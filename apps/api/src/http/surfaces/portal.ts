import { Hono } from "hono";
import * as z from "zod";
import { MODULES } from "../../domaine/modules";
import { isStaffRole } from "../../domaine/roles";
import { fail } from "../errors";
import { guard } from "../guard";
import type { ApiDeps, AppEnv } from "../types";

/*
 * `/portal/v1` — l'espace client. Familles, bénéficiaires, payeurs, professionnels invités.
 *
 * Aucune route ne prend « le foyer de l'utilisateur » : elles prennent **un** foyer, nommément, et
 * le vérifient. Un même membre peut suivre son père et sa mère avec des droits différents (la
 * fille qui organise tout), donc l'implicite serait faux la moitié du temps.
 */

const fenetreSchema = z.strictObject({
  from: z.coerce.date(),
  to: z.coerce.date(),
});

export function portalSurface(deps: ApiDeps) {
  const app = new Hono<AppEnv>();

  app.get("/me", async (context) => {
    const member = context.get("member");
    const memberships = (await deps.repositories.memberships.listByMember(member._id)).filter(
      (membership) => membership.status === "actif" && !isStaffRole(membership.role),
    );

    const foyers = await Promise.all(
      memberships.map(async (membership) => {
        const household = await deps.repositories.households.findById(membership.householdId);
        const grants = await deps.repositories.grants.listFor(member._id, membership.householdId);
        const now = deps.now();
        const ouverts = MODULES.filter((module) =>
          grants.some(
            (grant) =>
              grant.module === module &&
              !grant.revokedAt &&
              grant.startsAt.getTime() <= now.getTime() &&
              (!grant.endsAt || grant.endsAt.getTime() > now.getTime()),
          ),
        );
        return {
          id: membership.householdId,
          code: household?.code ?? null,
          statut: household?.status ?? null,
          role: membership.role,
          modules: ouverts,
        };
      }),
    );

    return context.json({
      membre: {
        id: member._id,
        nom: member.displayName,
        affichage: member.prefs.displayMode,
        notifications: member.prefs.notifications,
      },
      foyers,
    });
  });

  app.get("/households/:id/visits", async (context) => {
    const householdId = context.req.param("id");
    const fenetre = fenetreSchema.safeParse({
      from: context.req.query("from"),
      to: context.req.query("to"),
    });
    if (!fenetre.success) return fail(context, "requete_invalide", "from, to");
    if (fenetre.data.to.getTime() <= fenetre.data.from.getTime()) {
      return fail(context, "requete_invalide", "to");
    }

    const autorise = await guard(deps, context, {
      householdId,
      module: "planning",
      action: "voir",
    });
    if (!autorise.ok) return autorise.response;

    const visits = await deps.repositories.visits.listByHousehold(
      householdId,
      fenetre.data.from,
      fenetre.data.to,
    );

    const vues = await Promise.all(
      visits.map(async (visit) => {
        const worker = await deps.repositories.workers.findById(visit.workerId);
        return {
          id: visit._id,
          debut: visit.plannedStart.toISOString(),
          fin: visit.plannedEnd.toISOString(),
          nature: visit.kind,
          statut: visit.status,
          // Prénom et initiale : le nom complet est la donnée personnelle de l'intervenant, et la
          // photo n'apparaît qu'avec son accord écrit (`PERMISSIONS.md` §8).
          intervenant: worker
            ? {
                prenom: worker.firstName,
                initiale: worker.lastInitial,
                photo: worker.photoConsent ? worker.photoId : null,
              }
            : null,
        };
      }),
    );

    return context.json({ visites: vues });
  });

  app.get("/households/:id/access-log", async (context) => {
    const householdId = context.req.param("id");
    const autorise = await guard(deps, context, {
      householdId,
      module: "journal_acces",
      action: "voir",
    });
    if (!autorise.ok) return autorise.response;

    const events = await deps.auditReader.listByHousehold(householdId, 200);
    return context.json({
      acces: events.map((event) => ({
        quand: event.at.toISOString(),
        qui: event.actorId,
        role: event.actorRole,
        quoi: event.module,
        action: event.action,
        resultat: event.outcome,
      })),
    });
  });

  return app;
}
