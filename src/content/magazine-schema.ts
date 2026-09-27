import { z } from "zod";
import { articleRubriques } from "./article-schema";
import { seoFieldsSchema } from "./schemas";

/*
 * Pages du magazine (docs/06 §2) : content/pages/magazine.json porte l'index /magazine/ et les
 * six rubriques /magazine/categorie/{rubrique}/ ; content/pages/charte-editoriale.json porte la
 * section « Le Fil » de /a-propos/charte-editoriale/ (docs/06 §4). Les articles eux-mêmes sont
 * des MDX (article-schema.ts). Les pages 2 et suivantes ajoutent un suffixe au titre et à la
 * description moteur (interface.json › magazine.pagination) : les titres restent donc courts
 * (50 à 53 caractères) et les descriptions aussi (140 à 147) pour tenir dans docs/01 §8.
 */

const text = z.string().min(1);
const internalPath = z
  .string()
  .regex(/^\/(?:[a-z0-9-]+\/)*$/, "chemin interne en minuscules, barre finale");

/** Titre et description moteur qui laissent la place du suffixe de pagination. */
export const paginableSeoSchema = z.strictObject({
  titre: z.string().min(50).max(53),
  description: z.string().min(140).max(147),
});

const rubriquePageSchema = z.strictObject({
  seo: paginableSeoSchema,
  h1: text,
  /** Une phrase qui dit ce que la rubrique contient (docs/06 §2). */
  texte: text,
});

export const magazinePageSchema = z.strictObject({
  _lisezmoi: z.string(),
  seo: paginableSeoSchema,
  ariane: text,
  h1: text,
  chapo: text,
  /** La promesse au lecteur (docs/06 §1), sous les rubriques. */
  promesse: text,
  rubriques: z.strictObject(
    Object.fromEntries(
      articleRubriques.map((rubrique) => [rubrique, rubriquePageSchema]),
    ) as Record<(typeof articleRubriques)[number], typeof rubriquePageSchema>,
  ),
  charte: z.strictObject({ texte: text, lien: text, href: internalPath }),
});
export type MagazinePageContent = z.infer<typeof magazinePageSchema>;

export const editorialCharterSchema = z.strictObject({
  _lisezmoi: z.string(),
  magazine: z.strictObject({
    h2: text,
    chapo: text,
    etapes: z.array(z.strictObject({ titre: text, texte: text })).min(4),
    lien: z.strictObject({ libelle: text, href: internalPath }),
  }),
});
export type EditorialCharterContent = z.infer<typeof editorialCharterSchema>;

export { seoFieldsSchema };
