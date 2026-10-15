import * as z from "zod";
import { ACTIONS, MODULES } from "./modules";
import { CLIENT_ROLES, STAFF_ROLES } from "./roles";

/*
 * Les schémas du socle (vague 1), d'après `docs/portal/DATA_MODEL.md` §2.
 *
 * Trois règles tenues ici, et pas seulement documentées :
 * 1. `strictObject` partout : un champ inattendu est une erreur, jamais un champ ignoré en
 *    silence. C'est ce qui empêche une donnée de santé d'arriver par une porte non prévue.
 * 2. chaque document porte son `householdId` : le filtre par foyer est possible avant tout autre.
 * 3. ce qui s'est passé ne se modifie pas : les schémas en ajout seul (`auditEventSchema`,
 *    `visitEventSchema`) n'ont ni `updatedAt` ni champ de correction. Une correction est un
 *    nouvel événement.
 */

/** Identifiant technique : la représentation hexadécimale d'un ObjectId MongoDB. */
export const idSchema = z
  .string()
  .regex(/^[0-9a-f]{24}$/, "identifiant attendu sur 24 hexadécimaux");

const isoDateTime = z.coerce.date();

export const householdStatuses = ["actif", "gele", "archive"] as const;
export const householdModes = ["prestataire", "mandataire", "mixte"] as const;

export const householdSchema = z.strictObject({
  _id: idSchema,
  code: z.string().regex(/^[A-Z0-9-]{4,16}$/),
  agencyId: idSchema,
  status: z.enum(householdStatuses),
  mode: z.enum(householdModes),
  address: z.strictObject({
    line1: z.string().min(1).max(120),
    line2: z.string().max(120).optional(),
    postalCode: z.string().regex(/^\d{5}$/),
    city: z.string().min(1).max(80),
    accessNote: z.string().max(200).optional(),
  }),
  frozenAt: isoDateTime.nullish(),
  createdAt: isoDateTime,
});

export type Household = z.infer<typeof householdSchema>;

export const displayModes = ["simple", "complet"] as const;

export const memberSchema = z
  .strictObject({
    _id: idSchema,
    email: z.email().nullish(),
    phone: z
      .string()
      .regex(/^\+33[1-9]\d{8}$/, "numéro français au format E.164")
      .nullish(),
    displayName: z.string().min(1).max(80),
    prefs: z.strictObject({
      displayMode: z.enum(displayModes).default("complet"),
      notifications: z.array(z.enum(["email", "sms", "push"])).default(["email"]),
    }),
    createdAt: isoDateTime,
  })
  // Beaucoup de bénéficiaires n'ont pas d'adresse e-mail : le téléphone suffit, mais pas rien.
  .refine((member) => Boolean(member.email ?? member.phone), {
    error: "un membre a besoin d'une adresse e-mail ou d'un numéro de téléphone",
    path: ["email"],
  });

export type Member = z.infer<typeof memberSchema>;

export const membershipStatuses = ["invite", "actif", "suspendu", "revoque"] as const;

export const membershipSchema = z.strictObject({
  _id: idSchema,
  memberId: idSchema,
  householdId: idSchema,
  role: z.enum([...CLIENT_ROLES, ...STAFF_ROLES]),
  status: z.enum(membershipStatuses),
  invitedBy: idSchema.nullish(),
  activatedAt: isoDateTime.nullish(),
  revokedAt: isoDateTime.nullish(),
  createdAt: isoDateTime,
});

export type Membership = z.infer<typeof membershipSchema>;

/** Le droit effectif (`PERMISSIONS.md` §7). Sans lui, le rôle n'ouvre rien. */
export const accessGrantSchema = z.strictObject({
  _id: idSchema,
  memberId: idSchema,
  householdId: idSchema,
  module: z.enum(MODULES),
  actions: z.array(z.enum(ACTIONS)).min(1),
  grantedBy: idSchema,
  reason: z.string().max(200).nullish(),
  startsAt: isoDateTime,
  endsAt: isoDateTime.nullish(),
  revokedAt: isoDateTime.nullish(),
  createdAt: isoDateTime,
});

export type AccessGrant = z.infer<typeof accessGrantSchema>;

export const protectionTypes = [
  "tutelle",
  "curatelle",
  "habilitation",
  "autorite_parentale",
] as const;

export const legalProtectionSchema = z.strictObject({
  _id: idSchema,
  householdId: idSchema,
  memberId: idSchema,
  type: z.enum(protectionTypes),
  scope: z.array(z.enum(["biens", "personne"])).min(1),
  representation: z.enum(["assistance", "representation"]),
  documentId: idSchema.nullish(),
  // Validée par un humain avant activation (`PERMISSIONS.md` §6) : pas de mesure auto-déclarée.
  verifiedBy: idSchema.nullish(),
  verifiedAt: isoDateTime.nullish(),
  endsAt: isoDateTime.nullish(),
  createdAt: isoDateTime,
});

export type LegalProtection = z.infer<typeof legalProtectionSchema>;

export const visitStatuses = [
  "prevue",
  "en_route",
  "en_cours",
  "faite",
  "annulee",
  "non_faite",
] as const;
export const visitKinds = ["jour", "nuit_calme", "nuit_active", "continu"] as const;

/**
 * La visite au strict nécessaire pour le socle : c'est elle qui borne `acces_logement` dans le
 * temps (règle R4). Le module Planning complet vient en vague 1, étape 2.
 */
export const visitSchema = z.strictObject({
  _id: idSchema,
  householdId: idSchema,
  workerId: idSchema,
  plannedStart: isoDateTime,
  plannedEnd: isoDateTime,
  kind: z.enum(visitKinds),
  status: z.enum(visitStatuses),
  replaces: idSchema.nullish(),
  createdAt: isoDateTime,
});

export type Visit = z.infer<typeof visitSchema>;

export const auditOutcomes = ["autorise", "refuse"] as const;

/** Journal d'audit, en ajout seul (`DATA_MODEL.md` §2, `ARCHITECTURE.md` §5 principe 3). */
export const auditEventSchema = z.strictObject({
  at: isoDateTime,
  actorId: idSchema.nullish(),
  actorRole: z.enum([...CLIENT_ROLES, ...STAFF_ROLES]).nullish(),
  householdId: idSchema.nullish(),
  action: z.enum(ACTIONS),
  module: z.enum(MODULES),
  target: z.string().max(120).nullish(),
  outcome: z.enum(auditOutcomes),
  reason: z.string().max(80).nullish(),
  // Jamais le contenu consulté : le journal dit qui a vu quoi, pas ce qu'il y avait dedans.
  requestId: z.string().max(64).nullish(),
});

export type AuditEvent = z.infer<typeof auditEventSchema>;
