import type { Challenge } from "../auth/challenges";
import type { Session } from "../auth/sessions";
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
import {
  auditEventSchema,
  householdSchema,
  memberSchema,
  membershipSchema,
  accessGrantSchema,
  visitEventSchema,
  visitSchema,
  workerSchema,
} from "../domaine/schemas";
import type { AuditEvent } from "../domaine/schemas";
import type { AuditJournal } from "../audit/journal";
import type { AuditReader } from "../http/types";
import { absenceSchema, type Absence } from "../domaine/absences";
import { workerPreferenceSchema, type WorkerPreference } from "../domaine/preferences";
import { agencyRulesSchema, type AgencyRules } from "../domaine/regles";
import {
  prestationSchema,
  tariffSettingsSchema,
  type Prestation,
  type TariffSettings,
} from "../domaine/tarifs";
import { serieSchema, type Serie } from "../planning/serie";
import type { Repositories } from "./repositories";

/*
 * Les dépôts en mémoire. Ils servent aux tests de bout en bout des routes — et ils valident
 * chaque écriture avec le même schéma Zod que la base, pour qu'un test qui passe ici ne cache pas
 * une écriture que MongoDB refuserait.
 */

type Tables = {
  series: Serie[];
  rules: AgencyRules[];
  prestations: Prestation[];
  tariffSettings: TariffSettings[];
  absences: Absence[];
  workerPreferences: WorkerPreference[];
  members: Member[];
  households: Household[];
  memberships: Membership[];
  grants: AccessGrant[];
  protections: LegalProtection[];
  workers: Worker[];
  visits: Visit[];
  visitEvents: VisitEvent[];
  sessions: Session[];
  challenges: Challenge[];
  auditLogs: AuditEvent[];
};

const overlaps = (visit: Visit, from: Date, to: Date): boolean =>
  visit.plannedStart.getTime() < to.getTime() && visit.plannedEnd.getTime() > from.getTime();

export class MemoryDatabase {
  readonly tables: Tables = {
    series: [],
    rules: [],
    prestations: [],
    tariffSettings: [],
    absences: [],
    workerPreferences: [],
    members: [],
    households: [],
    memberships: [],
    grants: [],
    protections: [],
    workers: [],
    visits: [],
    visitEvents: [],
    sessions: [],
    challenges: [],
    auditLogs: [],
  };

  readonly journal: AuditJournal = {
    append: async (event) => {
      this.tables.auditLogs.push(auditEventSchema.parse(event));
    },
  };

  /** Lecture du journal pour l'écran « Qui a consulté mon dossier ? ». */
  get auditReader(): AuditReader {
    return {
      listByHousehold: async (householdId, limit) =>
        this.tables.auditLogs
          .filter((event) => event.householdId === householdId)
          .slice(-limit)
          .reverse(),
    };
  }

  get repositories(): Repositories {
    const t = this.tables;
    return {
      members: {
        findById: async (id) => t.members.find((member) => member._id === id) ?? null,
        findByIdentifier: async ({ email, phone }) =>
          t.members.find(
            (member) => (email && member.email === email) || (phone && member.phone === phone),
          ) ?? null,
        insert: async (member) => void t.members.push(memberSchema.parse(member)),
      },
      households: {
        findById: async (id) => t.households.find((item) => item._id === id) ?? null,
        findByCode: async (code) => t.households.find((item) => item.code === code) ?? null,
        listByAgency: async (agencyId) => t.households.filter((item) => item.agencyId === agencyId),
        insert: async (household) => void t.households.push(householdSchema.parse(household)),
      },
      memberships: {
        find: async (memberId, householdId) =>
          t.memberships.find(
            (item) => item.memberId === memberId && item.householdId === householdId,
          ) ?? null,
        listByMember: async (memberId) =>
          t.memberships.filter((item) => item.memberId === memberId),
        listByHousehold: async (householdId) =>
          t.memberships.filter((item) => item.householdId === householdId),
        insert: async (membership) => void t.memberships.push(membershipSchema.parse(membership)),
      },
      grants: {
        listFor: async (memberId, householdId) =>
          t.grants.filter(
            (grant) => grant.memberId === memberId && grant.householdId === householdId,
          ),
        listByHousehold: async (householdId) =>
          t.grants.filter((grant) => grant.householdId === householdId),
        insertMany: async (grants) => {
          for (const grant of grants) t.grants.push(accessGrantSchema.parse(grant));
        },
        revoke: async (id, at) => {
          const grant = t.grants.find((item) => item._id === id);
          if (grant) grant.revokedAt = at;
        },
        extend: async (id, endsAt) => {
          const grant = t.grants.find((item) => item._id === id);
          if (grant) grant.endsAt = endsAt;
        },
      },
      protections: {
        listByHousehold: async (householdId) =>
          t.protections.filter((item) => item.householdId === householdId),
      },
      workers: {
        findById: async (id) => t.workers.find((worker) => worker._id === id) ?? null,
        listByAgency: async (agencyId) =>
          t.workers.filter((worker) => worker.agencyId === agencyId),
        insert: async (worker) => void t.workers.push(workerSchema.parse(worker)),
      },
      visits: {
        findById: async (id) => t.visits.find((visit) => visit._id === id) ?? null,
        listByHousehold: async (householdId, from, to) =>
          t.visits.filter(
            (visit) => visit.householdId === householdId && overlaps(visit, from, to),
          ),
        listByWorker: async (workerId, from, to) =>
          t.visits.filter((visit) => visit.workerId === workerId && overlaps(visit, from, to)),
        listAssigned: async (householdId, workerId, around) =>
          t.visits.filter(
            (visit) =>
              visit.householdId === householdId &&
              visit.workerId === workerId &&
              overlaps(
                visit,
                new Date(around.getTime() - 86_400_000),
                new Date(around.getTime() + 86_400_000),
              ),
          ),
        listBySeries: async (serieIds, from, to) =>
          t.visits.filter(
            (visit) =>
              visit.serieId !== null &&
              visit.serieId !== undefined &&
              serieIds.includes(visit.serieId) &&
              (visit.occurrenceDate ?? "") >= from &&
              (visit.occurrenceDate ?? "") <= to,
          ),
        insert: async (visit) => void t.visits.push(visitSchema.parse(visit)),
        save: async (visit) => {
          const index = t.visits.findIndex((item) => item._id === visit._id);
          if (index >= 0) t.visits[index] = visitSchema.parse(visit);
        },
      },
      visitEvents: {
        append: async (event) => void t.visitEvents.push(visitEventSchema.parse(event)),
        listByVisit: async (visitId) => t.visitEvents.filter((event) => event.visitId === visitId),
      },
      sessions: {
        findByFingerprint: async (fingerprint) =>
          t.sessions.find((session) => session.tokenFingerprint === fingerprint) ?? null,
        findById: async (id) => t.sessions.find((session) => session._id === id) ?? null,
        listByMember: async (memberId) =>
          t.sessions.filter((session) => session.memberId === memberId),
        insert: async (session) => void t.sessions.push(session),
        save: async (session) => {
          const index = t.sessions.findIndex((item) => item._id === session._id);
          if (index >= 0) t.sessions[index] = session;
        },
      },
      series: {
        findById: async (id) => t.series.find((serie) => serie._id === id) ?? null,
        listByHousehold: async (householdId) =>
          t.series.filter((serie) => serie.householdId === householdId),
        listByAgency: async (agencyId, status) =>
          t.series.filter(
            (serie) => serie.agencyId === agencyId && (!status || serie.status === status),
          ),
        insert: async (serie) => void t.series.push(serieSchema.parse(serie)),
        save: async (serie) => {
          const index = t.series.findIndex((item) => item._id === serie._id);
          if (index >= 0) t.series[index] = serieSchema.parse(serie);
        },
      },
      rules: {
        current: async (agencyId) =>
          t.rules
            .filter((rules) => rules.agencyId === agencyId)
            .sort((a, b) => b.version - a.version)[0] ?? null,
        insert: async (rules) => void t.rules.push(agencyRulesSchema.parse(rules)),
      },
      prestations: {
        listByAgency: async (agencyId) =>
          t.prestations
            .filter((prestation) => prestation.agencyId === agencyId)
            .sort((a, b) => b.from.localeCompare(a.from)),
        insert: async (prestation) => void t.prestations.push(prestationSchema.parse(prestation)),
        close: async (id, to) => {
          const index = t.prestations.findIndex((prestation) => prestation._id === id);
          if (index >= 0)
            t.prestations[index] = prestationSchema.parse({ ...t.prestations[index], to });
        },
      },
      tariffSettings: {
        find: async (agencyId) =>
          t.tariffSettings.find((item) => item.agencyId === agencyId) ?? null,
        upsert: async (settings) => {
          const index = t.tariffSettings.findIndex((item) => item.agencyId === settings.agencyId);
          const valide = tariffSettingsSchema.parse(settings);
          if (index >= 0) t.tariffSettings[index] = valide;
          else t.tariffSettings.push(valide);
        },
      },
      absences: {
        listByWorker: async (workerId, from, to) =>
          t.absences.filter(
            (absence) =>
              absence.workerId === workerId &&
              absence.from.getTime() < to.getTime() &&
              absence.to.getTime() > from.getTime(),
          ),
        insert: async (absence) => void t.absences.push(absenceSchema.parse(absence)),
      },
      workerPreferences: {
        listByHousehold: async (householdId) =>
          t.workerPreferences.filter((preference) => preference.householdId === householdId),
        upsert: async (preference) => {
          const valide = workerPreferenceSchema.parse(preference);
          const index = t.workerPreferences.findIndex(
            (item) => item.householdId === valide.householdId && item.workerId === valide.workerId,
          );
          if (index >= 0) t.workerPreferences[index] = valide;
          else t.workerPreferences.push(valide);
        },
      },
      challenges: {
        findById: async (id) => t.challenges.find((challenge) => challenge._id === id) ?? null,
        insert: async (challenge) => void t.challenges.push(challenge),
        save: async (challenge) => {
          const index = t.challenges.findIndex((item) => item._id === challenge._id);
          if (index >= 0) t.challenges[index] = challenge;
        },
      },
    };
  }
}
