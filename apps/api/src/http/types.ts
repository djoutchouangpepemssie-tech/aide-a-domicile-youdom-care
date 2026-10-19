import type { AuditJournal } from "../audit/journal";
import type { Session } from "../auth/sessions";
import type { AuditEvent, Member } from "../domaine/schemas";
import type { Notifier } from "../services/notifier";
import type { RateLimiter } from "../services/rate-limit";
import type { AuthorizationStore } from "../store/authorization-store";
import type { Repositories } from "../store/repositories";

/** Lecture du journal, pour l'écran « Qui a consulté mon dossier ? » (parcours critique n° 4). */
export interface AuditReader {
  listByHousehold(householdId: string, limit: number): Promise<AuditEvent[]>;
}

export type ApiDeps = {
  repositories: Repositories;
  authorization: AuthorizationStore;
  journal: AuditJournal;
  auditReader: AuditReader;
  notifier: Notifier;
  rateLimiter: RateLimiter;
  /** L'horloge est une dépendance : un test ne doit pas attendre qu'une heure passe. */
  now: () => Date;
  newId: () => string;
  pepper: string;
  allowedOrigins: readonly string[];
};

export type Variables = {
  requestId: string;
  member: Member;
  session: Session;
  secondFactorPresented: boolean;
};

export type AppEnv = { Variables: Variables };
