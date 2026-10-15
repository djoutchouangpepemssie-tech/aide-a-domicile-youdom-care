import type { AuthorizationContext } from "../droits/authorize";
import type {
  AccessGrant,
  Household,
  LegalProtection,
  Membership,
  Visit,
} from "../domaine/schemas";

/*
 * La lecture dont le moteur d'autorisation a besoin, derrière une interface. Deux raisons, et
 * aucune n'est l'élégance :
 *
 * 1. le moteur se teste sans base : une erreur de droits doit être attrapée par un test unitaire
 *    rapide, pas par un parcours qui met trente secondes à démarrer ;
 * 2. l'hébergeur certifié HDS de l'API n'est pas encore choisi (question A). L'interface laisse
 *    ce choix ouvert sans rien réécrire du cœur.
 */

export type ContextQuery = {
  memberId: string;
  householdId: string;
  now: Date;
  /** `true` seulement pour `acces_logement` : inutile de charger les visites autrement. */
  withAssignedVisits?: boolean;
};

export type LoadedContext = Pick<
  AuthorizationContext,
  "household" | "membership" | "grants" | "protections" | "assignedVisits"
>;

export interface AuthorizationStore {
  loadContext(query: ContextQuery): Promise<LoadedContext>;
}

export type MemorySeed = {
  households?: readonly Household[];
  memberships?: readonly Membership[];
  grants?: readonly AccessGrant[];
  protections?: readonly LegalProtection[];
  visits?: readonly Visit[];
};

/** Mise en œuvre en mémoire : tests, et développement local avant la base. */
export class MemoryAuthorizationStore implements AuthorizationStore {
  constructor(private readonly seed: MemorySeed) {}

  async loadContext(query: ContextQuery): Promise<LoadedContext> {
    const household = this.seed.households?.find((item) => item._id === query.householdId) ?? null;
    const membership =
      this.seed.memberships?.find(
        (item) => item.memberId === query.memberId && item.householdId === query.householdId,
      ) ?? null;
    const grants = (this.seed.grants ?? []).filter(
      (grant) => grant.memberId === query.memberId && grant.householdId === query.householdId,
    );
    const protections = (this.seed.protections ?? []).filter(
      (protection) => protection.householdId === query.householdId,
    );
    const assignedVisits = query.withAssignedVisits
      ? (this.seed.visits ?? []).filter(
          (visit) => visit.householdId === query.householdId && visit.workerId === query.memberId,
        )
      : undefined;

    return {
      household: household ? { _id: household._id, status: household.status } : null,
      membership,
      grants,
      protections,
      assignedVisits,
    };
  }
}
