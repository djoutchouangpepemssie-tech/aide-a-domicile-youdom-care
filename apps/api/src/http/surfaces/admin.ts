import { Hono } from "hono";
import * as z from "zod";
import { CLIENT_ROLES, STAFF_ROLES, defaultGrants } from "../../domaine/roles";
import {
  accessGrantSchema,
  householdModes,
  visitKinds,
  type AccessGrant,
} from "../../domaine/schemas";
import { parseBody } from "../body";
import { couvre, traceAdmin } from "../trace";
import { fail, notFound } from "../errors";
import type { ApiDeps, AppEnv } from "../types";

/*
 * `/admin/v1` — le back-office de l'agence. Le strict nécessaire pour que la coordination quitte
 * Word : créer un foyer, enregistrer un intervenant, rattacher un membre avec ses droits par
 * défaut, poser une visite et l'affecter.
 *
 * Deux choses que je signale plutôt que de les laisser découvrir :
 *
 * 1. **la portée par agence est en place depuis MY-14** : un compte n'agit que sur les agences de
 *    ses rattachements, jamais sur celle qu'il nomme dans sa requête (`trace.ts`). Hors portée,
 *    la réponse est 404 — aucun refus ne dit « ça existe, mais pas pour vous » ;
 * 2. **il n'y a pas de route pour créer le premier administrateur**, volontairement : elle serait
 *    une porte ouverte. Le premier compte se crée avec `scripts/create-admin.ts`, en accès direct
 *    à la base.
 */

const idParam = z.string().regex(/^[0-9a-f]{24}$/);

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

    // Un compte d'agence n'agit que sur son agence : la portée vient de ses rattachements, pas
    // de ce qu'il écrit dans sa requête (`trace.ts`).
    if (!couvre(context.get("acteur"), body.value.agencyId)) return notFound(context);

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
    await traceAdmin(deps, context, {
      action: "creer",
      householdId: household._id,
      target: "foyer",
    });

    return context.json({ id: household._id, code: household.code }, 201);
  });

  /*
   * Les foyers d'une agence. Le foyer technique de l'agence — celui par lequel les salariés
   * tiennent leur portée — est marqué `technique` : c'est un foyer comme un autre dans le modèle,
   * et l'écran n'a aucune raison de le présenter comme un foyer accompagné.
   */
  app.get("/households", async (context) => {
    const agencyId = context.req.query("agencyId") ?? "";
    if (!idParam.safeParse(agencyId).success) return notFound(context);
    const acteur = context.get("acteur");
    if (!couvre(acteur, agencyId)) return notFound(context);

    const foyers = await deps.repositories.households.listByAgency(agencyId);
    return context.json({
      foyers: foyers
        .map((foyer) => ({
          id: foyer._id,
          code: foyer.code,
          mode: foyer.mode,
          statut: foyer.status,
          ville: foyer.address.city,
          codePostal: foyer.address.postalCode,
          gele: Boolean(foyer.frozenAt),
          technique: acteur.staffHouseholds.includes(foyer._id),
        }))
        .sort((a, b) => a.code.localeCompare(b.code, "fr")),
    });
  });

  /*
   * Un foyer : son identité, qui en fait partie, et **ce que chacun peut réellement voir**.
   *
   * Les droits affichés sont les droits effectifs du moment — révoqués et expirés exclus. Un écran
   * qui montrerait le rôle sans les droits mentirait : dans ce modèle, le rôle ne décide de rien,
   * c'est le droit qui ouvre (`PERMISSIONS.md` §7).
   *
   * Les mesures de protection juridique sont là parce que la coordination en a besoin pour savoir
   * qui peut consentir et signer. Ce sont des faits d'état civil, pas des données de santé : le
   * contenu des consignes d'accès et tout ce qui touche à la santé reste hors de cette réponse.
   */
  app.get("/households/:id", async (context) => {
    const householdId = context.req.param("id");
    if (!idParam.safeParse(householdId).success) return notFound(context);
    const foyer = await deps.repositories.households.findById(householdId);
    if (!foyer || !couvre(context.get("acteur"), foyer.agencyId)) return notFound(context);

    const [rattachements, droits, protections] = await Promise.all([
      deps.repositories.memberships.listByHousehold(householdId),
      deps.repositories.grants.listByHousehold(householdId),
      deps.repositories.protections.listByHousehold(householdId),
    ]);
    const maintenant = deps.now();
    const actif = (droit: AccessGrant) =>
      !droit.revokedAt &&
      droit.startsAt <= maintenant &&
      (!droit.endsAt || droit.endsAt > maintenant);

    const membres = await Promise.all(
      rattachements.map(async (rattachement) => {
        const membre = await deps.repositories.members.findById(rattachement.memberId);
        return {
          id: rattachement.memberId,
          nom: membre?.displayName ?? null,
          role: rattachement.role,
          statut: rattachement.status,
          droits: droits
            .filter((droit) => droit.memberId === rattachement.memberId && actif(droit))
            .map((droit) => ({ id: droit._id, module: droit.module, actions: droit.actions }))
            .sort((a, b) => a.module.localeCompare(b.module, "fr")),
        };
      }),
    );

    return context.json({
      foyer: {
        id: foyer._id,
        code: foyer.code,
        agencyId: foyer.agencyId,
        mode: foyer.mode,
        statut: foyer.status,
        gele: Boolean(foyer.frozenAt),
        adresse: {
          ligne1: foyer.address.line1,
          ligne2: foyer.address.line2 ?? null,
          codePostal: foyer.address.postalCode,
          ville: foyer.address.city,
        },
      },
      membres: membres.sort((a, b) => (a.nom ?? "").localeCompare(b.nom ?? "", "fr")),
      protections: protections.map((protection) => ({
        memberId: protection.memberId,
        type: protection.type,
        portee: protection.scope,
        representation: protection.representation,
        verifiee: Boolean(protection.verifiedAt),
      })),
    });
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

    if (!couvre(context.get("acteur"), body.value.agencyId)) return notFound(context);

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
    await traceAdmin(deps, context, { action: "creer", householdId: null, target: "intervenant" });

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
    if (!household || !couvre(context.get("acteur"), household.agencyId)) return notFound(context);

    const member = await trouverOuCreerMembre(body.value.member);
    const existant = await deps.repositories.memberships.find(member._id, household._id);
    if (existant) return fail(context, "requete_invalide", "member (déjà rattaché)");

    const acteur = context.get("acteur");
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
    await traceAdmin(deps, context, {
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

    const foyerDuDroit = await deps.repositories.households.findById(body.value.householdId);
    if (!foyerDuDroit || !couvre(context.get("acteur"), foyerDuDroit.agencyId)) {
      return notFound(context);
    }

    await deps.repositories.grants.revoke(context.req.param("id"), deps.now());
    // Le retrait est immédiat : aucun droit ne voyage dans un jeton (`auth/sessions.ts`).
    await traceAdmin(deps, context, {
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
    await traceAdmin(deps, context, {
      action: "creer",
      householdId: household._id,
      target: "visite",
    });

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
