import { parsePhoneNumberFromString, type MetadataJson } from "libphonenumber-js/core";
import * as z from "zod/mini";
import phoneMetadata from "../../../data/phone-metadata.fr.json";
import { weekDays, weekSlots } from "@/lib/week/week";
import {
  durations,
  idfDepartments,
  leadForms,
  nightKinds,
  rhythms,
  urgencies,
  isHealthForm,
} from "./forms";

/*
 * `LeadPayload` de docs/05 §7 : schéma partagé par les formulaires (client) et la route
 * api/lead (serveur), écrit avec `zod/mini` pour peser quelques kilo-octets dans les pages de
 * formulaire (D-022). Règles de docs/05 §6 et §8 : téléphone français valide, commune en
 * Île-de-France (sauf contact, D-021), champ libre limité, consentement explicite dès qu'une
 * réponse touche à la santé, aucune donnée de santé dans l'adresse de la page d'origine.
 * Le téléphone est validé par libphonenumber-js avec les seules métadonnées de la France
 * (data/phone-metadata.fr.json, `pnpm data:phone`).
 */

const MAX_MESSAGE = 600;
const MAX_ANSWER = 500;
const MAX_LIST = 20;
const MAX_DATES = 60;

/** Numéro français (fixe ou mobile) au format E.164, null s'il est invalide. */
export function normalizeFrenchPhone(input: string): string | null {
  const parsed = parsePhoneNumberFromString(input, "FR", phoneMetadata as MetadataJson);
  if (!parsed || parsed.country !== "FR" || !parsed.isValid()) return null;
  return parsed.number;
}

const trimmed = (max: number) => z.string().check(z.trim(), z.minLength(1), z.maxLength(max));
const time = z
  .string()
  .check(z.regex(/^([01]\d|2[0-3]):(00|30)$/, "heure HH:MM par pas de 30 minutes"));
const isoDate = z.iso.date();

const phoneSchema = z.string().check(
  z.trim(),
  z.refine(
    (value) => normalizeFrenchPhone(value) !== null,
    "numéro de téléphone français invalide",
  ),
);

export const communeSchema = z
  .strictObject({
    insee: z.string().check(z.regex(/^\d{5}$/, "code INSEE à cinq chiffres")),
    nom: trimmed(80),
    codePostal: z.string().check(z.regex(/^\d{5}$/, "code postal à cinq chiffres")),
    departement: z.enum(idfDepartments),
  })
  .check(
    z.refine((c) => c.insee.startsWith(c.departement) && c.codePostal.startsWith(c.departement), {
      message: "commune hors du département indiqué",
    }),
  );

const slotsSchema = z.array(z.enum(weekSlots)).check(
  z.minLength(1),
  z.maxLength(weekSlots.length),
  z.refine((slots) => new Set(slots).size === slots.length, "créneau en double"),
);

const rangeSchema = z
  .strictObject({ debut: time, fin: time })
  .check(z.refine((r) => r.debut !== r.fin, "plage vide"));

export const planningSchema = z
  .strictObject({
    rythme: z.enum(rhythms),
    grille: z.optional(z.partialRecord(z.enum(weekDays), slotsSchema)),
    plages: z.optional(
      z.partialRecord(z.enum(weekDays), z.array(rangeSchema).check(z.minLength(1), z.maxLength(6))),
    ),
    /** Ponctuel : les dates demandées ; 24h/24 : la date de début souhaitée. */
    dates: z.optional(z.array(isoDate).check(z.minLength(1), z.maxLength(MAX_DATES))),
    /** Ponctuel : créneaux communs à toutes les dates (D-020). */
    creneaux: z.optional(slotsSchema),
    /** 24h/24 : durée envisagée (D-020). */
    duree: z.optional(z.enum(durations)),
    nuit: z.optional(z.enum(nightKinds)),
    heuresParSemaine: z.optional(z.number().check(z.minimum(0), z.maximum(168))),
  })
  .check(
    z.superRefine((p, ctx) => {
      if (p.rythme === "ponctuel" && !p.dates) {
        ctx.addIssue({
          code: "custom",
          path: ["dates"],
          message: "dates requises pour un besoin ponctuel",
          input: p,
        });
      }
    }),
  );

export const contactSchema = z.strictObject({
  prenom: trimmed(60),
  nom: trimmed(80),
  telephone: phoneSchema,
  email: z.optional(z.email().check(z.maxLength(254))),
  rappel: z.optional(trimmed(120)),
});

export const consentSchema = z.strictObject({
  sante: z.boolean(),
  date: z.iso.datetime(),
  version: trimmed(40),
});

const answerSchema = z.union([
  z.string().check(z.trim(), z.maxLength(MAX_ANSWER)),
  z.array(trimmed(MAX_ANSWER)).check(z.maxLength(MAX_LIST)),
]);

export const leadPayloadSchema = z
  .strictObject({
    id: z.uuid(),
    createdAt: z.iso.datetime(),
    form: z.enum(leadForms),
    sourcePage: z.string().check(z.regex(/^\/[^\s?#]*$/, "chemin interne sans paramètres")),
    /** Obligatoire sauf pour le formulaire de contact (D-021). */
    commune: z.optional(communeSchema),
    agenceProche: z.optional(z.string().check(z.regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/))),
    urgence: z.enum(urgencies),
    pourQui: z.optional(trimmed(80)),
    situation: z.optional(
      z.record(z.string().check(z.regex(/^[a-z][a-z0-9_]{0,39}$/)), answerSchema),
    ),
    besoins: z.optional(z.array(trimmed(120)).check(z.maxLength(MAX_LIST))),
    planning: z.optional(planningSchema),
    contact: contactSchema,
    message: z.optional(z.string().check(z.trim(), z.maxLength(MAX_MESSAGE))),
    consentement: consentSchema,
  })
  .check(
    z.superRefine((lead, ctx) => {
      if (lead.form !== "contact" && !lead.commune) {
        ctx.addIssue({
          code: "custom",
          path: ["commune"],
          message: "commune requise",
          input: lead,
        });
      }
      // Le formulaire professionnel ne décrit jamais la personne (docs/05 §5, D-021) : sa
      // « situation » (structure, fonction, type de besoin) n'est pas une donnée de santé.
      const touchesHealth =
        isHealthForm(lead.form) || (lead.situation !== undefined && lead.form !== "professionnel");
      if (touchesHealth && !lead.consentement.sante) {
        ctx.addIssue({
          code: "custom",
          path: ["consentement", "sante"],
          message: "consentement explicite requis pour les informations de santé",
          input: lead,
        });
      }
    }),
  );

export type LeadPayload = z.infer<typeof leadPayloadSchema>;
export type LeadPlanning = z.infer<typeof planningSchema>;
export type LeadContact = z.infer<typeof contactSchema>;
export type LeadCommune = z.infer<typeof communeSchema>;

export const leadLimits = { MAX_MESSAGE, MAX_ANSWER, MAX_LIST, MAX_DATES } as const;
