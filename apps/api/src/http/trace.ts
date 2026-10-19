import type { Context, MiddlewareHandler } from "hono";
import { ADMIN_SCOPE } from "../domaine/modules";
import { auditEventSchema } from "../domaine/schemas";
import type { ApiDeps, AppEnv } from "./types";

/** Les rôles d'agence : ils ouvrent `/admin/v1` et apparaissent dans le journal. */
export const ROLES_AGENCE = ["coordinateur", "responsable_agence", "administrateur"] as const;

/**
 * L'auteur de la requête, son rôle d'agence, et **les agences qu'il couvre**.
 *
 * La portée vient de ses rattachements : un compte d'agence est rattaché au foyer technique de son
 * agence, et c'est de ce foyer qu'on lit `agencyId`. Rien n'est déclaré dans le jeton — un jeton
 * ne porte aucun droit (`auth/sessions.ts`), et une portée inscrite dans un jeton survivrait à sa
 * révocation.
 *
 * Conséquence voulue : un coordinateur de l'agence A ne peut plus agir sur l'agence B en la
 * nommant dans sa requête. Avant cette version il pouvait — chaque action était journalisée, mais
 * rien ne l'arrêtait. Un responsable de deux agences a deux rattachements, et couvre les deux.
 */
export async function actorRole(deps: ApiDeps, context: Context<AppEnv>) {
  const member = context.get("member");
  const memberships = await deps.repositories.memberships.listByMember(member._id);
  const staff = memberships.filter(
    (membership) =>
      membership.status === "actif" &&
      (ROLES_AGENCE as readonly string[]).includes(membership.role),
  );
  const agencies = new Set<string>();
  for (const membership of staff) {
    const household = await deps.repositories.households.findById(membership.householdId);
    if (household) agencies.add(household.agencyId);
  }
  return {
    memberId: member._id,
    role: staff[0]?.role ?? "administrateur",
    agencies: [...agencies],
    /*
     * Les foyers par lesquels l'auteur tient sa portée : les « foyers techniques » d'agence, où les
     * salariés sont rattachés. Ce sont des foyers comme les autres dans le modèle — c'est leur
     * rattachement qui les distingue, pas un champ. Les exposer ici évite à l'écran des foyers de
     * présenter l'agence elle-même comme un foyer accompagné.
     */
    staffHouseholds: staff.map((membership) => membership.householdId),
  };
}

export type Actor = Awaited<ReturnType<typeof actorRole>>;

/** L'auteur couvre-t-il cette agence ? Un refus répond 404, comme tout refus d'autorisation. */
export function couvre(actor: Actor, agencyId: string): boolean {
  return actor.agencies.includes(agencyId);
}

/**
 * Charge l'auteur une fois par requête et le range dans le contexte : les routes du back-office
 * n'ont alors plus à le relire, et surtout elles ne peuvent plus oublier de le faire.
 */
export function chargerActeur(deps: ApiDeps): MiddlewareHandler<AppEnv> {
  return async (context, next) => {
    context.set("acteur", await actorRole(deps, context));
    await next();
  };
}

/**
 * Journalise une action d'agence. Aucune route du back-office n'écrit sans passer par là : une
 * modification de planning sans auteur ni horodatage n'est pas une modification, c'est une rumeur.
 */
export async function traceAdmin(
  deps: ApiDeps,
  context: Context<AppEnv>,
  input: { action: "creer" | "modifier"; householdId: string | null; target: string },
): Promise<void> {
  const { memberId, role } = context.get("acteur") ?? (await actorRole(deps, context));
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
