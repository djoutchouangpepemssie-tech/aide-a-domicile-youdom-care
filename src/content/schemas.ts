import { z } from "zod";

/*
 * Schémas des fichiers de content/ : seule source autorisée pour les faits d'entreprise.
 * Un champ null est un fait inconnu (le composant se masque) ; un champ inconnu ou mal typé
 * fait échouer le build. Les clés préfixées par « _ » sont des notes pour Arcel.
 */

const slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "identifiant en minuscules et tirets");
const nullableString = z.string().min(1).nullable();
const nullableNumber = z.number().nullable();
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date AAAA-MM-JJ");

export const interventionModeSchema = z.enum(["prestataire", "mandataire"]);
export type InterventionMode = z.infer<typeof interventionModeSchema>;

/* ---------- content/site.config.json ---------- */

const zoneSchema = z.strictObject({
  code: z.string().regex(/^\d{2}$/),
  nom: z.string().min(1),
  slug,
});

const agencySchema = z.strictObject({
  id: slug,
  nom: z.string().min(1),
  adresse: z.string().min(1),
  code_postal: z.string().regex(/^\d{5}$/),
  commune: z.string().min(1),
  code_insee: z.string().regex(/^\d{5}$/),
  departement: z.string().regex(/^\d{2}$/),
  telephone: nullableString,
  horaires: nullableString,
  coordonnees: z.strictObject({ lat: z.number(), lng: z.number() }).nullable(),
});

const labelSchema = z.strictObject({
  id: slug,
  nom: z.string().min(1),
  detenu: z.boolean().nullable(),
  logo: nullableString,
});

const authorizationSchema = z.strictObject({
  libelle: z.string().min(1),
  departement: z
    .string()
    .regex(/^\d{2}$/)
    .nullable(),
  publics: z.array(z.string().min(1)),
  mode: interventionModeSchema.nullable(),
  reference: nullableString,
  date: isoDate.nullable(),
});

export const siteConfigSchema = z.strictObject({
  _lisezmoi: z.string(),
  marque: z.strictObject({
    nom: z.string().min(1),
    signature: z.string().min(1),
    description_courte: z.string().min(1),
    url: z.url(),
    annee_creation: z.number().int().min(1900).max(2100).nullable(),
  }),
  contact: z.strictObject({
    telephone_principal: nullableString,
    telephone_mobile: nullableString,
    email: z.email().nullable(),
    horaires_accueil_telephonique: nullableString,
    astreinte_24_7: z.boolean().nullable(),
    delai_rappel: nullableString,
  }),
  legal: z.strictObject({
    raison_sociale: nullableString,
    forme_juridique: nullableString,
    capital: nullableString,
    siege_social: nullableString,
    rcs: nullableString,
    siret: nullableString,
    code_ape: nullableString,
    tva_intracommunautaire: nullableString,
    numero_sap: nullableString,
    autorisations: z.array(authorizationSchema),
    directeur_publication: nullableString,
    mediateur_consommation: nullableString,
    hebergeur: z.strictObject({
      nom: z.string().min(1),
      adresse: nullableString,
      contact: nullableString,
    }),
  }),
  modes_intervention: z.array(interventionModeSchema).min(1),
  disponibilite: z.strictObject({
    sept_jours_sur_sept: z.boolean().nullable(),
    vingt_quatre_heures: z.boolean().nullable(),
    duree_minimale_intervention: nullableString,
  }),
  zones: z.array(zoneSchema).min(1),
  agences: z.array(agencySchema),
  labels: z.array(labelSchema),
  reseaux_sociaux: z.strictObject({
    facebook: z.url().nullable(),
    instagram: z.url().nullable(),
    linkedin: z.url().nullable(),
    youtube: z.url().nullable(),
  }),
  a_confirmer: z.array(z.string()),
});
export type SiteConfig = z.infer<typeof siteConfigSchema>;
export type Agency = z.infer<typeof agencySchema>;

/* ---------- content/tarifs.json ---------- */

const unitSchema = z.enum(["heure", "nuit", "jour", "forfait", "mois"]);

const serviceSchema = z.strictObject({
  id: slug,
  libelle: z.string().min(1),
  activite: z.string().min(1),
  mode: interventionModeSchema,
  unite: unitSchema,
  prix_ttc: nullableNumber,
  prix_ht: nullableNumber,
  tva: nullableNumber,
  majorations: z.array(z.strictObject({ libelle: z.string().min(1), taux: nullableNumber })),
  degressivite: z.array(
    z.strictObject({ jusqu_a_heures_par_semaine: nullableNumber, prix_ttc: nullableNumber }),
  ),
  frais: z.array(z.strictObject({ libelle: z.string().min(1), montant_ttc: nullableNumber })),
});

const packageSchema = z.strictObject({
  id: slug,
  libelle: z.string().min(1),
  mode: interventionModeSchema,
  unite: unitSchema,
  prix_ttc: nullableNumber,
  prix_ht: nullableNumber,
});

export const pricingSchema = z.strictObject({
  _lisezmoi: z.string(),
  date_application: isoDate.nullable(),
  credit_impot_taux: z.number().min(0).max(1),
  prestations: z.array(serviceSchema),
  _exemple_de_structure: serviceSchema,
  forfaits: z.array(packageSchema),
  _exemple_de_forfait: packageSchema,
});
export type Pricing = z.infer<typeof pricingSchema>;
export type Service = z.infer<typeof serviceSchema>;
export type Package = z.infer<typeof packageSchema>;

/* ---------- content/engagements.json ---------- */

const commitmentSchema = z.strictObject({
  code: z.string().regex(/^E\d+$/),
  titre: z.string().min(1),
  texte: nullableString,
  preuve: nullableString,
  valide: z.boolean(),
});

const milestoneSchema = z.strictObject({
  moment: z.string().min(1),
  texte: nullableString,
  valide: z.boolean(),
  source: z.string().min(1).optional(),
});

export const commitmentsSchema = z.strictObject({
  _lisezmoi: z.string(),
  engagements: z.array(commitmentSchema),
  suivi: z.strictObject({
    _lisezmoi: z.string(),
    jalons: z.array(milestoneSchema),
  }),
});
export type Commitments = z.infer<typeof commitmentsSchema>;
export type Commitment = z.infer<typeof commitmentSchema>;
export type Milestone = z.infer<typeof milestoneSchema>;

/* ---------- content/interface.json ---------- */

const text = z.string().min(1);

export const interfaceSchema = z.strictObject({
  _lisezmoi: z.string(),
  boutons: z.strictObject({
    rappel: text,
    appel: text,
    demande_detaillee: text,
    planning: text,
    evaluation: text,
    budget: text,
    sortie_hopital: text,
    aidant: text,
    enfant: text,
    prescripteur: text,
    candidat: text,
    lecture_article: text,
    lecture_accompagnement: text,
    lecture_aides: text,
  }),
  en_tete: z.strictObject({
    aller_au_contenu: text,
    navigation_principale: text,
    accueil: text,
    menu: text,
    fermer_menu: text,
    appeler: text.includes("{téléphone}"),
  }),
  pied_de_page: z.strictObject({
    nous_joindre: text,
    nos_agences: text,
    pour_qui: text,
    nos_services: text,
    territoires: text,
    entreprise: text,
    labels: text,
    navigation_pied: text,
    toutes_les_agences: text,
    aide_a_domicile_en: text.includes("{territoire}"),
    voir_agence: text.includes("{nom}"),
  }),
  confort: z.strictObject({
    libelle: text,
    description: text,
  }),
  semaine_type: z.strictObject({
    exemple_illustratif: text,
    legende: text,
    libre: text,
    creneau: text,
    resume: text.includes("{h}"),
    nuit_singulier: text,
    nuits_pluriel: text.includes("{n}"),
    activites: z.strictObject({
      gestes: text,
      repas: text,
      sorties: text,
      presence: text,
      nuit: text,
    }),
    jours: z.strictObject({
      lun: text,
      mar: text,
      mer: text,
      jeu: text,
      ven: text,
      sam: text,
      dim: text,
    }),
    creneaux: z.strictObject({
      early: text,
      morning: text,
      noon: text,
      afternoon: text,
      evening: text,
      night: text,
    }),
  }),
  tarifs: z.strictObject({
    ttc: text,
    ht: text,
    par_unite: text.includes("{unite}"),
    avant_avantage: text,
    apres_credit: text.includes("{montant}").includes("{taux}"),
    exemple_mensuel: text.includes("{heures}").includes("{montant}"),
    mode: text.includes("{mode}"),
    devis: text,
    unites: z.strictObject({ heure: text, nuit: text, jour: text, forfait: text, mois: text }),
    modes: z.strictObject({ prestataire: text, mandataire: text }),
  }),
  aides: z.strictObject({
    pour_qui: text,
    combien: text,
    comment: text,
    lien_externe: text,
  }),
  situations: z.strictObject({
    lire: text,
  }),
  fil_ariane: z.strictObject({
    nom: text,
    accueil: text,
  }),
  barre_mobile: z.strictObject({
    nom: text,
    appeler: text,
    rappel: text,
    demande: text,
  }),
  formulaires: z.strictObject({
    accroche: text,
    etape_pour_qui: text,
    etape_situation: text,
    etape_besoins: text,
    choix_ouvert: text,
    etape_planning: text,
    raccourcis: z.array(text).length(5),
    estimation: text.includes("{h}"),
    etape_coordonnees: text,
    creneau_rappel: text,
    consentement: text,
    erreur_champ: text.includes("{champ}"),
    telephone_invalide: text,
    hors_idf: text,
    envoi_impossible: text.includes("{téléphone}"),
    succes: text.includes("{délai}"),
    succes_delai_inconnu: text,
    succes_urgence: text.includes("{téléphone}"),
  }),
});
export type InterfaceTexts = z.infer<typeof interfaceSchema>;

/* ---------- content/navigation.json ---------- */

const internalPath = z
  .string()
  .regex(/^\/(?:[a-z0-9-]+\/)*$/, "chemin interne, minuscules, tirets, barre finale");

const navigationChildSchema = z.strictObject({
  libelle: text,
  href: internalPath,
  description: text.optional(),
});

const navigationItemSchema = z
  .strictObject({
    id: slug,
    libelle: text,
    href: internalPath.optional(),
    enfants: z.array(navigationChildSchema).min(1).optional(),
  })
  .refine((item) => (item.href === undefined) !== (item.enfants === undefined), {
    message: "une entrée a soit un href, soit des enfants",
  });

export const navigationSchema = z.strictObject({
  _lisezmoi: z.string(),
  principale: z.array(navigationItemSchema).min(1),
  rappel_href: internalPath,
  demande_href: internalPath,
  contact_href: internalPath,
  pied_de_page: z.strictObject({
    entreprise: z.array(navigationChildSchema).min(1),
    legal: z.array(navigationChildSchema).min(1),
  }),
});
export type Navigation = z.infer<typeof navigationSchema>;

/* ---------- content/semaines-types.json ---------- */

const weekEntrySchema = z.strictObject({
  jour: z.enum(["lun", "mar", "mer", "jeu", "ven", "sam", "dim"]),
  creneau: z.enum(["early", "morning", "noon", "afternoon", "evening", "night"]),
  activite: z.enum(["gestes", "repas", "sorties", "presence", "nuit"]),
  heures: z
    .string()
    .regex(/^\d{1,2}h(?:\d{2})?[–-]\d{1,2}h(?:\d{2})?$/, "plage « 8h30–11h »")
    .optional(),
  libelle: text.optional(),
});

const weekExampleSchema = z
  .strictObject({
    id: slug,
    titre: text,
    contexte: text.optional(),
    /** Renvoi au cahier qui décrit l'exemple : aucune semaine type inventée sans source. */
    source: z.string().regex(/^docs\/0[0-7]/, "renvoi à un cahier docs/0x"),
    entrees: z.array(weekEntrySchema).min(1),
  })
  .refine(
    (example) =>
      new Set(example.entrees.map((e) => `${e.jour}-${e.creneau}`)).size === example.entrees.length,
    { message: "une seule entrée par jour et créneau" },
  );

export const weekExamplesSchema = z.strictObject({
  _lisezmoi: z.string(),
  exemples: z.array(weekExampleSchema).min(1),
});
export type WeekExamples = z.infer<typeof weekExamplesSchema>;
export type WeekExample = z.infer<typeof weekExampleSchema>;
export type NavigationItem = z.infer<typeof navigationItemSchema>;
export type NavigationChild = z.infer<typeof navigationChildSchema>;
