# Mouvement et profondeur — infrastructure d'animation

Livrable « Mouvement et 3D » du brief `docs/design/BRIEF_EXPERIENCE.md` (D-024). Complète `docs/02 §5` (durées 150 à 300 ms, courbe `cubic-bezier(.2,.7,.2,1)`, tout s'éteint en mouvement réduit et en mode confort) et `docs/02 §1` (le fil se dessine une seule fois, 600 à 900 ms).

Code : `src/lib/motion/`, `src/components/motion/`, `src/styles/motion.css` (importée par `globals.css`), `src/components/ui/Thread/` (`HeroThread`, `hero-threads.ts`, `hero-thread.css`). Démonstration : `/styleguide/mouvement/` (noindex, exclue du plan de site comme `/styleguide/`).

Lot 3 (« la profondeur », CONCEPT §8) livré le 2026-09-20 : `HeroDepth`, `HeroThread` (`fil-hero`), `PageThread` (`fil-conducteur`), `parallax-2` sur les illustrations, jeton `--duration-flip`, bouton framboise du hero masqué sur mobile. Complément budget (même jour, §7) : moteurs de décoration chargés à la demande, image du hero allégée (AVIF, qualité 60, `fetchpriority="high"`).

## 1. Principes

1. **CSS d'abord.** Chaque animation est une règle CSS (transition, `animation`, `animation-timeline`). Le JavaScript, quand il existe, se contente de poser un attribut (`data-reveal`, `data-tilt`) ou un style en ligne au rythme de `requestAnimationFrame`. Aucun état React, aucun nouveau rendu.
2. **Jamais de contenu caché sans JavaScript.** Le serveur rend tout visible. L'état « caché » (`data-reveal="pending"`) n'est posé qu'après le montage, seulement si le mouvement est permis, seulement pour un élément sous le pli. Au-dessus du pli, rien ne bouge : pas de clignotement, LCP intact.
3. **Trois interrupteurs, un seul module.** `prefers-reduced-motion: reduce`, le mode confort (`html[data-comfort="on"]`) et la simulation du styleguide (`html[data-motion="reduce"]`) coupent tout, en CSS (règles dédiées dans `motion.css`, jetons de durée à 0 ms dans `tokens.css`) et en JavaScript (`prefersReducedMotion()`).
4. **Budget (D-019).** Îles de moins d'un kilo-octet compressé chacune. Aucune dépendance ajoutée. Aucun WebGL, aucune bibliothèque 3D : les objets du hero sont en CSS 3D.
5. **Accessibilité.** Rien ne dépend d'un survol ou d'une animation pour être lu ou activé. Les objets 3D et les couches décoratives sont `aria-hidden`. Le compteur garde la valeur finale lisible par les lecteurs d'écran dès le rendu serveur. Aucun clignotement, aucune lumière stroboscopique, aucune animation automatique de plus de 12 s de période.
6. **Différer ce qui n'est pas lu.** Une décoration qui répond au pointeur ou au défilement ne charge son moteur qu'au premier signe d'usage : `Tilt` et `HeroDepth` importent `lib/motion/pointer-tilt` au premier `pointerenter` d'une souris avec un pointeur fin ; `PageThread` importe son moteur de mesure au premier défilement, mouvement de pointeur, touche ou toucher. Le HTML serveur est complet et la CSS tient la place (scène à plat, trait statique). Un audit de laboratoire (Lighthouse) ne survole ni ne défile : ces moteurs ne comptent pas dans le JavaScript initial.
7. **Armer sans clignoter.** Quand un tracé doit attendre un événement (la photo du hero), le HTML serveur reste complet et visible ; un script en ligne du layout (`MotionScript`) pose `<html data-js>` avant le premier rendu, et c'est cette condition, combinée aux trois interrupteurs, qui autorise la CSS à cacher le fil jusqu'au signal de l'île. Sans JavaScript, sans `data-js`, en mouvement réduit ou en mode confort : affiché d'emblée, sans passer par un état caché.

## 2. Liste fermée des animations

Toute animation absente de cette liste doit y être ajoutée avant d'être livrée.

| Nom | Composant / classe | Déclencheur | Durée | Courbe | Mouvement réduit, confort, simulation |
| --- | --- | --- | --- | --- | --- |
| Fondu-montée | `Reveal` `rise` (`.m-reveal--rise`) | Entrée dans l'écran (IntersectionObserver, seuil 0,15), une seule fois, sous le pli seulement | 300 ms (`--duration-slow`), délai optionnel | `--ease-out` | Visible d'emblée, aucune transition |
| Fondu | `Reveal` `fade` (`.m-reveal--fade`) | idem | 300 ms | `--ease-out` | idem |
| Liste en cascade | `Reveal` `stagger` (`.m-reveal--stagger`) | idem, sur les enfants directs | 300 ms + 60 ms × rang (`--m-stagger`) | `--ease-out` | idem |
| Tracé d'un SVG au fil | `Reveal` `draw` (`.m-reveal--draw`) | idem, `pathLength="1"` posé sur les formes | 800 ms (`--thread-duration`, entre 600 et 900) | `--ease-out` | Tracé complet d'emblée |
| Tracé du Fil (existant) | `Thread` (`.thread`) | idem, composant existant inchangé | 800 ms | `--ease-out` | idem |
| Compteur | `CountUp` (`.m-count`) | Moitié de l'élément visible, une seule fois | 900 ms, `requestAnimationFrame` | Sortie en cube `1 − (1 − t)³` | Valeur finale affichée, aucun comptage |
| Inclinaison | `Tilt` (`.m-tilt`) | Souris seulement (`pointerType === "mouse"`), suivi à 80 ms, retour à la sortie du pointeur | Retour 200 ms (`--duration-base`) | `--ease-out` | Aucune inclinaison (`transform: none !important`) ; jamais au toucher, au stylet, au clavier |
| Couche de profondeur | `Parallax` (`.m-parallax`), à partir de 64 rem | Défilement, `animation-timeline: view()` (compositeur, zéro JavaScript) | Traversée de l'écran, ±24 px au plus | linéaire | Couche immobile (`animation: none`) ; idem sous 64 rem et dans les navigateurs sans `animation-timeline` |
| `parallax-2` : illustration au fil | `Thread` avec `parallax` (`.m-parallax`, 16 px), à partir de 64 rem | idem | Traversée de l'écran, ±16 px | linéaire | Immobile ; jamais sur une photo ni sur du texte |
| `fil-hero` : le fil qui signe le hero | `HeroThread` (`.hero-thread`, `hero-thread.css`) | Chargement de la photo du hero (`load` de l'`<img>`, ou déjà chargée), une seule fois | 1 200 ms (`--thread-hero-duration`) : trait du H1 30 %, contour 55 %, nœud 15 % | `--ease-out` | Affiché d'emblée (`data-state="idle"`, `stroke-dashoffset: 0`), aucune transition ; idem sans JavaScript |
| `hero-depth` : trois couches vers le pointeur | `HeroDepth` (`.m-depth`, `.m-depth__stage`) | Souris seulement (`pointerType === "mouse"`), ordinateur avec pointeur fin (`@media (hover: hover) and (pointer: fine) and (min-width: 64rem)`), suivi à 80 ms | Retour 300 ms (`--duration-slow`) ; ±4° au plus (`maxDeg`), perspective 1 200 px, couches à 0 / 24 / 48 px | `--ease-out` | Aucune rotation ni perspective (`transform: none !important`, `perspective: none`) ; jamais au toucher, au stylet, au clavier |
| `fil-conducteur` : le trait de page | `PageThread` (`.m-pthread`, à partir de 64 rem) | Défilement : trait `animation-timeline: scroll(root)` (pointe à 55 % de l'écran, `clip-path`), nœud `animation-timeline: view()` (`cover 0 % → 30 %`) | Liée au défilement | linéaire | Trait complet, nœuds noués (`animation: none`) ; idem sans `animation-timeline` |
| Carte qui se retourne (jeton) | `--duration-flip: 500ms` (tokens.css) | Bouton « Voir ce qu'elle contient » (composant `FlipCard`, hors de ce livrable) | 500 ms | `--ease-out` | 0 ms, comme les autres durées |
| Rotation lente | `HeroScene` `maison` et `fil` (`.m-scene__stage`) | Chargement (CSS `animation`) | 12 s, boucle | linéaire | Pose fixe `rotateY(−32deg)` |
| Respiration | `HeroScene` `fil` (`.m-scene__tilt`) | Chargement | 8 s, aller-retour | `--ease-out` | Immobile |
| Transitions d'état des composants (existant) | `Card`, `Button`, `ComfortToggle`… | Survol, focus, activation | 150 à 200 ms | `--ease-out` | Aucune transition (jetons à 0 ms) |

Hors liste et interdits : carrousel automatique, vidéo en lecture automatique avec son, animation en boucle rapide, tout effet qui déplace le contenu pendant qu'on le lit, tout WebGL chargé d'emblée.

## 3. Composants

### `prefersReducedMotion()`, `useReducedMotion()` — `src/lib/motion/reduced-motion.ts`

- `prefersReducedMotion()` : vrai côté serveur, vrai si la media query, le mode confort ou la simulation est active.
- `useReducedMotion()` : hook client, `useSyncExternalStore` (abonnement à la media query et aux attributs de `<html>` par `MutationObserver`). Instantané serveur : `true`. Aucun état posé dans un effet.
- `setSimulatedReducedMotion(on)` / `isSimulatedReducedMotion()` : outil du styleguide.

### `Reveal` — `src/components/motion/Reveal/Reveal.tsx` (île client)

```tsx
<Reveal>…</Reveal>                       // fondu-montée 12 px
<Reveal variant="fade" delay={120}>…</Reveal>
<Reveal as="ol" variant="stagger">…</Reveal>  // enfants directs, 60 ms d'écart
<Reveal as="figure" variant="draw"><svg>…</svg></Reveal>
```

Props : `as`, `variant`, `delay`, `stagger`, `threshold`. Les enfants restent des composants serveur (passés en `children`). Règles : un `Reveal` par bloc de section, jamais autour du hero ni d'un formulaire, jamais imbriqués, jamais sur un élément qui reçoit le focus au chargement.

### `CountUp` — `src/components/motion/CountUp/CountUp.tsx` (île client)

```tsx
<CountUp value={1268} />                       // « 1 268 »
<CountUp value={12.5} decimals={1} suffix=" €" />
```

Le chiffre doit être un **fait sourcé** (brief §2) : le composant l'affiche, il ne l'invente pas. Chiffres tabulaires, largeur réservée (`--m-count-width`) : CLS 0. Le lecteur d'écran lit la valeur finale (`sr-only`) ; la copie animée est `aria-hidden`.

### `Tilt` — `src/components/motion/Tilt/Tilt.tsx` (île client)

```tsx
<Tilt as="li"><Card interactive>…</Card></Tilt>
```

Props : `as`, `max` (degrés, plafonné à 6). Perspective 800 px. Ne pose jamais de gestionnaire sur les enfants : liens et boutons restent cliquables, le focus clavier ne déclenche rien. Réservé aux cartes de moins de 480 px de large ; ne jamais l'appliquer à un bloc de texte long. Coquille de 0,7 Ko : un seul gestionnaire `pointerenter` ; au premier survol d'une souris avec un pointeur fin (`(hover: hover) and (pointer: fine)`), le mouvement permis, elle charge `lib/motion/pointer-tilt` (0,6 Ko, partagé avec `HeroDepth`), qui pose les écouteurs natifs et le style en ligne. Rendu serveur inchangé.

### `Parallax` — `src/components/motion/Parallax/Parallax.tsx` (composant serveur)

```tsx
<Parallax amount={24} aria-hidden="true">…</Parallax>   // couche décorative
<Parallax amount={-16}>…</Parallax>                    // avance au lieu de retarder
```

Props : `as`, `amount` (−24 à 24 px, 16 par défaut). Zéro JavaScript : `animation-timeline: view()` sous `@supports`, jouée sur le compositeur, sans écouteur `scroll` ni `will-change`. Les navigateurs qui ne connaissent pas les animations liées au défilement affichent la couche immobile : c'est le repli statique voulu. Trois couches par section au plus ; le texte courant ne dépasse jamais ±8 px.

### `HeroDepth` — `src/components/motion/HeroDepth/HeroDepth.tsx` (île client)

```tsx
<HeroDepth maxDeg={4}>…photo, fil, nœud…</HeroDepth>   // 4 par défaut
<HeroDepth maxDeg={2}>…</HeroDepth>                    // aidants
<HeroDepth maxDeg={0}>…</HeroDepth>                    // adultes en situation de handicap : à plat
```

Props : `maxDeg` (0 à 4, plafonné), plus les attributs d'un `div`. Deux éléments : `.m-depth` (perspective 1 200 px, gestionnaires de pointeur) et `.m-depth__stage` (`transform-style: preserve-3d`, `rotateX(var(--rx)) rotateY(var(--ry))`). L'île ne porte qu'un gestionnaire `pointerenter` ; au premier survol d'une souris avec un pointeur fin et le mouvement permis, elle charge le moteur commun `lib/motion/pointer-tilt` (import dynamique, partagé avec `Tilt`), qui pose `--rx`, `--ry` et `data-depth="active"` au rythme de `requestAnimationFrame`, puis les retire à la sortie du pointeur (retour 300 ms en CSS). Les enfants donnent leur profondeur : `translateZ(0)` pour la photo, `translateZ(24px)` pour le fil (`.hero-thread__fil`), `translateZ(48px)` pour le nœud (`.hero-thread__knot`). Sur mobile, au toucher, sans pointeur fin ou en mouvement réduit : ni perspective ni rotation, couches à plat, aucun gestionnaire posé sur les enfants (liens et boutons intacts).

### `HeroThread` — `src/components/ui/Thread/HeroThread.tsx` (composant serveur) + `HeroThreadArm.tsx` (île), `hero-threads.ts`, `hero-thread-entry.ts`, `hero-thread.css`

```tsx
<HeroThread fil="bras-lies" knot="62% 48%" tone="light" depth={4}>
  <PhotoFigure … />           // ou ReaderPhoto : n'importe quel média qui contient un <img>
</HeroThread>
```

Props : `fil` (`generique` par défaut, `bras-lies`, `main-qui-fait`, `album`, `tasse`), `knot` (« x% y% », le `focal` de la photo en général ; centre par défaut, borné de 8 à 92 %), `tone`, `depth` (transmis à `HeroDepth`), `heading` (sélecteur du titre, `h1` par défaut, cherché dans `.hero`). Trois couches dans la scène de `HeroDepth` (photo, contour, nœud) et, hors de la scène, le trait qui part du dernier mot du titre : ce trait ne pivote jamais (le texte non plus). Géométries en unités relatives de la boîte de la photo (`viewBox 0 0 100 100`, `preserveAspectRatio="none"`, `vector-effect: non-scaling-stroke`) : la même géométrie épouse le 4:5 d'ordinateur et la bande 16:9 de mobile ; tracé jamais fermé, un seul nœud (anneau ouvert framboise de 16 px posé à `knot`). `HeroThread` est un composant serveur : le SVG, les cinq géométries et le nœud sont rendus par le serveur et ne partent jamais au client. Seule `HeroThreadArm` (1,2 Ko, un `<span hidden>` d'ancrage dans `.hero-thread`) est cliente : elle mesure le dernier mot du titre après le montage, au chargement des polices et à la redimension (étendue par `Range`), écrit le trait dans l'attribut `d` du DOM et, sur ordinateur, recale l'entrée du contour à la hauteur du mot en réécrivant seulement son premier segment (`hero-thread-entry.ts`, `withEntry`). Le serveur rend le contour et le nœud complets (`data-state="idle"`) ; avec `data-js` et le mouvement permis, la CSS les cache jusqu'à ce que l'île pose `data-state="drawn"` au chargement de la photo (`img.complete` ou événement `load`, deux images d'attente pour laisser peindre l'état caché). En mouvement réduit, l'île ne pose rien : affiché d'emblée.

### `PageThread` — `src/components/motion/PageThread/PageThread.tsx` (île client, montée dans `src/app/layout.tsx`)

```tsx
<PageThread />                                                          // layout : main, h2, exclusions par défaut
<PageThread root="#pagethread-demo" headings="h3" exclude={[]} eager />   // styleguide : moteur chargé d'emblée
```

Props : `root` (`main`), `headings` (`h2`), `exclude` (`PAGE_THREAD_EXCLUDED`, `src/lib/motion/page-thread.ts` : `/styleguide/`, `/demande/`, `/etre-rappele/`, `/contact/`, comparés par préfixe à `usePathname()`), `eager`. Deux fichiers : la coquille `PageThread.tsx` (0,6 Ko) et le moteur `PageThreadEngine.tsx` (1,0 Ko, `React.lazy`, jamais rendu par le serveur ; `next/dynamic` aurait tiré 3,7 Ko de routeur). La coquille ne rend rien : sur un chemin exclu elle pose `data-pthread="off"` sur `<html>` ; sinon, sur un écran d'au moins 64 rem, elle attend le premier signe d'usage (`scroll`, `pointermove`, `keydown`, `touchstart`) et monte le moteur. En attendant, un trait statique en CSS pur (`body > main::before`, motion.css : la portion visible en haut de page, jusqu'à la ligne de lecture) tient la place ; il n'apparaît pas sur les chemins exclus (`data-pthread="off"`, posé par MotionScript avant le premier rendu) et disparaît quand le moteur a rendu (`data-pthread="on"`). Le moteur mesure `main` (haut, hauteur, ce qui reste dessous) et chaque titre visible (ceux d'un panneau replié ou en `sr-only` n'ont ni hauteur ni largeur : pas de nœud), puis rend hors du flux (`position: absolute`, `z-index: 1`, `pointer-events: none`, `aria-hidden`) un trait de 2 px et un anneau ouvert de 12 px par titre, au milieu de sa première ligne. Colonne : `max(0.75rem, (100 % − 75rem) / 2 − 1.5rem)`, donc dans la gouttière à 1 024 px, à 24 px du conteneur à partir de 1 296 px. Remesure sur `ResizeObserver(document.body)`, `resize`, `document.fonts.ready`, changement de chemin. Tout le mouvement est en CSS (motion.css) : le trait grandit avec `animation-timeline: scroll(root)` et sa pointe suit la ligne de lecture (55 % de l'écran) par un `clip-path` calculé sur `--m-pt-top` et `--m-pt-below` ; chaque nœud se noue (`stroke-dashoffset` 1 → 0) sur `animation-timeline: view()`, plage `cover 0 % → 30 %`. Aucune page n'a été modifiée.

### `MotionScript` — `src/components/motion/MotionScript/MotionScript.tsx` (script en ligne, layout)

Pose `<html data-js>` avant le premier rendu (voir §1, point 7) et `data-pthread="off"` sur les chemins exclus du fil conducteur (liste importée de `src/lib/motion/page-thread.ts`, 160 caractères en tout). Aucune donnée lue ni écrite ; autorisé par la CSP comme `ComfortScript` (D-013).

### `Thread` avec `parallax` — `src/components/ui/Thread/Thread.tsx`

```tsx
<Thread illustration="tasse" parallax />   // 16 px liés au défilement, à partir de 64 rem
```

Ajoute `.m-parallax` et `--m-parallax: 16px` (`THREAD_PARALLAX_PX`) sur le SVG : zéro JavaScript, immobile en mouvement réduit, sous 64 rem et sans `animation-timeline`. Réservé aux illustrations ; jamais une photo, jamais du texte.

### `Hero` — `src/components/blocks/Hero/Hero.tsx` (props ajoutées pour l'intégration)

```tsx
<Hero … media={photo} />                                        // fil générique, nœud au centre, 4°
<Hero … media={photo} depth={2} thread={{ fil: "tasse", knot: hero.photo.focal }} />   // aidants
<Hero … media={photo} depth={0} thread={{ fil: "tasse", knot: "60% 55%" }} />          // adultes : à plat
<Hero … media={photo} thread={null} />                          // pas de fil, profondeur seule
```

- `depth?: number` : 4 par défaut, 2 pour les aidants, 0 = aucune inclinaison. Avec `media` seulement.
- `thread?: { fil: HeroThreadFil; knot?: string } | null` : sans valeur, `generique` avec le nœud au centre ; `null` retire le fil. Avec `media` seulement.
- Le bouton framboise (`primary`) est enveloppé dans `<span class="hidden lg:contents" data-hero-primary>` : masqué sous 64 rem (la barre mobile porte déjà « Rappel » et « Ma demande »), le bouton de contour et le téléphone restent visibles.

### `HeroScene` — `src/components/motion/HeroScene/HeroScene.tsx` (composant serveur)

```tsx
<HeroScene variant="maison" size={220} />
<HeroScene variant="fil" />
```

CSS 3D pur (`transform-style: preserve-3d`, `perspective`), `aria-hidden`, `pointer-events: none`. Ses règles vivent dans `hero-scene.css`, importée par le composant : elles ne partent qu'avec les pages qui l'utilisent (le styleguide aujourd'hui), plus dans le CSS global (1,5 Ko gzip de moins pour toutes les pages). `maison` : quatre murs (paper et sable), deux pans de toit (teal-700 et teal-800), deux pignons, une porte framboise (le nœud), une ombre au sol. `fil` : trois arcs ouverts (jamais fermés, docs/02 §1), un nœud. Tout est proportionnel à `size`. À placer à côté du H1 du hero, jamais derrière du texte. Aucune variante canvas/WebGL n'est livrée : si un jour un objet plus riche est voulu, il sera chargé par `next/dynamic` après interaction ou hors écran, avec `HeroScene` comme repli statique.

## 4. Poids mesurés

Mesure du 2026-09-20, après `pnpm build` (Next 16.3.5, Turbopack) :

| Île | Minifié | gzip | brotli |
| --- | --- | --- | --- |
| `lib/motion/reduced-motion` (partagée) | 1 103 o | 516 o | 431 o |
| `Reveal` (avec la lib et `cn`) | 1 469 o | 827 o | 725 o |
| `CountUp` (idem) | 1 454 o | 824 o | 727 o |
| `Tilt` (idem) | 1 372 o | 769 o | 666 o |
| Les trois îles ensemble (lib comptée une fois) | 4 297 o | 1 749 o | 1 576 o |
| `Parallax`, `HeroScene` | 0 o côté client (composants serveur) | — | — |
| `MotionSimulator` (styleguide seulement) | 1 877 o | 897 o | 780 o |

Lot 3, mesure du 2026-09-20 (même méthode, `next/navigation` externe) :

| Île | Minifié | gzip | brotli |
| --- | --- | --- | --- |
| `HeroDepth` (avec la lib et `cn`) | 1 549 o | 820 o | 722 o |
| `HeroThread` (avec `HeroDepth`, la lib, les cinq géométries, la mesure du trait) | 5 427 o | 2 396 o | 2 173 o |
| `PageThread` (hors `next/navigation`, déjà dans le socle) | 1 940 o | 1 053 o | 942 o |
| `Thread` avec `parallax` (composant existant, +1 prop) | 1 921 o | 1 136 o | 998 o |
| `MotionScript` | script en ligne de 41 caractères | — | — |

Complément budget du 2026-09-20 (mêmes méthodes ; moteurs différés externes aux coquilles) :

| Module | Minifié | gzip | brotli | Chargement |
| --- | --- | --- | --- | --- |
| `HeroDepth` (coquille, lib comprise) | 1 510 o | 816 o | 712 o | Initial |
| `Tilt` (coquille, lib comprise) | 1 315 o | 748 o | 648 o | Initial |
| `lib/motion/pointer-tilt` (moteur, lib comprise) | 1 041 o | 569 o | 489 o | Premier survol d'une souris avec pointeur fin |
| `HeroThreadArm` (île du fil, entrée du contour comprise) | 2 567 o | 1 231 o | 1 098 o | Initial (le SVG et les géométries restent serveur) |
| `PageThread` (coquille, hors `next/navigation`) | 1 039 o | 597 o | 516 o | Initial |
| `PageThreadEngine` (moteur) | 1 886 o | 970 o | 856 o | Premier défilement, pointeur, touche ou toucher |
| `MotionScript` | script en ligne de 160 caractères | — | — | Dans le HTML |

Dans les chunks construits (gzip, mesure sur `.next/static/chunks`), la part de ces îles est bien plus faible que leurs poids isolés (les chaînes communes se compressent ensemble) : le passage aux coquilles fait perdre 0,5 Ko gzip à l'accueil (196,8 → 196,4 Ko pour les dix scripts référencés par le HTML, dont un chunk de 39 Ko que Lighthouse ne voit pas charger). Le vrai poids de la page est le socle : React et le routeur de Next (0d_, 0sj, 1157, turbopack : 127 Ko gzip, 78 % du total compté par Lighthouse), puis le chunk des composants partagés de la page (12,6 Ko : `next/image`, `Reveal`, `CountUp`, semaine type, recherche de commune, gestes) et celui du layout (10,8 Ko : en-tête, confort, barre mobile, coquille du fil).

Sur les pages construites (total des scripts référencés par le HTML, gzip, lots 1 à 3 de l'autre agent compris) : accueil 192 Ko (9 scripts), `/personnes-agees/` et `/aidants/` 234 Ko (11 scripts, gabarit service avec ses gestes), `/a-propos/` 178 Ko (8 scripts, page sans île de ce lot au-delà de `PageThread`), `/styleguide/mouvement/` 185 Ko. Les trois îles de ce lot représentent 3,4 Ko gzip au plus par page (HeroThread avec HeroDepth : 2,4 Ko ; PageThread : 1,1 Ko), et 1,1 Ko sur une page sans photo de hero. La feuille `motion.css` pèse 3,5 Ko gzip (source, 1,2 Ko avant ce lot) et `hero-thread.css` 1,0 Ko ; le CSS global construit passe à 12,9 Ko gzip. Le dépassement des 160 Ko de D-019 sur toutes les pages précède ce lot (voir la note ci-dessus) et relève de l'intégration : ce lot ajoute au plus 2 %.

Méthode : esbuild (déjà présent via Vite) bundle chaque entrée, React externe, minifié, puis `zlib` (gzip niveau 9, brotli). Sur la page construite, le seul chunk propre à `/styleguide/mouvement/` (îles, simulateur, références client de la page) pèse 5 524 o minifiés, 2 317 o gzip. Total des scripts de la page : 181,9 Ko gzip, contre 180,7 Ko pour `/a-propos/` et 182,9 Ko pour l'accueil : l'infrastructure ajoute environ 1,3 Ko gzip à une page qui utilise les trois îles. La feuille `motion.css` ajoute environ 1,2 Ko gzip au CSS global (11,0 Ko).

Note : le total par page mesuré ici compte tous les scripts référencés par le HTML (framework, runtime, polyfills) ; il dépasse déjà les 160 Ko de D-019 avant ce livrable, sur toutes les pages. Ce point relève de l'intégration, pas de cette infrastructure.

## 5. Règles d'usage

- Une page de contenu : au plus un `HeroScene`, trois `Parallax`, un `Reveal` par bloc de section, deux à quatre `CountUp` (chiffres sourcés), `Tilt` sur des cartes seulement.
- Ne jamais mettre un `Reveal` autour d'un élément qui porte le H1, un formulaire, un message d'erreur, une zone `aria-live`.
- Ne jamais imbriquer deux `Reveal`, ni un `Tilt` dans un `Parallax`.
- Aucune information ne doit être portée par un mouvement : ce qui bouge doit être lisible immobile.
- Tester en mouvement réduit (bouton du styleguide, réglage du système) et en mode confort : tout doit être visible, immobile, cliquable au clavier.
- Toute nouvelle animation passe par `motion.css` (préfixe `.m-`), est neutralisée dans les trois contextes et est ajoutée au tableau du §2. Les règles d'un composant rarement monté vont dans une feuille à côté de lui (`hero-scene.css`, `hero-thread.css`, `thread-connector.css`), pas dans le CSS global.
- Un moteur qui répond au pointeur ou au défilement se charge au premier signe d'usage (`import()`), jamais à l'inactivité : `requestIdleCallback` se déclenche pendant la fenêtre d'audit et compterait dans le JavaScript initial.
- Profondeur par public (CONCEPT §4) : `depth={4}` par défaut, `depth={2}` sur `/aidants/`, `depth={0}` sur `/adultes-en-situation-de-handicap/` (photo posée, seul le fil se trace). Les cartes de stade à trois profondeurs restent portées par `railItemStyle(index, depth)` (`ThreadConnector`).
- Le nœud du fil de hero se pose sur le point d'intérêt de la photo : passer `knot={photo.focal}` (ou une valeur propre) ; sans valeur, il tombe au centre.
- Un seul `HeroThread` par page, jamais sans photo ; le trait du H1 suppose que le titre est dans `.hero` (ou donner `heading`).
- Vérifier après chaque ajout : `pnpm lint && pnpm typecheck && pnpm exec vitest run src/components/motion src/lib/motion && pnpm build`.

## 6. Limites connues

- `Reveal` et `CountUp` lisent la préférence de mouvement au montage : si l'utilisateur change de réglage sans recharger, la CSS éteint les animations en cours mais les révélations non jouées ne rejouent pas (comportement voulu, le contenu reste visible).
- `CountUp` : entre le rendu serveur (valeur finale) et le premier comptage, la valeur finale peut apparaître un instant si l'élément est dans l'écran au chargement. Placer les compteurs sous le pli.
- `Parallax` : sans `animation-timeline` (anciens navigateurs), aucune profondeur ; aucun repli JavaScript n'est fourni, par choix de budget.
- `HeroScene` : `backface-visibility: hidden` et `preserve-3d` créent quelques calques composites ; un seul objet par page.
- Pas de variante canvas/WebGL : à écrire seulement si un besoin réel apparaît, chargée à la demande, avec repli.
- `HeroThread` : le contour et le nœud sont rendus par le serveur, mais le trait du H1 n'existe qu'après mesure (donc pas sans JavaScript, ni si `Range.getBoundingClientRect` manque). Si l'île n'hydrate pas alors que `data-js` est posé, le fil reste caché sur ce hero (la photo et le texte ne dépendent de rien).
- `HeroThread` : avec `ReaderPhoto` (deux photos), la première `<img>` déclenche le tracé ; la bascule de lecteur ne le rejoue pas.
- `PageThread` : le moteur n'existe qu'après un premier signe d'usage ; un lecteur qui ne défile pas voit seulement le trait statique du haut de page (ce que le trait animé montrerait au même endroit). Les nœuds sont posés au montage du moteur et remesurés quand le document change de taille ; un titre qui apparaît sans changer la hauteur du document (rare) garde le nœud là où il était. Le trait passe sous l'en-tête collant (`z-index` 1 contre 40).
- `Tilt`, `HeroDepth` : le moteur se charge au premier `pointerenter` ; le tout premier mouvement sur la toute première carte survolée arrive avant lui (quelques dizaines de millisecondes), sans effet visible.
- `HeroDepth` : la perspective scale légèrement les couches à 24 et 48 px même au repos (2 à 4 %), seulement sur ordinateur avec pointeur fin ; c'est voulu, le fil « flotte » au-dessus de la photo.

## 7. Budget JavaScript et LCP (mesure du 2026-09-20)

Lighthouse CI (`pnpm lhci`, lighthouserc.cjs : mobile, 4G et processeur ×4 en étranglement `devtools`, trois passages, médiane), quatre pages témoins, budgets de docs/07 §5 : JavaScript 160 Ko sur l'accueil et 220 Ko sur les pages de formulaire et de service, LCP 2,0 s.

| Page | JavaScript initial (budget) | LCP (budget 2,0 s) | Image du hero | Performance | TBT |
| --- | --- | --- | --- | --- | --- |
| `/` | 162 → **161 Ko** (160) | 2 111 → **1 944 ms** | 16,5 Ko WebP → 7,9 Ko AVIF, demandée à 1 236 → 620 ms | 0,96 → 0,96 | 147 → 168 ms |
| `/etre-rappele/` | 198 → **197 Ko** (220) | 1 797 → **1 791 ms** (texte) | — | 0,99 → 0,98 | 50 → 55 ms |
| `/personnes-agees/` | 224 → **223 Ko** (220) | 2 196 → **2 051 ms** | 23 Ko → 11 Ko (deux photos : 54 → 30 Ko) | 0,97 → 0,97 | 106 → 115 ms |
| `/services/garde-de-nuit/` | 224 → **223 Ko** (220) | 2 281 → **2 014 ms** | 31 Ko → 13 Ko | 0,95 → 0,97 | 134 → 125 ms |

Valeurs « avant » : mesure du coordinateur (rapports du 2026-09-20 16:56, conservés hors dépôt) ; « après » : `.lighthouseci/` du 2026-09-20 17:26 (heure UTC des rapports). Tailles Lighthouse = octets transférés (brotli), plus faibles que les gzip de `.next/static/chunks` cités plus haut. Le préchargement de l'image partait à 1 236 ms après la requête du document (priorité basse, derrière les feuilles de style et les polices) ; avec `fetchpriority="high"` il part à 620 ms, en même temps que le CSS, et l'image est peinte 30 à 60 ms après son arrivée.

Ce qui a changé entre les deux mesures :

- **Décoration différée** (§1 point 6) : `Tilt`, `HeroDepth` et `PageThread` ne gardent qu'une coquille ; `HeroThread` devient un composant serveur, seule l'île d'armement part au client ; les règles de `HeroScene` quittent le CSS global. Gain réel sur le JavaScript initial : 1 Ko par page (162 → 161 Ko sur l'accueil, 224 → 223 Ko sur les pages services, 198 → 197 Ko sur le rappel), les moteurs différés n'étant plus dans la fenêtre de mesure. Les îles de décoration n'ont jamais pesé les 6 Ko visés : leur part dans les chunks compressés était d'environ 1 Ko, le reste est le socle React + Next (127 Ko gzip) et les composants de contenu.
- **Image du hero** (`PhotoFigure`, next.config.ts) : formats `image/avif` puis `image/webp`, qualité 60 sur le hero (75 ailleurs, `images.qualities: [60, 75]`), `fetchPriority="high"` posé sur l'image et sur son préchargement (next/image 16 ne le fait pas seul : sans lui, le préchargement partait en priorité basse, après les feuilles de style et derrière les polices, 1 236 ms après la requête du document dans la mesure « avant »). Sur l'accueil mobile, l'image du hero passe de 16,5 Ko (WebP, q 75) à 7,9 Ko (AVIF, q 60) ; la première génération AVIF par `next start` prend 0,2 s (750 px) à 0,3 s (1 920 px), puis vient du cache. Le `sizes` du hero reste `(min-width: 75rem) 480px, (min-width: 64rem) 40vw, 100vw` : 100 vw sous 64 rem, 40 vw au-dessus, plafonné à 480 px sur les grands écrans.

Ce qui reste au-dessus des budgets, et pourquoi :

- **JavaScript : 161 Ko sur l'accueil (160), 223 Ko sur `/personnes-agees/` et `/services/garde-de-nuit/` (220).** Le socle React + routeur Next pèse 127 Ko gzip (78 % de l'accueil) ; les îles de décoration de ce livrable représentent moins de 3 Ko brotli, tout différé compris. Ce qui reste est le contenu : `next/image` (client), `Reveal`, `CountUp`, la semaine type, la recherche de commune, le parcours « Pour qui ? » (accueil) ; le formulaire détaillé de la section 12 avec `react-hook-form`, `zod` et `libphonenumber` (29 Ko gzip, pages services), les gestes de hero et le sélecteur de lecteur. Trois pistes hors de ce périmètre, par ordre de rendement : charger le formulaire de section 12 à la demande (au premier focus ou à l'entrée dans l'écran : −29 Ko sur les pages services, largement sous 220) ; scinder le chunk partagé de l'accueil (12,6 Ko) pour ne charger la semaine type et la recherche de commune qu'à leur entrée dans l'écran ; ne pas hydrater ce qui n'a pas d'interaction.
- **LCP : 2 051 ms sur `/personnes-agees/`, 2 014 ms sur `/services/garde-de-nuit/` (2 000).** Le premier rendu (FCP) est à 1 790 ms sur toutes les pages, image ou non : c'est le coût du HTML (46 Ko gzip sur `/personnes-agees/`, charge utile RSC comprise), du CSS et des polices sur 4G ; l'image n'ajoute plus que 200 à 260 ms (elle arrive 1,3 s après sa demande de 11 Ko, en concurrence avec les polices : 35 + 122 Ko). Deux pistes : une seule photo dans `ReaderPhoto` au chargement (la seconde, « pour vous-même », est aujourd'hui rendue et chargée d'emblée, 19 Ko sur 4G avant que le lecteur ait choisi : à ne rendre qu'après la bascule, composant hors de ce périmètre) ; alléger la police Fraunces (122 Ko, axes `SOFT` et `opsz` : un sous-ensemble ou un seul axe ferait gagner plusieurs centaines de millisecondes de bande passante avant le LCP).
- **TBT : 168 ms sur l'accueil (150).** Dispersion de 140 à 183 ms sur trois passages, 107 à 183 avant : la médiane bouge d'un passage à l'autre sans changement du travail principal (l'hydratation de React sur processeur ×4). Le gain viendra des mêmes pistes que le JavaScript.
- **SEO 0,69 sur les pages `a_relire`** : noindex voulu. L'entrée ajoutée à `lighthouserc.cjs` ne remplace pas la règle `.*` (`categories:seo ≥ 1`) : dans `assertMatrix`, toutes les entrées dont le motif correspond s'appliquent, et la plus stricte fait échouer la passe. Pour tolérer ces pages, la règle générale doit exclure leurs chemins (motif négatif) ou l'assertion SEO doit être déplacée dans les entrées par page.
