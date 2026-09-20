# Mouvement et profondeur — infrastructure d'animation

Livrable « Mouvement et 3D » du brief `docs/design/BRIEF_EXPERIENCE.md` (D-024). Complète `docs/02 §5` (durées 150 à 300 ms, courbe `cubic-bezier(.2,.7,.2,1)`, tout s'éteint en mouvement réduit et en mode confort) et `docs/02 §1` (le fil se dessine une seule fois, 600 à 900 ms).

Code : `src/lib/motion/`, `src/components/motion/`, `src/styles/motion.css` (importée par `globals.css`). Démonstration : `/styleguide/mouvement/` (noindex, exclue du plan de site comme `/styleguide/`).

## 1. Principes

1. **CSS d'abord.** Chaque animation est une règle CSS (transition, `animation`, `animation-timeline`). Le JavaScript, quand il existe, se contente de poser un attribut (`data-reveal`, `data-tilt`) ou un style en ligne au rythme de `requestAnimationFrame`. Aucun état React, aucun nouveau rendu.
2. **Jamais de contenu caché sans JavaScript.** Le serveur rend tout visible. L'état « caché » (`data-reveal="pending"`) n'est posé qu'après le montage, seulement si le mouvement est permis, seulement pour un élément sous le pli. Au-dessus du pli, rien ne bouge : pas de clignotement, LCP intact.
3. **Trois interrupteurs, un seul module.** `prefers-reduced-motion: reduce`, le mode confort (`html[data-comfort="on"]`) et la simulation du styleguide (`html[data-motion="reduce"]`) coupent tout, en CSS (règles dédiées dans `motion.css`, jetons de durée à 0 ms dans `tokens.css`) et en JavaScript (`prefersReducedMotion()`).
4. **Budget (D-019).** Îles de moins d'un kilo-octet compressé chacune. Aucune dépendance ajoutée. Aucun WebGL, aucune bibliothèque 3D : les objets du hero sont en CSS 3D.
5. **Accessibilité.** Rien ne dépend d'un survol ou d'une animation pour être lu ou activé. Les objets 3D et les couches décoratives sont `aria-hidden`. Le compteur garde la valeur finale lisible par les lecteurs d'écran dès le rendu serveur. Aucun clignotement, aucune lumière stroboscopique, aucune animation automatique de plus de 12 s de période.

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
| Couche de profondeur | `Parallax` (`.m-parallax`) | Défilement, `animation-timeline: view()` (compositeur, zéro JavaScript) | Traversée de l'écran, ±24 px au plus | linéaire | Couche immobile (`animation: none`) ; idem dans les navigateurs sans `animation-timeline` |
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

Props : `as`, `max` (degrés, plafonné à 6). Perspective 800 px. Ne pose jamais de gestionnaire sur les enfants : liens et boutons restent cliquables, le focus clavier ne déclenche rien. Réservé aux cartes de moins de 480 px de large ; ne jamais l'appliquer à un bloc de texte long.

### `Parallax` — `src/components/motion/Parallax/Parallax.tsx` (composant serveur)

```tsx
<Parallax amount={24} aria-hidden="true">…</Parallax>   // couche décorative
<Parallax amount={-16}>…</Parallax>                    // avance au lieu de retarder
```

Props : `as`, `amount` (−24 à 24 px, 16 par défaut). Zéro JavaScript : `animation-timeline: view()` sous `@supports`, jouée sur le compositeur, sans écouteur `scroll` ni `will-change`. Les navigateurs qui ne connaissent pas les animations liées au défilement affichent la couche immobile : c'est le repli statique voulu. Trois couches par section au plus ; le texte courant ne dépasse jamais ±8 px.

### `HeroScene` — `src/components/motion/HeroScene/HeroScene.tsx` (composant serveur)

```tsx
<HeroScene variant="maison" size={220} />
<HeroScene variant="fil" />
```

CSS 3D pur (`transform-style: preserve-3d`, `perspective`), `aria-hidden`, `pointer-events: none`. `maison` : quatre murs (paper et sable), deux pans de toit (teal-700 et teal-800), deux pignons, une porte framboise (le nœud), une ombre au sol. `fil` : trois arcs ouverts (jamais fermés, docs/02 §1), un nœud. Tout est proportionnel à `size`. À placer à côté du H1 du hero, jamais derrière du texte. Aucune variante canvas/WebGL n'est livrée : si un jour un objet plus riche est voulu, il sera chargé par `next/dynamic` après interaction ou hors écran, avec `HeroScene` comme repli statique.

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

Méthode : esbuild (déjà présent via Vite) bundle chaque entrée, React externe, minifié, puis `zlib` (gzip niveau 9, brotli). Sur la page construite, le seul chunk propre à `/styleguide/mouvement/` (îles, simulateur, références client de la page) pèse 5 524 o minifiés, 2 317 o gzip. Total des scripts de la page : 181,9 Ko gzip, contre 180,7 Ko pour `/a-propos/` et 182,9 Ko pour l'accueil : l'infrastructure ajoute environ 1,3 Ko gzip à une page qui utilise les trois îles. La feuille `motion.css` ajoute environ 1,2 Ko gzip au CSS global (11,0 Ko).

Note : le total par page mesuré ici compte tous les scripts référencés par le HTML (framework, runtime, polyfills) ; il dépasse déjà les 160 Ko de D-019 avant ce livrable, sur toutes les pages. Ce point relève de l'intégration, pas de cette infrastructure.

## 5. Règles d'usage

- Une page de contenu : au plus un `HeroScene`, trois `Parallax`, un `Reveal` par bloc de section, deux à quatre `CountUp` (chiffres sourcés), `Tilt` sur des cartes seulement.
- Ne jamais mettre un `Reveal` autour d'un élément qui porte le H1, un formulaire, un message d'erreur, une zone `aria-live`.
- Ne jamais imbriquer deux `Reveal`, ni un `Tilt` dans un `Parallax`.
- Aucune information ne doit être portée par un mouvement : ce qui bouge doit être lisible immobile.
- Tester en mouvement réduit (bouton du styleguide, réglage du système) et en mode confort : tout doit être visible, immobile, cliquable au clavier.
- Toute nouvelle animation passe par `motion.css` (préfixe `.m-`), est neutralisée dans les trois contextes et est ajoutée au tableau du §2.
- Vérifier après chaque ajout : `pnpm lint && pnpm typecheck && pnpm exec vitest run src/components/motion src/lib/motion && pnpm build`.

## 6. Limites connues

- `Reveal` et `CountUp` lisent la préférence de mouvement au montage : si l'utilisateur change de réglage sans recharger, la CSS éteint les animations en cours mais les révélations non jouées ne rejouent pas (comportement voulu, le contenu reste visible).
- `CountUp` : entre le rendu serveur (valeur finale) et le premier comptage, la valeur finale peut apparaître un instant si l'élément est dans l'écran au chargement. Placer les compteurs sous le pli.
- `Parallax` : sans `animation-timeline` (anciens navigateurs), aucune profondeur ; aucun repli JavaScript n'est fourni, par choix de budget.
- `HeroScene` : `backface-visibility: hidden` et `preserve-3d` créent quelques calques composites ; un seul objet par page.
- Pas de variante canvas/WebGL : à écrire seulement si un besoin réel apparaît, chargée à la demande, avec repli.
