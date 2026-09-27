import { z } from "zod";
import { iconNames, type IconName } from "../components/ui/Icon/icons";

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

/* ---------- Photos (docs/design/PHOTOS.md, docs/design/CONCEPT.md §2) ---------- */

/**
 * Une photo d'illustration servie depuis public/images/ : chemin local, texte alternatif
 * descriptif et neutre (jamais de prénom, jamais « notre équipe »), point d'intérêt au format
 * `object-position` (« 50% 40% »). Le ratio d'affichage est choisi par le composant.
 */
export const photoSchema = z.strictObject({
  src: z.string().regex(/^\/images\/[a-z0-9-]+(?:\/[a-z0-9-]+)*\.(?:jpg|jpeg|png|webp|avif)$/, {
    message: "chemin local sous /images/",
  }),
  alt: z.string().trim().min(1),
  focal: z
    .string()
    .regex(/^\d{1,3}% \d{1,3}%$/, "point d'intérêt « 50% 40% »")
    .optional(),
});
export type Photo = z.infer<typeof photoSchema>;

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
    /** Sélecteur segmenté des exemples (WeekStory) et mention sous le récit. */
    choisir_exemple: text,
    prenom_fictif: text,
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
  service: z.strictObject({
    /** docs/03 §4 : sélecteur « pour un proche / pour vous-même » du chapô. */
    lecteur: z.strictObject({ legende: text, proche: text, soi: text }),
    situations_h2: text,
    actions_h2: text,
    rubriques: z.strictObject({ gestes: text, presence: text, lien: text, coordination: text }),
    stades_h2: text,
    semaine_h2: text,
    suivi_h2: text,
    proches_h2: text,
    proches_lien: text,
    repit_lien: text,
    intervenants_h2: text,
    ne_faisons_pas_h2: text,
    cout_h2: text,
    cout_lien: text,
    faq_h2: text,
    formulaire_h2: text,
    formulaire_texte: text,
    sources_h2: text,
    auteur: text.includes("{nom}").includes("{fonction}"),
    relu_par: text.includes("{nom}").includes("{fonction}").includes("{date}"),
    non_relu: text,
    maj: text.includes("{date}"),
    /** Carte de relecture (SourcesList) : tant que `relu_par` est vide. */
    relecture_attendue: text,
    /** Encart « Ce que nous ne faisons pas », variante `frontiere` du Callout. */
    frontiere: z.strictObject({
      sous_titre: text,
      colonne_faits: text,
      colonne_relais: text,
      ligne_fin: text,
    }),
    pilier_lien: text.includes("{titre}"),
    /** Bloc « À lire aussi » (RelatedLinks, docs/04 §2 « Maillage »), avant le formulaire. */
    a_lire_aussi_h2: text,
    soeurs_h2: text,
    commune_lien: text,
    publics: z.strictObject({
      neuro: text,
      "personne-agee": text,
      "adulte-handicap": text,
      "enfant-handicap": text,
      aidant: text,
      transverse: text,
    }),
    /** Nom de la rangée de liens-icônes vers les sous-pages d'un pilier (sous le hero). */
    sous_pages_nom: text,
    /**
     * Gestes d'entrée des heros (docs/design/CONCEPT.md §4, src/components/blocks/HeroGestures/).
     * Les clés des choix sont les valeurs des paramètres de requête transmis aux formulaires
     * (`?planning=`, `?nuit=`, `?duree=`, `?sortie=`) : elles ne changent pas sans le formulaire.
     */
    gestes: z.strictObject({
      stades: z.strictObject({ question: text, choix: z.array(text).length(3) }),
      planning: z.strictObject({
        question: text,
        choix: z.strictObject({
          "matin-soir": text,
          semaine: text,
          "week-end": text,
          "24h": text,
        }),
      }),
      fiche_de_vie: z.strictObject({
        titre: text,
        sous_titre: text,
        voir: text,
        recto: text,
        lignes: z.strictObject({
          aime: text,
          apaise: text,
          difficulte: text,
          communique: text,
          routines: text,
          protocoles: text,
        }),
      }),
      questionnaire: z.strictObject({ mention: text }),
      nuit: z.strictObject({
        question: text,
        calme: z.strictObject({ titre: text, texte: text }),
        active: z.strictObject({ titre: text, texte: text }),
        duree_question: text,
        durees: z.strictObject({ jours: text, semaines: text, durable: text }),
      }),
      sortie: z.strictObject({
        question: text,
        choix: z.strictObject({ demain: text, semaine: text, "a-confirmer": text }),
      }),
    }),
  }),
  barre_mobile: z.strictObject({
    nom: text,
    appeler: text,
    rappel: text,
    demande: text,
    /** Libellés courts affichés sur une ligne à 375 px ; les libellés complets restent le nom accessible. */
    court: z.strictObject({
      appeler: text,
      rappel: text,
      demande: text,
    }),
  }),
  /** Rail de conversion des pages intérieures (ConversionRail, docs/design/CONCEPT.md §7). */
  rail_conversion: z.strictObject({
    nom: text,
    appeler: text.includes("{téléphone}"),
    reassurance: text,
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
    etape_sur: text.includes("{n}").includes("{total}"),
    retour: text,
    suivant: text,
    envoyer: text,
    envoi_en_cours: text,
    erreurs_titre: text,
    conservation: text,
    champs: z.strictObject({
      prenom: text,
      nom: text,
      telephone: text,
      commune: text,
      pour_qui: text,
      rythme: text,
      debut: text,
      consentement: text,
    }),
    pour_qui_options: z.array(text).length(6),
    choix_parler: text,
    email: text,
    email_aide: text,
    message: text,
    message_aide: text,
    consentement_requis: text,
    etape_titres: z.strictObject({
      pour_qui: text,
      situation: text,
      besoins: text,
      planning: text,
      coordonnees: text,
    }),
    rappel: z.strictObject({
      titre_etape: text,
      prenom: text,
      nom: text,
      telephone: text,
      commune: text,
      creneau_rappel: text,
      creneau_choisir: text,
      creneaux_rappel: z.array(text).min(2).max(6),
      usage_coordonnees: text,
      confidentialite: text,
    }),
  }),
  planning: z.strictObject({
    rythme_question: text,
    rythmes: z.strictObject({ regulier: text, ponctuel: text, "24h": text, inconnu: text }),
    grille_legende: text,
    raccourcis_legende: text,
    raccourci_matins: text,
    tout_effacer: text,
    cellule: text.includes("{jour}").includes("{creneau}").includes("{debut}").includes("{fin}"),
    creneaux_jour_zero: text,
    creneaux_jour_singulier: text,
    creneaux_jour_pluriel: text.includes("{n}"),
    resume_vide: text,
    estimation_suite: text,
    horaires_precis: text,
    horaires_legende: text,
    plage_nom: text.includes("{jour}").includes("{n}"),
    plage_de: text,
    plage_a: text,
    ajouter_plage: text,
    retirer_plage: text,
    copier_jour: text,
    copier_choisir: text,
    copier_tous: text,
    copier: text,
    nuit_question: text,
    nuits: z.strictObject({ calme: text, active: text, inconnu: text }),
    debut_question: text,
    debuts: z.strictObject({ "48h": text, semaine: text, mois: text, information: text }),
    budget: text.includes("{avant}").includes("{apres}"),
    budget_mention: text,
    dates_legende: text,
    date_unique: text,
    ajouter_date: text,
    periode_du: text,
    periode_au: text,
    ajouter_periode: text,
    retirer_date: text,
    dates_choisies: text.includes("{n}"),
    aucune_date: text,
    dates_maximum: text.includes("{max}"),
    creneaux_dates: text,
    resume_dates: text.includes("{h}").includes("{n}"),
    tous_les_jours_question: text,
    tous_les_jours: text,
    jours_choisis: text,
    jours_legende: text,
    grille_24h: text,
    debut_date: text,
    duree_question: text,
    durees: z.strictObject({ jours: text, semaines: text, durable: text }),
  }),
  /**
   * Pages locales et agences (docs/04 §4, P6.5 et P6.6) : gabarit `LocalTemplate`, carte
   * régionale, `LocalFactsGrid`, `AgencyCard`. Le jeton {lieu} reçoit « à Puteaux », « dans les
   * Hauts-de-Seine » ou « à Paris 15e » (`lieu.*`) ; {cp}, {agence}, {distance}, {source} et
   * {date} sont remplis par les composants.
   */
  local: z.strictObject({
    sur_titre: text,
    lieu: z.strictObject({
      commune: text.includes("{nom}"),
      /** Élisions : « au Blanc-Mesnil », « aux Mureaux » (le nom est donné sans son article). */
      commune_le: text.includes("{nom}"),
      commune_les: text.includes("{nom}"),
      arrondissement: text.includes("{numero}"),
      quartier: text.includes("{nom}"),
      /** Préposition et nom par département : « dans les Hauts-de-Seine ». */
      departements: z.strictObject({
        "75": text,
        "77": text,
        "78": text,
        "91": text,
        "92": text,
        "93": text,
        "94": text,
        "95": text,
      }),
    }),
    h1: text.includes("{lieu}"),
    h1_code_postal: text.includes("{lieu}").includes("{cp}"),
    reassurance_7j7: text,
    reassurance_24h: text,
    reponse: z.strictObject({
      oui: text.includes("{lieu}"),
      agence: text.includes("{agence}").includes("{distance}"),
      agence_proche: text.includes("{agence}"),
      /** L'agence est installée dans le territoire même (code INSEE identique). */
      agence_ici: text.includes("{agence}").includes("{lieu}"),
      /** Page de département : l'agence du département, ou la plus proche, sans distance. */
      agence_departement: text.includes("{agence}").includes("{commune}"),
      agence_hors_departement: text.includes("{agence}").includes("{commune}"),
      voir_agence: text.includes("{nom}"),
      appeler: text.includes("{téléphone}"),
    }),
    vivre_h2: text.includes("{lieu}"),
    reperes_h3: text,
    demographie: z.strictObject({
      population: text.includes("{millesime}"),
      habitants: text.includes("{n}"),
      part_60_74: text,
      part_75_89: text,
      part_90_plus: text,
      part_75_plus: text,
      source: text,
    }),
    ressources_h2: text,
    ressources_texte: text,
    faits: z.strictObject({
      source: text.includes("{source}").includes("{date}"),
      site_officiel: text,
      lien_externe: text,
      telephone: text,
      adresse: text,
      types: z.strictObject({
        "point-information": text,
        ccas: text,
        mdph: text,
        "service-apa": text,
        "accueil-jour": text,
        "residence-autonomie": text,
        ehpad: text,
        hopital: text,
        "consultation-memoire": text,
        "plateforme-repit": text,
        "transport-adapte": text,
        association: text,
        marche: text,
        "espace-vert": text,
        "equipement-seniors": text,
        habitat: text,
        "relief-deplacements": text,
        demographie: text,
        "aide-departementale": text,
        autre: text,
      }),
    }),
    accompagnements_h2: text.includes("{lieu}"),
    accompagnements_texte: text,
    exemple_h2: text,
    exemple_texte: text,
    aides_h2: text,
    aides_texte: text,
    aides_lien: text,
    voisines_h2: text,
    /** Page de département : liste des pages de communes et d'arrondissements construites. */
    communes_h2: text.includes("{lieu}"),
    communes_texte: text,
    voisines_texte: text,
    voisines_distance: text.includes("{distance}"),
    autres_pages_h3: text,
    questions_h2: text,
    formulaire_h2: text,
    formulaire_texte: text,
    non_relu: text,
    auteur: text.includes("{nom}").includes("{fonction}"),
    maj: text.includes("{date}"),
    donnees: text.includes("{date}"),
    territoires: text,
    carte: z.strictObject({
      titre: text,
      description: text,
      liste: text,
      lien: text.includes("{lieu}"),
    }),
    agence: z.strictObject({
      adresse: text,
      telephone: text,
      standard: text,
      horaires: text,
      itineraire: text,
      itineraire_externe: text,
      communes_h2: text,
      communes_texte: text,
      communes_aucune: text,
      departement_lien: text.includes("{lieu}"),
      voir: text.includes("{nom}"),
    }),
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
    /** Libellé court pour la barre de l'en-tête (une ligne) ; `libelle` reste le nom accessible et le libellé du menu mobile. */
    libelle_court: text.optional(),
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
    /** Photo d'ambiance de l'exemple (docs/design/PHOTOS.md §5) : jamais la personne de l'exemple. */
    photo: photoSchema.optional(),
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

/** Nom d'icône du registre `Icon` (docs/design/ICONES.md), validé contre le registre. */
const homeIconName = z.enum(iconNames as [IconName, ...IconName[]]);

/**
 * Parcours « Pour qui cherchez-vous de l'aide ? » (docs/design/CONCEPT.md §3 et §8) : la
 * question, six choix (icône 32 px, lien de repli sans JavaScript), le titre du panneau du
 * bloc 2 avec son jeton {pour}, rempli par le `pour` de chaque choix. Un choix sans `pour` n'a
 * pas de panneau : c'est un lien direct (« Je ne sais pas encore » → Être rappelé(e)), auquel la
 * page ajoute `?motif=<id>` ; la page de rappel affiche alors le message de `motifs[id]`
 * (content/pages/etre-rappele.json).
 */
const homeJourneySchema = z.strictObject({
  _lisezmoi: z.string().optional(),
  question: text,
  choix: z
    .array(
      z.strictObject({
        id: slug,
        libelle: text,
        /** Complément du titre du panneau (« pour votre parent ») ; absent : lien direct. */
        pour: text.optional(),
        icone: homeIconName,
        href: internalPath,
      }),
    )
    .length(6),
  titre_panneau: text.includes("{pour}"),
  autre: text,
  toutes: text,
});
const engagementCode = z.string().regex(/^E\d+$/);

/** Balises titre (50 à 60 caractères) et description (140 à 155) de docs/01 §8. */
export const seoFieldsSchema = z.strictObject({
  titre: z.string().min(50).max(60),
  description: z.string().min(140).max(155),
});
export type SeoFields = z.infer<typeof seoFieldsSchema>;

export const homePageSchema = z.strictObject({
  _lisezmoi: z.string(),
  /** Balise titre et description de l'accueil (modèle de docs/01 §8). */
  seo: seoFieldsSchema,
  banniere: z.strictObject({
    sur_titre: text,
    h1: text,
    chapo: text,
    lien_telephone: text.includes("{téléphone}"),
    reassurance: z.array(text).min(1),
    note_astérisque: text,
    note_href: internalPath,
    illustration: illustrationName,
    /** Photo du hero (docs/design/CONCEPT.md §3 bloc 1) ; absente : illustration au fil. */
    photo: photoSchema.optional(),
    /** Point où le fil du hero pose son nœud (« 49% 82% ») : un objet, une main, jamais un visage. */
    noeud: photoSchema.shape.focal,
    /** Geste d'entrée « Pour qui cherchez-vous de l'aide ? » ; absent : pas de picker. */
    parcours: homeJourneySchema.optional(),
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
          /** Icône 48 px de la carte (docs/design/CONCEPT.md §3 bloc 2). */
          icone: homeIconName,
        }),
      )
      .length(6),
  }),
  engagements: z.strictObject({
    h2: text,
    items: z
      .array(
        z.strictObject({
          engagement: engagementCode,
          titre: text,
          texte: text,
          /** Icône 32 px dans le nœud du fil (docs/design/CONCEPT.md §3 bloc 3) ; décorative. */
          icone: homeIconName.optional(),
        }),
      )
      .min(1),
  }),
  neuro: z.strictObject({
    h2: text,
    texte: text,
    stades: z
      .array(
        z.strictObject({
          titre: text,
          texte: text.optional(),
          /** Icône 32 px dans le nœud du stade ; décorative. */
          icone: homeIconName.optional(),
        }),
      )
      .length(3),
    bouton: text,
    href: internalPath,
    photo: photoSchema.optional(),
  }),
  semaine: z.strictObject({
    h2: text,
    texte: text,
    /** Exemples du sélecteur segmenté (nom accessible : interface.json > semaine_type.choisir_exemple). */
    onglets: z
      .array(
        z.strictObject({
          exemple: slug,
          libelle: text,
          photo: photoSchema.optional(),
          /** Icône 24 px dans le bouton du sélecteur ; décorative. */
          icone: homeIconName.optional(),
        }),
      )
      .length(3),
  }),
  etapes: z.strictObject({
    h2: text,
    photo: photoSchema.optional(),
    items: z
      .array(
        z
          .strictObject({
            titre: text,
            texte: text,
            texte_engagement: text.optional(),
            engagement: engagementCode.optional(),
            /** Icône 24 px dans le nœud de l'étape ; décorative. */
            icone: homeIconName.optional(),
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
    /** Carte de repli tant que content/tarifs.json est vide : aucun chiffre. */
    carte_devis: z.strictObject({ titre: text, texte: text }),
    carte_aides: z.strictObject({ titre: text, aides: z.array(text).min(1), href: internalPath }),
  }),
  proches: z.strictObject({
    h2: text,
    texte: text,
    href: internalPath,
    illustration: illustrationName,
    photo: photoSchema.optional(),
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

/* ---------- content/pages/ou-en-etes-vous.json (docs/03 §7) ---------- */

const adviceSchema = z.strictObject({
  texte: text,
  lien: z.strictObject({ libelle: text, href: z.string().min(1) }).optional(),
});

/** Questionnaire « Où en êtes-vous ? » : huit questions, trois niveaux, aucune donnée conservée. */
export const caregiverCheckSchema = z
  .strictObject({
    _lisezmoi: z.string(),
    seo: seoFieldsSchema,
    ariane: text,
    h1: text,
    chapo: text,
    avertissement: z.strictObject({ titre: text, texte: text }),
    reponses: z
      .array(z.strictObject({ valeur: z.number().int().min(0), libelle: text }))
      .min(2)
      .max(4),
    questions: z.array(z.strictObject({ id: slug, texte: text })).length(8),
    bouton_resultat: text,
    bouton_recommencer: text,
    incomplet: text.includes("{n}"),
    resultat_h2: text,
    niveaux: z
      .array(
        z.strictObject({
          id: slug,
          min: z.number().int().min(0),
          max: z.number().int().min(0),
          titre: text,
          texte: text,
          conseils: z.array(adviceSchema).min(2).max(5),
        }),
      )
      .length(3),
    appel: z.strictObject({ titre: text, texte: text, bouton: text, href: internalPath }),
    retour: z.strictObject({ libelle: text, href: internalPath }),
  })
  .refine(
    (page) => {
      const max = page.questions.length * Math.max(...page.reponses.map((r) => r.valeur));
      const sorted = [...page.niveaux].sort((a, b) => a.min - b.min);
      const first = sorted[0];
      const last = sorted[sorted.length - 1];
      if (!first || !last) return false;
      return (
        first.min === 0 &&
        last.max === max &&
        sorted.every((n, i) => {
          const previous = sorted[i - 1];
          return n.max >= n.min && (previous === undefined || n.min === previous.max + 1);
        })
      );
    },
    { message: "les trois niveaux doivent couvrir toute l’échelle, sans trou ni chevauchement" },
  );
export type CaregiverCheckPage = z.infer<typeof caregiverCheckSchema>;

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

export const sourceSchema = z.strictObject({
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

/* ---------- content/pages/merci.json ---------- */

export const thanksSchema = z.strictObject({
  _lisezmoi: z.string(),
  seo: seoFieldsSchema,
  h1: text,
  suite_h2: text,
  lectures_h2: text,
  lectures: z.array(z.strictObject({ libelle: text, href: internalPath })).length(2),
  retour_accueil: text,
  variantes: z.record(slug, z.strictObject({ h1: text, texte: text })),
});
export type ThanksContent = z.infer<typeof thanksSchema>;

/* ---------- content/pages/etre-rappele.json ---------- */

export const callbackPageSchema = z.strictObject({
  _lisezmoi: z.string(),
  seo: seoFieldsSchema,
  ariane: text,
  h1: text,
  chapo: text,
  /**
   * Message affiché au-dessus du formulaire selon `?motif=<clé>` dans l'adresse (lu côté client,
   * rien n'est conservé) : `inconnu` vient du choix « Je ne sais pas encore » de l'accueil.
   */
  motifs: z.record(slug, text),
  appel_h2: text,
  appel_texte: text.includes("{téléphone}"),
});
export type CallbackPage = z.infer<typeof callbackPageSchema>;

/* ---------- content/pages/plan-du-site.json (docs/04 §2 « Maillage », P5.5) ---------- */

export const siteMapPageSchema = z.strictObject({
  _lisezmoi: z.string(),
  seo: seoFieldsSchema,
  ariane: text,
  h1: text,
  chapo: text,
  /** Titres des groupes ; un groupe sans page construite n'est pas affiché. */
  groupes: z.strictObject({
    fonctionnement: text,
    pour_qui: text,
    services: text,
    aidants: text,
    formulaires: text,
    territoires: text,
    entreprise: text,
    legal: text,
  }),
});
export type SiteMapPage = z.infer<typeof siteMapPageSchema>;

/* ---------- content/pages/404.json (docs/04 §2 « Erreurs ») ---------- */

export const notFoundPageSchema = z.strictObject({
  _lisezmoi: z.string(),
  seo: seoFieldsSchema,
  ariane: text,
  h1: text,
  texte: text,
  commune_h2: text,
  commune_texte: text,
  piliers_h2: text,
  appel_h2: text,
  appel_texte: text.includes("{téléphone}"),
  liens_h2: text,
  plan_du_site: text,
  retour_accueil: text,
});
export type NotFoundPage = z.infer<typeof notFoundPageSchema>;

/* ---------- content/formulaires/*.json (docs/05 §5) ---------- */

const situationQuestionSchema = z.strictObject({
  id: z.string().regex(/^[a-z][a-z0-9_]{0,39}$/, "identifiant simple (clé de situation)"),
  question: text,
  type: z.enum(["choix", "choix_multiple"]),
  options: z.array(text).min(2).max(12),
});

export const formDefinitionSchema = z.strictObject({
  _lisezmoi: z.string(),
  id: z.enum([
    "neuro",
    "personne-agee",
    "adulte-handicap",
    "enfant-handicap",
    "aidant",
    "nuit-24h",
  ]),
  slug,
  seo: seoFieldsSchema,
  ariane: text,
  h1: text,
  chapo: text,
  /** Grille de planning préremplie à l'ouverture (docs/05 §5 : nuit-24h). */
  planning_initial: z.enum(["nuits"]).optional(),
  situation: z.array(situationQuestionSchema).min(1).max(8),
  besoins: z.array(text).min(3).max(12),
});
export type FormDefinition = z.infer<typeof formDefinitionSchema>;

/* ---------- content/pages/demande.json ---------- */

export const requestIndexSchema = z.strictObject({
  _lisezmoi: z.string(),
  seo: seoFieldsSchema,
  ariane: text,
  h1: text,
  chapo: text,
  presse_h2: text,
  presse_texte: text,
  /** Formulaires hors fabrique, listés après les cas (docs/05 §2). */
  autres: z.array(
    z.strictObject({
      id: z.enum(["sortie-hospitalisation", "professionnel"]),
      libelle: text,
      texte: text,
    }),
  ),
});
export type RequestIndexPage = z.infer<typeof requestIndexSchema>;

/* ---------- content/pages/formulaires-speciaux.json ---------- */

export const specialFormsSchema = z.strictObject({
  _lisezmoi: z.string(),
  sortie_hospitalisation: z.strictObject({
    seo: seoFieldsSchema,
    ariane: text,
    h1: text,
    chapo: text,
    bandeau_titre: text,
    bandeau_texte: text.includes("{téléphone}"),
    etape_date: text,
    date: text,
    date_aide: text,
    etape_lieu: text,
    hopital: text,
    hopital_aide: text,
    commune: text,
    etape_besoins: text,
    besoins: z.array(text).min(3).max(12),
    etape_coordonnees: text,
    vous_etes: text,
    roles: z.array(text).min(2).max(4),
  }),
  professionnel: z.strictObject({
    seo: seoFieldsSchema,
    ariane: text,
    h1: text,
    chapo: text,
    etape_vous: text,
    structure: text,
    fonction: text,
    telephone: text,
    etape_situation: text,
    commune: text,
    type_besoin: text,
    types: z.array(text).min(2).max(8),
    echeance: text,
    message: text,
    anonymat: text,
  }),
  contact: z.strictObject({
    seo: seoFieldsSchema,
    ariane: text,
    h1: text,
    chapo: text,
    sujet: text,
    sujets: z.array(text).min(2).max(8),
    message: text,
    message_aide: text,
    demande_h2: text,
    demande_texte: text,
    demande_lien: text,
  }),
});
export type SpecialForms = z.infer<typeof specialFormsSchema>;

/* ---------- content/emails.json (docs/01 §9) ---------- */

export const emailsSchema = z.strictObject({
  _lisezmoi: z.string(),
  accuse: z.strictObject({
    objet: text,
    corps: text.includes("{prénom}").includes("{délai}").includes("{téléphone}"),
    delai_inconnu: text,
    signature: text,
  }),
  equipe: z.strictObject({
    objet: text.includes("{formulaire}").includes("{commune}").includes("{urgence}"),
    objet_sans_commune: text.includes("{formulaire}").includes("{urgence}"),
    coordonnees: text,
    appeler: text,
    rappel_prefere: text,
    urgence: text,
    pour_qui: text,
    situation: text,
    besoins: text,
    planning: text,
    heures: text.includes("{h}"),
    nuit: text,
    dates: text,
    creneaux_dates: text,
    duree: text,
    message: text,
    origine: text,
    agence: text,
    consentement: text,
    oui: text,
    non: text,
    version_consentement: text.includes("{version}"),
    json: text,
    recu_le: text.includes("{date}"),
    formulaires: z.strictObject({
      rappel: text,
      neuro: text,
      "personne-agee": text,
      "adulte-handicap": text,
      "enfant-handicap": text,
      aidant: text,
      "sortie-hospitalisation": text,
      "nuit-24h": text,
      professionnel: text,
      candidature: text,
      contact: text,
    }),
    rythmes: z.strictObject({ regulier: text, ponctuel: text, "24h": text, inconnu: text }),
    nuits: z.strictObject({ calme: text, active: text, inconnu: text }),
    durees: z.strictObject({ jours: text, semaines: text, durable: text }),
  }),
});
export type EmailTexts = z.infer<typeof emailsSchema>;
export type NavigationItem = z.infer<typeof navigationItemSchema>;
export type NavigationChild = z.infer<typeof navigationChildSchema>;

/* ---------- content/pages/aide-a-domicile.json (docs/04 §4, carte régionale, P6.5) ---------- */

export const regionPageSchema = z.strictObject({
  _lisezmoi: z.string(),
  seo: seoFieldsSchema,
  ariane: text,
  h1: text,
  chapo: text,
  carte_h2: text,
  carte_texte: text,
  recherche_h2: text,
  recherche_texte: text,
  agences_h2: text,
  /** Contient {agences} (nombre d'agences de site.config.json). */
  agences_texte: text.includes("{agences}"),
  agences_lien: text,
  appel_h2: text,
  appel_texte: text,
});
export type RegionPage = z.infer<typeof regionPageSchema>;

/* ---------- content/pages/agences.json (docs/00 §5, docs/04 §2 LocalBusiness, P6.6) ---------- */

export const agenciesPageSchema = z.strictObject({
  _lisezmoi: z.string(),
  index: z.strictObject({
    seo: seoFieldsSchema,
    ariane: text,
    h1: text,
    /** Contient {agences}. */
    chapo: text.includes("{agences}"),
    territoires_texte: text,
    territoires_lien: text,
  }),
  page: z.strictObject({
    sur_titre: text,
    /** Contient {adresse} (adresse postale complète) et {lieu} (« dans les Hauts-de-Seine »). */
    chapo: text.includes("{adresse}").includes("{lieu}"),
    rappel_h2: text,
    rappel_texte: text,
  }),
  /** Balises titre et description de chaque agence, par `id` de site.config.json : uniques. */
  agences: z.record(slug, z.strictObject({ seo: seoFieldsSchema })),
});
export type AgenciesPage = z.infer<typeof agenciesPageSchema>;
