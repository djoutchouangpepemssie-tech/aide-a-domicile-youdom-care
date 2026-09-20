/*
 * Icônes « au fil » (docs/02 §1, docs/design/ICONES.md).
 *
 * Chaque icône est dessinée à la main sur une grille de 24 × 24 avec une marge de 2 (les
 * extrémités de tracé restent entre 2 et 22). Le trait fait 2 px sur ordinateur et 1,75 px sur
 * mobile (`--thread-width`), extrémités et jonctions arrondies, jamais de remplissage, jamais de
 * commande `Z` : le fil reste ouvert. Une seule couleur de trait, plus un segment optionnel, le
 * « nœud », repassé en `raspberry-500` (`knot`). Le nœud fait toujours partie du tracé principal :
 * l'icône reste complète si la couleur d'accent n'est pas appliquée (impression, forçage des
 * couleurs).
 *
 * Les icônes sont décoratives : elles ne portent jamais une information absente du texte voisin.
 */

export type IconGroup = "quotidien" | "service" | "objet" | "public" | "action";

export interface IconDefinition {
  /** Tracé principal, une ou deux lignes continues quand c'est possible. */
  main: string;
  /** Segment repassé en framboise : le point d'attention. Un seul par icône, optionnel. */
  knot?: string;
  /** Regroupement pour le styleguide et la documentation. */
  groupe: IconGroup;
}

export const icons = {
  /* ---- Gestes du quotidien ---- */

  /* Lever : un lit vu de côté (tête de lit, oreiller, matelas), une flèche qui monte. */
  lever: {
    main: "M2 21V11M2 16h20v5M5 16v-4h5v4M15 11V4M11.5 7.5L15 4l3.5 3.5",
    knot: "M11.5 7.5L15 4l3.5 3.5",
    groupe: "quotidien",
  },
  /* Toilette : une baignoire, un robinet qui se penche. */
  toilette: {
    main: "M2 15v-3h20v3a6 6 0 0 1-6 6H8a6 6 0 0 1-6-6M5 12V6a2.5 2.5 0 0 1 5 0v1",
    knot: "M5 12V6a2.5 2.5 0 0 1 5 0v1",
    groupe: "quotidien",
  },
  /* Repas : un bol et son rebord, un filet de vapeur. */
  repas: {
    main: "M2 12h20M3 12c0 5 4 9 9 9s9-4 9-9M12 8c-1.5-1.5 1.5-2.5 0-5",
    knot: "M12 8c-1.5-1.5 1.5-2.5 0-5",
    groupe: "quotidien",
  },
  /* Courses : un sac ouvert, une anse. */
  courses: {
    main: "M5 9l-2 12h18L19 9M8 10V6a4 4 0 0 1 8 0v4",
    knot: "M8 10V6a4 4 0 0 1 8 0v4",
    groupe: "quotidien",
  },
  /* Ménage : un balai, les brins laissés libres en bas, le manche en nœud. */
  menage: {
    main: "M6 21l1.5-9h9L18 21M12 12V3M12 21v-4",
    knot: "M12 12V3",
    groupe: "quotidien",
  },
  /* Linge : un tee-shirt ouvert par le bas, le col en nœud. */
  linge: {
    main: "M8 21V9l-2 1-2-4 5-2a3 3 0 0 0 6 0l5 2-2 4-2-1v12",
    knot: "M9 4a3 3 0 0 0 6 0",
    groupe: "quotidien",
  },
  /* Promenade : un arbre sur un chemin qui ondule, le tronc en nœud. */
  promenade: {
    main: "M2 21c4-3 16-3 20 0M12 21v-8M15.5 11.5a5 5 0 1 1-7 0",
    knot: "M12 21v-8",
    groupe: "quotidien",
  },
  /* Compagnie : deux tasses côte à côte, une vapeur partagée. */
  compagnie: {
    main: "M2 10v5a4 4 0 0 0 8 0v-5M14 10v5a4 4 0 0 0 8 0v-5M6 7c-1-1.5 1-2 0-4M18 7c-1-1.5 1-2 0-4",
    knot: "M18 7c-1-1.5 1-2 0-4",
    groupe: "quotidien",
  },
  /* Jeux : une pièce de puzzle, ouverte en bas à gauche. */
  jeux: {
    main: "M4 20v-4a2 2 0 1 1 0-4V8h4a2 2 0 1 1 4 0h4v4a2 2 0 1 0 0 4v4h-4a2 2 0 1 1-4 0",
    knot: "M8 8a2 2 0 1 1 4 0",
    groupe: "quotidien",
  },
  /* Lecture : un livre ouvert, la reliure en nœud. */
  lecture: {
    main: "M12 7c-2-2-5-2-9-2v14c4 0 7 0 9 2 2-2 5-2 9-2V5c-4 0-7 0-9 2v14",
    knot: "M12 7v14",
    groupe: "quotidien",
  },
  /* Marche : une silhouette en mouvement, la jambe avant en nœud. */
  marche: {
    main: "M15 4a1.5 1.5 0 1 1-1.5-1.5M13 7.5l-1 5.5-3.5 4.5M12 13l3.5 2.5 1 5.5M13 8l3.5 1.5 2 3M13 8l-4 1-1 3.5",
    knot: "M12 13l3.5 2.5 1 5.5",
    groupe: "quotidien",
  },
  /* Communication : une bulle ouverte près de sa pointe, trois points. */
  communication: {
    main: "M4 16V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-7l-4 4v-4M8 10h.01M12 10h.01M16 10h.01",
    knot: "M11 16l-4 4v-4",
    groupe: "quotidien",
  },
  /* Transferts : un lève-personne au bras arrondi, une personne assise dans la sangle (le nœud). */
  transferts: {
    main: "M2 21h8M5 21V6a4 4 0 0 1 4-4h5a4 4 0 0 1 4 4v1M16 11a2 2 0 1 1 4 0M18 13v4M14 13v2a4 4 0 0 0 8 0v-2",
    knot: "M14 13v2a4 4 0 0 0 8 0v-2",
    groupe: "quotidien",
  },

  /* ---- Services et moments ---- */

  /* Nuit : un croissant de lune, une petite étoile. */
  nuit: {
    main: "M20 15A8.5 8.5 0 1 1 9 4c-1 5 3 10 11 11M18 3v4M16 5h4",
    knot: "M18 3v4M16 5h4",
    groupe: "service",
  },
  /* Jour : un soleil ouvert, le rayon qui prolonge l'ouverture en nœud. */
  jour: {
    main: "M16 12a4 4 0 1 1-4-4M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M4.9 19.1l1.4-1.4M17.7 17.7l1.4 1.4M17.7 6.3l1.4-1.4",
    knot: "M17.7 6.3l1.4-1.4",
    groupe: "service",
  },
  /* 24h/24 : une horloge dont le cadran se prolonge en flèche, sans fin. */
  "24h": {
    main: "M20 12a8 8 0 1 1-2.3-5.7M17.7 2.8v3.5h-3.5M12 7v5h3.5",
    knot: "M17.7 2.8v3.5h-3.5",
    groupe: "service",
  },
  /* Retour d'hôpital : une maison, une flèche qui rentre. */
  "retour-hopital": {
    main: "M3 21V10l9-7 9 7v11M8 16h8M13 13l3 3-3 3",
    knot: "M13 13l3 3-3 3",
    groupe: "service",
  },
  /* Garde-malade : une personne alitée, la tête sur l'oreiller. */
  "garde-malade": {
    main: "M2 21v-5h20v5M2 18h20M5 13a2 2 0 1 1 4 0M11 16c2-3 6-3 9 0",
    knot: "M5 13a2 2 0 1 1 4 0",
    groupe: "service",
  },
  /* Vacances : un soleil qui se lève sur l'eau. */
  vacances: {
    main: "M2 19c2.5 0 2.5-2 5-2s2.5 2 5 2 2.5-2 5-2 2.5 2 5 2M6 14a6 6 0 0 1 12 0M12 5V3M5.5 7.5L4 6M18.5 7.5L20 6",
    knot: "M12 5V3",
    groupe: "service",
  },
  /* Remplacement : deux flèches qui se relaient. */
  remplacement: {
    main: "M3 8h14M13.5 4.5L17 8l-3.5 3.5M21 16H7M10.5 12.5L7 16l3.5 3.5",
    knot: "M10.5 12.5L7 16l3.5 3.5",
    groupe: "service",
  },
  /* Fauteuil : un fauteuil confortable vu de face, l'assise en nœud. */
  fauteuil: {
    main: "M3 21v-8a2 2 0 0 1 4 0v3h10v-3a2 2 0 0 1 4 0v8M7 13V7a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v6",
    knot: "M7 16h10",
    groupe: "service",
  },
  /* École : un cartable à rabat, la boucle en nœud. */
  ecole: {
    main: "M3 21V10a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3v11M3 14h18M9 7V5a3 3 0 0 1 6 0v2M12 14v3",
    knot: "M12 14v3",
    groupe: "service",
  },

  /* ---- Objets et repères ---- */

  /* Fiche de vie : une feuille cornée, une silhouette. */
  "fiche-de-vie": {
    main: "M5 21V3h9l5 5v13M14 3v5h5M10 12a2 2 0 1 1 4 0M8 19a4 4 0 0 1 8 0",
    knot: "M10 12a2 2 0 1 1 4 0",
    groupe: "objet",
  },
  /* Mémoire : une bulle de pensée qui s'éloigne. */
  memoire: {
    main: "M7.5 16.5a3.5 3.5 0 0 1-.5-7A5 5 0 0 1 16.5 8a3.5 3.5 0 0 1 1 8.5h-9M5.5 19.5h.01M3 22h.01",
    knot: "M5.5 19.5h.01",
    groupe: "objet",
  },
  /* Cœur : un cœur d'un seul trait, le lobe droit en nœud. */
  coeur: {
    main: "M12 20.5C7 16 3 12 3 8a4.5 4.5 0 0 1 9 0 4.5 4.5 0 0 1 9 0c0 4-5 8-9 12.5",
    knot: "M12 8a4.5 4.5 0 0 1 9 0",
    groupe: "objet",
  },
  /* Téléphone : un combiné, une onde d'appel en nœud. */
  telephone: {
    main: "M5 3h4l2 5-2.5 1.5a11 11 0 0 0 6 6L16 13l5 2v4a2 2 0 0 1-2 2A17 17 0 0 1 3 5a2 2 0 0 1 2-2M14 7a3 3 0 0 1 3 3M14 3a7 7 0 0 1 7 7",
    knot: "M14 3a7 7 0 0 1 7 7",
    groupe: "objet",
  },
  /* Rappel : le combiné, et une flèche qui revient. */
  rappel: {
    main: "M5 3h4l2 5-2.5 1.5a11 11 0 0 0 6 6L16 13l5 2v4a2 2 0 0 1-2 2A17 17 0 0 1 3 5a2 2 0 0 1 2-2M13 4a6 6 0 0 1 6 6M16.5 7.5L19 10l2.5-2.5",
    knot: "M16.5 7.5L19 10l2.5-2.5",
    groupe: "objet",
  },
  /* Calendrier : une page de calendrier, la bande de la semaine en nœud. */
  calendrier: {
    main: "M3 21V7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14M3 11h18M8 3v4M16 3v4M7 16h10",
    knot: "M7 16h10",
    groupe: "objet",
  },
  /* Maison : reprise de l'illustration au fil, la porte reste ouverte. */
  maison: {
    main: "M4 21V11l8-7 8 7v10h-5v-5H9v5H7",
    knot: "M9 16h6",
    groupe: "objet",
  },
  /* Mains : deux bras qui se rejoignent, une boucle pour l'étreinte des doigts. */
  mains: {
    main: "M2 20c2-7 5-11 9-10 2 .5 2.5 2.5 1.5 4-1 1.5-3.5.5-3-1 .5-2 2.5-3.5 4.5-3 4 1 6 5 8 10",
    knot: "M12.5 14c-1 1.5-3.5.5-3-1",
    groupe: "objet",
  },
  /* Cahier de liaison : un carnet à spirale, une ligne écrite en nœud. */
  "cahier-de-liaison": {
    main: "M6 3h12v18H6M6 6H4M6 10H4M6 14H4M6 18H4M10 9h5M10 13h5",
    knot: "M10 9h5",
    groupe: "objet",
  },
  /* Aide financière : un signe euro, la barre haute en nœud. */
  "aide-financiere": {
    main: "M17 5.5A8 8 0 1 0 17 18.5M5 10h9M5 14h9",
    knot: "M5 10h9",
    groupe: "objet",
  },
  /* Dossier MDPH : une chemise à onglet, l'étiquette en nœud. */
  "dossier-mdph": {
    main: "M3 20V5h6l2 2h10v13M3 10h18M8 15h5",
    knot: "M8 15h5",
    groupe: "objet",
  },
  /* Aidant : deux silhouettes côte à côte, le bras posé sur l'épaule en nœud. */
  aidant: {
    main: "M4.5 7.5a2.5 2.5 0 0 1 5 0M2 21v-5a4 4 0 0 1 4-4h2a4 4 0 0 1 4 4v5M15.5 10.5a2 2 0 0 1 4 0M13 21v-4a3.5 3.5 0 0 1 3.5-3.5h1a3.5 3.5 0 0 1 3.5 3.5v4M11 13.5c1.5 0 2.5.5 3 1.5",
    knot: "M11 13.5c1.5 0 2.5.5 3 1.5",
    groupe: "objet",
  },

  /* ---- Publics ---- */

  /* Neuro : une tête, le fil qui s'enroule à l'intérieur. */
  "public-neuro": {
    main: "M8 21v-2.5A7 7 0 0 1 5 12.5a7 7 0 0 1 14 0c0 2.5-1.3 4.7-3 6V21M12 16a4 4 0 1 1 4-4 2 2 0 0 1-2 2",
    knot: "M12 16a4 4 0 1 1 4-4 2 2 0 0 1-2 2",
    groupe: "public",
  },
  /* Personnes âgées : une silhouette debout, la canne en nœud. */
  "public-personnes-agees": {
    main: "M10.2 6.8a2.5 2.5 0 1 1 3.6 0M12 7.5V14M12 14l-3 7M12 14l3 7M12 9.5l4 3.5v8",
    knot: "M16 13v8",
    groupe: "public",
  },
  /* Adultes en situation de handicap : une personne en fauteuil, en mouvement, jamais un fauteuil vide. */
  "public-adultes": {
    main: "M13.6 5.9a2 2 0 1 1 2.8 0M15 7v6h4l2 5M15 13h-5M14 16a5 5 0 1 1-5-5",
    knot: "M19 13l2 5",
    groupe: "public",
  },
  /* Enfants en situation de handicap : un ballon, sa ficelle qui danse. */
  "public-enfants": {
    main: "M17 8a5 5 0 1 1-5-5M12 13c-1.5 2 1.5 3.5 0 5.5s-1.5 2 0 3.5",
    knot: "M12 13c-1.5 2 1.5 3.5 0 5.5",
    groupe: "public",
  },
  /* Aidants : un cœur porté par une main ouverte. */
  "public-aidants": {
    main: "M12 12.5C9.5 10 6.5 8 6.5 5.5a2.75 2.75 0 0 1 5.5 0 2.75 2.75 0 0 1 5.5 0c0 2.5-3 4.5-5.5 7M3 14v3a4 4 0 0 0 4 4h7a5 5 0 0 0 4.5-2.7L21 15",
    knot: "M12 5.5a2.75 2.75 0 0 1 5.5 0",
    groupe: "public",
  },
  /* Services : quatre cases ouvertes, une en nœud. */
  "public-services": {
    main: "M3 10V4a1 1 0 0 1 1-1h6v7H3M14 3h6a1 1 0 0 1 1 1v6h-7V3M3 14h7v7H4a1 1 0 0 1-1-1v-6M14 21v-7h7v6a1 1 0 0 1-1 1h-6",
    knot: "M14 21v-7h7v6a1 1 0 0 1-1 1h-6",
    groupe: "public",
  },

  /* ---- Rubriques d'action ---- */

  /* Gestes : une main ouverte, le pouce en nœud. */
  "action-gestes": {
    main: "M6 21v-4l-2.5-5a1.4 1.4 0 0 1 2.5-1.2L8 13V6a1.5 1.5 0 0 1 3 0v5V4a1.5 1.5 0 0 1 3 0v7V5.5a1.5 1.5 0 0 1 3 0V14a7 7 0 0 1-7 7",
    knot: "M6 17l-2.5-5a1.4 1.4 0 0 1 2.5-1.2L8 13",
    groupe: "action",
  },
  /* Présence : une silhouette sous un toit. */
  "action-presence": {
    main: "M3 21V11l9-8 9 8v10M10.2 13.8a2.5 2.5 0 1 1 3.6 0M6 21v-1a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v1",
    knot: "M10.2 13.8a2.5 2.5 0 1 1 3.6 0",
    groupe: "action",
  },
  /* Lien : le fil qui se noue en deux boucles, d'un seul trait. */
  "action-lien": {
    main: "M12 12c-2-3-3-5-5-5s-5 2-5 5 2 5 5 5 3-2 5-5 3-5 5-5 5 2 5 5-2 5-5 5-3-2-5-5",
    knot: "M7 17c3 0 3-2 5-5s3-5 5-5",
    groupe: "action",
  },
  /* Coordination : un porte-bloc, la coche en nœud. */
  "action-coordination": {
    main: "M9 5H6.5A1.5 1.5 0 0 0 5 6.5v13A1.5 1.5 0 0 0 6.5 21h11a1.5 1.5 0 0 0 1.5-1.5v-13A1.5 1.5 0 0 0 17.5 5H15M9 7V5a3 3 0 0 1 6 0v2M8.5 13l2 2 4-4M8.5 18h7",
    knot: "M8.5 13l2 2 4-4",
    groupe: "action",
  },
} as const satisfies Record<string, IconDefinition>;

export type IconName = keyof typeof icons;

export const iconNames = Object.keys(icons) as IconName[];

/** Libellés des groupes, dans l'ordre d'affichage du styleguide. */
export const iconGroups: { id: IconGroup; label: string }[] = [
  { id: "quotidien", label: "Gestes du quotidien" },
  { id: "service", label: "Services et moments" },
  { id: "objet", label: "Objets et repères" },
  { id: "public", label: "Publics" },
  { id: "action", label: "Rubriques d'action" },
];
