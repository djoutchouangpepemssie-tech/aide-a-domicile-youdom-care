# Brief — Design « verre liquide », heros interactifs, mouvement, mobile (demande d'Arcel du 2026-09-27, décision D-032)

Ce brief s'adresse à chaque agent de la refonte visuelle de la phase 9b. Il complète `docs/02_DESIGN_SYSTEM.md` (« Le Fil ») et `docs/design/{CONCEPT,MOUVEMENT,ICONES,PHOTOS}.md`. Là où il le contredit, c'est la décision D-032 qui s'applique.

## 1. Ce qu'Arcel demande

1. **Un design puissant, avec le « verre liquide »** (surfaces translucides floutées, reflets, profondeur) sur tout le site.
2. **Des animations irréprochables** : rien qui saute, rien qui rame, tout qui a un sens.
3. **Des zones hero redimensionnées** : à l'arrivée, sans scroller, le visiteur **comprend** où il est et **peut agir** (choisir sa situation, dire pour qui, chercher sa commune, appeler, être rappelé).
4. **Un site irréprochable sur mobile** (téléphone d'abord).
5. Les pages qui ne fonctionnent pas sont corrigées.

## 2. Ce qui ne bouge pas (non négociable)

- **Accessibilité AA** : contraste du texte sur verre mesuré et conforme (4,5:1 pour le texte courant, 3:1 pour les gros titres et les bordures d'état), focus visible sur toute surface, clavier complet, `prefers-reduced-motion` et mode confort coupent flous et animations non essentielles, cibles 44 px au moins. Un contenu ne dépend jamais d'un effet.
- **Performance** (docs/07 §5, D-019, D-030) : JavaScript initial ≤ 160 Ko sur une page de contenu, ≤ 220 Ko sur une page de formulaire ; LCP ≤ 2,0 s ; CLS ≤ 0,05 ; TBT ≤ 150 ms. Le verre se fait en **CSS** (`backdrop-filter`, dégradés, ombres) ; aucune bibliothèque d'animation ajoutée ; aucun effet qui anime `width`, `height`, `top` ou `left` (uniquement `transform` et `opacity`) ; `will-change` seulement pendant l'interaction.
- **Vérité et santé** : aucun texte ni chiffre inventé, photos illustratives jamais présentées comme l'équipe ou les clients.
- **Le Fil** reste la signature : le trait continu, la framboise comme seule couleur d'action, Fraunces et Atkinson Hyperlegible. Le verre habille, il ne remplace pas.

## 3. Contrat technique du verre (à respecter par tous)

Les jetons et les classes utilitaires sont définis **une seule fois** dans `src/styles/` par l'agent « design system ». Les autres agents les consomment sans les redéfinir.

| Classe | Usage |
| --- | --- |
| `glass` | Surface de verre standard : fond translucide, flou, bordure claire, ombre douce. Cartes, encarts, panneaux. |
| `glass-strong` | Verre plus dense : en-tête collant, barre d'action mobile, panneaux au-dessus d'une photo. |
| `glass-quiet` | Verre à peine perceptible, pour les grandes surfaces de texte (lisibilité d'abord). |
| `glass-tint-teal`, `glass-tint-framboise`, `glass-tint-sable` | Teinte du verre selon le rôle (information, action, chaleur). |
| `glass-edge` | Liseré lumineux d'un bord (haut d'un panneau, bas d'un en-tête). |
| `glass-sheen` | Reflet mobile au survol et au pointeur, désactivé en mouvement réduit. |
| `depth-1` à `depth-3` | Élévation (ombre + léger décalage), sans changer la taille. |

Règles :
- Tout élément en `glass*` doit rester lisible **sans** `backdrop-filter` : fond de repli opaque à 92 % au moins, testé avec `@supports not (backdrop-filter: blur(1px))`.
- Jamais de verre sur un texte long : le corps des articles, des pages locales et des pages légales reste sur fond plein.
- Le mode confort (`data-comfort`) et `prefers-reduced-motion` retirent les flous, les reflets et les parallaxes ; les surfaces deviennent opaques.

## 4. Contrat des heros

Un hero est **une scène utile**, pas une bannière :
- Hauteur : `min-height: calc(100svh - hauteur de l'en-tête)` sur ordinateur, `min-height: calc(100dvh - en-tête - barre d'action)` sur téléphone ; jamais plus de 100 % de la hauteur visible ; le contenu est centré verticalement et ne déborde pas à 320 px de large ni à 200 % de zoom (au besoin, la scène se compacte : photo réduite, geste en premier).
- Contenu visible sans scroller : sur-titre (où je suis), H1 (ce que le site fait pour moi), une phrase de promesse, **une action principale** (bouton framboise) et **une interaction immédiate** (choix de situation, « pour qui ? », recherche de commune, question d'orientation) selon la page.
- Un repère de défilement discret (« Ce que vous trouverez plus bas » + flèche) qui n'est pas la seule indication.
- Le fil continue de relier le hero au reste de la page.

## 5. Contrat du mouvement

- À l'entrée : le hero apparaît en une seule séquence de moins de 600 ms (opacité et translation de 8 px au plus), jamais de rideau ni de saut.
- Au défilement : révélations par `IntersectionObserver`, 250 à 400 ms, décalage de 40 ms entre éléments d'une même liste, une seule fois.
- Au pointeur : reflets et inclinaison de 2° au plus, 150 ms, annulés au clavier et en mouvement réduit.
- Transitions entre pages : fondu court sur le contenu principal, jamais sur l'en-tête.
- Aucune animation infinie visible, aucun contenu qui bouge sous le doigt, aucun décalage de mise en page (CLS 0).

## 6. Contrat mobile

Portrait 320, 360, 390 et 430 px ; paysage 667 px de haut. À vérifier sur chaque gabarit : aucun défilement horizontal, cibles 44 px, barre d'action toujours atteignable, formulaires utilisables au pouce, tableaux en listes, photos jamais rognées sur un visage, en-tête et menu utilisables d'une main, hero lisible et interactif sans scroller.

## 7. Périmètres (fichiers disjoints)

| Agent | Périmètre |
| --- | --- |
| Design system | `src/styles/**`, primitives `src/components/ui/**`, `src/app/styleguide/**`, `docs/design/LIQUID_GLASS.md` |
| Heros | `src/components/blocks/{Hero,HeroGestures,Parcours}/**`, section hero de `ServiceTemplate`, `LocalTemplate`, `AgencyTemplate`, `ArticleTemplate`, `src/app/page.tsx` |
| Mouvement | `src/components/motion/**`, `src/lib/motion/**`, `src/components/ui/Thread/**` |
| Mobile et mise en page | `src/components/layout/**`, grilles des autres `src/components/blocks/**`, `WeekPlanner`, tableaux |

Chaque agent : `pnpm exec prettier --write`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, puis rapport. Le coordinateur lance `pnpm build`, `pnpm validate`, Playwright et Lighthouse.
