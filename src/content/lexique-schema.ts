import { z } from "zod";
import { seoFieldsSchema, sourceSchema } from "./schemas";

/*
 * Lexique (docs/06 §6) : une page par terme, 120 à 250 mots, dans content/lexique/{slug}.json.
 * Définition en une phrase, explication, « pour qui », lien officiel, pages liées. Chaque sigle
 * rencontré dans le site renvoie à sa page de lexique à sa première occurrence dans la page
 * (src/lib/mdx/rehype-lexique.ts). Le compte de mots porte sur ce que la page rend : la
 * définition, l'explication (balisage Markdown retiré) et « pour qui » ; il est vérifié par le
 * schéma, donc par le chargeur (build) et par `check-content`.
 */

const text = z.string().min(1);
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date AAAA-MM-JJ");
const internalPath = z
  .string()
  .regex(/^\/(?:[a-z0-9-]+\/)*$/, "chemin interne en minuscules, barre finale");

export const LEXIQUE_WORDS_MIN = 120;
export const LEXIQUE_WORDS_MAX = 250;

/** Mots rendus sur la page d'un terme : définition, explication sans balisage, « pour qui ». */
export function lexiqueWordCount(term: {
  definition: string;
  explication: string;
  pour_qui: string;
}): number {
  const prose = [term.definition, term.explication.replace(/[#*_>`|-]+/g, " "), term.pour_qui].join(
    " ",
  );
  return prose.split(/\s+/).filter(Boolean).length;
}

export const lexiqueTermSchema = z
  .strictObject({
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
  })
  .superRefine((term, ctx) => {
    const words = lexiqueWordCount(term);
    if (words < LEXIQUE_WORDS_MIN || words > LEXIQUE_WORDS_MAX) {
      ctx.addIssue({
        code: "custom",
        path: ["explication"],
        message: `${words} mots rendus : ${LEXIQUE_WORDS_MIN} à ${LEXIQUE_WORDS_MAX} attendus (définition, explication et « pour qui »)`,
      });
    }
    // Une variante qui ne diffère du terme que par la casse est légitime (« Cesu » pour « CESU »,
    // qu'un sigle en capitales ne lierait pas) ; une variante identique ne l'est pas.
    const seen = new Set([term.terme.trim()]);
    for (const [index, variante] of (term.variantes ?? []).entries()) {
      const key = variante.trim();
      if (seen.has(key)) {
        ctx.addIssue({
          code: "custom",
          path: ["variantes", index],
          message: `variante « ${variante} » en double ou identique au terme`,
        });
      }
      seen.add(key);
    }
    if (new Set(term.pages_liees).size !== term.pages_liees.length) {
      ctx.addIssue({ code: "custom", path: ["pages_liees"], message: "page liée en double" });
    }
  });
export type LexiqueTerm = z.infer<typeof lexiqueTermSchema>;

/* ---------- content/pages/lexique.json : index /lexique/ ---------- */

export const lexiquePageSchema = z.strictObject({
  _lisezmoi: z.string(),
  seo: seoFieldsSchema,
  ariane: text,
  h1: text,
  chapo: text,
  /** Nom de la navigation par lettres (« Aller à une lettre »). */
  lettres_nom: text,
  /** Filtrage côté client, facultatif : sans JavaScript, la liste complète reste rendue. */
  recherche: z.strictObject({
    label: text,
    aide: text,
    un_resultat: text,
    resultats: text.includes("{n}"),
    aucun: text,
  }),
  appel: z.strictObject({ h2: text, texte: text }),
});
export type LexiquePage = z.infer<typeof lexiquePageSchema>;

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
