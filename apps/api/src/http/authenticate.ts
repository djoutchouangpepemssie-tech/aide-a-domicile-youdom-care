import type { MiddlewareHandler } from "hono";
import { fingerprint } from "../auth/secrets";
import { verifySession } from "../auth/sessions";
import { isStaffRole, type Role } from "../domaine/roles";
import { fail, notFound } from "./errors";
import type { ApiDeps, AppEnv } from "./types";

/*
 * L'authentification, puis la **séparation des surfaces**.
 *
 * `ARCHITECTURE.md` §5, principe 1 : ce qu'un intervenant peut appeler, une famille ne le peut
 * pas, et réciproquement. Un seul jeu de routes « parce que c'est plus simple » finit toujours par
 * exposer ce qu'il ne faut pas. La vérification est donc faite à l'entrée de chaque surface, en
 * plus de l'autorisation par foyer et par module qui suit sur chaque route.
 */

export function authenticate(deps: ApiDeps): MiddlewareHandler<AppEnv> {
  return async (context, next) => {
    const header = context.req.header("authorization") ?? "";
    const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
    if (!token) return fail(context, "non_authentifie");

    const session = await deps.repositories.sessions.findByFingerprint(
      fingerprint(token, deps.pepper),
    );
    if (!session) return fail(context, "non_authentifie");

    const verdict = verifySession(session, token, deps.now(), deps.pepper);
    if (!verdict.ok) return fail(context, "non_authentifie");

    const member = await deps.repositories.members.findById(session.memberId);
    if (!member) return fail(context, "non_authentifie");

    // La dernière activité est rafraîchie à chaque appel : c'est elle qui ferme une session
    // oubliée sur un ordinateur partagé.
    await deps.repositories.sessions.save(verdict.session);

    context.set("session", verdict.session);
    context.set("member", member);
    context.set("secondFactorPresented", verdict.secondFactorPresented);
    await next();
  };
}

const CLIENT_SURFACE = "client" as const;

/**
 * Restreint une surface à une famille de rôles. Un membre qui n'a aucun rattachement du bon type
 * reçoit **404**, et non 403 : l'existence de la surface terrain ne se déduit pas d'une réponse
 * reçue par une famille.
 */
export function requireRoles(deps: ApiDeps, allowed: readonly Role[] | typeof CLIENT_SURFACE) {
  const middleware: MiddlewareHandler<AppEnv> = async (context, next) => {
    const member = context.get("member");
    const memberships = await deps.repositories.memberships.listByMember(member._id);
    const active = memberships.filter((membership) => membership.status === "actif");
    const matches =
      allowed === CLIENT_SURFACE
        ? active.some((membership) => !isStaffRole(membership.role))
        : active.some((membership) => allowed.includes(membership.role));
    if (!matches) return notFound(context);
    await next();
  };
  return middleware;
}

export { CLIENT_SURFACE };
