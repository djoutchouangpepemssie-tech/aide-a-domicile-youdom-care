import type { Context } from "hono";
import { ADMIN_SCOPE } from "../domaine/modules";
import { auditEventSchema } from "../domaine/schemas";
import type { ApiDeps, AppEnv } from "./types";

/** Les rôles d'agence : ils ouvrent `/admin/v1` et apparaissent dans le journal. */
export const ROLES_AGENCE = ["coordinateur", "responsable_agence", "administrateur"] as const;

/** Le rôle d'agence de l'auteur de la requête. */
export async function actorRole(deps: ApiDeps, context: Context<AppEnv>) {
  const member = context.get("member");
  const memberships = await deps.repositories.memberships.listByMember(member._id);
  const agence = memberships.find(
    (membership) =>
      membership.status === "actif" &&
      (ROLES_AGENCE as readonly string[]).includes(membership.role),
  );
  return { memberId: member._id, role: agence?.role ?? "administrateur" };
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
  const { memberId, role } = await actorRole(deps, context);
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
