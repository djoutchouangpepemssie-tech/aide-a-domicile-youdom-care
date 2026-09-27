import { cn } from "@/lib/cn";

/*
 * Heros : hauteur, compaction et scène (décision D-032, brief docs/design/BRIEF_LIQUID_GLASS.md §4,
 * renfort d'Arcel du 2026-09-27 : « des pages uniques, pas génériques, jamais un fond blanc »).
 *
 * Ce fichier ne contient **aucun** style de verre ni de fond : les classes `scene`, `scene-*`,
 * `scene-soutenu`, `glass`, `glass-strong`, `glass-tint-*`, `glass-edge`, `glass-sheen` et
 * `depth-*` sont définies une seule fois par l'agent design system (`src/styles/scenes.css` et
 * `src/styles/glass.css`) ; on les consomme, on ne les redéfinit jamais. Ces feuilles garantissent
 * déjà : contraste borné par `--scene-deep` et `--scene-accent` (encre AAA, texte secondaire AA,
 * liens en teal-800), repli opaque du verre à 94 % sans `backdrop-filter`, et aplatissement complet
 * en mode confort, en mouvement réduit et à l'impression. Aucun `backdrop-filter` ni `blur-*` n'est
 * écrit ici.
 *
 * Ce qui vit ici :
 *  1. `heroSectionShell` : la hauteur du hero (`100svh` moins l'en-tête et, sous 64 rem, la barre
 *     d'action), le centrage vertical, la compaction des espaces ;
 *  2. `sceneClass` et les tables de scènes (par public, par rubrique, par territoire) : quel fond
 *     coloré porte quel gabarit ;
 *  3. les classes partagées des morceaux du hero (panneau de verre, actions, paliers de
 *     compaction), pour que les cinq gabarits se compactent de la même façon.
 *
 * Compaction : trois paliers, pilotés par la hauteur visible (donc aussi par le zoom à 200 %, qui
 * divise la hauteur en pixels CSS) et par la largeur à 320 px.
 *  - au large : sur-titre, H1, promesse, photo, interaction, action, lien secondaire, téléphone,
 *    réassurance, note, repère ;
 *  - hauteur ≤ 42 rem (paysage, zoom 200 %, petits téléphones) : la photo, la réassurance et la
 *    note se retirent, les titres rapetissent, les rangées passent à 44 px, le panneau se défile
 *    en interne s'il le faut ;
 *  - hauteur ≤ 36 rem : le sur-titre part, le chapô tient sur deux lignes, le lien secondaire et
 *    le téléphone cèdent la place (l'en-tête et la barre d'action les portent) : il reste le titre,
 *    une phrase, l'interaction, l'action framboise et le repère.
 * Tout se joue en CSS : aucun calcul au chargement, donc aucun décalage de mise en page (CLS 0).
 */

/** Teintes de verre du brief §3, pour les panneaux du hero. */
export type GlassTint = "teal" | "framboise" | "sable";

const glassTints: Record<GlassTint, string> = {
  teal: "glass-tint-teal",
  framboise: "glass-tint-framboise",
  sable: "glass-tint-sable",
};

/**
 * Enveloppe de la section d'un hero : hauteur visible moins l'en-tête (4 rem) et, sous 64 rem, la
 * barre d'action (4 rem) ; contenu centré ; jamais plus de 100 % de la hauteur visible.
 */
export const heroSectionShell = cn(
  "hero-section flex flex-col justify-center",
  // En-tête mesuré à 86 px sur téléphone et 91 px sur ordinateur, barre d'action à 61 px : on
  // réserve 9,5 rem sous 64 rem (en-tête + barre) et 6 rem au-delà (en-tête seul).
  "[--hero-chrome:9.5rem] lg:[--hero-chrome:6rem]",
  "min-h-[calc(100svh-var(--hero-chrome))]",
  "py-8 [@media(max-height:42rem)_and_(min-height:36.01rem)]:py-6 [@media(max-height:36rem)]:py-4",
);

/** Scènes de `src/styles/scenes.css`. */
export type HeroSceneName =
  "aurore" | "teal" | "azure" | "verte" | "sable" | "framboise" | "nuit" | "neutre";

/** Teinte du verre des panneaux, par scène (information, chaleur, action). */
const sceneTints: Record<HeroSceneName, GlassTint> = {
  aurore: "teal",
  teal: "teal",
  azure: "teal",
  verte: "teal",
  sable: "sable",
  framboise: "framboise",
  nuit: "teal",
  neutre: "teal",
};

/** Classes de la scène d'un hero : version soutenue, le fond le plus présent du site. */
const sceneClasses: Record<HeroSceneName, string> = {
  aurore: "scene-aurore",
  teal: "scene-teal",
  azure: "scene-azure",
  verte: "scene-verte",
  sable: "scene-sable",
  framboise: "scene-framboise",
  nuit: "scene-nuit",
  neutre: "scene-neutre",
};

/** Fond de scène d'un hero (`scenes.css`) : la palette de la page, en version soutenue. */
export function sceneClass(scene: HeroSceneName): string {
  return cn("scene", sceneClasses[scene], "scene-soutenu");
}

/** Teinte de verre à utiliser dans une scène donnée. */
export function sceneTint(scene: HeroSceneName): GlassTint {
  return sceneTints[scene];
}

/** Scène d'un public de page service (docs/03) ; `teal` pour les pages transverses. */
export const sceneByPublic: Record<string, HeroSceneName> = {
  "personne-agee": "teal",
  neuro: "azure",
  "enfant-handicap": "verte",
  "adulte-handicap": "sable",
  aidant: "framboise",
  transverse: "teal",
};

/** Scène d'une rubrique du magazine (docs/06) : chaque rubrique a sa couleur. */
export const sceneByRubrique: Record<string, HeroSceneName> = {
  comprendre: "azure",
  agir: "teal",
  aides: "sable",
  temoignages: "framboise",
  quotidien: "verte",
};

/**
 * Scène d'un territoire : teinte tirée du code du département ou de la commune, pour que deux
 * territoires voisins ne se ressemblent pas et qu'une même page garde toujours sa couleur.
 */
export function sceneByTerritory(code: string): HeroSceneName {
  const palette: readonly HeroSceneName[] = ["teal", "azure", "sable", "verte"];
  const sum = [...code].reduce((total, char) => total + char.charCodeAt(0), 0);
  return palette[sum % palette.length] ?? "teal";
}

/**
 * Panneau de verre d'un hero (interaction immédiate, réponse locale, aperçu d'article) : verre
 * teinté, liseré lumineux, reflet au pointeur (survol seulement), élévation 1. `glass-strong` sur
 * la scène de nuit et au-dessus d'une photo, où le panneau doit être plus dense.
 */
export function heroPanelClass(tint: GlassTint = "teal", dark = false): string {
  return cn(
    "hero-panel rounded-card p-4 sm:p-5",
    "[@media(max-height:42rem)]:p-3",
    // Hauteur visible réduite : le panneau garde tous ses choix mais se défile en interne, pour que
    // l'action et le repère restent dans la fenêtre. Ses choix sont focusables : la zone est
    // atteignable au clavier (axe `scrollable-region-focusable`). Les deux plafonds ne se
    // recouvrent pas : une seule règle s'applique à la fois.
    "[@media(min-width:64rem)_and_(min-height:42.01rem)]:max-h-[38svh]",
    "[@media(max-width:63.99rem)_and_(min-height:42.01rem)]:max-h-[30svh]",
    "[@media(max-height:42rem)_and_(min-height:36.01rem)]:max-h-[38svh]",
    "[@media(max-height:36rem)]:max-h-[22svh]",
    "overflow-y-auto overscroll-contain",
    dark ? "glass-strong" : "glass",
    glassTints[tint],
    "glass-edge glass-sheen depth-1",
  );
}

/**
 * Panneau du chapô quand l'interaction y vit (sélecteur « pour vous / pour un proche » du pilier
 * Personnes âgées) : verre blanc, sans teinte, pour que les deux boutons teal-700 du sélecteur
 * gardent leur contraste (teal-700 sur verre blanc à 72 % posé sur le point le plus soutenu d'une
 * scène : 4,9 ; le même teal-700 à même la scène tomberait à 3,93).
 */
export function heroLeadPanelClass(dark = false): string {
  return cn(
    "hero-panel rounded-card p-4 sm:p-5 [@media(max-height:42rem)]:p-3",
    // Mêmes plafonds que les autres panneaux : le sélecteur reste en haut, visible et cliquable,
    // et le chapô se défile dans le panneau plutôt que de repousser l'action hors de la fenêtre.
    "[@media(min-width:64rem)_and_(min-height:42.01rem)]:max-h-[38svh]",
    "[@media(max-width:63.99rem)_and_(min-height:42.01rem)]:max-h-[30svh]",
    "[@media(max-height:42rem)_and_(min-height:36.01rem)]:max-h-[38svh]",
    "[@media(max-height:36rem)]:max-h-[22svh]",
    "overflow-y-auto overscroll-contain",
    dark ? "glass-strong" : "glass",
    "glass-edge depth-1",
  );
}

/**
 * Espace entre deux blocs du hero. Les trois paliers s'excluent (aucune media query n'en recouvre
 * une autre) : c'est la seule façon d'être sûr de la valeur appliquée, l'ordre de deux variantes
 * arbitraires dans la feuille produite n'étant pas garanti.
 */
export const heroGap =
  "mt-5 [@media(max-height:42rem)_and_(min-height:36.01rem)]:mt-3 [@media(max-height:36rem)]:mt-2";

/** Espace avant un panneau ou une rangée d'actions (un cran de plus). */
export const heroGapWide =
  "mt-6 [@media(max-height:42rem)_and_(min-height:36.01rem)]:mt-4 [@media(max-height:36rem)]:mt-2";

/** Rangée d'actions du hero : un bouton framboise, un lien secondaire, le téléphone. */
export const heroActionsClass = cn(
  "hero-actions m-0 flex flex-wrap items-center gap-x-5 gap-y-3",
  heroGapWide,
);

/**
 * Réservé aux grands écrans (photo du hero, réassurance, note, lien secondaire) : sous 64 rem, la
 * hauteur visible d'un téléphone ne peut pas les porter en plus du titre, de la promesse, de
 * l'interaction, de l'action et du repère. La barre d'action mobile porte déjà « Ma demande ».
 */
export const heroOnlyWide = "max-lg:hidden";

/**
 * Largeur de la photo du hero sur ordinateur : la colonne de droite porte la photo **et** le
 * panneau d'interaction ; à 16 rem de large, la photo 4:5 fait 360 px de haut et les deux tiennent
 * dans la hauteur visible d'un écran de 900 px (mesuré).
 */
export const heroMediaWidth = "w-full lg:mx-0 lg:ml-auto lg:max-w-[16rem]";

/** Bloc que la compaction retire dès 42 rem de haut (photo, réassurance, note). */
export const heroWhenTall = "[@media(max-height:42rem)]:hidden";

/** Bloc que la compaction retire au dernier palier (sur-titre, lien secondaire, téléphone). */
export const heroWhenRoomy = "[@media(max-height:36rem)]:hidden";

/**
 * Chapô : affiché en entier. La troncature à deux ou trois lignes coupait la promesse en plein
 * milieu et laissait des points de suspension sur presque tous les gabarits (demande du 27/09/2026,
 * D-036). La hauteur reste tenue par la compaction (`heroWhenTall`, `heroWhenRoomy`) et par
 * l'échelle typographique, pas en cachant du texte.
 */
export const heroLeadClamp = "";

/**
 * Au dernier palier de compaction (36 rem de haut ou moins), l'action principale passe **avant**
 * l'interaction : c'est ce qui la garde dans la fenêtre sur un petit téléphone en portrait comme en
 * paysage. L'ordre du document ne change pas (lecture d'écran et clavier : titre, promesse, action,
 * interaction, repère).
 */
export const heroOrderPanel = "[@media(max-height:36rem)]:order-1";
export const heroOrderLast = "[@media(max-height:36rem)]:order-2";

/**
 * Échelle typographique du hero : le titre et le chapô suivent la largeur et la hauteur visibles.
 * Les jetons `--text-h1` et `--text-lead` ne sont pas redéfinis (tokens.css les garde pour tout le
 * site) : ils sont seulement réglés sur la scène du hero. Les quatre paliers s'excluent deux à deux.
 *  - grand écran, hauteur confortable : 2,5 rem (le clamp de docs/02 §3 irait jusqu'à 3,75 rem, six
 *    lignes de titre sur l'accueil : la scène ne tiendrait plus dans la fenêtre) ;
 *  - téléphone et tablette, hauteur confortable : 1,75 rem ;
 *  - hauteur de 36 à 42 rem : 1,875 rem ; sous 36 rem : 1,375 rem.
 */
export const heroTypeScale = cn(
  "[@media(min-width:64rem)_and_(min-height:42.01rem)]:[--text-h1:2.5rem]",
  "[@media(max-width:63.99rem)_and_(min-height:42.01rem)]:[--text-h1:1.5rem]",
  "[@media(max-height:42rem)_and_(min-height:36.01rem)]:[--text-h1:1.875rem]",
  "[@media(max-height:42rem)_and_(min-height:36.01rem)]:[--text-lead:1.0625rem]",
  "[@media(max-height:36rem)]:[--text-h1:1.375rem] [@media(max-height:36rem)]:[--text-lead:1rem]",
);

/**
 * Attribut `sizes` de la photo d'un hero : elle n'est affichée qu'à partir de 64 rem (sous cette
 * largeur, la compaction la retire). La valeur de repli de 16 px évite de précharger une grande
 * image invisible sur téléphone, sans retirer `priority` là où la photo est bien l'élément du LCP.
 */
export const heroPhotoSizes = "(min-width: 75rem) 480px, (min-width: 64rem) 40vw, 16px";

/**
 * Placement du hero sur ordinateur (grille 3fr / 2fr, dix rangées explicites) : la colonne de
 * gauche porte le texte et les actions, la colonne de droite la photo puis le panneau
 * d'interaction — c'est ce qui permet à la scène entière de tenir dans la hauteur visible.
 * Sous 64 rem, une seule colonne dans l'ordre du document.
 */
export const heroRows = {
  surtitle: "lg:col-start-1 lg:row-start-1",
  title: "lg:col-start-1 lg:row-start-2",
  lead: "lg:col-start-1 lg:row-start-3",
  actions: "lg:col-start-1 lg:row-start-4",
  reassurance: "lg:col-start-1 lg:row-start-5",
  footnote: "lg:col-start-1 lg:row-start-6",
  cue: "lg:col-start-1 lg:row-start-7",
  media: "lg:col-start-2 lg:row-start-1 lg:row-span-3 lg:self-center",
  panel: "lg:col-start-2 lg:row-start-4 lg:row-span-7 lg:self-start",
} as const;
