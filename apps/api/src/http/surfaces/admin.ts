import { Hono, type Context } from "hono";
import * as z from "zod";
import { ADMIN_SCOPE } from "../../domaine/modules";
import { CLIENT_ROLES, STAFF_ROLES, defaultGrants } from "../../domaine/roles";
import {
  accessGrantSchema,
  auditEventSchema,
  householdModes,
  visitKinds,
  type AccessGrant,
} from "../../domaine/schemas";
import { parseBody } from "../body";
import { fail, notFound } from "../errors";
import type { ApiDeps, AppEnv } from "../types";

/*
 * `/admin/v1` — le back-office de l'agence. Le strict nécessaire pour que la coordination quitte
 * Word : créer un foyer, enregistrer un intervenant, rattacher un membre avec ses droits par
 * défaut, poser une visite et l'affecter.
 *
 * Deux choses que je signale plutôt que de les laisser découvrir :
 *
 * 1. **la portée par agence n'est pas encore en place.** Un coordinateur authentifié peut agir
 *    sur l'agence qu'il nomme. Le rattachement d'un salarié à son agence arrive avec le module
 *    Planning (étape 3) ; d'ici là, chaque action est journalisée avec son auteur ;
 * 2. **il n'y a pas de route pour créer le premier administrateur**, volontairement : elle serait
 *    une porte ouverte. Le premier compte se crée avec `scripts/create-admin.ts`, en accès direct
 *    à la base.
 */

const ROLES_AGENCE = ["coordinateur", "responsable_agence", "administrateur"] as const;

const adresseSchema = z.strictObject({
  line1: z.string().min(1).max(120),
  line2: z.string().max(120).optional(),
  postalCode: z.string().regex(/^\d{5}$/),
  city: z.string().min(1).max(80),
  accessNote: z.string().max(200).optional(),
});

const identifiantSchema = z
  .strictObject({
    email: z.email().optional(),
    phone: z
      .string()
      .regex(/^\+33[1-9]\d{8}$/)
      .optional(),
    displayName: z.string().min(1).max(80),
  })
  .refine((body) => Boolean(body.email ?? body.phone), {
    error: "une adresse e-mail ou un numéro",
  });

export function adminSurface(deps: ApiDeps) {
  const app = new Hono<AppEnv>();

  /** Le rôle d'agence de l'auteur de la requête, pour le journal. */
  async function actor(context: Context<AppEnv>) {
    const member = context.get("member");
    const memberships = await deps.repositories.memberships.listByMember(member._id);
    const agence = memberships.find(
      (membership) =>
        membership.status === "actif" &&
        (ROLES_AGENCE as readonly string[]).includes(membership.role),
    );
    return { memberId: member._id, role: agence?.role ?? "administrateur" };
  }

  /** Journalise une action d'agence qui ne porte sur aucun module (`ADMIN_SCOPE`). */
  async function trace(
    context: Context<AppEnv>,
    input: { action: "creer" | "modifier"; householdId: string | null; target: string },
  ) {
    const { memberId, role } = await actor(context);
    await deps.journal.append(
      auditEventSchema.parse({
        at: deps.now(),
        actorId: memberId,
        actorRole: role,
        householdId: input.householdId,
        action: input.action,
        module: ADMIN_SCOPE,
        target: input.target,
        outcome: "autorise",
        reason: null,
        requestId: context.get("requestId") ?? null,
      }),
    );
  }

  app.post("/households", async (context) => {
    const body = await parseBody(
      context,
      z.strictObject({
        code: z.string().regex(/^[A-Z0-9-]{4,16}$/),
        agencyId: z.string().regex(/^[0-9a-f]{24}$/),
        mode: z.enum(householdModes),
        address: adresseSchema,
      }),
    );
    if (!body.ok) return body.response;

    const existant = await deps.repositories.households.findByCode(body.value.code);
    if (existant) return fail(context, "requete_invalide", "code (déjà utilisé)");

    const household = {
      _id: deps.newId(),
      code: body.value.code,
      agencyId: body.value.agencyId,
      status: "actif" as const,
      mode: body.value.mode,
      address: body.value.address,
      frozenAt: null,
      createdAt: deps.now(),
    };
    await deps.repositories.households.insert(household);
    await trace(context, { action: "creer", householdId: household._id, target: "foyer" });

    return context.json({ id: household._id, code: household.code }, 201);
  });

  app.post("/workers", async (context) => {
    const body = await parseBody(
      context,
      identifiantSchema.and(
        z.object({
          agencyId: z.string().regex(/^[0-9a-f]{24}$/),
          firstName: z.string().min(1).max(40),
          lastInitial: z.string().length(1),
          qualifications: z.array(z.string().max(80)).optional(),
          languages: z.array(z.string().max(40)).optional(),
          photoConsent: z.boolean().optional(),
        }),
      ),
    );
    if (!body.ok) return body.response;

    const member = await trouverOuCreerMembre(body.value);
    const worker = {
      // Une personne, une identité : l'intervenant porte l'identifiant de son compte.
      _id: member._id,
      agencyId: body.value.agencyId,
      firstName: body.value.firstName,
      lastInitial: body.value.lastInitial,
      senioritySince: null,
      qualifications: body.value.qualifications ?? [],
      languages: body.value.languages ?? [],
      // La photo n'apparaît qu'avec un accord écrit : par défaut, non.
      photoConsent: body.value.photoConsent ?? false,
      photoId: null,
      createdAt: deps.now(),
    };
    await deps.repositories.workers.insert(worker);
    await trace(context, { action: "creer", householdId: null, target: "intervenant" });

    return context.json({ id: worker._id }, 201);
  });

  app.post("/memberships", async (context) => {
    const body = await parseBody(
      context,
      z.object({
        householdId: z.string().regex(/^[0-9a-f]{24}$/),
        role: z.enum([...CLIENT_ROLES, ...STAFF_ROLES]),
        member: identifiantSchema,
      }),
    );
    if (!body.ok) return body.response;

    const household = await deps.repositories.households.findById(body.value.householdId);
    if (!household) return notFound(context);

    const member = await trouverOuCreerMembre(body.value.member);
    const existant = await deps.repositories.memberships.find(member._id, household._id);
    if (existant) return fail(context, "requete_invalide", "member (déjà rattaché)");

    const acteur = await actor(context);
    const now = deps.now();
    await deps.repositories.memberships.insert({
      _id: deps.newId(),
      memberId: member._id,
      householdId: household._id,
      role: body.value.role,
      // Invité, pas actif : le rattachement s'active quand la personne se connecte.
      status: "invite",
      invitedBy: acteur.memberId,
      activatedAt: null,
      revokedAt: null,
      createdAt: now,
    });

    // Les droits posés d'office sont les « ✓ » de la matrice, et eux seuls. Les « ○ » attendent
    // une décision du bénéficiaire ou de son représentant : l'agence ne les pose pas à sa place.
    const grants: AccessGrant[] = defaultGrants(body.value.role).map((entry) =>
      accessGrantSchema.parse({
        _id: deps.newId(),
        memberId: member._id,
        householdId: household._id,
        module: entry.module,
        actions: entry.actions,
        grantedBy: acteur.memberId,
        reason: "droits par défaut du rôle",
        startsAt: now,
        endsAt: null,
        revokedAt: null,
        createdAt: now,
      }),
    );
    await deps.repositories.grants.insertMany(grants);
    await trace(context, {
      action: "creer",
      householdId: household._id,
      target: `rattachement:${body.value.role}`,
    });

    return context.json({ memberId: member._id, droits: grants.length }, 201);
  });

  app.delete("/grants/:id", async (context) => {
    const body = await parseBody(
      context,
      z.strictObject({ householdId: z.string().regex(/^[0-9a-f]{24}$/) }),
    );
    if (!body.ok) return body.response;

    await deps.repositories.grants.revoke(context.req.param("id"), deps.now());
    // Le retrait est immédiat : aucun droit ne voyage dans un jeton (`auth/sessions.ts`).
    await trace(context, {
      action: "modifier",
      householdId: body.value.householdId,
      target: `retrait_droit:${context.req.param("id")}`,
    });
    return context.body(null, 204);
  });

  app.post("/visits", async (context) => {
    const body = await parseBody(
      context,
      z.strictObject({
        householdId: z.string().regex(/^[0-9a-f]{24}$/),
        workerId: z.string().regex(/^[0-9a-f]{24}$/),
        plannedStart: z.coerce.date(),
        plannedEnd: z.coerce.date(),
        kind: z.enum(visitKinds),
      }),
    );
    if (!body.ok) return body.response;
    if (body.value.plannedEnd.getTime() <= body.value.plannedStart.getTime()) {
      return fail(context, "requete_invalide", "plannedEnd");
    }

    const [household, worker] = await Promise.all([
      deps.repositories.households.findById(body.value.householdId),
      deps.repositories.workers.findById(body.value.workerId),
    ]);
    if (!household) return notFound(context);
    if (!worker) return fail(context, "requete_invalide", "workerId");
    if (household.status !== "actif")
      return fail(context, "requete_invalide", "householdId (gelé)");

    const visit = {
      _id: deps.newId(),
      householdId: household._id,
      workerId: worker._id,
      plannedStart: body.value.plannedStart,
      plannedEnd: body.value.plannedEnd,
      kind: body.value.kind,
      status: "prevue" as const,
      replaces: null,
      createdAt: deps.now(),
    };
    await deps.repositories.visits.insert(visit);
    await trace(context, { action: "creer", householdId: household._id, target: "visite" });

    return context.json({ id: visit._id }, 201);
  });

  async function trouverOuCreerMembre(input: {
    email?: string;
    phone?: string;
    displayName: string;
  }) {
    const existant = await deps.repositories.members.findByIdentifier({
      email: input.email,
      phone: input.phone,
    });
    if (existant) return existant;
    const member = {
      _id: deps.newId(),
      email: input.email ?? null,
      phone: input.phone ?? null,
      displayName: input.displayName,
      prefs: { displayMode: "complet" as const, notifications: ["email" as const] },
      createdAt: deps.now(),
    };
    await deps.repositories.members.insert(member);
    return member;
  }

  return app;
}

export { ROLES_AGENCE };
