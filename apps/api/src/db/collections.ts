import type { CreateIndexesOptions, IndexSpecification } from "mongodb";

/*
 * Les collections du socle et leurs index. Les index de `docs/portal/DATA_MODEL.md` §4 sont posés
 * **dès la première ligne**, pas le jour où la base ralentit : Arcel n'a annoncé aucune volumétrie
 * (MY-06), donc on conçoit sans hypothèse de volume.
 *
 * `health: true` marque les collections qui portent des données de santé. Ce drapeau n'est pas
 * décoratif : un test interdit qu'une collection de santé soit déclarée sans lui, et c'est lui qui
 * rendra possible, le jour venu, de les isoler dans un périmètre certifié distinct sans reprise.
 */

export type CollectionSpec = {
  name: string;
  health?: true;
  /** Ajout seul : l'utilisateur applicatif n'y reçoit ni `update` ni `delete`. */
  appendOnly?: true;
  indexes: Array<{ keys: IndexSpecification; options?: CreateIndexesOptions }>;
};

export const COLLECTIONS: readonly CollectionSpec[] = [
  {
    name: "households",
    indexes: [
      { keys: { code: 1 }, options: { unique: true, name: "code_unique" } },
      { keys: { agencyId: 1, status: 1 }, options: { name: "agence_statut" } },
    ],
  },
  {
    name: "members",
    indexes: [
      // Partiels : un membre peut n'avoir qu'un téléphone, ou qu'une adresse (DATA_MODEL §2).
      {
        keys: { email: 1 },
        options: {
          unique: true,
          name: "email_unique",
          partialFilterExpression: { email: { $type: "string" } },
        },
      },
      {
        keys: { phone: 1 },
        options: {
          unique: true,
          name: "telephone_unique",
          partialFilterExpression: { phone: { $type: "string" } },
        },
      },
    ],
  },
  {
    name: "memberships",
    indexes: [
      { keys: { memberId: 1, householdId: 1 }, options: { unique: true, name: "membre_foyer" } },
      { keys: { householdId: 1, status: 1 }, options: { name: "foyer_statut" } },
    ],
  },
  {
    name: "access_grants",
    indexes: [
      // DATA_MODEL §4 : l'index du chemin critique de l'autorisation, lu à chaque requête.
      { keys: { memberId: 1, householdId: 1, module: 1 }, options: { name: "droit_effectif" } },
      { keys: { householdId: 1, revokedAt: 1 }, options: { name: "foyer_revocation" } },
    ],
  },
  {
    name: "legal_protections",
    indexes: [{ keys: { householdId: 1, memberId: 1 }, options: { name: "foyer_membre" } }],
  },
  {
    name: "consents",
    appendOnly: true,
    indexes: [
      { keys: { householdId: 1, purpose: 1, version: -1 }, options: { name: "foyer_finalite" } },
    ],
  },
  {
    name: "workers",
    indexes: [
      // `_id` est celui du compte membre : une personne, une identité (`domaine/schemas.ts`).
      { keys: { agencyId: 1 }, options: { name: "agence" } },
    ],
  },
  {
    name: "agency_rules",
    indexes: [
      // Les réglages sont versionnés : on lit toujours le dernier, on garde les précédents.
      { keys: { agencyId: 1, version: -1 }, options: { unique: true, name: "agence_version" } },
    ],
  },
  {
    name: "series",
    indexes: [
      { keys: { householdId: 1, from: 1 }, options: { name: "foyer_debut" } },
      { keys: { agencyId: 1, status: 1 }, options: { name: "agence_statut" } },
      // Retrouver les séries d'un intervenant : son identifiant est dans les créneaux.
      { keys: { "slots.workerId": 1, status: 1 }, options: { name: "intervenant_statut" } },
    ],
  },
  {
    name: "prestations",
    indexes: [
      { keys: { agencyId: 1, code: 1, from: -1 }, options: { name: "agence_code_application" } },
    ],
  },
  {
    name: "tariff_settings",
    indexes: [{ keys: { agencyId: 1 }, options: { unique: true, name: "agence_unique" } }],
  },
  {
    name: "worker_preferences",
    indexes: [
      {
        keys: { householdId: 1, workerId: 1 },
        options: { unique: true, name: "foyer_intervenant" },
      },
    ],
  },
  {
    name: "absences",
    indexes: [
      { keys: { workerId: 1, from: 1 }, options: { name: "intervenant_debut" } },
      { keys: { from: 1, to: 1 }, options: { name: "fenetre" } },
    ],
  },
  {
    name: "visits",
    indexes: [
      { keys: { householdId: 1, plannedStart: 1 }, options: { name: "foyer_debut" } },
      { keys: { workerId: 1, plannedStart: 1 }, options: { name: "intervenant_debut" } },
      // Sert la détection des retards, qui tourne chaque minute (DATA_MODEL §4).
      { keys: { status: 1, plannedStart: 1 }, options: { name: "statut_debut" } },
      /*
       * L'unicité qui rend la matérialisation idempotente : une occurrence de planning ne peut
       * donner qu'une visite. Partiel, parce qu'une visite ponctuelle n'a pas de série.
       */
      {
        keys: { serieId: 1, occurrenceDate: 1, slotIndex: 1 },
        options: {
          unique: true,
          name: "occurrence_unique",
          partialFilterExpression: { serieId: { $type: "string" } },
        },
      },
    ],
  },
  {
    name: "visit_events",
    appendOnly: true,
    indexes: [{ keys: { visitId: 1, at: 1 }, options: { name: "visite_instant" } }],
  },
  {
    name: "audit_logs",
    appendOnly: true,
    indexes: [
      { keys: { householdId: 1, at: -1 }, options: { name: "foyer_instant" } },
      { keys: { actorId: 1, at: -1 }, options: { name: "acteur_instant" } },
    ],
  },
  {
    name: "auth_challenges",
    indexes: [
      { keys: { memberId: 1, createdAt: -1 }, options: { name: "membre_demande" } },
      // Un défi expiré ne sert plus à rien : MongoDB le supprime seul une heure après.
      { keys: { expiresAt: 1 }, options: { name: "peremption", expireAfterSeconds: 3600 } },
    ],
  },
  {
    name: "sessions",
    indexes: [
      { keys: { tokenFingerprint: 1 }, options: { unique: true, name: "empreinte_unique" } },
      { keys: { memberId: 1, revokedAt: 1 }, options: { name: "membre_revocation" } },
      { keys: { expiresAt: 1 }, options: { name: "peremption", expireAfterSeconds: 86400 } },
    ],
  },
];

/** Les collections qui portent des données de santé (`ARCHITECTURE.md` §4.2). */
export const HEALTH_COLLECTIONS: readonly string[] = [
  "beneficiaries",
  "care_plans",
  "life_sheets",
  "visit_reports",
  "incidents",
];

export function collectionSpec(name: string): CollectionSpec | undefined {
  return COLLECTIONS.find((collection) => collection.name === name);
}
