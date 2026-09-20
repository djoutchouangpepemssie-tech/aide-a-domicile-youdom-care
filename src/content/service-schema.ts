import { z } from "zod";
import { photoSchema, seoFieldsSchema, sourceSchema } from "./schemas";

/*
 * En-tête (frontmatter) d'une page service ou pathologie : content/services/*.mdx, gabarit de
 * docs/03 §2 (13 sections). Les règles de docs/03 §1 sont portées ici : sources datées,
 * statut `a_relire` tant que `relu_par` n'est pas renseigné (la page n'est pas construite en
 * production), encart « Ce que nous ne faisons pas » obligatoire, semaine type illustrative.
 * Le corps MDX est une prose complémentaire rendue dans la section 3.
 */

const text = z.string().min(1);
const internalPath = z
  .string()
  .regex(/^\/[a-z0-9-]+(?:\/[a-z0-9-]+)*\/$/, "chemin interne avec barre finale");
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date AAAA-MM-JJ");

export function wordCount(value: string): number {
  return value.trim().split(/\s+/).filter(Boolean).length;
}

const words = (min: number, max: number) =>
  text.refine((value) => {
    const n = wordCount(value);
    return n >= min && n <= max;
  }, `entre ${min} et ${max} mots`);

export const servicePublics = [
  "neuro",
  "personne-agee",
  "adulte-handicap",
  "enfant-handicap",
  "aidant",
  "transverse",
] as const;
export type ServicePublic = (typeof servicePublics)[number];

export const serviceKinds = ["pilier", "pathologie", "sous-page", "service"] as const;

export const serviceForms = [
  "rappel",
  "neuro",
  "personne-agee",
  "adulte-handicap",
  "enfant-handicap",
  "aidant",
  "sortie-hospitalisation",
  "nuit-24h",
] as const;

const personSchema = z.strictObject({ nom: text, fonction: text });

/** Nom d'icône du registre `Icon` (docs/design/ICONES.md) : validé par le composant, pas ici. */
const iconName = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "nom d'icône en minuscules et tirets");

/**
 * Gestes d'entrée du hero (docs/design/CONCEPT.md §4), un par page au plus :
 * `lecteur` (sélecteur « pour un proche / pour moi »), `stades` (« Où en est la maladie ? »),
 * `planning` (raccourcis du planning), `fiche-de-vie` (carte qui se retourne), `questionnaire`
 * (première question de « Où en êtes-vous ? »), `nuit` (nuit calme ou active ; durée sur 24h/24),
 * `sortie` (« Quand est la sortie ? »). Composants : src/components/blocks/HeroGestures/.
 */
export const heroGestures = [
  "lecteur",
  "stades",
  "planning",
  "fiche-de-vie",
  "questionnaire",
  "nuit",
  "sortie",
] as const;
export type HeroGesture = (typeof heroGestures)[number];

/**
 * Bannière personnalisée (docs/design/CONCEPT.md §4) : photo 4:5 (bande 16:9 sur mobile),
 * variante « pour vous-même » basculée par le sélecteur de lecteur (pilier personnes âgées),
 * ton sombre (teal-900) pour la garde de nuit et la présence 24h/24, geste d'entrée.
 */
export const serviceHeroSchema = z.strictObject({
  photo: photoSchema,
  photo_pour_soi: photoSchema.optional(),
  ton: z.enum(["clair", "sombre"]).optional(),
  geste: z.enum(heroGestures).optional(),
});
export type ServiceHero = z.infer<typeof serviceHeroSchema>;

export const servicePageSchema = z
  .strictObject({
    titre: seoFieldsSchema.shape.titre,
    description: seoFieldsSchema.shape.description,
    chemin: internalPath,
    type: z.enum(serviceKinds),
    public: z.enum(servicePublics),
    /** Page pilier de rattachement ; absent pour un pilier. */
    pilier: internalPath.optional(),
    /** Deux pages sœurs (maillage de docs/03 §2). */
    soeurs: z.array(internalPath).min(2).max(3),
    h1: text,
    /** Libellé court (liens-icônes sous le hero du pilier, cartes sœurs) ; à défaut, le H1. */
    libelle_court: text.optional(),
    /** Rang d'affichage parmi les sous-pages d'un pilier (liens-icônes) ; à défaut, l'ordre des fichiers. */
    ordre: z.number().int().positive().optional(),
    /** Icône de la page (menus, cartes sœurs, formulaire), registre `Icon`. */
    icone: iconName.optional(),
    /** Section 1 : photo du hero ; absente, l'illustration au fil reste. */
    hero: serviceHeroSchema.optional(),
    chapo: text,
    /** docs/03 §4 : version « Pour vous-même » du chapô, affichée par un sélecteur (pilier personnes âgées). */
    chapo_pour_soi: text.optional(),
    /** Deux phrases de promesse sous le H1 (section 1). */
    promesse: z.array(text).length(2),
    reassurance: z.array(text).min(2).max(4),
    /** Section 2 : situations vécues, du point de vue du proche ou de la personne. */
    situations: z
      .array(z.strictObject({ titre: text, texte: text, icone: iconName.optional() }))
      .min(3)
      .max(5),
    /** Section 3 : quatre rubriques, verbes d'action, exemples précis. */
    actions: z
      .array(
        z.strictObject({
          rubrique: z.enum(["gestes", "presence", "lien", "coordination"]),
          exemples: z.array(text).min(2).max(8),
        }),
      )
      .length(4),
    /** Section 4 : par stade, âge ou phase. */
    stades: z
      .array(z.strictObject({ titre: text, texte: text }))
      .min(2)
      .max(5),
    /** Section 5 : exemple de content/semaines-types.json et récit de 80 à 120 mots. */
    semaine_type: z.strictObject({
      exemple: z.string().min(1),
      /** Photo d'ambiance de l'exemple (3:2), jamais la personne de l'exemple. */
      photo: photoSchema.optional(),
      recit: words(80, 120),
    }),
    /** Photos de section (docs/design/CONCEPT.md §5) : section 3 et section 7, deux au plus. */
    photos: z
      .strictObject({ actions: photoSchema.optional(), proches: photoSchema.optional() })
      .optional(),
    /** Section 7. */
    proches: z.strictObject({ texte: text }),
    /** Section 8. */
    intervenants: z.strictObject({ texte: text }),
    /** Section 9 : encart de franchise (docs/03 §1, règle 4). */
    ne_faisons_pas: z.array(text).min(2).max(6),
    /** Section 10 : identifiants de content/aides.json. */
    aides: z.array(z.string().min(1)).min(1).max(6),
    /** Section 11 : 6 à 8 questions réelles, réponses de 40 à 90 mots. */
    faq: z
      .array(z.strictObject({ question: text, reponse: words(40, 90) }))
      .min(6)
      .max(8),
    /** Section 12 : formulaire du cas. */
    formulaire: z.enum(serviceForms),
    /** Section 13. */
    sources: z.array(sourceSchema).min(2),
    auteur: personSchema,
    relu_par: personSchema.extend({ date: isoDate }).nullable(),
    statut: z.enum(["a_relire", "publie"]),
    maj: isoDate,
  })
  .superRefine((page, ctx) => {
    // Les services transverses (docs/03 §8) n’ont pas de pilier ; toute autre page en a un.
    if (page.type !== "pilier" && page.type !== "service" && !page.pilier) {
      ctx.addIssue({ code: "custom", path: ["pilier"], message: "page rattachée à un pilier" });
    }
    if (page.statut === "publie" && !page.relu_par) {
      ctx.addIssue({
        code: "custom",
        path: ["statut"],
        message: "une page publiée doit avoir été relue (relu_par)",
      });
    }
    const rubriques = new Set(page.actions.map((a) => a.rubrique));
    if (rubriques.size !== 4) {
      ctx.addIssue({
        code: "custom",
        path: ["actions"],
        message: "les quatre rubriques, une fois chacune",
      });
    }
  });

export type ServicePage = z.infer<typeof servicePageSchema>;
