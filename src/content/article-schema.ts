import { z } from "zod";
import { photoSchema, seoFieldsSchema, sourceSchema } from "./schemas";

/*
 * Magazine « Le Fil » (docs/06) : contrat d'un article MDX de content/magazine/{slug}.mdx.
 *
 * Le gabarit d'article (docs/06 §3) rend, dans l'ordre : fil d'Ariane et rubrique · titre ·
 * chapô · ligne de confiance (auteur, relecteur si sujet de santé, dates, temps de lecture) ·
 * « L'essentiel » · sommaire ancré · corps (intertitres en questions réelles, encarts « À retenir »
 * et « Attention ») · « Et concrètement, demain ? » · un seul encart d'appel · sources numérotées ·
 * « À lire ensuite ». L'en-tête porte tout ce qui n'est pas le corps ; le corps est du MDX qui
 * n'utilise que les composants `<ARetenir>`, `<Attention>` et les éléments Markdown (titres `##`
 * en questions, paragraphes, listes, tableaux simples, liens).
 *
 * Règles de confiance (docs/06 §4) : auteurs réels fournis par Arcel dans content/auteurs/ ; tant
 * qu'aucun n'existe, l'auteur est l'équipe éditoriale et l'article reste en `a_relire` (noindex,
 * non construit en production). Un sujet de santé publié exige `relu_par`. Chaque article porte
 * une date de révision prévue : 12 mois après `maj_le`, 6 mois pour la rubrique « Droits et
 * aides » (`check-freshness` avertit quand elle est dépassée). Récits et portraits : uniquement
 * réels avec accord écrit ; aucune histoire inventée présentée comme vraie.
 */

const text = z.string().min(1);
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date AAAA-MM-JJ");
const internalPath = z
  .string()
  .regex(/^\/(?:[a-z0-9-]+\/)*$/, "chemin interne en minuscules, barre finale");

/** Rubriques de docs/06 §2, dans l'ordre du menu du magazine. */
export const articleRubriques = [
  "comprendre",
  "vivre-chez-soi",
  "grandir-avec-un-handicap",
  "tenir-dans-la-duree",
  "droits-et-aides",
  "dans-les-coulisses",
] as const;
export type ArticleRubrique = (typeof articleRubriques)[number];

export const rubriqueLabels: Record<ArticleRubrique, string> = {
  comprendre: "Comprendre",
  "vivre-chez-soi": "Vivre chez soi",
  "grandir-avec-un-handicap": "Grandir avec un handicap",
  "tenir-dans-la-duree": "Tenir dans la durée",
  "droits-et-aides": "Droits et aides",
  "dans-les-coulisses": "Dans les coulisses",
};

/** Délai de révision par rubrique, en mois (docs/06 §4). */
export function revisionMonths(rubrique: ArticleRubrique): number {
  return rubrique === "droits-et-aides" ? 6 : 12;
}

const personSchema = z.strictObject({ nom: text, fonction: text });

export const articleStatuts = ["brouillon", "a_relire", "publie"] as const;

export const articleFrontmatterSchema = z
  .strictObject({
    /** Titre de l'article : promesse claire, 55 à 70 caractères (docs/06 §3). */
    titre: z.string().min(55).max(70),
    /** Balise titre et description moteur (docs/01 §8) ; le titre moteur peut différer du titre. */
    seo: seoFieldsSchema,
    rubrique: z.enum(articleRubriques),
    /** Numéro du sujet dans docs/06 §5 (1 à 36), pour la file d'attente. */
    sujet: z.number().int().min(1).max(36),
    /** Chapô de 40 à 60 mots qui répond à la question posée. */
    chapo: text,
    auteur: personSchema,
    /** Relecteur professionnel ; obligatoire pour publier un sujet de santé. */
    relu_par: personSchema.extend({ date: isoDate }).nullable(),
    /** Sujet de santé (maladie, handicap, soins) : relecture obligatoire avant publication. */
    sante: z.boolean(),
    publie_le: isoDate,
    maj_le: isoDate,
    /** Date de révision prévue ; si absente, calculée par `revisionMonths` depuis `maj_le`. */
    revision_le: isoDate.optional(),
    /** « L'essentiel » : 3 à 5 points, une phrase chacun. */
    essentiel: z.array(text).min(3).max(5),
    /** « Et concrètement, demain ? » : exactement trois actions simples. */
    demain: z.array(text).length(3),
    /** L'unique encart d'appel contextuel, placé par le gabarit après le corps. */
    encart: z.strictObject({
      titre: text,
      texte: text,
      libelle: text,
      href: internalPath,
    }),
    /** Sources numérotées, toutes réellement ouvertes, avec date de consultation. */
    sources: z.array(sourceSchema).min(2),
    image: photoSchema,
    /** Piliers, pages services ou pages d'aide liés (chemins internes construits). */
    piliers_lies: z.array(internalPath).min(1).max(4),
    /** Slugs d'articles à lire ensuite ; complétés par la rubrique s'il en manque. */
    a_lire_ensuite: z
      .array(z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/))
      .max(3)
      .optional(),
    statut: z.enum(articleStatuts),
  })
  .superRefine((a, ctx) => {
    if (a.statut === "publie" && a.sante && !a.relu_par) {
      ctx.addIssue({
        code: "custom",
        path: ["statut"],
        message: "un sujet de santé publié doit avoir été relu (relu_par)",
      });
    }
    if (a.maj_le < a.publie_le) {
      ctx.addIssue({ code: "custom", path: ["maj_le"], message: "maj_le précède publie_le" });
    }
    const words = a.chapo.trim().split(/\s+/).length;
    if (words < 40 || words > 60) {
      ctx.addIssue({
        code: "custom",
        path: ["chapo"],
        message: `chapô de ${words} mots : 40 à 60 attendus`,
      });
    }
  });
export type ArticleFrontmatter = z.infer<typeof articleFrontmatterSchema>;

/** Composants MDX autorisés dans le corps d'un article. */
export const articleMdxComponents = ["ARetenir", "Attention"] as const;

/** Fiche auteur (content/auteurs/{slug}.json), fournie par Arcel (docs/06 §4). */
export const authorSchema = z.strictObject({
  _lisezmoi: z.string().optional(),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  nom: text,
  fonction: text,
  biographie: text,
  photo: photoSchema.optional(),
});
export type Author = z.infer<typeof authorSchema>;
