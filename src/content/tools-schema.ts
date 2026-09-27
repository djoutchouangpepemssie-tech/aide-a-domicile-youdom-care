import { z } from "zod";
import { iconNames, type IconName } from "../components/ui/Icon/icons";
import { seoFieldsSchema, sourceSchema } from "./schemas";

/*
 * Outils à imprimer (docs/06 §7, P7.7) : content/outils/{slug}.json porte chaque document
 * (liste de contrôle, modèle de fiche de vie, mémo) et content/pages/outils.json l'index
 * /outils/. Un outil se remplit à la main, une fois imprimé : rien n'est saisi ni collecté sur
 * le site (docs/07 §2). Trois sortes de lignes :
 * - `case` : une case à cocher (vrai carré à l'impression) suivie d'un texte court ;
 * - `champ` : un libellé suivi d'une ou plusieurs lignes vides à remplir à la main ;
 * - `info` : un libellé et un texte fixe (le mémo des aides : « Combien ? » et son montant).
 * Le mémo des aides ne porte aucun chiffre qui ne soit déjà dans content/aides/{id}.json :
 * la section indique l'aide (`aide`) et le test vérifie chaque montant. Les faits affirmés
 * ailleurs (chutes, sortie d'hospitalisation) citent leurs sources officielles, datées.
 */

const text = z.string().min(1);
const slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "identifiant en minuscules et tirets");
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date AAAA-MM-JJ");

export const toolItemSchema = z.discriminatedUnion("type", [
  z.strictObject({
    type: z.literal("case"),
    texte: text,
    /** Précision en petit, sous le texte (« à confirmer avec le pharmacien »). */
    precision: text.optional(),
  }),
  z.strictObject({
    type: z.literal("champ"),
    libelle: text,
    /** Nombre de lignes vides à remplir (1 par défaut, 6 au plus). */
    lignes: z.number().int().min(1).max(6).optional(),
  }),
  z.strictObject({
    type: z.literal("info"),
    libelle: text,
    texte: text,
  }),
]);
export type ToolItem = z.infer<typeof toolItemSchema>;

export const toolSectionSchema = z.strictObject({
  h2: text,
  /** Une phrase d'introduction, facultative. */
  intro: text.optional(),
  /** Identifiant d'aide (content/aides.json) quand la section reprend ses montants. */
  aide: slug.optional(),
  items: z.array(toolItemSchema).min(1),
});
export type ToolSection = z.infer<typeof toolSectionSchema>;

export const toolPageSchema = z.strictObject({
  id: slug,
  seo: seoFieldsSchema,
  ariane: text,
  h1: text,
  sous_titre: text,
  icone: z.enum(iconNames as [IconName, ...IconName[]]),
  /** Deux phrases : à quoi sert l'outil, comment s'en servir. */
  mode_emploi: z.array(text).length(2),
  maj: isoDate,
  sections: z.array(toolSectionSchema).min(1),
  /** Notes de prudence (chutes, médicaments) : on renvoie au médecin ou au pharmacien. */
  prudence: z.array(text).optional(),
  /** Obligatoire dès qu'un fait est affirmé ; absent pour un simple modèle à remplir. */
  sources: z.array(sourceSchema).min(1).optional(),
});
export type ToolPage = z.infer<typeof toolPageSchema>;

/* ---------- content/pages/outils.json ---------- */

export const toolsPageSchema = z.strictObject({
  _lisezmoi: z.string(),
  seo: seoFieldsSchema,
  ariane: text,
  h1: text,
  chapo: text,
  liste_h2: text,
  confiance: z.strictObject({ titre: text, texte: text }),
  appel: z.strictObject({ h2: text, texte: text }),
});
export type ToolsPage = z.infer<typeof toolsPageSchema>;
