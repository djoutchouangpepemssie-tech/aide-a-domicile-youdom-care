import { z } from "zod";
import { interventionModeSchema, seoFieldsSchema } from "./schemas";

/*
 * Schémas des pages légales (docs/07 §2, P8.3) : content/legal/{mentions-legales,
 * politique-de-confidentialite, cookies, conditions-generales}.json. Ces fichiers ne portent
 * que des textes et des libellés : les faits d'entreprise (raison sociale, siège, SIRET,
 * hébergeur, médiateur…) viennent de content/site.config.json > legal et chaque champ `null`
 * y est masqué par la page, jamais remplacé par un « à compléter ».
 */

const text = z.string().min(1);
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date AAAA-MM-JJ");
const internalPath = z.string().regex(/^\/(?:[a-z0-9-]+\/)*$/, "chemin interne avec barre finale");
const paragraphs = z.array(text).min(1);
const link = z.strictObject({ libelle: text, href: internalPath });
const externalLink = z.strictObject({ libelle: text, href: z.url() });

/** En-tête commun : balises, fil d'Ariane, H1, chapô, date de dernière révision affichée. */
const legalHead = {
  _lisezmoi: z.string(),
  seo: seoFieldsSchema,
  ariane: text,
  h1: text,
  chapo: text,
  maj: isoDate,
  /** Libellé de la date affichée ; contient {date}. */
  maj_libelle: text.includes("{date}"),
} as const;

/* ---------- content/legal/mentions-legales.json ---------- */

export const openDataLicenceIds = ["etalab-2.0", "odbl"] as const;
export type OpenDataLicenceId = (typeof openDataLicenceIds)[number];

export const mentionsLegalesSchema = z.strictObject({
  ...legalHead,
  editeur: z.strictObject({
    h2: text,
    intro: text,
    libelles: z.strictObject({
      nom_commercial: text,
      raison_sociale: text,
      forme_juridique: text,
      capital: text,
      siege_social: text,
      rcs: text,
      siret: text,
      code_ape: text,
      tva_intracommunautaire: text,
      telephone: text,
      email: text,
      directeur_publication: text,
    }),
  }),
  services_a_la_personne: z.strictObject({
    h2: text,
    /** Contient {numero}. */
    texte_numero: text.includes("{numero}"),
    autorisations_h3: text,
    autorisations_intro: text,
    libelles: z.strictObject({
      departement: text,
      publics: text,
      mode: text,
      reference: text,
      date: text,
      modes: z.strictObject({ prestataire: text, mandataire: text }),
    }),
  }),
  hebergeur: z.strictObject({
    h2: text,
    libelles: z.strictObject({ nom: text, adresse: text, contact: text }),
  }),
  mediation: z.strictObject({ h2: text, texte: text }),
  propriete_intellectuelle: z.strictObject({ h2: text, paragraphes: paragraphs }),
  credits: z.strictObject({
    h2: text,
    intro: text,
    /** Contient {n} ; singulier et pluriel. */
    photo_une: text,
    photos_n: text.includes("{n}"),
    licences_libelle: text,
    /** Libellé du lien vers la page d'une photo ; contient {n}. */
    lien_photo: text.includes("{n}"),
  }),
  donnees_ouvertes: z.strictObject({
    h2: text,
    intro: text,
    licences: z.record(z.enum(openDataLicenceIds), externalLink),
    jeux: z
      .array(
        z.strictObject({
          producteur: text,
          jeu: text,
          href: z.url(),
          licence: z.enum(openDataLicenceIds),
        }),
      )
      .min(1),
  }),
  donnees_personnelles: z.strictObject({ h2: text, texte: text, liens: z.array(link).min(1) }),
});
export type MentionsLegales = z.infer<typeof mentionsLegalesSchema>;

/* ---------- content/legal/politique-de-confidentialite.json ---------- */

const policySection = z.strictObject({ h2: text, paragraphes: paragraphs });

export const politiqueConfidentialiteSchema = z.strictObject({
  ...legalHead,
  responsable: z.strictObject({
    h2: text,
    intro: text,
    libelles: z.strictObject({
      nom_commercial: text,
      raison_sociale: text,
      forme_juridique: text,
      siege_social: text,
      siret: text,
      email: text,
      telephone: text,
    }),
  }),
  principes: policySection,
  finalites: z.strictObject({
    h2: text,
    intro: text,
    colonnes: z.strictObject({ formulaire: text, donnees: text, finalite: text, base: text }),
    formulaires: z
      .array(
        z.strictObject({
          libelle: text,
          href: internalPath,
          donnees: text,
          finalite: text,
          base_legale: text,
        }),
      )
      .min(1),
  }),
  sante: policySection,
  destinataires: z.strictObject({ h2: text, intro: text, liste: z.array(text).min(1), fin: text }),
  durees: z.strictObject({
    h2: text,
    paragraphes: paragraphs,
    /** Propositions de docs/05 §8, présentées comme telles (statut de la liste). */
    propositions_libelle: text,
    propositions: z.array(text).min(1),
  }),
  droits: z.strictObject({
    h2: text,
    intro: text,
    liste: z.array(text).min(1),
    /** Contient {email}. */
    exercice: text.includes("{email}"),
    delai: text,
  }),
  reclamation: z.strictObject({
    h2: text,
    texte: text,
    cnil: externalLink,
    adresse_postale: text,
  }),
  mesure_audience: z.strictObject({ h2: text, paragraphes: paragraphs, lien: link }),
  securite: policySection,
  mineurs: policySection,
  evolution: policySection,
});
export type PolitiqueConfidentialite = z.infer<typeof politiqueConfidentialiteSchema>;

/* ---------- content/legal/cookies.json ---------- */

export const cookiesSchema = z.strictObject({
  ...legalHead,
  reponse: z.strictObject({ h2: text, paragraphes: paragraphs }),
  traceurs: z.strictObject({
    h2: text,
    intro: text,
    aucun: text,
    colonnes: z.strictObject({ nom: text, emetteur: text, finalite: text, duree: text }),
    /** Liste réelle des traceurs déposés ; vide aujourd'hui (src/lib/mesure/README.md). */
    liste: z.array(z.strictObject({ nom: text, emetteur: text, finalite: text, duree: text })),
  }),
  reglages_locaux: z.strictObject({
    h2: text,
    intro: text,
    liste: z.array(z.strictObject({ nom: text, texte: text })).min(1),
  }),
  mesure: z.strictObject({ h2: text, paragraphes: paragraphs }),
  bandeau: z.strictObject({ h2: text, texte: text }),
  liens: z.array(link).min(1),
});
export type CookiesPage = z.infer<typeof cookiesSchema>;

/* ---------- content/legal/conditions-generales.json ---------- */

export const legalDocumentSchema = z.strictObject({
  libelle: text,
  /** Chemin public du PDF, sous /documents/. */
  fichier: z.string().regex(/^\/documents\/[a-z0-9-]+\.pdf$/, "PDF sous /documents/"),
  mode: interventionModeSchema,
  maj: isoDate,
});
export type LegalDocument = z.infer<typeof legalDocumentSchema>;

export const conditionsGeneralesSchema = z.strictObject({
  ...legalHead,
  documents: z.array(legalDocumentSchema),
  documents_h2: text,
  /** Affiché quand `documents` est vide. */
  attente: z.strictObject({ paragraphes: paragraphs }),
  /** Libellé d'un document ; contient {libelle}, {mode} et {date}. */
  document_libelle: text.includes("{libelle}").includes("{mode}").includes("{date}"),
  modes: z.strictObject({ prestataire: text, mandataire: text }),
  mandataire: z.strictObject({ h2: text, paragraphes: paragraphs }),
  devis: z.strictObject({ h2: text, paragraphes: paragraphs }),
  liens: z.array(link).min(1),
});
export type ConditionsGenerales = z.infer<typeof conditionsGeneralesSchema>;
