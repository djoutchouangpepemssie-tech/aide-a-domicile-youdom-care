import { MODULE_SENSITIVITY, type Action, type ModuleKey } from "../domaine/modules";
import { isStaffRole, protocolStance, stanceFor, type Role } from "../domaine/roles";
import type { AccessGrant, LegalProtection, Membership, Visit } from "../domaine/schemas";

/*
 * Le moteur d'autorisation. C'est le fichier le plus sensible du socle : une erreur ici n'est pas
 * un défaut d'affichage, c'est l'intimité de quelqu'un.
 *
 * Il applique, dans cet ordre, les cinq règles de `docs/portal/PERMISSIONS.md` §7, plus trois que
 * le même document impose ailleurs (gel du foyer §6, astreinte §5, protocole §4) :
 *
 *   R1 rattachement actif au foyer
 *   R2 un droit couvre le module **et** l'action
 *   R3 la date du jour est dans la fenêtre du droit
 *   R4 `acces_logement` : l'heure est dans la plage d'une visite affectée au demandeur
 *   R5 le foyer n'est pas gelé (sauf lecture autorisée après gel)
 *   R6 la matrice du rôle ne dit jamais « — » (un droit qui contredit le rôle ne vaut rien)
 *   R7 l'astreinte hors heures ouvrées a saisi un motif
 *   R8 un protocole de la fiche de vie ne se modifie pas sans validation de l'agence
 *
 * Toute décision négative renvoie `introuvable`. Jamais « interdit » : un 403 confirmerait
 * l'existence de la ressource à qui n'y a pas droit (`PERMISSIONS.md` §7).
 */

export type AuthorizationRequest = {
  memberId: string;
  householdId: string;
  module: ModuleKey;
  action: Action;
  /** Précision sur la cible, quand une règle en dépend : `protocole` pour la fiche de vie. */
  target?: "protocole" | string;
};

export type AuthorizationContext = {
  now: Date;
  /** `null` si le foyer n'existe pas : indistinguable d'un foyer auquel on n'a pas droit. */
  household: { _id: string; status: "actif" | "gele" | "archive" } | null;
  membership: Membership | null;
  grants: readonly AccessGrant[];
  /** Mesures de protection du foyer, pour la règle du représentant légal. */
  protections?: readonly LegalProtection[];
  /** Visites affectées **au demandeur** dans ce foyer. Nécessaire pour R4. */
  assignedVisits?: readonly Pick<Visit, "plannedStart" | "plannedEnd" | "status">[];
  /** Contexte d'astreinte : hors heures ouvrées, un motif est exigé (R7). */
  onCall?: { outsideOpeningHours: boolean; reason?: string | null };
  /** Le second facteur a-t-il été présenté dans cette session ? */
  secondFactorPresented?: boolean;
};

export type DenialReason =
  | "foyer_inconnu"
  | "pas_de_rattachement"
  | "rattachement_inactif"
  | "role_interdit"
  | "aucun_droit"
  | "droit_expire"
  | "droit_revoque"
  | "hors_plage_de_visite"
  | "foyer_gele"
  | "foyer_archive"
  | "motif_astreinte_absent"
  | "second_facteur_absent"
  | "protocole_sans_validation"
  | "mesure_non_verifiee";

export type Decision =
  | { allowed: true; grantId: string | null; requiresAgencyValidation?: true }
  | { allowed: false; reason: DenialReason };

/** Les lectures qui survivent au gel du foyer (`PERMISSIONS.md` §6 : factures et documents). */
const READABLE_WHEN_FROZEN: readonly ModuleKey[] = ["finances", "documents", "journal_acces"];

function grantCovers(grant: AccessGrant, request: AuthorizationRequest, now: Date): boolean {
  if (grant.module !== request.module) return false;
  if (!grant.actions.includes(request.action)) return false;
  if (grant.startsAt.getTime() > now.getTime()) return false;
  if (grant.endsAt && grant.endsAt.getTime() <= now.getTime()) return false;
  if (grant.revokedAt) return false;
  return true;
}

function withinAssignedVisit(context: AuthorizationContext): boolean {
  const now = context.now.getTime();
  return (context.assignedVisits ?? []).some((visit) => {
    if (visit.status === "annulee") return false;
    return visit.plannedStart.getTime() <= now && now <= visit.plannedEnd.getTime();
  });
}

export function authorize(request: AuthorizationRequest, context: AuthorizationContext): Decision {
  // R5a — un foyer inconnu et un foyer interdit se répondent de la même façon.
  if (!context.household || context.household._id !== request.householdId) {
    return { allowed: false, reason: "foyer_inconnu" };
  }
  if (context.household.status === "archive") {
    return { allowed: false, reason: "foyer_archive" };
  }

  // R1 — rattachement actif.
  const membership = context.membership;
  if (!membership || membership.householdId !== request.householdId) {
    return { allowed: false, reason: "pas_de_rattachement" };
  }
  if (membership.memberId !== request.memberId) {
    return { allowed: false, reason: "pas_de_rattachement" };
  }
  if (membership.status !== "actif" || membership.revokedAt) {
    return { allowed: false, reason: "rattachement_inactif" };
  }

  const role: Role = membership.role;

  // R6 — la matrice du rôle prime sur le droit en base.
  if (stanceFor(role, request.module, request.action) === "jamais") {
    return { allowed: false, reason: "role_interdit" };
  }

  // Une mesure de protection non vérifiée par un humain n'ouvre rien (`PERMISSIONS.md` §6).
  if (role === "representant_legal") {
    const verified = (context.protections ?? []).some(
      (protection) =>
        protection.memberId === request.memberId &&
        protection.householdId === request.householdId &&
        Boolean(protection.verifiedAt) &&
        (!protection.endsAt || protection.endsAt.getTime() > context.now.getTime()),
    );
    if (!verified) return { allowed: false, reason: "mesure_non_verifiee" };
  }

  // R5b — gel du foyer : les notes de santé sortent de la consultation immédiatement.
  if (context.household.status === "gele") {
    const readable = request.action === "voir" && READABLE_WHEN_FROZEN.includes(request.module);
    if (!readable) return { allowed: false, reason: "foyer_gele" };
  }

  // R7 — astreinte hors heures ouvrées : un motif, ou rien.
  if (role === "astreinte" && context.onCall?.outsideOpeningHours) {
    const reason = context.onCall.reason?.trim();
    if (!reason) return { allowed: false, reason: "motif_astreinte_absent" };
  }

  // R2 et R3 — un droit, dans sa fenêtre.
  const grant = context.grants.find((candidate) => grantCovers(candidate, request, context.now));
  if (!grant) {
    const expired = context.grants.some(
      (candidate) =>
        candidate.module === request.module &&
        candidate.actions.includes(request.action) &&
        !candidate.revokedAt,
    );
    const revoked = context.grants.some(
      (candidate) => candidate.module === request.module && Boolean(candidate.revokedAt),
    );
    if (expired) return { allowed: false, reason: "droit_expire" };
    if (revoked) return { allowed: false, reason: "droit_revoque" };
    return { allowed: false, reason: "aucun_droit" };
  }

  // Second facteur pour la santé, l'argent et l'accès au logement (`ARCHITECTURE.md` §5).
  const sensitivity = MODULE_SENSITIVITY[request.module];
  if (
    (sensitivity === "sante" || sensitivity === "financier" || sensitivity === "critique") &&
    context.secondFactorPresented === false
  ) {
    return { allowed: false, reason: "second_facteur_absent" };
  }

  // R4 — l'accès au logement d'un intervenant ne vaut que pendant sa visite.
  if (request.module === "acces_logement" && isStaffRole(role) && role === "intervenant") {
    if (!withinAssignedVisit(context)) {
      return { allowed: false, reason: "hors_plage_de_visite" };
    }
  }

  // R8 — un protocole ne se modifie pas tout seul.
  if (
    request.module === "fiche_de_vie" &&
    request.action === "modifier" &&
    request.target === "protocole"
  ) {
    const stance = protocolStance(role);
    if (stance === "jamais" || stance === "demande_seulement") {
      return { allowed: false, reason: "protocole_sans_validation" };
    }
    return { allowed: true, grantId: grant._id, requiresAgencyValidation: true };
  }

  return { allowed: true, grantId: grant._id };
}

/**
 * Le code HTTP d'une décision. Il n'y a volontairement **aucun** chemin vers 403 : un refus ne
 * confirme jamais l'existence de la ressource. Le motif part au journal d'audit, pas au client.
 */
export function httpStatusFor(decision: Decision): 200 | 404 {
  return decision.allowed ? 200 : 404;
}
