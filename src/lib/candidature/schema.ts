import * as z from "zod/mini";
import { idfDepartments } from "@/lib/lead/forms";
import { normalizeFrenchPhone } from "@/lib/lead/schema";

/*
 * Candidature (docs/05 §2 : « CV en pièce jointe, 4 Mo au plus, PDF ou DOCX », P8.2). Schéma
 * partagé par le formulaire /recrutement/postuler/ et la route api/candidature, en `zod/mini`
 * comme le LeadPayload (D-022). Aucune donnée de santé n'est demandée ; le consentement porte sur
 * l'étude de la candidature (RGPD) et doit être coché. Le fichier est contrôlé à part : taille,
 * type MIME, extension et signature (les premiers octets), pour refuser un fichier renommé.
 */

/*
 * Plafond du CV : 4 Mo. La limite n'est pas un choix de confort mais une contrainte de
 * l'hébergeur — une fonction serveur Vercel refuse un corps de requête au-delà de 4,5 Mo, et le
 * refus vient de la plateforme, avant la route : un CV plus lourd faisait perdre sa saisie au
 * candidat sans message compréhensible (docs/AUDIT_GLOBAL.md, S-5). Le corps multipart accepté
 * (CV + champs) reste donc sous 4,5 Mo.
 */
export const CV_MAX_BYTES = 4 * 1024 * 1024;
/** Corps multipart accepté par la route : le CV plus les champs, sous la limite de l'hébergeur. */
export const CANDIDATURE_MAX_BODY_BYTES = 4 * 1024 * 1024 + 384 * 1024;
export const CANDIDATURE_MAX_MESSAGE = 600;
export const CANDIDATURE_CONSENT_VERSION = "2026-09";

export const cvMimeTypes = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
} as const;
export type CvKind = keyof typeof cvMimeTypes;

const trimmed = (max: number) => z.string().check(z.trim(), z.minLength(1), z.maxLength(max));

const phoneSchema = z.string().check(
  z.trim(),
  z.refine(
    (value) => normalizeFrenchPhone(value) !== null,
    "numéro de téléphone français invalide",
  ),
);

export const candidatureCommuneSchema = z.strictObject({
  insee: z.string().check(z.regex(/^\d{5}$/, "code INSEE à cinq chiffres")),
  nom: trimmed(80),
  codePostal: z.string().check(z.regex(/^\d{5}$/, "code postal à cinq chiffres")),
  departement: z.enum(idfDepartments),
});

export const candidatureSchema = z.strictObject({
  id: z.uuid(),
  createdAt: z.iso.datetime(),
  sourcePage: z.string().check(z.regex(/^\/[^\s?#]*$/, "chemin interne sans paramètres")),
  /** Slug d'une offre publiée ; absent pour une candidature spontanée. */
  offre: z.optional(z.string().check(z.regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/))),
  contact: z.strictObject({
    prenom: trimmed(60),
    nom: trimmed(80),
    telephone: phoneSchema,
    email: z.email().check(z.maxLength(254)),
  }),
  departement: z.enum(idfDepartments),
  commune: z.optional(candidatureCommuneSchema),
  disponibilite: trimmed(80),
  message: z.optional(z.string().check(z.trim(), z.maxLength(CANDIDATURE_MAX_MESSAGE))),
  consentement: z.strictObject({
    accepte: z.literal(true),
    date: z.iso.datetime(),
    version: trimmed(40),
  }),
});
export type CandidaturePayload = z.infer<typeof candidatureSchema>;

export const candidatureMetaSchema = z.strictObject({
  honeypot: z.string().check(z.maxLength(200)),
  startedAt: z.iso.datetime(),
});
export type CandidatureMeta = z.infer<typeof candidatureMetaSchema>;

/** Ce que l'on sait d'un fichier avant de l'accepter : nom, type annoncé, taille, premiers octets. */
export interface CvFileFacts {
  name: string;
  type: string;
  size: number;
  /** Au moins les quatre premiers octets. */
  head: Uint8Array;
}

export type CvRejection = "manquant" | "trop_lourd" | "type_invalide";

export interface CvCheck {
  ok: boolean;
  kind: CvKind | null;
  reason: CvRejection | null;
}

/** Type déduit du nom de fichier ; null si l'extension n'est ni .pdf ni .docx. */
export function cvKindFromName(name: string): CvKind | null {
  const lower = name.toLowerCase();
  if (lower.endsWith(".pdf")) return "pdf";
  if (lower.endsWith(".docx")) return "docx";
  return null;
}

/** Signature de fichier : « %PDF » pour un PDF, « PK\x03\x04 » (archive zip) pour un DOCX. */
export function cvKindFromSignature(head: Uint8Array): CvKind | null {
  if (head.length < 4) return null;
  if (head[0] === 0x25 && head[1] === 0x50 && head[2] === 0x44 && head[3] === 0x46) return "pdf";
  if (head[0] === 0x50 && head[1] === 0x4b && head[2] === 0x03 && head[3] === 0x04) return "docx";
  return null;
}

/** Refuse un fichier absent, trop lourd, ou dont l'extension, le type MIME et la signature ne concordent pas. */
export function checkCvFile(file: CvFileFacts | null, maxBytes = CV_MAX_BYTES): CvCheck {
  if (!file || file.size === 0) return { ok: false, kind: null, reason: "manquant" };
  if (file.size > maxBytes) return { ok: false, kind: null, reason: "trop_lourd" };
  const byName = cvKindFromName(file.name);
  if (!byName) return { ok: false, kind: null, reason: "type_invalide" };
  // Certains navigateurs annoncent un type vide ou générique : l'extension et la signature tranchent.
  const declared = file.type.trim().toLowerCase();
  const genericTypes = ["", "application/octet-stream"];
  if (!genericTypes.includes(declared) && declared !== cvMimeTypes[byName]) {
    return { ok: false, kind: null, reason: "type_invalide" };
  }
  if (cvKindFromSignature(file.head) !== byName) {
    return { ok: false, kind: null, reason: "type_invalide" };
  }
  return { ok: true, kind: byName, reason: null };
}

/** « 1,2 Mo », « 340 Ko » : taille lisible pour les e-mails et les messages. */
export function formatFileSize(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    return `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 }).format(bytes / (1024 * 1024))} Mo`;
  }
  return `${Math.max(1, Math.round(bytes / 1024))} Ko`;
}

/** Nom de fichier sûr pour la pièce jointe : lettres, chiffres, tirets, extension conservée. */
export function safeCvFilename(name: string, kind: CvKind): string {
  const base = name
    .replace(/\.[^.]+$/, "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return `${base || "cv"}.${kind}`;
}
