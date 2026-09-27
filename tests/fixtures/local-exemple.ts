import type { LocalData, LocalEditorial } from "@/content/local-schema";

/*
 * Territoire fictif complet (données + éditorial), pour les tests unitaires du gabarit local,
 * du chargeur et des générateurs JSON-LD seulement. Commune inventée (« Exempleville »), code
 * INSEE inexistant, sources sur example.org : rien ici ne décrit un lieu réel et rien n'est
 * jamais copié dans data/local/ ni content/local/. L'agence la plus proche est une agence réelle
 * de content/site.config.json (`puteaux`), comme sur une vraie page.
 */

const mots = (n: number) =>
  Array.from({ length: n }, (_, i) => (i % 3 === 0 ? "phrase" : i % 3 === 1 ? "de" : "test")).join(
    " ",
  ) + ".";

export const localDataExemple: LocalData = {
  code: "92999",
  kind: "commune",
  nom: "Exempleville",
  chemin: "/aide-a-domicile/hauts-de-seine/exempleville/",
  slug: "exempleville",
  departement: "92",
  departement_nom: "Hauts-de-Seine",
  codes_postaux: ["92990"],
  parent: "92",
  epci: { code: "200054781", nom: "Intercommunalité fictive" },
  centre: { lat: 48.88, lng: 2.24 },
  superficie_ha: 320,
  population: 45210,
  demographie: {
    millesime: "2022",
    population: 45210,
    part_60_74: 14.2,
    part_75_89: 7.1,
    part_90_plus: 1.3,
    part_75_plus: 8.4,
    source_url: "https://example.org/insee/exempleville",
    collected_at: "2026-09-20",
  },
  agence_proche: { id: "puteaux", distance_km: 2.36 },
  communes_voisines: [
    {
      code: "92998",
      nom: "Voisine-la-Proche",
      slug: "voisine-la-proche",
      distance_km: 1.8,
      page: true,
    },
    { code: "92997", nom: "Petite-Voisine", slug: "petite-voisine", distance_km: 3.4, page: false },
    {
      code: "75116",
      nom: "Paris 16e Arrondissement",
      slug: "16e-arrondissement",
      distance_km: 4.1,
      page: true,
    },
  ],
  vague: 1,
  motif_vague: "proximite",
  facts: [
    {
      type: "demographie",
      label: "Part des 75 ans et plus",
      value: "8,4 %",
      source_url: "https://example.org/insee/exempleville",
      source_label: "Insee, recensement 2022",
      collected_at: "2026-09-20",
    },
    {
      type: "habitat",
      label: "Logements en immeuble collectif",
      value: "82 %",
      source_url: "https://example.org/insee/logements",
      source_label: "Insee, logements 2022",
      collected_at: "2026-09-20",
    },
    {
      type: "relief-deplacements",
      label: "Dénivelé entre le bord de Seine et le plateau",
      value: "environ 60 mètres",
      source_url: "https://example.org/ign/exempleville",
      source_label: "IGN",
      collected_at: "2026-09-20",
    },
    {
      type: "marche",
      label: "Marché du centre",
      value: "mardi et samedi matin",
      address: "Place de l'Exemple",
      source_url: "https://example.org/mairie/marches",
      source_label: "Mairie d'Exempleville",
      collected_at: "2026-09-20",
    },
    {
      type: "espace-vert",
      label: "Parc des Deux-Rives",
      address: "Quai fictif",
      source_url: "https://example.org/mairie/parcs",
      collected_at: "2026-09-20",
    },
    {
      type: "point-information",
      label: "Point d'information seniors d'Exempleville",
      address: "1 rue de l'Exemple, 92990 Exempleville",
      telephone: "01 00 00 00 01",
      url: "https://example.org/pil",
      source_url: "https://example.org/data/points-information",
      source_label: "CNSA, points d'information locaux",
      collected_at: "2026-09-20",
    },
    {
      type: "ccas",
      label: "CCAS d'Exempleville",
      address: "2 rue de l'Exemple, 92990 Exempleville",
      telephone: "01 00 00 00 02",
      source_url: "https://example.org/annuaire/ccas",
      source_label: "Annuaire de l'administration",
      collected_at: "2026-09-20",
    },
    {
      type: "accueil-jour",
      label: "Accueil de jour Les Tilleuls",
      address: "3 avenue Fictive, 92990 Exempleville",
      source_url: "https://example.org/data/accueils-de-jour",
      source_label: "CNSA, établissements",
      collected_at: "2026-09-20",
    },
    {
      type: "hopital",
      label: "Centre hospitalier fictif",
      address: "4 boulevard Fictif, 92990 Exempleville",
      url: "https://example.org/hopital",
      source_url: "https://example.org/finess",
      source_label: "FINESS",
      collected_at: "2026-09-20",
    },
    {
      type: "transport-adapte",
      label: "PAM 92",
      url: "https://example.org/pam",
      source_url: "https://example.org/idfm/pam",
      source_label: "Île-de-France Mobilités",
      collected_at: "2026-09-20",
    },
    {
      type: "mdph",
      label: "MDPH des Hauts-de-Seine",
      address: "5 place Fictive, 92000 Nanterre",
      telephone: "01 00 00 00 05",
      url: "https://example.org/mdph92",
      source_url: "https://example.org/annuaire/mdph",
      source_label: "Annuaire de l'administration",
      collected_at: "2026-09-20",
    },
    {
      type: "service-apa",
      label: "Service APA du conseil départemental",
      telephone: "01 00 00 00 06",
      url: "https://example.org/cd92/apa",
      source_url: "https://example.org/cd92/apa",
      source_label: "Conseil départemental fictif",
      collected_at: "2026-09-20",
    },
    {
      type: "aide-departementale",
      label: "Allocation fictive de maintien à domicile",
      value: "complément départemental à l'APA",
      url: "https://example.org/cd92/aides",
      source_url: "https://example.org/cd92/aides",
      source_label: "Conseil départemental fictif",
      collected_at: "2026-09-20",
    },
  ],
  generated_at: "2026-09-20",
  sources: [
    { label: "Insee (fictif)", url: "https://example.org/insee", collected_at: "2026-09-20" },
    {
      label: "Annuaire de l'administration (fictif)",
      url: "https://example.org/annuaire",
      collected_at: "2026-09-20",
    },
  ],
};

export const localEditorialExemple: LocalEditorial = {
  code: "92999",
  seo: {
    titre: "Aide à domicile à Exempleville (92990) : exemple pour tests",
    description:
      "Page locale fictive pour les tests unitaires du gabarit des pages locales : aucun fait réel, aucune commune réelle, seulement des exemples de structure.",
  },
  sous_titre:
    "Une commune fictive, entre bord de Seine et plateau, où l'aide à domicile s'adapte aux immeubles avec et sans ascenseur.",
  zone_editoriale: [
    "Exempleville compte 45 210 habitants, dont 8,4 % ont 75 ans et plus. Quatre logements sur cinq sont en immeuble collectif, souvent sans ascenseur dans le centre ancien.",
    "",
    "## Se déplacer",
    "",
    "Le dénivelé entre le bord de Seine et le plateau atteint environ soixante mètres : les sorties se préparent, surtout l'hiver.",
    "",
    "- Le marché du centre a lieu le mardi et le samedi matin, place de l'Exemple.",
    "- Le parc des Deux-Rives, en bord de quai, offre des allées **planes** et des bancs.",
    "",
    "Ce que cela change pour l'aide à domicile : des accompagnements aux courses le matin du marché, et une attention aux escaliers. Voir [nos accompagnements](/personnes-agees/).",
    "",
    mots(300),
  ].join("\n"),
  questions: [
    { question: "Intervenez-vous dans le centre ancien d'Exempleville ?", reponse: mots(45) },
    { question: "Pouvez-vous accompagner au marché du samedi ?", reponse: mots(50) },
    { question: "Qui contacter pour l'APA dans les Hauts-de-Seine ?", reponse: mots(55) },
  ],
  semaine_type: "suzanne",
  faits_utilises: [0, 1, 2, 3, 4],
  auteur: { nom: "Auteur fictif", fonction: "rédaction" },
  statut: "publie",
  maj: "2026-09-20",
};
