# Mouvement et profondeur — infrastructure d'animation

Livrable « Mouvement et 3D » du brief `docs/design/BRIEF_EXPERIENCE.md` (D-024), aligné sur le **contrat du mouvement** de `docs/design/BRIEF_LIQUID_GLASS.md` §5 (décision D-032), qui prévaut là où il contredit `docs/02 §5` et `docs/02 §1`.

Code : `src/lib/motion/`, `src/components/motion/`, `src/styles/motion.css` (importée par `globals.css`), `src/components/ui/Thread/` (`HeroThread`, `hero-threads.ts`, `hero-thread.css`). Démonstration : `/styleguide/mouvement/` (noindex, exclue du plan de site comme `/styleguide/`).

Lot 3 (« la profondeur », CONCEPT §8) livré le 2026-09-20 : `HeroDepth`, `HeroThread` (`fil-hero`), `PageThread` (`fil-conducteur`), `parallax-2` sur les illustrations, jeton `--duration-flip`, bouton framboise du hero masqué sur mobile. Complément budget (même jour, §7) : moteurs de décoration chargés à la demande, image du hero allégée (AVIF, qualité 60, `fetchpriority="high"`).

Passe « mouvement irréprochable » du 2026-09-27 (D-032) : grille unique des durées et des courbes (`src/lib/motion/grid.ts`), une seule fabrique d'observateurs et une seule mesure du pli (`viewport.ts`), une seule image pour tous les effets de pointeur et de défilement (`frame.ts`), fondu court entre deux pages (`PageFade`), suiveur de pointeur du reflet du verre (`Sheen`), classe `m-press`, fin des animations infinies de `HeroScene`, inclinaisons ramenées à 2°, entrée du hero ramenée à 560 ms, cascades à 40 ms. Voir §8 pour la grille et §9 pour ce qui a changé.

## 1. Principes

1. **CSS d'abord.** Chaque animation est une règle CSS (transition, `animation`, `animation-timeline`). Le JavaScript, quand il existe, se contente de poser un attribut (`data-reveal`, `data-tilt`) ou un style en ligne au rythme de `requestAnimationFrame`. Aucun état React, aucun nouveau rendu.
2. **Jamais de contenu caché sans JavaScript.** Le serveur rend tout visible. L'état « caché » (`data-reveal="pending"`) n'est posé qu'après le montage, seulement si le mouvement est permis, seulement pour un élément sous le pli. Au-dessus du pli, rien ne bouge : pas de clignotement, LCP intact.
3. **Trois interrupteurs, un seul module.** `prefers-reduced-motion: reduce`, le mode confort (`html[data-comfort="on"]`) et la simulation du styleguide (`html[data-motion="reduce"]`) coupent tout, en CSS (règles dédiées dans `motion.css`, jetons de durée à 0 ms dans `tokens.css`) et en JavaScript (`prefersReducedMotion()`).
4. **Budget (D-019).** Îles de moins d'un kilo-octet compressé chacune. Aucune dépendance ajoutée. Aucun WebGL, aucune bibliothèque 3D : les objets du hero sont en CSS 3D.
5. **Accessibilité.** Rien ne dépend d'un survol ou d'une animation pour être lu ou activé. Les objets 3D et les couches décoratives sont `aria-hidden`. Le compteur garde la valeur finale lisible par les lecteurs d'écran dès le rendu serveur. Aucun clignotement, aucune lumière stroboscopique, aucune animation automatique de plus de 12 s de période.
6. **Différer ce qui n'est pas lu.** Une décoration qui répond au pointeur ou au défilement ne charge son moteur qu'au premier signe d'usage : `Tilt`, `HeroDepth` et `Sheen` importent `lib/motion/pointer` au premier `pointerenter` d'une souris avec un pointeur fin ; `PageThread` importe son moteur de mesure au premier défilement, mouvement de pointeur, touche ou toucher. Le HTML serveur est complet et la CSS tient la place (scène à plat, trait statique). Un audit de laboratoire (Lighthouse) ne survole ni ne défile : ces moteurs ne comptent pas dans le JavaScript initial.
7. **Armer sans clignoter.** Quand un tracé doit attendre un événement (la photo du hero), le HTML serveur reste complet et visible ; un script en ligne du layout (`MotionScript`) pose `<html data-js>` avant le premier rendu, et c'est cette condition, combinée aux trois interrupteurs, qui autorise la CSS à cacher le fil jusqu'au signal de l'île. Sans JavaScript, sans `data-js`, en mouvement réduit ou en mode confort : affiché d'emblée, sans passer par un état caché.

## 2. Liste fermée des animations

Toute animation absente de cette liste doit y être ajoutée avant d'être livrée. Les durées viennent de la grille (§8) ; aucune ne dépasse 600 ms, délai compris.

| Nom | Composant / classe | Déclencheur | Durée | Courbe | Mouvement réduit, confort, simulation |
| --- | --- | --- | --- | --- | --- |
| Fondu-montée | `Reveal` `rise` (`.m-reveal--rise`) | Entrée dans l'écran (observateur partagé, seuil 0,15), une seule fois, sous le pli seulement | 300 ms (`--duration-slow`), délai optionnel | `--ease-out` | Visible d'emblée, aucune transition |
| Fondu | `Reveal` `fade` (`.m-reveal--fade`) | idem | 300 ms | `--ease-out` | idem |
| Liste en cascade | `Reveal` `stagger` (`.m-reveal--stagger`) | idem, sur les enfants directs | 300 ms + **40 ms × rang** (`--m-stagger`) | `--ease-out` | idem |
| Tracé d'un SVG au fil | `Reveal` `draw` (`.m-reveal--draw`) | idem, `pathLength="1"` posé sur les formes | **400 ms** (`--thread-duration` posé par l'île) | `--ease-out` | Tracé complet d'emblée |
| Tracé du Fil | `Thread` (`.thread`) | idem, seuil 0,2, jamais sur une illustration déjà visible | **400 ms** (idem) | `--ease-out` | idem |
| Compteur | `CountUp` (`.m-count`) | Moitié de l'élément visible, une seule fois | **600 ms**, `requestAnimationFrame` | Sortie en cube `1 − (1 − t)³` | Valeur finale affichée, aucun comptage |
| Inclinaison | `Tilt` (`.m-tilt`) | Souris seulement (`pointerType === "mouse"`), suivi à 80 ms ; retour à la sortie du pointeur **et au focus clavier** | Retour 200 ms (`--duration-base`), **2° au plus** | `--ease-out` | Aucune inclinaison (`transform: none !important`) ; jamais au toucher, au stylet, au clavier |
| Reflet du verre | `Sheen` (`.m-sheen` + `glass-sheen` du design system) | Souris seulement, pointeur fin ; `--sheen-x`, `--sheen-y`, `data-sheen="active"` | Suivi du pointeur, 150 ms côté style | `--ease-out` | Aucun reflet (le design system éteint `glass-sheen`) |
| Pression d'un bouton | `.m-press` (`motion-press.css`) | `:active` d'une surface pressable | 100 ms, échelle 95 % | `--ease-out` | Aucune pression |
| Fondu entre deux pages | `PageFade` (aucune classe : `main.animate`) | Changement de chemin, jamais au premier affichage | 150 ms, opacité de `main` seulement | `--ease-out` | Aucun fondu, la page change d'un coup |
| Couche de profondeur | `Parallax` (`.m-parallax`), à partir de 64 rem | Défilement, `animation-timeline: view()` (compositeur, zéro JavaScript) | Traversée de l'écran, ±24 px au plus | linéaire | Couche immobile (`animation: none`) ; idem sous 64 rem et dans les navigateurs sans `animation-timeline` |
| `parallax-2` : illustration au fil | `Thread` avec `parallax` (`.m-parallax`, 16 px), à partir de 64 rem | idem | Traversée de l'écran, ±16 px | linéaire | Immobile ; jamais sur une photo ni sur du texte |
| `fil-hero` : le fil qui signe le hero | `HeroThread` (`.hero-thread`, `hero-thread.css`) | Chargement de la photo du hero (`load` de l'`<img>`, ou déjà chargée), une seule fois | **560 ms** (`--thread-hero-duration`, posé par `hero-thread.css`) : trait du H1 30 %, contour 55 %, nœud 15 % | `--ease-out` | Affiché d'emblée (`data-state="idle"`, `stroke-dashoffset: 0`), aucune transition ; idem sans JavaScript |
| `hero-depth` : trois couches vers le pointeur | `HeroDepth` (`.m-depth`, `.m-depth__stage`) | Souris seulement, ordinateur avec pointeur fin (`@media (hover: hover) and (pointer: fine) and (min-width: 64rem)`), suivi à 80 ms | Retour 300 ms (`--duration-slow`) ; **2° au plus** (`maxDeg`), perspective 1 200 px, couches à 0 / 24 / 48 px | `--ease-out` | Aucune rotation ni perspective (`transform: none !important`, `perspective: none`) ; jamais au toucher, au stylet, au clavier |
| `fil-conducteur` : le trait de page | `PageThread` (`.m-pthread`, à partir de 64 rem) | Défilement : trait `animation-timeline: scroll(root)` (pointe à 55 % de l'écran, `clip-path`), nœud `animation-timeline: view()` (`cover 0 % → 30 %`) | Liée au défilement | linéaire | Trait complet, nœuds noués (`animation: none`) ; idem sans `animation-timeline` |
| Carte qui se retourne (jeton) | `--duration-flip: 500ms` (tokens.css) | Bouton « Voir ce qu'elle contient » (composant `FlipCard`, hors de ce livrable) | 500 ms | `--ease-out` | 0 ms, comme les autres durées |
| Pose de l'objet 3D | `HeroScene` (`.m-scene__stage`) | Chargement, **une seule fois** (jamais de boucle) | 560 ms, `rotateY(−62deg)` → `rotateY(−32deg)` | `--ease-out` | Pose fixe `rotateY(−32deg)`, aucune animation |
| Transitions d'état des composants (existant) | `Card`, `Button`, `ComfortToggle`… | Survol, focus, activation | 150 à 200 ms | `--ease-out` | Aucune transition (jetons à 0 ms) |

Hors liste et interdits : carrousel automatique, vidéo en lecture automatique avec son, **toute animation infinie** (la rotation de 12 s et la respiration de 8 s de `HeroScene` ont été retirées le 2026-09-27), tout effet qui déplace le contenu pendant qu'on le lit, tout WebGL chargé d'emblée.

## 3. Composants

### `prefersReducedMotion()`, `useReducedMotion()` — `src/lib/motion/reduced-motion.ts`

- `prefersReducedMotion()` : vrai côté serveur, vrai si la media query, le mode confort ou la simulation est active.
- `useReducedMotion()` : hook client, `useSyncExternalStore` (abonnement à la media query et aux attributs de `<html>` par `MutationObserver`). Instantané serveur : `true`. Aucun état posé dans un effet.
- `setSimulatedReducedMotion(on)` / `isSimulatedReducedMotion()` : outil du styleguide.

### `grid.ts`, `viewport.ts`, `frame.ts` — `src/lib/motion/` (les trois modules partagés)

- **`grid.ts`** (aucune dépendance) : la grille du mouvement en chiffres — `MOTION_DURATION` (`press`, `pointer`, `page`, `state`, `reveal`, `draw`, `entry`), `MOTION_STAGGER`, `MOTION_MAX_DURATION`, `MOTION_EASE_OUT`, `MOTION_TILT_MAX_DEGREES`, `MOTION_PRESS_SCALE`, `MOTION_RISE_PX`, `FINE_POINTER_QUERY`, `ms()`. Voir §8. `grid.test.ts` échoue si une valeur sort du contrat. La requête du pointeur fin vit ici, dans le module sans dépendance, pour que les coquilles la lisent sans embarquer le moteur du pointeur.
- **`viewport.ts`** : `observeOnce(element, seuil, onEnter)` — **une seule fabrique d'observateurs**, un `IntersectionObserver` par seuil pour toute la page (et non un par élément), l'élément retiré dès sa première entrée dans l'écran, l'observateur détruit quand il n'a plus de cible ; `isOnScreen(element, groupe)` — la question du pli, posée une fois pour toute une famille de sélecteurs (`.m-reveal`, `.thread`) : une seule passe de mesure, aucune lecture de mise en page entre deux écritures d'attribut. `sharedObserverCount()` et `resetSharedObservers()` sont réservés aux tests.
- **`frame.ts`** : `scheduleFrame(job)` / `cancelScheduledFrame(job)` — **une seule image pour tous** les effets de pointeur, de défilement et de redimension. Dix mouvements entre deux images ne produisent qu'une écriture ; N éléments qui suivent le pointeur ne demandent qu'un `requestAnimationFrame`. `pendingFrameJobs()` et `resetFrames()` sont réservés aux tests.

### `PageFade` — `src/components/motion/PageFade/PageFade.tsx` (île client, montée par `MotionScript`)

Le fondu court entre deux pages (contrat §5). Ce qui bouge : l'opacité de `main`, 150 ms, `--ease-out`. **Jamais l'en-tête**, jamais la barre d'action, jamais le pied de page ; aucune propriété de mise en page, donc CLS 0 ; le défilement n'est pas touché (Next garde sa restauration). Seulement au changement de chemin (`usePathname`), **jamais au premier affichage** : une page qui s'ouvre en fondu retarderait son LCP. L'opacité de départ est posée dans un effet de mise en page, donc avant la peinture : la nouvelle page n'apparaît jamais avant de disparaître. L'opacité en ligne est retirée à la fin **et** en cas d'annulation : `main` ne peut pas rester invisible. Repli sans effet : mouvement réduit, mode confort, simulation, ou navigateur sans `Element.animate`.

Pourquoi pas les transitions de vue de Next 16 : `experimental.viewTransition` et l'enveloppe `<ViewTransition>` demandent `next.config.ts` et `src/app/layout.tsx`, hors du périmètre du mouvement. Le jour où elles seront activées, `PageFade` leur cédera la place (même durée, même courbe) : il suffira de ne plus le monter.

### `Sheen` — `src/components/motion/Sheen/Sheen.tsx` (île client)

```tsx
<Sheen className="glass glass-sheen">…</Sheen>
```

Le **suiveur de pointeur** du reflet du verre. Partage des rôles : le style est celui du design system (`glass-sheen`, `src/styles/`), le mouvement est ici. L'île n'écrit que trois choses sur son élément : `--sheen-x`, `--sheen-y` (position dans la boîte, en pourcentage, une décimale) et `data-sheen="active"` tant que la souris est dessus. Les variables étant héritées, `glass-sheen` peut être posée sur cet élément ou sur n'importe lequel de ses descendants. Souris seulement, pointeur fin, moteur chargé au premier survol (`lib/motion/pointer`, partagé avec `Tilt` et `HeroDepth`) ; le focus clavier éteint le reflet ; rien en mouvement réduit, en mode confort ni sous la simulation.

### `m-press` — `src/components/motion/MotionScript/motion-press.css`

Classe d'adhésion pour la pression d'un bouton (contrat §5) : `transform: scale(0.95)` sur `:active`, 100 ms, `--ease-out`, neutralisée dans les trois contextes. Chargée par `MotionScript`, donc disponible sur toutes les pages (quatre règles, environ 0,2 Ko minifiée). C'est la contrepartie de `glass-sheen` : **le design system pose la classe** sur ses surfaces pressables (bouton, carte cliquable, jalon), le mouvement vient d'ici.

### `Reveal` — `src/components/motion/Reveal/Reveal.tsx` (île client)

```tsx
<Reveal>…</Reveal>                       // fondu-montée (--motion-rise)
<Reveal variant="fade" delay={120}>…</Reveal>
<Reveal as="ol" variant="stagger">…</Reveal>  // enfants directs, 40 ms d'écart
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

Props : `as`, `max` (degrés, **plafonné à 2** par la grille). Perspective 800 px. Ne pose jamais de gestionnaire sur les enfants : liens et boutons restent cliquables, le focus clavier ne déclenche rien — il remet même la carte à plat. Réservé aux cartes de moins de 480 px de large ; ne jamais l'appliquer à un bloc de texte long. Coquille minuscule : un seul gestionnaire `pointerenter` ; au premier survol d'une souris avec un pointeur fin (`FINE_POINTER_QUERY`), le mouvement permis, elle charge `lib/motion/pointer` (partagé avec `HeroDepth` et `Sheen`), qui pose les écouteurs natifs et le style en ligne au rythme d'une image groupée. `will-change: transform` n'est posé que pendant l'interaction, et retiré au repos. Rendu serveur inchangé.

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

Props : `maxDeg` (0 à 2, **plafonné à 2** par la grille : les pages qui passent encore `depth={4}` sont ramenées à 2 sans erreur), plus les attributs d'un `div`. Deux éléments : `.m-depth` (perspective 1 200 px, gestionnaires de pointeur) et `.m-depth__stage` (`transform-style: preserve-3d`, `rotateX(var(--rx)) rotateY(var(--ry))`). L'île ne porte qu'un gestionnaire `pointerenter` ; au premier survol d'une souris avec un pointeur fin et le mouvement permis, elle charge le moteur commun `lib/motion/pointer` (import dynamique, partagé avec `Tilt` et `Sheen`), qui pose `--rx`, `--ry`, `data-depth="active"` et `will-change` au rythme d'une image groupée, puis les retire à la sortie du pointeur **ou au premier focus clavier** (retour 300 ms en CSS). Les enfants donnent leur profondeur : `translateZ(0)` pour la photo, `translateZ(24px)` pour le fil (`.hero-thread__fil`), `translateZ(48px)` pour le nœud (`.hero-thread__knot`). Sur mobile, au toucher, sans pointeur fin ou en mouvement réduit : ni perspective ni rotation, couches à plat, aucun gestionnaire posé sur les enfants (liens et boutons intacts).

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

L'amorce du mouvement du layout, trois choses en une :

1. le script en ligne qui pose `<html data-js>` avant le premier rendu (voir §1, point 7) et `data-pthread="off"` sur les chemins exclus du fil conducteur (liste importée de `src/lib/motion/page-thread.ts`, 160 caractères en tout). Aucune donnée lue ni écrite ; autorisé par la CSP comme `ComfortScript` (D-013) ;
2. le montage de `PageFade` (fondu entre deux pages) ;
3. l'import de `motion-press.css` (classe `m-press`).

C'est le seul point d'entrée du mouvement dans `src/app/layout.tsx` : ajouter un effet global se fait ici, sans toucher au layout.

### `Thread` avec `parallax` — `src/components/ui/Thread/Thread.tsx`

```tsx
<Thread illustration="tasse" parallax />   // 16 px liés au défilement, à partir de 64 rem
```

Ajoute `.m-parallax` et `--m-parallax: 16px` (`THREAD_PARALLAX_PX`) sur le SVG : zéro JavaScript, immobile en mouvement réduit, sous 64 rem et sans `animation-timeline`. Réservé aux illustrations ; jamais une photo, jamais du texte.

Depuis le 2026-09-27, `Thread` n'a plus d'état React : l'île écrit `data-state` sur le DOM (deux rendus de moins par illustration), confie l'entrée dans l'écran à l'observateur partagé, **ne cache plus une illustration déjà visible** (elle clignotait) et pose `--thread-duration: 400ms` elle-même, donc seulement quand le mouvement est permis.

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

CSS 3D pur (`transform-style: preserve-3d`, `perspective`), `aria-hidden`, `pointer-events: none`. Ses règles vivent dans `hero-scene.css`, importée par le composant : elles ne partent qu'avec les pages qui l'utilisent (le styleguide aujourd'hui), plus dans le CSS global (1,5 Ko gzip de moins pour toutes les pages). Aucune animation infinie : l'objet se pose en une seule séquence de 560 ms (`m-scene-settle`, `rotateY(−62deg)` → `rotateY(−32deg)`) et ne bouge plus ; la rotation de 12 s et la respiration de 8 s ont été retirées (contrat §5). `maison` : quatre murs (paper et sable), deux pans de toit (teal-700 et teal-800), deux pignons, une porte framboise (le nœud), une ombre au sol. `fil` : trois arcs ouverts (jamais fermés, docs/02 §1), un nœud. Tout est proportionnel à `size`. À placer à côté du H1 du hero, jamais derrière du texte. Aucune variante canvas/WebGL n'est livrée : si un jour un objet plus riche est voulu, il sera chargé par `next/dynamic` après interaction ou hors écran, avec `HeroScene` comme repli statique.

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
| `lib/motion/pointer-tilt` (moteur, lib comprise ; devenu `lib/motion/pointer`) | 1 041 o | 569 o | 489 o | Premier survol d'une souris avec pointeur fin |
| `HeroThreadArm` (île du fil, entrée du contour comprise) | 2 567 o | 1 231 o | 1 098 o | Initial (le SVG et les géométries restent serveur) |
| `PageThread` (coquille, hors `next/navigation`) | 1 039 o | 597 o | 516 o | Initial |
| `PageThreadEngine` (moteur) | 1 886 o | 970 o | 856 o | Premier défilement, pointeur, touche ou toucher |
| `MotionScript` | script en ligne de 160 caractères | — | — | Dans le HTML |

Dans les chunks construits (gzip, mesure sur `.next/static/chunks`), la part de ces îles est bien plus faible que leurs poids isolés (les chaînes communes se compressent ensemble) : le passage aux coquilles fait perdre 0,5 Ko gzip à l'accueil (196,8 → 196,4 Ko pour les dix scripts référencés par le HTML, dont un chunk de 39 Ko que Lighthouse ne voit pas charger). Le vrai poids de la page est le socle : React et le routeur de Next (0d_, 0sj, 1157, turbopack : 127 Ko gzip, 78 % du total compté par Lighthouse), puis le chunk des composants partagés de la page (12,6 Ko : `next/image`, `Reveal`, `CountUp`, semaine type, recherche de commune, gestes) et celui du layout (10,8 Ko : en-tête, confort, barre mobile, coquille du fil).

Sur les pages construites (total des scripts référencés par le HTML, gzip, lots 1 à 3 de l'autre agent compris) : accueil 192 Ko (9 scripts), `/personnes-agees/` et `/aidants/` 234 Ko (11 scripts, gabarit service avec ses gestes), `/a-propos/` 178 Ko (8 scripts, page sans île de ce lot au-delà de `PageThread`), `/styleguide/mouvement/` 185 Ko. Les trois îles de ce lot représentent 3,4 Ko gzip au plus par page (HeroThread avec HeroDepth : 2,4 Ko ; PageThread : 1,1 Ko), et 1,1 Ko sur une page sans photo de hero. La feuille `motion.css` pèse 3,5 Ko gzip (source, 1,2 Ko avant ce lot) et `hero-thread.css` 1,0 Ko ; le CSS global construit passe à 12,9 Ko gzip. Le dépassement des 160 Ko de D-019 sur toutes les pages précède ce lot (voir la note ci-dessus) et relève de l'intégration : ce lot ajoute au plus 2 %.

Méthode : esbuild (déjà présent via Vite) bundle chaque entrée, React externe, minifié, puis `zlib` (gzip niveau 9, brotli). Sur la page construite, le seul chunk propre à `/styleguide/mouvement/` (îles, simulateur, références client de la page) pèse 5 524 o minifiés, 2 317 o gzip. Total des scripts de la page : 181,9 Ko gzip, contre 180,7 Ko pour `/a-propos/` et 182,9 Ko pour l'accueil : l'infrastructure ajoute environ 1,3 Ko gzip à une page qui utilise les trois îles. La feuille `motion.css` ajoute environ 1,2 Ko gzip au CSS global (11,0 Ko).

Note : le total par page mesuré ici compte tous les scripts référencés par le HTML (framework, runtime, polyfills) ; il dépasse déjà les 160 Ko de D-019 avant ce livrable, sur toutes les pages. Ce point relève de l'intégration, pas de cette infrastructure.

### Mesure du 2026-09-27 (passe « mouvement irréprochable », même méthode)

esbuild, React et `next/navigation` externes, minifié, puis `zlib` (gzip 9, brotli 11). Deux arbres comparés : `HEAD` (avant) et le dépôt (après).

| Module | Minifié | gzip | brotli | Chargement |
| --- | --- | --- | --- | --- |
| `lib/motion/grid` (nouveau, aucune dépendance) | 408 o | 304 o | 260 o | Initial |
| `lib/motion/frame` (nouveau) | 366 o | 236 o | 203 o | Initial |
| `lib/motion/viewport` (nouveau) | 1 093 o | 561 o | 498 o | Initial |
| `lib/motion/pointer` (moteur, avant `pointer-tilt`) | 1 432 o (1 041) | 698 o (569) | 624 o (489) | Premier survol d'une souris avec pointeur fin |
| `Tilt` (coquille, lib comprise) | 2 735 o (2 131) | 1 315 o (1 107) | 1 169 o (968) | Initial |
| `HeroDepth` (coquille, lib comprise) | 2 930 o (2 335) | 1 392 o (1 178) | 1 245 o (1 039) | Initial |
| `Sheen` (coquille, nouveau) | 2 633 o | 1 231 o | 1 109 o | Initial, seulement si une page l'utilise |
| `PageFade` (nouveau) | 1 159 o | 664 o | 558 o | Initial (layout) |

Ces poids isolés comptent plusieurs fois les modules partagés. Le seul chiffre honnête est l'**union** : une entrée qui importe toutes les îles d'une page de contenu (`Reveal`, `CountUp`, `Tilt`, `HeroDepth`, `PageThread`, `Thread`, `HeroThreadArm`, `ThreadConnector`, plus `PageFade`).

| Union des îles | Minifié | gzip | brotli |
| --- | --- | --- | --- |
| Avant (`HEAD`) | 14 628 o | 5 564 o | 4 985 o |
| Après, sans le fondu de page | 16 178 o | 6 234 o | 5 620 o |
| Après, fondu compris | 16 953 o | 6 514 o | 5 859 o |

**Bilan : +670 o gzip pour l'infrastructure partagée, +280 o pour le fondu de page, soit +950 o gzip (+874 o brotli) sur une page qui utilise tout.** Environ 0,5 % du JavaScript d'une page (161 à 223 Ko). Ce que ces 950 octets achètent, à l'exécution : un `IntersectionObserver` par seuil au lieu d'un par bloc (six à douze de moins sur l'accueil), une seule passe de mesure du pli au lieu d'une lecture forcée de mise en page par bloc pendant l'hydratation, un `requestAnimationFrame` pour tous les effets de pointeur au lieu d'un par élément, deux rendus React de moins par illustration du fil, un `Intl.NumberFormat` par compteur au lieu d'un par image (soixante par seconde). Dans les chunks construits, la part réelle est plus faible : les chaînes communes se compressent ensemble (voir la note du §4 plus haut).

Côté CSS : `motion-press.css` ajoute quatre règles au CSS global (environ 0,2 Ko une fois minifiée, commentaires retirés) et `hero-scene.css` perd deux `@keyframes` et deux règles de neutralisation (−177 octets de source). Mesure à confirmer sur le CSS construit par le coordinateur.

## 5. Règles d'usage

- Une page de contenu : au plus un `HeroScene`, trois `Parallax`, un `Reveal` par bloc de section, deux à quatre `CountUp` (chiffres sourcés), `Tilt` sur des cartes seulement.
- Ne jamais mettre un `Reveal` autour d'un élément qui porte le H1, un formulaire, un message d'erreur, une zone `aria-live`.
- Ne jamais imbriquer deux `Reveal`, ni un `Tilt` dans un `Parallax`.
- Aucune information ne doit être portée par un mouvement : ce qui bouge doit être lisible immobile.
- Tester en mouvement réduit (bouton du styleguide, réglage du système) et en mode confort : tout doit être visible, immobile, cliquable au clavier.
- **Toute durée et toute courbe viennent de la grille (§8, `src/lib/motion/grid.ts`).** Aucune valeur en dur dans un composant ; aucune animation ne dépasse 600 ms, délai compris ; aucune animation infinie.
- Toute nouvelle animation passe par `motion.css` (préfixe `.m-`), est neutralisée dans les trois contextes et est ajoutée au tableau du §2. Les règles d'un composant rarement monté vont dans une feuille à côté de lui (`hero-scene.css`, `hero-thread.css`, `thread-connector.css`), pas dans le CSS global.
- Un moteur qui répond au pointeur ou au défilement se charge au premier signe d'usage (`import()`), jamais à l'inactivité : `requestIdleCallback` se déclenche pendant la fenêtre d'audit et compterait dans le JavaScript initial.
- Profondeur par public (CONCEPT §4) : `depth={2}` au plus (les appels historiques à `depth={4}` sont plafonnés), `depth={1}` pour une inclinaison encore plus discrète, `depth={0}` sur `/adultes-en-situation-de-handicap/` (photo posée, seul le fil se trace). Les cartes de stade à trois profondeurs restent portées par `railItemStyle(index, depth)` (`ThreadConnector`).
- Le nœud du fil de hero se pose sur le point d'intérêt de la photo : passer `knot={photo.focal}` (ou une valeur propre) ; sans valeur, il tombe au centre.
- Un seul `HeroThread` par page, jamais sans photo ; le trait du H1 suppose que le titre est dans `.hero` (ou donner `heading`).
- Une révélation qui attend l'écran passe par `observeOnce` ; un effet qui répond au pointeur, au défilement ou à une redimension passe par `scheduleFrame`. Jamais un observateur ni une image par élément.
- Un écouteur de défilement ou de toucher est toujours `{ passive: true }` ; aucune lecture de mise en page (`getBoundingClientRect`, `scrollHeight`) hors d'une image programmée ou d'une passe groupée.
- Vérifier après chaque ajout : `pnpm lint && pnpm typecheck && pnpm exec vitest run src/components/motion src/lib/motion src/components/ui/Thread && pnpm exec playwright test tests/e2e/mouvement.spec.ts && pnpm build`.

## 6. Limites connues

- `Reveal` et `CountUp` lisent la préférence de mouvement au montage : si l'utilisateur change de réglage sans recharger, la CSS éteint les animations en cours mais les révélations non jouées ne rejouent pas (comportement voulu, le contenu reste visible).
- `CountUp` : entre le rendu serveur (valeur finale) et le premier comptage, la valeur finale peut apparaître un instant si l'élément est dans l'écran au chargement. Placer les compteurs sous le pli.
- `Parallax` : sans `animation-timeline` (anciens navigateurs), aucune profondeur ; aucun repli JavaScript n'est fourni, par choix de budget.
- `HeroScene` : `backface-visibility: hidden` et `preserve-3d` créent quelques calques composites ; un seul objet par page.
- Pas de variante canvas/WebGL : à écrire seulement si un besoin réel apparaît, chargée à la demande, avec repli.
- `HeroThread` : le contour et le nœud sont rendus par le serveur, mais le trait du H1 n'existe qu'après mesure (donc pas sans JavaScript, ni si `Range.getBoundingClientRect` manque). Si l'île n'hydrate pas alors que `data-js` est posé, le fil reste caché sur ce hero (la photo et le texte ne dépendent de rien).
- `HeroThread` : avec `ReaderPhoto` (deux photos), la première `<img>` déclenche le tracé ; la bascule de lecteur ne le rejoue pas.
- `PageThread` : le moteur n'existe qu'après un premier signe d'usage ; un lecteur qui ne défile pas voit seulement le trait statique du haut de page (ce que le trait animé montrerait au même endroit). Les nœuds sont posés au montage du moteur et remesurés quand le document change de taille ; un titre qui apparaît sans changer la hauteur du document (rare) garde le nœud là où il était. Le trait passe sous l'en-tête collant (`z-index` 1 contre 40).
- `Tilt`, `HeroDepth`, `Sheen` : le moteur se charge au premier `pointerenter` ; le tout premier mouvement sur la toute première carte survolée arrive avant lui (quelques dizaines de millisecondes), sans effet visible.
- `PageFade` : un clic pendant le fondu (150 ms) annule l'animation en cours ; l'opacité en ligne est retirée dans les deux cas, mais la nouvelle page peut apparaître sans fondu. Voulu : mieux vaut sauter un fondu que retarder une page.
- `Sheen` et `m-press` attendent leur adhésion : le design system doit poser `glass-sheen` sur les surfaces enveloppées par `Sheen` et `m-press` sur ses surfaces pressables. Sans cela, le mouvement est prêt mais invisible.
- Le décalage d'une liste est de 40 ms (contrat §5) : le rail de jalons, qui prenait 200 ms par jalon, se lit maintenant comme une seule vague. Choix du contrat, pas du goût.
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

## 8. Grille des durées et des courbes (2026-09-27, D-032)

Une seule source : `src/lib/motion/grid.ts` pour le JavaScript, `src/styles/tokens.css` pour la CSS. Les deux disent la même chose ; `grid.test.ts` vérifie que la grille tient dans le contrat.

| Geste | Jeton de la grille | Jeton CSS | Durée | Courbe |
| --- | --- | --- | --- | --- |
| Pression d'un bouton | `MOTION_DURATION.press` | `--duration-press` (à ajouter par le design system) | 100 ms | `--ease-out` |
| Suivi du pointeur (reflet, inclinaison) | `MOTION_DURATION.pointer` | `--duration-fast` | 150 ms | `--ease-out` |
| Fondu entre deux pages | `MOTION_DURATION.page` | — (animation JavaScript) | 150 ms | `--ease-out` |
| État d'un composant (survol, focus) | `MOTION_DURATION.state` | `--duration-base` | 200 ms | `--ease-out` |
| Révélation d'un bloc au défilement | `MOTION_DURATION.reveal` | `--duration-slow` | 300 ms | `--ease-out` |
| Tracé d'un fil au défilement | `MOTION_DURATION.draw` | `--thread-duration` (posé par l'île) | 400 ms | `--ease-out` |
| Entrée du hero, pose d'un objet | `MOTION_DURATION.entry` | `--thread-hero-duration` (hero-thread.css), `--m-scene-duration` | 560 ms | `--ease-out` |

| Amplitude | Jeton | Valeur |
| --- | --- | --- |
| Décalage entre deux éléments d'une liste | `MOTION_STAGGER`, `--m-stagger`, `RAIL_STEP_MS` | 40 ms |
| Plafond absolu, délai compris | `MOTION_MAX_DURATION` | 600 ms |
| Inclinaison vers le pointeur | `MOTION_TILT_MAX_DEGREES` | 2° |
| Échelle d'un bouton enfoncé | `MOTION_PRESS_SCALE` | 95 % |
| Translation d'une entrée | `MOTION_RISE_PX` | 8 px |
| Courbe unique | `MOTION_EASE_OUT`, `--ease-out` | `cubic-bezier(0.2, 0.7, 0.2, 1)` |

Comment lire la colonne CSS : une durée qui doit être plafonnée mais dont le jeton vit dans `tokens.css` (hors du périmètre du mouvement) est posée **par l'île elle-même**, dans son effet — donc seulement quand le mouvement est permis. En mouvement réduit, en mode confort et sous la simulation, l'île ne pose rien et le jeton vaut 0 ms : rien ne bouge, sans dépendre de l'ordre des feuilles de style.

## 9. Audit du 2026-09-27 : ce qui a changé et pourquoi

| Effet | Avant | Après | Raison |
| --- | --- | --- | --- |
| Révélations (`Reveal`, `Thread`, `CountUp`) | Un `IntersectionObserver` par élément (six à douze par page) | Un observateur par seuil pour toute la page, cible retirée à la première entrée, observateur détruit à vide | Coût d'observation et fuite hors écran |
| Décision du pli | Une lecture de mise en page par bloc, entre deux écritures d'attribut | Une seule passe de mesure par famille (`.m-reveal`, `.thread`) | Recalculs de mise en page en chaîne pendant l'hydratation |
| Effets de pointeur | Un `requestAnimationFrame` par élément | Une image groupée pour tous (`frame.ts`) | Une seule écriture par image, quel que soit le nombre d'éléments |
| `Thread` (illustration) | Deux rendus React par illustration (`useState`), cachée même au-dessus du pli, `prefers-reduced-motion` lu sans le mode simulation | Attributs posés sur le DOM, jamais cachée si déjà visible, trois interrupteurs unifiés | Clignotement au-dessus du pli, rendus inutiles, simulation du styleguide sans effet |
| `CountUp` | Un `Intl.NumberFormat` construit à chaque image, 900 ms | Formateur mis en cache, 600 ms, dernière image = valeur exacte | Travail par image, durée hors contrat |
| `Tilt`, `HeroDepth` | 6° et 4°, aucun `will-change`, le focus clavier laissait la carte inclinée | 2° au plus, `will-change` seulement pendant le geste, retour à plat au focus | Contrat §5 (2°, annulé au clavier), budget §2 |
| `HeroScene` | Rotation infinie de 12 s, respiration infinie de 8 s | Une pose de 560 ms, une seule fois | Contrat §5 : aucune animation infinie |
| Fil du hero | 1 200 ms | 560 ms | Contrat §5 : entrée du hero sous 600 ms |
| Tracé du fil et des rails | 800 ms, cascade de 200 ms par jalon | 400 ms, cascade de 40 ms | Contrat §5 : révélation de 250 à 400 ms, décalage de 40 ms |
| Mesures du fil conducteur et du bras du hero | Promesse des polices toujours vivante après le démontage ; image propre à chaque composant | Programmation inerte après démontage (`live`), image groupée, `resize` passif | Travail après démontage, images multipliées |
| Entre deux pages | Rien | Fondu de 150 ms sur `main`, jamais l'en-tête, annulé en mouvement réduit | Contrat §5 |
| Reflet du verre | Rien | `Sheen` : suiveur de pointeur (`--sheen-x`, `--sheen-y`, `data-sheen`) | Contrat §3 `glass-sheen` : le style au design system, le mouvement ici |
| Pression d'un bouton | Rien | Classe `m-press` (95 %, 100 ms) | Contrat §5 |

Garde-fous ajoutés : `grid.test.ts` (la grille tient dans le contrat), `frame.test.ts` (une image pour N travaux, annulation), `viewport.test.ts` (un observateur par seuil, une passe de mesure), `budget.test.ts` (aucun `setInterval`, écouteurs de défilement passifs, aucune propriété de mise en page animée, aucune animation infinie en CSS, `will-change` toujours retiré, aucune bibliothèque d'animation), `PageFade.test.tsx`, `Sheen.test.tsx`, `MotionScript.test.tsx`, plus le parcours `tests/e2e/mouvement.spec.ts` (accueil, pilier, article : tout visible et `getAnimations()` vide en mouvement réduit ; rien au-delà de 600 ms, aucune boucle, aucun décalage de mise en page imputable au mouvement, clavier intact ; fondu de page limité au contenu principal).

Ce qui reste à faire, hors du périmètre du mouvement :

- **Design system** : `glass-sheen` (style du reflet, piloté par `--sheen-x` / `--sheen-y` / `data-sheen`), classe `m-press` posée sur les surfaces pressables, jetons `--duration-press: 100ms` et `--press-scale: 0.95`, et alignement de `tokens.css` sur la grille (`--thread-duration: 400ms`, `--thread-hero-duration: 560ms`, `--motion-rise: 8px`) pour que les îles n'aient plus à poser ces durées elles-mêmes.
- **Motion réduit dans `globals.css`** : `.thread` n'a de règle de neutralisation que pour `prefers-reduced-motion` ; le mode confort et la simulation ne passent aujourd'hui que par les jetons à 0 ms. Une règle `:root[data-comfort="on"] .thread path` serait plus sûre.
- **Transitions de vue** : activer `experimental.viewTransition` (next.config.ts) et envelopper le contenu du layout permettrait de remplacer `PageFade` par la transition native, à durée et courbe égales.
