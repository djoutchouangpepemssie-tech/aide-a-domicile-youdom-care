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
  page_aide: z.strictObject({
    mis_a_jour: text.includes("{date}"),
    sources_h2: text,
    source_verifiee: text.includes("{date}"),
    source_consultee: text.includes("{date}"),
    avertissement: text,
    a_retenir: text,
    retour: text,
  }),
  situations: z.strictObject({
    lire: text,
  }),
  mandataire_notice: z.strictObject({
    titre: text,
    texte: text,
  }),
  recherche_commune: z.strictObject({
    champ: text,
    bouton: text,
    oui: text.includes("{commune}").includes("{agence}"),
    oui_sans_agence: text.includes("{commune}"),
    aucun_resultat: text,
    suggestions: text.includes("{n}"),
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

/* ---------- content/pages/accueil.json ---------- */

const illustrationName = z.enum(["maison", "mains", "tasse", "lune", "cartable", "carnet"]);
const engagementCode = z.string().regex(/^E\d+$/);

export const homePageSchema = z.strictObject({
  _lisezmoi: z.string(),
  banniere: z.strictObject({
    sur_titre: text,
    h1: text,
    chapo: text,
    lien_telephone: text.includes("{téléphone}"),
    reassurance: z.array(text).min(1),
    note_astérisque: text,
    note_href: internalPath,
    illustration: illustrationName,
  }),
  situations: z.strictObject({
    h2: text,
    texte: text,
    cartes: z
      .array(
        z.strictObject({
          citation: text,
          texte: text,
          lien: text,
          href: internalPath,
          illustration: illustrationName,
        }),
      )
      .length(6),
  }),
  engagements: z.strictObject({
    h2: text,
    items: z.array(z.strictObject({ engagement: engagementCode, titre: text, texte: text })).min(1),
  }),
  neuro: z.strictObject({
    h2: text,
    texte: text,
    stades: z.array(z.strictObject({ titre: text, texte: text.optional() })).length(3),
    bouton: text,
    href: internalPath,
  }),
  semaine: z.strictObject({
    h2: text,
    texte: text,
    onglets_nom: text,
    onglets: z.array(z.strictObject({ exemple: slug, libelle: text })).length(3),
  }),
  etapes: z.strictObject({
    h2: text,
    items: z
      .array(
        z
          .strictObject({
            titre: text,
            texte: text,
            texte_engagement: text.optional(),
            engagement: engagementCode.optional(),
          })
          .refine(
            (step) => (step.texte_engagement === undefined) === (step.engagement === undefined),
            {
              message: "texte_engagement et engagement vont ensemble",
            },
          ),
      )
      .min(1),
  }),
  prix: z.strictObject({
    h2: text,
    texte: text,
    carte_tarifs: z.strictObject({ titre: text, bouton: text, href: internalPath }),
    carte_aides: z.strictObject({ titre: text, aides: z.array(text).min(1), href: internalPath }),
  }),
  proches: z.strictObject({
    h2: text,
    texte: text,
    href: internalPath,
    illustration: illustrationName,
  }),
  territoire: z.strictObject({
    h2: text,
    texte: text.includes("{agences}"),
  }),
  magazine: z.strictObject({
    h2: text,
    bouton: text,
    href: internalPath,
  }),
  appel_final: z.strictObject({
    h2: text,
    texte: text,
    bouton_telephone: text.includes("{téléphone}"),
  }),
  recrutement: z.strictObject({
    accroche: text,
    texte: text,
    lien: text,
    href: internalPath,
  }),
});
export type HomePage = z.infer<typeof homePageSchema>;

/* ---------- Pages de fonctionnement (docs/03 §9) ---------- */

/** Balises titre (50 à 60 caractères) et description (140 à 155) de docs/01 §8. */
export const seoFieldsSchema = z.strictObject({
  titre: z.string().min(50).max(60),
  description: z.string().min(140).max(155),
});
export type SeoFields = z.infer<typeof seoFieldsSchema>;

const gatedItemSchema = z
  .strictObject({
    titre: text,
    texte: text,
    texte_engagement: text.optional(),
    engagement: engagementCode.optional(),
  })
  .refine((item) => (item.texte_engagement === undefined) === (item.engagement === undefined), {
    message: "texte_engagement et engagement vont ensemble",
  });

const faqItemSchema = z.strictObject({
  id: slug,
  question: text,
  reponse: text,
  /** Affiché seulement si la condition est vraie dans site.config.json. */
  condition: z.enum(["disponibilite_24_7"]).optional(),
  lien: z.strictObject({ libelle: text, href: internalPath }).optional(),
});
export type FaqItem = z.infer<typeof faqItemSchema>;

export const howItWorksSchema = z.strictObject({
  _lisezmoi: z.string(),
  seo: seoFieldsSchema,
  h1: text,
  chapo: text,
  etapes_h2: text,
  suivi: z.strictObject({ h2: text, texte: text }),
  si_ca_ne_va_pas: z.strictObject({ h2: text, items: z.array(gatedItemSchema).min(1) }),
  faq: z.strictObject({ h2: text, items: z.array(faqItemSchema).min(1) }),
  appel: z.strictObject({ h2: text, texte: text }),
});
export type HowItWorksPage = z.infer<typeof howItWorksSchema>;

const modeChoiceSchema = z.strictObject({ titre: text, texte: text, mode: interventionModeSchema });

export const modesPageSchema = z.strictObject({
  _lisezmoi: z.string(),
  seo: seoFieldsSchema,
  ariane: text,
  h1: text,
  chapo: text,
  tableau: z.strictObject({
    h2: text,
    legende: text,
    colonnes: z.strictObject({ critere: text, prestataire: text, mandataire: text }),
    lignes: z.array(z.strictObject({ critere: text, prestataire: text, mandataire: text })).min(3),
    note: text,
  }),
  question: z.strictObject({ h2: text, texte: text, oui: modeChoiceSchema, non: modeChoiceSchema }),
  appel: z.strictObject({ h2: text, texte: text }),
  liens: z.strictObject({ tarifs: z.strictObject({ libelle: text, href: internalPath }) }),
});
export type ModesPage = z.infer<typeof modesPageSchema>;

/* ---------- content/aides.json ---------- */

const externalSource = z.strictObject({ libelle: text, href: z.url() });

const aidSchema = z.strictObject({
  id: slug,
  nom: text,
  pour_qui: text,
  comment: text,
  page: internalPath,
  source: externalSource,
});
export type Aid = z.infer<typeof aidSchema>;

export const aidsSchema = z.strictObject({
  _lisezmoi: z.string(),
  aides: z.array(aidSchema).min(1),
});
export type Aids = z.infer<typeof aidsSchema>;

/* ---------- content/pages/tarifs-et-aides.json ---------- */

export const pricingPageSchema = z.strictObject({
  _lisezmoi: z.string(),
  seo: seoFieldsSchema,
  ariane: text,
  h1: text,
  chapo: text,
  tarifs: z.strictObject({
    h2: text,
    texte: text,
    colonnes: z.strictObject({
      prestation: text,
      activite: text,
      mode: text,
      prix_ttc: text,
      prix_ht: text,
      apres_credit: text,
    }),
    date_application: text.includes("{date}"),
    majorations_h3: text,
    degressivite_h3: text,
    degressivite_ligne: text.includes("{heures}").includes("{prix}"),
  }),
  sans_tarifs: z.strictObject({ titre: text, texte: text }),
  exemples: z.strictObject({
    h2: text,
    texte: text.includes("{semaines}"),
    heures: z.array(z.number().int().positive()).min(1).max(4),
    colonne_heures: text.includes("{heures}"),
    avant: text,
    apres: text,
  }),
  frais: z.strictObject({ h2: text, texte: text }),
  devis: z.strictObject({ titre: text, texte: text }),
  aides: z.strictObject({ h2: text, texte: text, lien_page: text }),
  appel: z.strictObject({ h2: text, texte: text }),
});
export type PricingPage = z.infer<typeof pricingPageSchema>;

/* ---------- content/aides/{id}.json : pages détaillées par aide ---------- */

const sourceSchema = z.strictObject({
  libelle: text,
  href: z.url(),
  /** Date « Vérifié le » affichée par la source, si elle en publie une. */
  verifie_le: isoDate.optional(),
  /** Date à laquelle la loop a lu la source. */
  consulte_le: isoDate,
});
export type Source = z.infer<typeof sourceSchema>;

const amountSchema = z.strictObject({
  libelle: text,
  valeur: text,
  precision: text.optional(),
});

const aidSectionSchema = z
  .strictObject({
    h2: text,
    paragraphes: z.array(text).optional(),
    montants: z.array(amountSchema).min(1).optional(),
    liste: z.array(text).optional(),
  })
  .refine((s) => s.paragraphes !== undefined || s.montants !== undefined || s.liste !== undefined, {
    message: "une section a au moins un paragraphe, un montant ou une liste",
  });

export const aidPageSchema = z.strictObject({
  id: slug,
  seo: seoFieldsSchema,
  ariane: text,
  h1: text,
  chapo: text,
  maj: isoDate,
  sources: z.array(sourceSchema).min(1),
  sections: z.array(aidSectionSchema).min(1),
  a_retenir: z.array(text).min(1),
  demarche: z.strictObject({
    h2: text,
    etapes: z.array(z.strictObject({ titre: text, texte: text })).min(1),
  }),
  appel: z.strictObject({ h2: text, texte: text }),
});
export type AidPage = z.infer<typeof aidPageSchema>;

/* ---------- content/pages/a-propos.json ---------- */

const teamMemberSchema = z.strictObject({
  nom: text,
  fonction: text,
  photo: text.optional(),
});

export const aboutSchema = z.strictObject({
  _lisezmoi: z.string(),
  a_propos: z.strictObject({
    seo: seoFieldsSchema,
    ariane: text,
    h1: text,
    chapo: text,
    manifeste: z.strictObject({ h2: text, paragraphes: z.array(text).min(1) }),
    engagements: z.strictObject({ h2: text, texte: text, lien: text }),
    histoire: z.strictObject({ h2: text, paragraphes: z.array(text).min(1) }).nullable(),
    equipe: z.strictObject({ h2: text, membres: z.array(teamMemberSchema).min(1) }).nullable(),
    territoire: z.strictObject({
      h2: text,
      texte: text.includes("{agences}"),
      lien: text,
      href: internalPath,
    }),
    charte: z.strictObject({ h2: text, texte: text, lien: text }),
  }),
  engagements_page: z.strictObject({
    seo: seoFieldsSchema,
    ariane: text,
    h1: text,
    chapo: text,
    suivi_h2: text,
    preuve_libelle: text,
  }),
  charte_page: z.strictObject({
    seo: seoFieldsSchema,
    ariane: text,
    h1: text,
    chapo: text,
    principes: z.array(z.strictObject({ titre: text, texte: text })).min(3),
    contact: z.strictObject({ h2: text, texte: text }),
  }),
});
export type AboutContent = z.infer<typeof aboutSchema>;
export type NavigationItem = z.infer<typeof navigationItemSchema>;
export type NavigationChild = z.infer<typeof navigationChildSchema>;
