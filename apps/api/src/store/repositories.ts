import type {
  AccessGrant,
  Household,
  LegalProtection,
  Member,
  Membership,
  Visit,
  VisitEvent,
  Worker,
} from "../domaine/schemas";
import type { Challenge } from "../auth/challenges";
import type { Session } from "../auth/sessions";
import type { AuthorizationStore, ContextQuery, LoadedContext } from "./authorization-store";

/*
 * Les dépôts : la frontière entre le domaine et la base. Les routes ne connaissent que ces
 * interfaces, jamais MongoDB. Deux bénéfices concrets, pas théoriques :
 *
 * - les routes se testent entièrement en mémoire, donc vite, donc souvent ;
 * - l'hébergeur certifié de l'API n'est pas encore choisi (question A) : si la base devait
 *   changer, c'est ce dossier qui change, et lui seul.
 *
 * Aucune méthode ne modifie ni ne supprime un événement : `visit_events` et `audit_logs` n'ont
 * qu'un `append`. Ce n'est pas un oubli, c'est la règle 2 de `DATA_MODEL.md` §1.
 */

export interface MemberRepository {
  findById(id: string): Promise<Member | null>;
  findByIdentifier(identifier: { email?: string; phone?: string }): Promise<Member | null>;
  insert(member: Member): Promise<void>;
}

export interface HouseholdRepository {
  findById(id: string): Promise<Household | null>;
  findByCode(code: string): Promise<Household | null>;
  insert(household: Household): Promise<void>;
}

export interface MembershipRepository {
  find(memberId: string, householdId: string): Promise<Membership | null>;
  listByMember(memberId: string): Promise<Membership[]>;
  insert(membership: Membership): Promise<void>;
}

export interface GrantRepository {
  listFor(memberId: string, householdId: string): Promise<AccessGrant[]>;
  insertMany(grants: AccessGrant[]): Promise<void>;
  revoke(id: string, at: Date): Promise<void>;
}

export interface ProtectionRepository {
  listByHousehold(householdId: string): Promise<LegalProtection[]>;
}

export interface WorkerRepository {
  findById(id: string): Promise<Worker | null>;
  insert(worker: Worker): Promise<void>;
}

export interface VisitRepository {
  findById(id: string): Promise<Visit | null>;
  listByHousehold(householdId: string, from: Date, to: Date): Promise<Visit[]>;
  listByWorker(workerId: string, from: Date, to: Date): Promise<Visit[]>;
  listAssigned(householdId: string, workerId: string, around: Date): Promise<Visit[]>;
  insert(visit: Visit): Promise<void>;
}

export interface VisitEventRepository {
  append(event: VisitEvent): Promise<void>;
  listByVisit(visitId: string): Promise<VisitEvent[]>;
}

export interface SessionRepository {
  findByFingerprint(fingerprint: string): Promise<Session | null>;
  findById(id: string): Promise<Session | null>;
  listByMember(memberId: string): Promise<Session[]>;
  insert(session: Session): Promise<void>;
  save(session: Session): Promise<void>;
}

export interface ChallengeRepository {
  findById(id: string): Promise<Challenge | null>;
  insert(challenge: Challenge): Promise<void>;
  save(challenge: Challenge): Promise<void>;
}

export type Repositories = {
  members: MemberRepository;
  households: HouseholdRepository;
  memberships: MembershipRepository;
  grants: GrantRepository;
  protections: ProtectionRepository;
  workers: WorkerRepository;
  visits: VisitRepository;
  visitEvents: VisitEventRepository;
  sessions: SessionRepository;
  challenges: ChallengeRepository;
};

/**
 * Le contexte d'autorisation lu à travers les dépôts. C'est la mise en œuvre utilisée en service :
 * les deux autres (`MemoryAuthorizationStore`, `MongoAuthorizationStore`) servent respectivement
 * aux tests du moteur seul et à une lecture directe optimisée.
 */
export class RepositoryAuthorizationStore implements AuthorizationStore {
  constructor(private readonly repositories: Repositories) {}

  async loadContext(query: ContextQuery): Promise<LoadedContext> {
    const { households, memberships, grants, protections, visits } = this.repositories;
    const [household, membership, grantList, protectionList] = await Promise.all([
      households.findById(query.householdId),
      memberships.find(query.memberId, query.householdId),
      grants.listFor(query.memberId, query.householdId),
      protections.listByHousehold(query.householdId),
    ]);

    return {
      household: household ? { _id: household._id, status: household.status } : null,
      membership,
      grants: grantList,
      protections: protectionList,
      assignedVisits: query.withAssignedVisits
        ? await visits.listAssigned(query.householdId, query.memberId, query.now)
        : undefined,
    };
  }
}
