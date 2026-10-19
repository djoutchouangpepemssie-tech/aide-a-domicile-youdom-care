import { Hono } from "hono";
import * as z from "zod";
import { absenceSchema, absenceKinds } from "../../domaine/absences";
import {
  RULE_CATALOG,
  RULE_KEYS,
  agencyRulesSchema,
  emptyRules,
  ruleSchema,
  type Finding,
} from "../../domaine/regles";
import { visitKinds } from "../../domaine/schemas";
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
import { judgePlanning } from "../../planning/validation";
import { isDate, isTime, nextDay } from "../../temps/paris";
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
