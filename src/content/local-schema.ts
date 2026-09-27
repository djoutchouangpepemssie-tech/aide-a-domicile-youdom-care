import { z } from "zod";
import { seoFieldsSchema } from "./schemas";

/*
 * Référencement local (docs/04 §4 et §5) : contrat des données d'un territoire.
 *
 * Deux fichiers par territoire, séparés parce qu'ils n'ont pas la même origine :
 * - `data/local/{code}.json` (`LocalData`) : produit par le pipeline `pnpm data:local` à partir
 *   des sources ouvertes ; régénérable ; chaque fait porte sa source et sa date de collecte.
 *   Règle d'or : aucun fait local sans source (docs/04 §4).
 * - `content/local/{code}.json` (`LocalEditorial`) : écrit à la main pour la page, à partir des
 *   faits ci-dessus uniquement : sous-titre, description, zone éditoriale, questions locales.
 *
 * Une page locale n'est construite que si les deux fichiers existent et si les seuils bloquants
 * de docs/04 §4 sont respectés (`check-local-facts`, `check-local-uniqueness`,
 * `check-local-nap`). Le code d'un territoire est son code INSEE (commune, arrondissement),
 * le code du département (`75`, `92`…) ou `idf` pour la carte régionale.
 */

const text = z.string().min(1);
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date AAAA-MM-JJ");
const httpUrl = z.string().url().startsWith("http");
export const localSlug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "slug en minuscules");

export const territoryKinds = [
  "region",
  "departement",
  "commune",
  "arrondissement",
  "quartier",
] as const;
export type TerritoryKind = (typeof territoryKinds)[number];

export const departementCodes = ["75", "77", "78", "91", "92", "93", "94", "95"] as const;

/** Types de faits (docs/04 §4, sections 3, 4 et 7 de la page locale). */
export const localFactTypes = [
  "point-information",
  "ccas",
  "mdph",
  "service-apa",
  "accueil-jour",
  "residence-autonomie",
  "ehpad",
  "hopital",
  "consultation-memoire",
  "plateforme-repit",
  "transport-adapte",
  "association",
  "marche",
  "espace-vert",
  "equipement-seniors",
  "habitat",
  "relief-deplacements",
  "demographie",
  "aide-departementale",
  "autre",
] as const;
export type LocalFactType = (typeof localFactTypes)[number];

const coordinatesSchema = z.strictObject({ lat: z.number(), lng: z.number() });

/** Un fait local : une valeur, une adresse source officielle, une date de collecte. */
export const localFactSchema = z.strictObject({
  type: z.enum(localFactTypes),
  label: text,
  /** Valeur lisible (nombre, pourcentage, description courte) ; absente pour un lieu. */
  value: text.optional(),
  /** Adresse postale d'un lieu, telle que publiée par la source. */
  address: text.optional(),
  commune_insee: z
    .string()
    .regex(/^\d{5}$/)
    .optional(),
  telephone: text.optional(),
  /** Page officielle du lieu ou du service, si elle existe. */
  url: httpUrl.optional(),
  /** Adresse de la source ouverte ou officielle d'où vient le fait. Obligatoire. */
  source_url: httpUrl,
  source_label: text.optional(),
  collected_at: isoDate,
  /** Fait situé dans le territoire même (quartier) et non dans son parent. */
  in_territory: z.boolean().optional(),
});
export type LocalFact = z.infer<typeof localFactSchema>;

export const localDemographySchema = z.strictObject({
  millesime: z.string().regex(/^\d{4}$/),
  population: z.number().int().nonnegative(),
  part_60_74: z.number().min(0).max(100).optional(),
  part_75_89: z.number().min(0).max(100).optional(),
  part_90_plus: z.number().min(0).max(100).optional(),
  part_75_plus: z.number().min(0).max(100).optional(),
  source_url: httpUrl,
  collected_at: isoDate,
});

export const nearestAgencySchema = z.strictObject({
  /** `id` d'une agence de content/site.config.json. */
  id: localSlug,
  distance_km: z.number().nonnegative(),
});

export const neighbourSchema = z.strictObject({
  code: z.string().regex(/^\d{5}$/),
  nom: text,
  slug: localSlug,
  distance_km: z.number().nonnegative(),
  /** Vrai si le voisin a sa propre page (vague 1) ; sinon il n'est cité que dans la recherche. */
  page: z.boolean(),
});

/** `data/local/{code}.json` : produit par le pipeline, jamais écrit à la main. */
export const localDataSchema = z
  .strictObject({
    _lisezmoi: z.string().optional(),
    code: z.string().min(2),
    kind: z.enum(territoryKinds),
    nom: text,
    /** Chemin canonique de la page, ex. `/aide-a-domicile/hauts-de-seine/puteaux/`. */
    chemin: z.string().regex(/^\/aide-a-domicile\/(?:[a-z0-9-]+\/)*$/),
    slug: localSlug,
    departement: z.enum(departementCodes).optional(),
    departement_nom: text.optional(),
    codes_postaux: z.array(z.string().regex(/^\d{5}$/)).optional(),
    /** Code du territoire parent (`75` pour un arrondissement, `92` pour une commune, `idf`). */
    parent: z.string().min(2).optional(),
    epci: z.strictObject({ code: text, nom: text }).optional(),
    centre: coordinatesSchema.optional(),
    superficie_ha: z.number().nonnegative().optional(),
    population: z.number().int().nonnegative().optional(),
    demographie: localDemographySchema.optional(),
    agence_proche: nearestAgencySchema.optional(),
    communes_voisines: z.array(neighbourSchema).max(12).optional(),
    /** Vague de docs/04 §4 (1, 2, 3) ; absent : hors vagues, pas de page dédiée. */
    vague: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional(),
    /** Motif de sélection en vague 1 : `agence`, `commune-agence`, `population`, `proximite`. */
    motif_vague: text.optional(),
    facts: z.array(localFactSchema),
    generated_at: isoDate,
    sources: z.array(z.strictObject({ label: text, url: httpUrl, collected_at: isoDate })).min(1),
  })
  .superRefine((d, ctx) => {
    if ((d.kind === "commune" || d.kind === "arrondissement") && !d.departement) {
      ctx.addIssue({ code: "custom", path: ["departement"], message: "département requis" });
    }
    if (d.kind !== "region" && !d.agence_proche) {
      ctx.addIssue({
        code: "custom",
        path: ["agence_proche"],
        message: "agence la plus proche requise",
      });
    }
  });
export type LocalData = z.infer<typeof localDataSchema>;

/** `content/local/{code}.json` : la partie écrite à la main, pour la page. */
export const localEditorialSchema = z.strictObject({
  _lisezmoi: z.string().optional(),
  code: z.string().min(2),
  seo: seoFieldsSchema,
  /** Sous-titre de la bannière, rédigé pour la page (docs/04 §4, anatomie 1). */
  sous_titre: text,
  /** Zone éditoriale unique « Vivre à domicile à {Territoire} », en Markdown, faits sourcés seulement. */
  zone_editoriale: text,
  /** 3 à 5 questions propres au territoire, réponses de 40 à 90 mots. */
  questions: z
    .array(z.strictObject({ question: text, reponse: text }))
    .min(3)
    .max(5),
  /** Exemple de semaine type (id de content/semaines-types.json) choisi selon le profil du territoire. */
  semaine_type: localSlug,
  /** Faits mis en avant dans la zone éditoriale, par index dans `facts[]` de LocalData (traçabilité). */
  faits_utilises: z.array(z.number().int().nonnegative()).min(1),
  auteur: z.strictObject({ nom: text, fonction: text }),
  statut: z.enum(["a_relire", "publie"]),
  maj: isoDate,
});
export type LocalEditorial = z.infer<typeof localEditorialSchema>;

/*
 * Seuils bloquants par type de territoire. Ceux de `docs/04 §4` (350 / 450 / 300 / 600 mots) sont
 * un plancher que la loop n'abaisse jamais ; Arcel les a relevés à **1000 mots pour tous les
 * territoires** le 27/09/2026, pour le référencement. Le seuil de similarité ne bouge pas : plus
 * une page est longue, plus le risque de se répéter d'une commune à l'autre augmente, et c'est lui
 * qui l'interdit.
 */
export const localThresholds: Record<
  Exclude<TerritoryKind, "region">,
  { faits: number; mots: number; similarite: number }
> = {
  commune: { faits: 8, mots: 1000, similarite: 0.3 },
  arrondissement: { faits: 12, mots: 1000, similarite: 0.3 },
  quartier: { faits: 6, mots: 1000, similarite: 0.3 },
  departement: { faits: 15, mots: 1000, similarite: 0.25 },
};
