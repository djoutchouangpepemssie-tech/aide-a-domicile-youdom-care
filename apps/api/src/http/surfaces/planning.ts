import { Hono } from "hono";
import * as z from "zod";
import { absenceKinds, absenceSchema } from "../../domaine/absences";
import { preferenceKinds, workerPreferenceSchema } from "../../domaine/preferences";
import {
  RULE_CATALOG,
  RULE_KEYS,
  agencyRulesSchema,
  emptyRules,
  ruleSchema,
  type Finding,
} from "../../domaine/regles";
import {
  accessGrantSchema,
  visitKinds,
  visitSchema,
  type AccessGrant,
} from "../../domaine/schemas";
import { defaultGrants } from "../../domaine/roles";
import {
  interventionModes,
  majorationSchema,
  prestationAt,
  prestationSchema,
  priceVisit,
  tariffSettingsSchema,
  unites,
} from "../../domaine/tarifs";
import {
  editOccurrence,
  editSerie,
  endSerie,
  occurrences,
  resumeSerie,
  serieSchema,
  skipDate,
  slotSchema,
  splitSerie,
  suspendSerie,
  visibleOccurrences,
  type Serie,
} from "../../planning/serie";
import { planMaterialisation } from "../../planning/materialisation";
import { optimise, suggestWorkers } from "../../planning/optimisation";
import { judgePlanning, workerFacts } from "../../planning/validation";
import { isDate, isTime, nextDay, parisToInstant } from "../../temps/paris";
import { parseBody } from "../body";
import { fail, notFound } from "../errors";
import { actorRole, traceAdmin } from "../trace";
import type { ApiDeps, AppEnv } from "../types";

/*
 * `/admin/v1` — planning et tarifs. C'est le cœur du métier de coordination, et les deux décisions
 * d'Arcel du 19/10 s'y lisent partout :
 *
 * - **« la planification n'a pas de règle »** : le moteur n'impose rien. Les règles sont des
 *   données saisies par l'agence (`PUT /rules`), avec leur seuil et leur sévérité. Tant que rien
 *   n'est saisi, tout passe — et la réponse le dit, au lieu de laisser croire qu'on a vérifié ;
 * - **« nous devons créer et mettre nous-même nos tarifs »** : aucun prix, aucune majoration,
 *   aucun taux n'est écrit dans le code. L'agence crée ses prestations, versionnées par date
 *   d'application.
 *
 * Ce que l'API garantit en revanche, et c'est là qu'est la profondeur : un planning se crée, se
 * modifie à trois portées (une occurrence, celle-ci et les suivantes, toute la série), se suspend,
 * se reprend, se termine — et chaque écriture est jugée par les règles de l'agence sur quatre
 * semaines autour du changement, puis journalisée.
 */

const dateSchema = z.string().refine(isDate, { error: "date AAAA-MM-JJ" });
const timeSchema = z.string().refine(isTime, { error: "heure HH:MM" });
const idParam = z.string().regex(/^[0-9a-f]{24}$/);

const slotInput = slotSchema;

function resume(findings: readonly Finding[]) {
  return findings.map((finding) => ({
    regle: finding.regle,
    severite: finding.severite,
    message: finding.message,
    visites: finding.visites,
  }));
}

export function planningSurface(deps: ApiDeps) {
  const app = new Hono<AppEnv>();

  /* ------------------------------------------------------------------ règles */

  app.get("/rules/:agencyId", async (context) => {
    const agencyId = context.req.param("agencyId");
    if (!idParam.safeParse(agencyId).success) return notFound(context);
    const rules = await deps.repositories.rules.current(agencyId);
    return context.json({
      // Le catalogue explique chaque règle et propose une valeur : il n'en applique aucune.
      catalogue: RULE_CATALOG,
      regles: rules?.rules ?? emptyRules(),
      version: rules?.version ?? 0,
      aucuneRegleSaisie: !rules,
    });
  });

  app.put("/rules/:agencyId", async (context) => {
    const agencyId = context.req.param("agencyId");
    if (!idParam.safeParse(agencyId).success) return notFound(context);
    const body = await parseBody(
      context,
      z.strictObject({ regles: z.record(z.enum(RULE_KEYS), ruleSchema) }),
    );
    if (!body.ok) return body.response;

    const acteur = await actorRole(deps, context);
    const courantes = await deps.repositories.rules.current(agencyId);
    const parsed = agencyRulesSchema.safeParse({
      _id: deps.newId(),
      agencyId,
      version: (courantes?.version ?? 0) + 1,
      rules: { ...emptyRules(), ...body.value.regles },
      updatedBy: acteur.memberId,
      updatedAt: deps.now(),
    });
    if (!parsed.success) {
      return fail(
        context,
        "requete_invalide",
        parsed.error.issues[0]?.message ?? "règles invalides",
      );
    }

    await deps.repositories.rules.insert(parsed.data);
    await traceAdmin(deps, context, {
      action: "modifier",
      householdId: null,
      target: `regles:v${parsed.data.version}`,
    });
    return context.json({ version: parsed.data.version, regles: parsed.data.rules });
  });

  /* ----------------------------------------------------------------- séries */

  app.post("/series", async (context) => {
    const body = await parseBody(
      context,
      z.strictObject({
        householdId: idParam,
        libelle: z.string().min(1).max(80),
        from: dateSchema,
        to: dateSchema.nullish(),
        everyWeeks: z.number().int().min(1).max(8),
        slots: z.array(slotInput).min(1).max(40),
      }),
    );
    if (!body.ok) return body.response;

    const household = await deps.repositories.households.findById(body.value.householdId);
    if (!household) return notFound(context);
    if (household.status !== "actif")
      return fail(context, "requete_invalide", "foyer gelé ou archivé");

    const acteur = await actorRole(deps, context);
    const now = deps.now();
    const parsed = serieSchema.safeParse({
      _id: deps.newId(),
      householdId: household._id,
      agencyId: household.agencyId,
      libelle: body.value.libelle,
      from: body.value.from,
      to: body.value.to ?? null,
      everyWeeks: body.value.everyWeeks,
      slots: body.value.slots,
      skips: [],
      overrides: [],
      status: "active",
      replacedBy: null,
      replaces: null,
      version: 1,
      createdBy: acteur.memberId,
      createdAt: now,
      updatedAt: now,
    });
    if (!parsed.success) {
      return fail(context, "requete_invalide", parsed.error.issues[0]?.message ?? "série invalide");
    }

    const jugement = await judgePlanning(deps.repositories, {
      agencyId: household.agencyId,
      from: body.value.from,
      extra: [parsed.data],
    });
    if (jugement.bloquants.length > 0) {
      return context.json(
        {
          code: "regles_non_respectees",
          message: "Ce planning ne respecte pas une règle que vous avez marquée bloquante.",
          bloquants: resume(jugement.bloquants),
        },
        409,
      );
    }

    await deps.repositories.series.insert(parsed.data);
    await traceAdmin(deps, context, {
      action: "creer",
      householdId: household._id,
      target: `serie:${parsed.data._id}`,
    });
    return context.json(
      {
        id: parsed.data._id,
        occurrences: visibleOccurrences(parsed.data, body.value.from, jugement.fenetre.to).length,
        avertissements: resume(jugement.findings),
        aucuneRegleSaisie: jugement.intervenants.length === 0 && jugement.findings.length === 0,
      },
      201,
    );
  });

  app.get("/households/:id/series", async (context) => {
    const householdId = context.req.param("id");
    if (!idParam.safeParse(householdId).success) return notFound(context);
    const series = await deps.repositories.series.listByHousehold(householdId);
    return context.json({
      series: series.map((serie) => ({
        id: serie._id,
        libelle: serie.libelle,
        du: serie.from,
        au: serie.to,
        rythme: serie.everyWeeks,
        creneaux: serie.slots.length,
        statut: serie.status,
        version: serie.version,
        remplaceePar: serie.replacedBy ?? null,
      })),
    });
  });

  app.get("/series/:id/occurrences", async (context) => {
    const serie = await deps.repositories.series.findById(context.req.param("id"));
    if (!serie) return notFound(context);
    const fenetre = z
      .strictObject({ from: dateSchema, to: dateSchema })
      .safeParse({ from: context.req.query("from"), to: context.req.query("to") });
    if (!fenetre.success) return fail(context, "requete_invalide", "from, to");
    if (fenetre.data.to < fenetre.data.from) return fail(context, "requete_invalide", "to");

    return context.json({
      serie: { id: serie._id, libelle: serie.libelle, statut: serie.status },
      // Une série suspendue ne produit rien pour les familles ; l'agence voit ce qui dort.
      occurrences: occurrences(serie, fenetre.data.from, fenetre.data.to),
      visibles: visibleOccurrences(serie, fenetre.data.from, fenetre.data.to).length,
    });
  });

  app.patch("/series/:id/occurrences/:date/:slotIndex", async (context) => {
    const serie = await deps.repositories.series.findById(context.req.param("id"));
    if (!serie) return notFound(context);
    const date = context.req.param("date");
    const slotIndex = Number(context.req.param("slotIndex"));
    if (!isDate(date) || !Number.isInteger(slotIndex) || slotIndex < 0) {
      return fail(context, "requete_invalide", "date, slotIndex");
    }
    if (slotIndex >= serie.slots.length) return notFound(context);

    const body = await parseBody(
      context,
      z.strictObject({
        portee: z.enum(["occurrence", "cette_et_suivantes", "serie"]),
        change: z.strictObject({
          start: timeSchema.optional(),
          end: timeSchema.optional(),
          overnight: z.boolean().optional(),
          kind: z.enum(visitKinds).optional(),
          workerId: idParam.nullable().optional(),
          cancelled: z.boolean().optional(),
          motif: z.string().max(200).optional(),
        }),
      }),
    );
    if (!body.ok) return body.response;

    const acteur = await actorRole(deps, context);
    const now = deps.now();
    const { portee, change } = body.value;

    let aEcrire: Serie[] = [];
    let nouvelleSerie: Serie | null = null;

    if (portee === "occurrence") {
      aEcrire = [editOccurrence(serie, { date, slotIndex, change, by: acteur.memberId, at: now })];
    } else {
      const slots = serie.slots.map((slot, index) =>
        index === slotIndex
          ? {
              ...slot,
              start: change.start ?? slot.start,
              end: change.end ?? slot.end,
              overnight: change.overnight ?? slot.overnight,
              kind: change.kind ?? slot.kind,
              workerId: change.workerId === undefined ? slot.workerId : change.workerId,
            }
          : slot,
      );
      if (portee === "serie") {
        aEcrire = [editSerie(serie, { slots, at: now })];
      } else {
        const { ancienne, nouvelle } = splitSerie(serie, {
          date,
          slots,
          by: acteur.memberId,
          at: now,
          newId: deps.newId(),
        });
        aEcrire = [ancienne];
        nouvelleSerie = nouvelle;
      }
    }

    const jugement = await judgePlanning(deps.repositories, {
      agencyId: serie.agencyId,
      from: date,
      extra: [...aEcrire, ...(nouvelleSerie ? [nouvelleSerie] : [])],
    });
    if (jugement.bloquants.length > 0) {
      return context.json(
        {
          code: "regles_non_respectees",
          message: "Ce changement ne respecte pas une règle que vous avez marquée bloquante.",
          bloquants: resume(jugement.bloquants),
        },
        409,
      );
    }

    for (const serieAEcrire of aEcrire) await deps.repositories.series.save(serieAEcrire);
    if (nouvelleSerie) await deps.repositories.series.insert(nouvelleSerie);

    await traceAdmin(deps, context, {
      action: "modifier",
      householdId: serie.householdId,
      target: `serie:${serie._id}#${date}#${slotIndex}:${portee}`,
    });

    return context.json({
      portee,
      serie: serie._id,
      nouvelleSerie: nouvelleSerie?._id ?? null,
      avertissements: resume(jugement.findings),
    });
  });

  app.post("/series/:id/skip", async (context) => {
    const serie = await deps.repositories.series.findById(context.req.param("id"));
    if (!serie) return notFound(context);
    const body = await parseBody(
      context,
      z.strictObject({ date: dateSchema, motif: z.string().max(200).optional() }),
    );
    if (!body.ok) return body.response;

    await deps.repositories.series.save(skipDate(serie, body.value.date, deps.now()));
    await traceAdmin(deps, context, {
      action: "modifier",
      householdId: serie.householdId,
      target: `serie:${serie._id}:saut:${body.value.date}`,
    });
    return context.json({ saute: body.value.date });
  });

  app.post("/series/:id/status", async (context) => {
    const serie = await deps.repositories.series.findById(context.req.param("id"));
    if (!serie) return notFound(context);
    const body = await parseBody(
      context,
      z.strictObject({
        statut: z.enum(["active", "suspendue", "terminee"]),
        date: dateSchema.optional(),
        motif: z.string().max(200).optional(),
      }),
    );
    if (!body.ok) return body.response;

    const now = deps.now();
    let modifiee: Serie;
    if (body.value.statut === "suspendue") modifiee = suspendSerie(serie, now);
    else if (body.value.statut === "active") modifiee = resumeSerie(serie, now);
    else {
      if (!body.value.date) return fail(context, "requete_invalide", "date (fin de série)");
      modifiee = endSerie(serie, body.value.date, now);
    }

    await deps.repositories.series.save(modifiee);
    await traceAdmin(deps, context, {
      action: "modifier",
      householdId: serie.householdId,
      target: `serie:${serie._id}:${body.value.statut}`,
    });
    return context.json({ statut: modifiee.status, version: modifiee.version });
  });

  /* --------------------------------------------------- planning d'ensemble */

  app.get("/planning", async (context) => {
    const query = z
      .strictObject({
        agencyId: idParam,
        from: dateSchema,
        to: dateSchema,
        workerId: idParam.optional(),
      })
      .safeParse({
        agencyId: context.req.query("agencyId"),
        from: context.req.query("from"),
        to: context.req.query("to"),
        workerId: context.req.query("workerId"),
      });
    if (!query.success) return fail(context, "requete_invalide", "agencyId, from, to");
    if (query.data.to < query.data.from) return fail(context, "requete_invalide", "to");

    const series = await deps.repositories.series.listByAgency(query.data.agencyId);
    const liste = series
      .flatMap((serie) => visibleOccurrences(serie, query.data.from, query.data.to))
      .filter((occurrence) => !query.data.workerId || occurrence.workerId === query.data.workerId)
      .sort((a, b) => `${a.date}${a.start}`.localeCompare(`${b.date}${b.start}`));

    const jugement = await judgePlanning(deps.repositories, {
      agencyId: query.data.agencyId,
      from: query.data.from,
      workerIds: query.data.workerId ? [query.data.workerId] : undefined,
    });

    return context.json({
      occurrences: liste,
      aPourvoir: liste.filter((occurrence) => occurrence.workerId === null).length,
      signalements: resume(jugement.findings),
      fenetreJugee: jugement.fenetre,
      aucuneRegleSaisie: (await deps.repositories.rules.current(query.data.agencyId)) === null,
    });
  });

  /* ------------------------------------------------- préférences du foyer */

  app.post("/worker-preferences", async (context) => {
    const body = await parseBody(
      context,
      z.strictObject({
        householdId: idParam,
        workerId: idParam,
        kind: z.enum(preferenceKinds),
        motif: z.string().max(200).optional(),
      }),
    );
    if (!body.ok) return body.response;

    const [household, worker] = await Promise.all([
      deps.repositories.households.findById(body.value.householdId),
      deps.repositories.workers.findById(body.value.workerId),
    ]);
    if (!household) return notFound(context);
    if (!worker) return fail(context, "requete_invalide", "workerId");

    const acteur = await actorRole(deps, context);
    await deps.repositories.workerPreferences.upsert(
      workerPreferenceSchema.parse({
        _id: deps.newId(),
        householdId: body.value.householdId,
        workerId: body.value.workerId,
        kind: body.value.kind,
        motif: body.value.motif ?? null,
        createdBy: acteur.memberId,
        createdAt: deps.now(),
      }),
    );
    await traceAdmin(deps, context, {
      action: "creer",
      householdId: body.value.householdId,
      // Le motif d'un refus ne sort pas du foyer et de l'agence : il n'entre pas dans la trace.
      target: `preference:${body.value.kind}`,
    });
    return context.json({ enregistre: true }, 201);
  });

  /* ----------------------------------------------------------- optimisation */

  const fenetreSchema = z.strictObject({ agencyId: idParam, from: dateSchema, to: dateSchema });

  async function contexteOptimisation(
    agencyId: string,
    from: string,
    to: string,
    householdId?: string,
  ) {
    const [rules, facts] = await Promise.all([
      deps.repositories.rules.current(agencyId),
      workerFacts(deps.repositories, { agencyId, from, to, householdId }),
    ]);
    const foyers = new Set(
      (await deps.repositories.series.listByAgency(agencyId)).map((serie) => serie.householdId),
    );
    const preferences = (
      await Promise.all(
        [...foyers].map((foyer) => deps.repositories.workerPreferences.listByHousehold(foyer)),
      )
    ).flat();
    return {
      rules: rules?.rules ?? emptyRules(),
      weights: rules?.optimisation ?? null,
      preferences,
      workers: facts,
      aucuneRegleSaisie: !rules,
    };
  }

  app.get("/planning/suggestions", async (context) => {
    const query = fenetreSchema.safeParse({
      agencyId: context.req.query("agencyId"),
      from: context.req.query("from"),
      to: context.req.query("to"),
    });
    if (!query.success) return fail(context, "requete_invalide", "agencyId, from, to");
    if (query.data.to < query.data.from) return fail(context, "requete_invalide", "to");

    const series = await deps.repositories.series.listByAgency(query.data.agencyId);
    const aPourvoir = series
      .flatMap((serie) => visibleOccurrences(serie, query.data.from, query.data.to))
      .filter((occurrence) => occurrence.workerId === null)
      .sort((a, b) => `${a.date}${a.start}`.localeCompare(`${b.date}${b.start}`));

    const creneaux = [];
    for (const occurrence of aPourvoir.slice(0, 50)) {
      const contexte = await contexteOptimisation(
        query.data.agencyId,
        query.data.from,
        query.data.to,
        occurrence.householdId,
      );
      const { proposes, exclus } = suggestWorkers(occurrence, contexte);
      creneaux.push({
        serieId: occurrence.serieId,
        householdId: occurrence.householdId,
        date: occurrence.date,
        heure: `${occurrence.start}–${occurrence.end}`,
        slotIndex: occurrence.slotIndex,
        // Trois propositions : au-delà, personne ne lit, et le classement perd son sens.
        suggestions: proposes.slice(0, 3).map((suggestion) => ({
          workerId: suggestion.workerId,
          score: suggestion.score,
          raisons: suggestion.raisons,
        })),
        exclus,
      });
    }

    return context.json({ creneaux, total: aPourvoir.length });
  });

  app.post("/planning/optimisation", async (context) => {
    const body = await parseBody(
      context,
      z.strictObject({
        agencyId: idParam,
        from: dateSchema,
        to: dateSchema,
        /** Sans cela, rien n'est écrit : l'optimisation propose, le coordinateur décide. */
        appliquer: z.boolean().optional(),
        maxPropositions: z.number().int().min(1).max(200).optional(),
      }),
    );
    if (!body.ok) return body.response;
    if (body.value.to < body.value.from) return fail(context, "requete_invalide", "to");

    const series = await deps.repositories.series.listByAgency(body.value.agencyId, "active");
    const occurrences = series.flatMap((serie) =>
      visibleOccurrences(serie, body.value.from, body.value.to),
    );
    const contexte = await contexteOptimisation(
      body.value.agencyId,
      body.value.from,
      body.value.to,
    );
    const resultat = optimise(occurrences, contexte, {
      maxPropositions: body.value.maxPropositions,
    });

    if (!body.value.appliquer) {
      return context.json({
        appliquees: 0,
        propositions: resultat.propositions,
        sansSolution: resultat.sansSolution,
        aucuneRegleSaisie: contexte.aucuneRegleSaisie,
      });
    }

    const acteur = await actorRole(deps, context);
    const now = deps.now();
    const appliquees: typeof resultat.propositions = [];
    const refusees: Array<{ proposition: (typeof resultat.propositions)[number]; raison: string }> =
      [];

    for (const proposition of resultat.propositions) {
      const serie = await deps.repositories.series.findById(proposition.serieId);
      if (!serie) continue;
      const modifiee = editOccurrence(serie, {
        date: proposition.date,
        slotIndex: proposition.slotIndex,
        change: {
          workerId: proposition.propose,
          motif:
            proposition.nature === "creneau_a_pourvoir"
              ? "affectation proposée par l'optimisation"
              : "réaffectation proposée par l'optimisation",
        },
        by: acteur.memberId,
        at: now,
      });

      // On revérifie après écriture simulée : une suite de propositions peut, ensemble, créer ce
      // qu'aucune ne créait seule. Rien n'est écrit tant que le jugement ne passe pas.
      const jugement = await judgePlanning(deps.repositories, {
        agencyId: body.value.agencyId,
        from: proposition.date,
        extra: [modifiee],
      });
      if (jugement.bloquants.length > 0) {
        refusees.push({ proposition, raison: jugement.bloquants[0].message });
        continue;
      }

      await deps.repositories.series.save(modifiee);
      await traceAdmin(deps, context, {
        action: "modifier",
        householdId: proposition.householdId,
        target: `optimisation:${proposition.serieId}#${proposition.date}#${proposition.slotIndex}`,
      });
      appliquees.push(proposition);
    }

    return context.json({
      appliquees: appliquees.length,
      propositions: appliquees,
      refusees,
      sansSolution: resultat.sansSolution,
      aucuneRegleSaisie: contexte.aucuneRegleSaisie,
    });
  });

  /* ------------------------------------------------------- matérialisation */

  /*
   * Transformer les occurrences en visites pointables. À appeler chaque nuit sur un horizon
   * glissant (quinze jours suffisent : au-delà, le planning bouge encore).
   *
   * La règle : une visite encore `prevue` suit son planning ; une visite commencée ne le suit
   * plus — la divergence est signalée, jamais réécrite. Réécrire une visite pointée, ce serait
   * réécrire des heures travaillées.
   */
  app.post("/planning/materialisation", async (context) => {
    const body = await parseBody(
      context,
      z.strictObject({ agencyId: idParam, from: dateSchema, to: dateSchema }),
    );
    if (!body.ok) return body.response;
    if (body.value.to < body.value.from) return fail(context, "requete_invalide", "to");

    const series = await deps.repositories.series.listByAgency(body.value.agencyId);
    const occurrences = series.flatMap((serie) =>
      visibleOccurrences(serie, body.value.from, body.value.to),
    );
    const existantes = await deps.repositories.visits.listBySeries(
      series.map((serie) => serie._id),
      body.value.from,
      body.value.to,
    );

    const instants = (occurrence: (typeof occurrences)[number]) => ({
      debut: parisToInstant(occurrence.date, occurrence.start),
      fin: parisToInstant(occurrence.endDate, occurrence.end),
    });
    const plan = planMaterialisation(occurrences, existantes, instants);
    const now = deps.now();
    const acteurMateria = await actorRole(deps, context);

    /*
     * Affecter quelqu'un à un foyer doit lui **ouvrir les droits de sa mission** sur ce foyer, et
     * pas plus : ceux de la colonne « intervenant » de la matrice (`PERMISSIONS.md` §5). Sans
     * cela, l'intervenante voit sa tournée mais pas la fiche de vie du foyer où elle entre — ce
     * qui est exactement le contraire de ce que le produit promet.
     *
     * Les droits sont **bornés dans le temps** et repoussés à chaque matérialisation : un
     * intervenant qui cesse de venir perd l'accès de lui-même, sans qu'un humain ait à y penser.
     * L'accès au logement reste, lui, limité à la plage de la visite (règle R4), quoi qu'il
     * arrive.
     */
    const FENETRE_DROITS_JOURS = 30;
    const finDesDroits = new Date(
      parisToInstant(nextDay(body.value.to, FENETRE_DROITS_JOURS), "00:00").getTime(),
    );

    async function ouvrirLesDroits(workerId: string, householdId: string): Promise<void> {
      const rattachement = await deps.repositories.memberships.find(workerId, householdId);
      if (!rattachement) {
        await deps.repositories.memberships.insert({
          _id: deps.newId(),
          memberId: workerId,
          householdId,
          role: "intervenant",
          status: "actif",
          invitedBy: acteurMateria.memberId,
          activatedAt: now,
          revokedAt: null,
          createdAt: now,
        });
      }

      const existants = await deps.repositories.grants.listFor(workerId, householdId);
      const aCreer: AccessGrant[] = [];
      for (const entree of defaultGrants("intervenant")) {
        const courant = existants.find(
          (grant) => grant.module === entree.module && !grant.revokedAt,
        );
        if (!courant) {
          aCreer.push(
            accessGrantSchema.parse({
              _id: deps.newId(),
              memberId: workerId,
              householdId,
              module: entree.module,
              actions: entree.actions,
              grantedBy: acteurMateria.memberId,
              reason: "mission de planning",
              startsAt: now,
              endsAt: finDesDroits,
              revokedAt: null,
              createdAt: now,
            }),
          );
        } else if (!courant.endsAt || courant.endsAt.getTime() < finDesDroits.getTime()) {
          await deps.repositories.grants.extend(courant._id, finDesDroits);
        }
      }
      if (aCreer.length > 0) await deps.repositories.grants.insertMany(aCreer);
    }

    for (const occurrence of plan.aCreer) {
      // Un créneau sans intervenant ne devient pas une visite : il n'y a personne à pointer.
      if (!occurrence.workerId) continue;
      const { debut, fin } = instants(occurrence);
      await deps.repositories.visits.insert(
        visitSchema.parse({
          _id: deps.newId(),
          householdId: occurrence.householdId,
          workerId: occurrence.workerId,
          plannedStart: debut,
          plannedEnd: fin,
          kind: occurrence.kind,
          status: "prevue",
          replaces: null,
          serieId: occurrence.serieId,
          occurrenceDate: occurrence.date,
          slotIndex: occurrence.slotIndex,
          createdAt: now,
        }),
      );
      await ouvrirLesDroits(occurrence.workerId, occurrence.householdId);
    }

    for (const { visit, occurrence } of plan.aMettreAJour) {
      if (!occurrence.workerId) continue;
      const { debut, fin } = instants(occurrence);
      await deps.repositories.visits.save({
        ...visit,
        workerId: occurrence.workerId,
        plannedStart: debut,
        plannedEnd: fin,
        kind: occurrence.kind,
      });
      // Un remplacement change l'intervenant : le remplaçant a besoin des droits de la mission.
      await ouvrirLesDroits(occurrence.workerId, occurrence.householdId);
    }

    for (const visit of plan.aAnnuler) {
      await deps.repositories.visits.save({ ...visit, status: "annulee" });
    }

    const creees = plan.aCreer.filter((occurrence) => occurrence.workerId).length;
    const aPourvoir = plan.aCreer.length - creees;
    await traceAdmin(deps, context, {
      action: "creer",
      householdId: null,
      target: `materialisation:${body.value.from}..${body.value.to}:+${creees}`,
    });

    return context.json({
      creees,
      misesAJour: plan.aMettreAJour.length,
      annulees: plan.aAnnuler.length,
      // Les créneaux sans intervenant ne sont pas des visites : ils restent à pourvoir.
      creneauxSansIntervenant: aPourvoir,
      // Ce que le planning ne réécrira pas : au coordinateur de trancher.
      divergences: plan.divergences.map(({ visit, occurrence, changements }) => ({
        visitId: visit._id,
        statut: visit.status,
        date: visit.occurrenceDate,
        changements,
        occurrenceSupprimee: occurrence === null,
      })),
    });
  });

  /* ---------------------------------------------------------------- absences */

  app.post("/absences", async (context) => {
    const body = await parseBody(
      context,
      z.strictObject({
        workerId: idParam,
        kind: z.enum(absenceKinds),
        from: z.coerce.date(),
        to: z.coerce.date(),
        motif: z.string().max(200).optional(),
      }),
    );
    if (!body.ok) return body.response;

    const worker = await deps.repositories.workers.findById(body.value.workerId);
    if (!worker) return notFound(context);

    const acteur = await actorRole(deps, context);
    const parsed = absenceSchema.safeParse({
      _id: deps.newId(),
      workerId: body.value.workerId,
      kind: body.value.kind,
      from: body.value.from,
      to: body.value.to,
      motif: body.value.motif ?? null,
      declaredBy: acteur.memberId,
      createdAt: deps.now(),
    });
    if (!parsed.success) return fail(context, "requete_invalide", "from, to");

    await deps.repositories.absences.insert(parsed.data);
    await traceAdmin(deps, context, {
      action: "creer",
      householdId: null,
      target: `absence:${body.value.workerId}`,
    });
    return context.json({ id: parsed.data._id }, 201);
  });

  /* ----------------------------------------------------------------- tarifs */

  app.post("/prestations", async (context) => {
    const body = await parseBody(
      context,
      z.strictObject({
        agencyId: idParam,
        code: z.string().regex(/^[a-z0-9-]{2,40}$/),
        libelle: z.string().min(1).max(120),
        mode: z.enum(interventionModes),
        unite: z.enum(unites),
        prixTtcCentimes: z.number().int().positive(),
        prixHtCentimes: z.number().int().positive().nullish(),
        tvaTaux: z.number().min(0).max(1).nullish(),
        creditImpotEligible: z.boolean(),
        majorations: z.array(majorationSchema).max(12).optional(),
        from: dateSchema,
        to: dateSchema.nullish(),
        /**
         * Changer un prix est une opération courante : avec cette option, la version précédente
         * est close la veille au lieu d'être refusée. Sans elle, rien n'est touché.
         */
        remplaceLaPrecedente: z.boolean().optional(),
      }),
    );
    if (!body.ok) return body.response;

    const acteur = await actorRole(deps, context);
    const existantes = await deps.repositories.prestations.listByAgency(body.value.agencyId);
    const enConflit = existantes.filter(
      (prestation) =>
        prestation.code === body.value.code &&
        prestation.from <= (body.value.to ?? "9999-12-31") &&
        (prestation.to ?? "9999-12-31") >= body.value.from,
    );
    const veille = nextDay(body.value.from, -1);
    const closables =
      body.value.remplaceLaPrecedente &&
      enConflit.every((prestation) => prestation.from <= veille && !prestation.to);
    if (enConflit.length > 0 && !closables) {
      // Deux prix applicables le même jour, c'est une facture indéfendable.
      return fail(
        context,
        "requete_invalide",
        "from (une version de ce code couvre déjà cette période ; fermez-la ou passez remplaceLaPrecedente)",
      );
    }

    const parsed = prestationSchema.safeParse({
      _id: deps.newId(),
      agencyId: body.value.agencyId,
      code: body.value.code,
      libelle: body.value.libelle,
      mode: body.value.mode,
      unite: body.value.unite,
      prixTtcCentimes: body.value.prixTtcCentimes,
      prixHtCentimes: body.value.prixHtCentimes ?? null,
      tvaTaux: body.value.tvaTaux ?? null,
      creditImpotEligible: body.value.creditImpotEligible,
      majorations: body.value.majorations ?? [],
      from: body.value.from,
      to: body.value.to ?? null,
      createdBy: acteur.memberId,
      createdAt: deps.now(),
    });
    if (!parsed.success) {
      return fail(
        context,
        "requete_invalide",
        parsed.error.issues[0]?.message ?? "prestation invalide",
      );
    }

    for (const precedente of enConflit) {
      await deps.repositories.prestations.close(precedente._id, veille);
    }
    await deps.repositories.prestations.insert(parsed.data);
    await traceAdmin(deps, context, {
      action: "creer",
      householdId: null,
      target: `prestation:${parsed.data.code}`,
    });
    return context.json(
      { id: parsed.data._id, versionsCloses: enConflit.map((prestation) => prestation._id) },
      201,
    );
  });

  app.get("/prestations/:agencyId", async (context) => {
    const agencyId = context.req.param("agencyId");
    if (!idParam.safeParse(agencyId).success) return notFound(context);
    const prestations = await deps.repositories.prestations.listByAgency(agencyId);
    const reglages = await deps.repositories.tariffSettings.find(agencyId);
    return context.json({
      prestations: prestations.map((prestation) => ({
        id: prestation._id,
        code: prestation.code,
        libelle: prestation.libelle,
        mode: prestation.mode,
        unite: prestation.unite,
        prixTtcCentimes: prestation.prixTtcCentimes,
        creditImpotEligible: prestation.creditImpotEligible,
        majorations: prestation.majorations,
        du: prestation.from,
        au: prestation.to,
      })),
      // `null` veut dire « non saisi » : aucune estimation de crédit d'impôt ne sera calculée.
      creditImpotTaux: reglages?.creditImpotTaux ?? null,
      aucunTarifSaisi: prestations.length === 0,
    });
  });

  app.put("/tariff-settings/:agencyId", async (context) => {
    const agencyId = context.req.param("agencyId");
    if (!idParam.safeParse(agencyId).success) return notFound(context);
    const body = await parseBody(
      context,
      z.strictObject({
        creditImpotTaux: z.number().min(0).max(1).nullable(),
        plafondAnnuelCentimes: z.number().int().positive().nullable().optional(),
      }),
    );
    if (!body.ok) return body.response;

    const acteur = await actorRole(deps, context);
    const existant = await deps.repositories.tariffSettings.find(agencyId);
    const settings = tariffSettingsSchema.parse({
      _id: existant?._id ?? deps.newId(),
      agencyId,
      creditImpotTaux: body.value.creditImpotTaux,
      plafondAnnuelCentimes: body.value.plafondAnnuelCentimes ?? null,
      updatedBy: acteur.memberId,
      updatedAt: deps.now(),
    });
    await deps.repositories.tariffSettings.upsert(settings);
    await traceAdmin(deps, context, {
      action: "modifier",
      householdId: null,
      target: "reglages_tarifs",
    });
    return context.json({ creditImpotTaux: settings.creditImpotTaux });
  });

  app.post("/price-preview", async (context) => {
    const body = await parseBody(
      context,
      z.strictObject({
        agencyId: idParam,
        code: z.string().min(1).max(40),
        visite: z.strictObject({
          startDate: dateSchema,
          start: timeSchema,
          endDate: dateSchema,
          end: timeSchema,
          kind: z.enum(visitKinds).optional(),
        }),
      }),
    );
    if (!body.ok) return body.response;

    const prestations = await deps.repositories.prestations.listByAgency(body.value.agencyId);
    const prestation = prestationAt(prestations, body.value.code, body.value.visite.startDate);
    if (!prestation) return notFound(context);

    const reglages = await deps.repositories.tariffSettings.find(body.value.agencyId);
    const prix = priceVisit(prestation, body.value.visite, reglages);
    return context.json({
      prestation: { code: prestation.code, libelle: prestation.libelle, mode: prestation.mode },
      // L'ordre n'est pas décoratif : le prix TTC avant avantage fiscal est l'information
      // principale, le crédit d'impôt est une estimation affichée à part (règle du projet).
      principal: prix.principal,
      secondaire: prix.secondaire,
    });
  });

  return app;
}
