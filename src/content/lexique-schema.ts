import { z } from "zod";
import { seoFieldsSchema, sourceSchema } from "./schemas";

/*
 * Lexique (docs/06 §6) : une page par terme, 120 à 250 mots, dans content/lexique/{slug}.json.
 * Définition en une phrase, explication, « pour qui », lien officiel, pages liées. Chaque sigle
 * rencontré dans le site renvoie à sa page de lexique à sa première occurrence dans la page.
 */

const text = z.string().min(1);
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date AAAA-MM-JJ");
const internalPath = z
  .string()
  .regex(/^\/(?:[a-z0-9-]+\/)*$/, "chemin interne en minuscules, barre finale");

export const lexiqueTermSchema = z.strictObject({
  _lisezmoi: z.string().optional(),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  /** Le terme tel qu'il s'écrit (« APA », « auxiliaire de vie », « GIR et grille AGGIR »). */
  terme: text,
  /** Développé d'un sigle (« Allocation personnalisée d'autonomie ») ; absent pour un mot. */
  developpe: text.optional(),
  /** Graphies repérées dans les textes pour le lien automatique (sigle, pluriel…) ; sans le terme. */
  variantes: z.array(text).max(6).optional(),
  seo: seoFieldsSchema,
  /** Définition en une phrase. */
  definition: text,
  /** Explication en Markdown minimal (paragraphes, listes), 120 à 250 mots avec la définition et « pour qui ». */
  explication: text,
  pour_qui: text,
  /** Lien officiel (service-public.fr, CNSA, ministère, département…), réellement ouvert. */
  lien_officiel: sourceSchema,
  pages_liees: z.array(internalPath).min(1).max(4),
  maj: isoDate,
});
export type LexiqueTerm = z.infer<typeof lexiqueTermSchema>;

/** Les termes du lancement (docs/06 §6), dans l'ordre alphabétique du cahier. */
export const lexiqueLaunchTerms = [
  "AAH",
  "AEEH",
  "AESH",
  "AJPA",
  "AJPP",
  "APA",
  "ARDH",
  "auxiliaire de vie",
  "CAMSP",
  "CCAS",
  "CESU",
  "CLIC",
  "consultation mémoire",
  "crédit d'impôt",
  "DAC",
  "ESA",
  "GIR et grille AGGIR",
  "HAD",
  "IME",
  "MDPH",
  "mode mandataire",
  "mode prestataire",
  "PCH",
  "plateforme de répit",
  "PCO",
  "SAAD",
  "SAMSAH",
  "SAVS",
  "SESSAD",
  "SSIAD",
  "TSA",
  "ULIS",
] as const;
