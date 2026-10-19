import { Hono } from "hono";
import * as z from "zod";
import {
  auditEventSchema,
  punchSources,
  visitEventSchema,
  visitEventTypes,
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
        return {
          id: visit._id,
          foyer: { id: visit.householdId, code: household?.code ?? null },
          adresse: household ? household.address : null,
          debut: visit.plannedStart.toISOString(),
          fin: visit.plannedEnd.toISOString(),
          nature: visit.kind,
          statut: visit.status,
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
    return context.json(
      { enregistre: true, at: at.toISOString(), recordedAt: now.toISOString() },
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
