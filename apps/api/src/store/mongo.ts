import type { Db } from "mongodb";
import type { AuditJournal } from "../audit/journal";
import type { Challenge } from "../auth/challenges";
import type { Session } from "../auth/sessions";
import {
  auditEventSchema,
  type AccessGrant,
  type AuditEvent,
  type Household,
  type LegalProtection,
  type Member,
  type Membership,
  type Visit,
  type VisitEvent,
  type Worker,
} from "../domaine/schemas";
import type { Absence } from "../domaine/absences";
import type { WorkerPreference } from "../domaine/preferences";
import type { AgencyRules } from "../domaine/regles";
import type { Prestation, TariffSettings } from "../domaine/tarifs";
import type { Serie } from "../planning/serie";
import type { AuditReader } from "../http/types";
import type { Repositories } from "./repositories";

/*
 * Les dépôts sur MongoDB. Deux disciplines s'y voient :
 *
 * - **aucune requête sans filtre de foyer** quand la donnée en porte un : c'est la règle 3 de
 *   `DATA_MODEL.md` §1, et c'est ce qui rend impossible la fuite d'un dossier voisin par un
 *   identifiant mal recopié ;
 * - **aucun `updateOne` sur une collection en ajout seul.** `visit_events` et `audit_logs` n'ont
 *   qu'un `insertOne`. L'utilisateur applicatif de la base ne doit d'ailleurs recevoir que
 *   `insert` et `find` sur ces deux collections — à poser à la création du cluster.
 */

const dates = { ignoreUndefined: true };

export function mongoRepositories(db: Db): Repositories {
  const members = db.collection<Member>("members");
  const households = db.collection<Household>("households");
  const memberships = db.collection<Membership>("memberships");
  const grants = db.collection<AccessGrant>("access_grants");
  const protections = db.collection<LegalProtection>("legal_protections");
  const workers = db.collection<Worker>("workers");
  const visits = db.collection<Visit>("visits");
  const visitEvents = db.collection<VisitEvent>("visit_events");
  const sessions = db.collection<Session>("sessions");
  const challenges = db.collection<Challenge>("auth_challenges");
  const series = db.collection<Serie>("series");
  const rules = db.collection<AgencyRules>("agency_rules");
  const prestations = db.collection<Prestation>("prestations");
  const tariffSettings = db.collection<TariffSettings>("tariff_settings");
  const absences = db.collection<Absence>("absences");
  const workerPreferences = db.collection<WorkerPreference>("worker_preferences");

  return {
    members: {
      findById: (id) => members.findOne({ _id: id }),
      findByIdentifier: ({ email, phone }) =>
        members.findOne(email ? { email } : { phone: phone ?? null }),
      insert: async (member) => void (await members.insertOne(member, dates)),
    },
    households: {
      findById: (id) => households.findOne({ _id: id }),
      findByCode: (code) => households.findOne({ code }),
      listByAgency: (agencyId) => households.find({ agencyId }).toArray(),
      insert: async (household) => void (await households.insertOne(household, dates)),
    },
    memberships: {
      find: (memberId, householdId) => memberships.findOne({ memberId, householdId }),
      listByMember: (memberId) => memberships.find({ memberId }).toArray(),
      listByHousehold: (householdId) => memberships.find({ householdId }).toArray(),
      insert: async (membership) => void (await memberships.insertOne(membership, dates)),
    },
    grants: {
      listFor: (memberId, householdId) => grants.find({ memberId, householdId }).toArray(),
      listByHousehold: (householdId) => grants.find({ householdId }).toArray(),
      insertMany: async (list) => {
        if (list.length > 0) await grants.insertMany(list, dates);
      },
      revoke: async (id, at) =>
        void (await grants.updateOne({ _id: id }, { $set: { revokedAt: at } })),
      extend: async (id, endsAt) =>
        void (await grants.updateOne({ _id: id }, { $set: { endsAt } })),
    },
    protections: {
      listByHousehold: (householdId) => protections.find({ householdId }).toArray(),
    },
    workers: {
      findById: (id) => workers.findOne({ _id: id }),
      listByAgency: (agencyId) => workers.find({ agencyId }).toArray(),
      insert: async (worker) => void (await workers.insertOne(worker, dates)),
    },
    visits: {
      findById: (id) => visits.findOne({ _id: id }),
      listByHousehold: (householdId, from, to) =>
        visits
          .find({ householdId, plannedStart: { $lt: to }, plannedEnd: { $gt: from } })
          .sort({ plannedStart: 1 })
          .toArray(),
      listByWorker: (workerId, from, to) =>
        visits
          .find({ workerId, plannedStart: { $lt: to }, plannedEnd: { $gt: from } })
          .sort({ plannedStart: 1 })
          .toArray(),
      listAssigned: (householdId, workerId, around) =>
        visits
          .find({
            householdId,
            workerId,
            plannedStart: { $lt: new Date(around.getTime() + 86_400_000) },
            plannedEnd: { $gt: new Date(around.getTime() - 86_400_000) },
          })
          .toArray(),
      listBySeries: (serieIds, from, to) =>
        visits
          .find({ serieId: { $in: [...serieIds] }, occurrenceDate: { $gte: from, $lte: to } })
          .toArray(),
      insert: async (visit) => void (await visits.insertOne(visit, dates)),
      save: async (visit) => void (await visits.updateOne({ _id: visit._id }, { $set: visit })),
    },
    visitEvents: {
      append: async (event) => void (await visitEvents.insertOne(event, dates)),
      listByVisit: (visitId) => visitEvents.find({ visitId }).sort({ at: 1 }).toArray(),
    },
    sessions: {
      findByFingerprint: (tokenFingerprint) => sessions.findOne({ tokenFingerprint }),
      findById: (id) => sessions.findOne({ _id: id }),
      listByMember: (memberId) => sessions.find({ memberId }).toArray(),
      insert: async (session) => void (await sessions.insertOne(session, dates)),
      save: async (session) =>
        void (await sessions.updateOne({ _id: session._id }, { $set: session }, { upsert: false })),
    },
    series: {
      findById: (id) => series.findOne({ _id: id }),
      listByHousehold: (householdId) => series.find({ householdId }).sort({ from: 1 }).toArray(),
      listByAgency: (agencyId, status) =>
        series.find(status ? { agencyId, status } : { agencyId }).toArray(),
      insert: async (serie) => void (await series.insertOne(serie, dates)),
      save: async (serie) => void (await series.updateOne({ _id: serie._id }, { $set: serie })),
    },
    rules: {
      current: (agencyId) => rules.find({ agencyId }).sort({ version: -1 }).limit(1).next(),
      insert: async (config) => void (await rules.insertOne(config, dates)),
    },
    prestations: {
      listByAgency: (agencyId) => prestations.find({ agencyId }).sort({ from: -1 }).toArray(),
      insert: async (prestation) => void (await prestations.insertOne(prestation, dates)),
      close: async (id, to) => void (await prestations.updateOne({ _id: id }, { $set: { to } })),
    },
    tariffSettings: {
      find: (agencyId) => tariffSettings.findOne({ agencyId }),
      upsert: async (settings) =>
        void (await tariffSettings.updateOne(
          { agencyId: settings.agencyId },
          { $set: settings },
          { upsert: true },
        )),
    },
    absences: {
      listByWorker: (workerId, from, to) =>
        absences.find({ workerId, from: { $lt: to }, to: { $gt: from } }).toArray(),
      insert: async (absence) => void (await absences.insertOne(absence, dates)),
    },
    workerPreferences: {
      listByHousehold: (householdId) => workerPreferences.find({ householdId }).toArray(),
      upsert: async (preference) =>
        void (await workerPreferences.updateOne(
          { householdId: preference.householdId, workerId: preference.workerId },
          { $set: preference },
          { upsert: true },
        )),
    },
    challenges: {
      findById: (id) => challenges.findOne({ _id: id }),
      insert: async (challenge) => void (await challenges.insertOne(challenge, dates)),
      save: async (challenge) =>
        void (await challenges.updateOne({ _id: challenge._id }, { $set: challenge })),
    },
  };
}

/** Le journal d'audit : `insertOne`, et rien d'autre. */
export function mongoAuditJournal(db: Db): AuditJournal {
  const logs = db.collection<AuditEvent>("audit_logs");
  return {
    append: async (event) => void (await logs.insertOne(auditEventSchema.parse(event), dates)),
  };
}

export function mongoAuditReader(db: Db): AuditReader {
  const logs = db.collection<AuditEvent>("audit_logs");
  return {
    listByHousehold: (householdId, limit) =>
      logs.find({ householdId }).sort({ at: -1 }).limit(limit).toArray(),
  };
}
