import { newId } from "../domaine/ids";
import type { Action, ModuleKey } from "../domaine/modules";
import type { Role } from "../domaine/roles";
import type {
  AccessGrant,
  Household,
  LegalProtection,
  Membership,
  Visit,
} from "../domaine/schemas";

/** Jeux d'essai du socle. Un seul endroit à corriger quand un schéma bouge. */

export const NOW = new Date("2026-10-15T10:00:00.000Z");

export function household(overrides: Partial<Household> = {}): Household {
  return {
    _id: newId(),
    code: "FOY-0001",
    agencyId: newId(),
    status: "actif",
    mode: "prestataire",
    address: { line1: "12 rue des Lilas", postalCode: "75011", city: "Paris" },
    frozenAt: null,
    createdAt: NOW,
    ...overrides,
  };
}

export function membership(
  input: { memberId: string; householdId: string; role: Role } & Partial<Membership>,
): Membership {
  return {
    _id: newId(),
    status: "actif",
    invitedBy: null,
    activatedAt: NOW,
    revokedAt: null,
    createdAt: NOW,
    ...input,
  };
}

export function grant(
  input: {
    memberId: string;
    householdId: string;
    module: ModuleKey;
    actions: Action[];
  } & Partial<AccessGrant>,
): AccessGrant {
  return {
    _id: newId(),
    grantedBy: newId(),
    reason: null,
    startsAt: new Date(NOW.getTime() - 86_400_000),
    endsAt: null,
    revokedAt: null,
    createdAt: NOW,
    ...input,
  };
}

export function protection(
  input: { householdId: string; memberId: string } & Partial<LegalProtection>,
): LegalProtection {
  return {
    _id: newId(),
    type: "tutelle",
    scope: ["personne"],
    representation: "representation",
    documentId: null,
    verifiedBy: newId(),
    verifiedAt: NOW,
    endsAt: null,
    createdAt: NOW,
    ...input,
  };
}

export function visit(input: { householdId: string; workerId: string } & Partial<Visit>): Visit {
  return {
    _id: newId(),
    plannedStart: new Date(NOW.getTime() - 15 * 60_000),
    plannedEnd: new Date(NOW.getTime() + 45 * 60_000),
    kind: "jour",
    status: "en_cours",
    replaces: null,
    createdAt: NOW,
    ...input,
  };
}
