import { Hono } from "hono";
import * as z from "zod";
import {
  auditEventSchema,
  punchSources,
  visitEventSchema,
  visitEventTypes,
  type Visit,
} from "../../domaine/schemas";
import { parseBody } from "../body";
import { fail, notFound } from "../errors";
import { guard } from "../guard";
import type { ApiDeps, AppEnv } from "../types";

/*
 * `/field/v1` — l'application intervenant.
 *
 * Deux choix qui viennent du terrain, pas du confort de développement :
 *
 * 1. **l'heure du geste n'est pas l'heure de l'envoi.** Dans un immeuble haussmannien ou un
 *    sous-sol, il n'y a pas de réseau : le pointage se fait localement et se synchronise ensuite.
 *    `at` vient donc du téléphone. Il est borné — sinon un relevé d'heures devient déclaratif ;
 * 2. **le pointage manuel existe**, avec un motif obligatoire (MY-02). Un badge se décolle, un
 *    téléphone d'entrée de gamme ne lit pas toujours le NFC. Sans cette porte de sortie, les
 *    intervenants trouveront la leur, et elle sera pire.
 */

/** Tolérance vers l'avenir : l'horloge d'un téléphone dérive de quelques secondes. */
const AVANCE_MAX_MS = 2 * 60 * 1000;
/** Tolérance vers le passé : une tournée hors réseau se synchronise au retour, pas une semaine après. */
const RETARD_MAX_MS = 48 * 60 * 60 * 1000;

/*
 * Ce qu'un pointage fait du statut de la visite.
 *
 * Ce n'était pas branché, et c'était un vrai trou : `commencee()` (`planning/materialisation.ts`)
 * lit `status !== "prevue"`, et c'est elle qui décide qu'« une visite commencée ne suit plus le
 * planning ». Sans cette mise à jour, une visite pointée restait « prévue » — et la
 * matérialisation de la nuit réécrivait sans broncher les horaires d'une visite déjà faite.
 *
 * L'avancement ne revient jamais en arrière : un pointage « en route » qui arrive après le départ
 * (tournée hors réseau synchronisée dans le désordre) est enregistré comme événement, mais ne
 * rouvre pas une visite terminée. L'événement reste la vérité ; le statut n'en est que le résumé.
 */
const STATUT_APRES = {
  en_route: "en_route",
  arrivee: "en_cours",
  depart: "faite",
  annulation: "annulee",
  remplacement: null,
} as const satisfies Record<(typeof visitEventTypes)[number], Visit["status"] | null>;

const AVANCEMENT: Record<Visit["status"], number> = {
  prevue: 0,
  en_route: 1,
  en_cours: 2,
  faite: 3,
  annulee: 3,
  non_faite: 3,
};

const punchSchema = z.strictObject({
  type: z.enum(visitEventTypes),
  source: z.enum(punchSources).exclude(["agence"]),
  at: z.coerce.date().optional(),
  reason: z.string().max(200).optional(),
});

export function fieldSurface(deps: ApiDeps) {
  const app = new Hono<AppEnv>();

  app.get("/visits/today", async (context) => {
    const member = context.get("member");
    const now = deps.now();
    const debut = new Date(now);
    debut.setHours(0, 0, 0, 0);
    const fin = new Date(debut.getTime() + 36 * 60 * 60 * 1000); // couvre une nuit à cheval

    const visits = await deps.repositories.visits.listByWorker(member._id, debut, fin);

    // La tournée d'un intervenant est sa propre donnée de travail : aucune autorisation par
    // foyer à demander — mais la consultation se journalise, sans foyer, parce qu'en inventer un
    // rendrait le journal du foyer faux.
    await deps.journal.append(
      auditEventSchema.parse({
        at: now,
        actorId: member._id,
        actorRole: "intervenant",
        householdId: null,
        action: "voir",
        module: "planning",
        target: "tournee",
        outcome: "autorise",
        reason: null,
        requestId: context.get("requestId") ?? null,
      }),
    );

    const vues = await Promise.all(
      visits.map(async (visit) => {
        const household = await deps.repositories.households.findById(visit.householdId);
        /*
         * Les pointages déjà enregistrés partent avec la tournée : sans eux, une application
         * rechargée (batterie, onglet fermé, téléphone changé) laisserait croire que rien n'a été
         * pointé, et l'intervenante repointerait son arrivée.
         */
        const evenements = await deps.repositories.visitEvents.listByVisit(visit._id);
        return {
          id: visit._id,
          foyer: { id: visit.householdId, code: household?.code ?? null },
          adresse: household ? household.address : null,
          debut: visit.plannedStart.toISOString(),
          fin: visit.plannedEnd.toISOString(),
          nature: visit.kind,
          statut: visit.status,
          pointages: evenements
            .map((evenement) => ({
              type: evenement.type,
              source: evenement.source,
              at: evenement.at.toISOString(),
            }))
            .sort((a, b) => a.at.localeCompare(b.at)),
        };
      }),
    );

    return context.json({ visites: vues });
  });

  app.post("/visits/:id/punch", async (context) => {
    const member = context.get("member");
    const body = await parseBody(context, punchSchema);
    if (!body.ok) return body.response;

    const visit = await deps.repositories.visits.findById(context.req.param("id"));
    // Une visite qui n'est pas la sienne n'existe pas pour lui.
    if (!visit || visit.workerId !== member._id) return notFound(context);

    const now = deps.now();
    const at = body.value.at ?? now;
    if (at.getTime() - now.getTime() > AVANCE_MAX_MS) {
      return fail(context, "requete_invalide", "at (dans le futur)");
    }
    if (now.getTime() - at.getTime() > RETARD_MAX_MS) {
      return fail(context, "requete_invalide", "at (trop ancien)");
    }

    const event = visitEventSchema.safeParse({
      _id: deps.newId(),
      visitId: visit._id,
      householdId: visit.householdId,
      workerId: member._id,
      type: body.value.type,
      source: body.value.source,
      at,
      recordedAt: now,
      reason: body.value.reason ?? null,
    });
    if (!event.success) {
      // Le seul cas : un pointage manuel sans motif.
      return fail(context, "requete_invalide", "reason");
    }

    await deps.repositories.visitEvents.append(event.data);

    const suivant = STATUT_APRES[body.value.type];
    const avance = suivant !== null && AVANCEMENT[suivant] > AVANCEMENT[visit.status];
    if (avance) await deps.repositories.visits.save({ ...visit, status: suivant });

    return context.json(
      {
        enregistre: true,
        at: at.toISOString(),
        recordedAt: now.toISOString(),
        statut: avance ? suivant : visit.status,
      },
      201,
    );
  });

  app.get("/visits/:id/access-instructions", async (context) => {
    const visit = await deps.repositories.visits.findById(context.req.param("id"));
    const member = context.get("member");
    if (!visit || visit.workerId !== member._id) return notFound(context);

    // Le digicode est la seule donnée dont la lecture dépend de l'heure : borné à la plage de la
    // visite affectée (règle R4), et chaque consultation journalisée.
    const autorise = await guard(deps, context, {
      householdId: visit.householdId,
      module: "acces_logement",
      action: "voir",
      target: visit._id,
    });
    if (!autorise.ok) return autorise.response;

    // Les consignes d'entrée elles-mêmes sont chiffrées au champ et arrivent à l'étape suivante
    // (`DATA_MODEL.md` §3) : la route existe, l'autorisation est tenue, le contenu viendra.
    return context.json({ consignes: null, aVenir: true });
  });

  return app;
}
