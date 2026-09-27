# Verre liquide et fonds de scène — jetons, classes, contrastes (D-032)

Référence du design system pour la refonte visuelle de la phase 9b. Ce document est **normatif** : il
décrit ce que `src/styles/glass.css` et `src/styles/scenes.css` livrent, comment s'en servir et
surtout **quand ne pas s'en servir**. Il complète `docs/02_DESIGN_SYSTEM.md` (« Le Fil ») et applique
`docs/design/BRIEF_LIQUID_GLASS.md` §3. Là où il contredit `docs/02` §4 (formes et profondeur) et §5
(mouvement), c'est la décision **D-032** qui s'applique.

Page de démonstration vivante : `/styleguide/verre/` (non indexée). Elle montre les trois niveaux, les
teintes, les élévations, les états, le repli sans `backdrop-filter`, le mode confort et les huit
scènes.

Règle d'or : **les jetons et les classes sont définis une seule fois, ici. Aucun composant, aucune
page, aucun bloc ne redéfinit un flou, une opacité, une ombre ou un halo.** Si une surface manque,
elle s'ajoute dans `src/styles/`, pas dans un composant.

---

## 1. Ce qui est livré, en un coup d'œil

| Classe | Rôle |
| --- | --- |
| `glass` | Verre standard : 72 % d'opacité, flou 12 px, bordure claire, élévation 1. Cartes, encarts, panneaux. |
| `glass-quiet` | Verre à peine perceptible : 82 %, flou 6 px, sans ombre. Grandes surfaces de texte, champs, pastilles. |
| `glass-strong` | Verre dense : 88 %, flou 20 px, élévation 2. En-tête collant, barre d'action mobile, panneau sur photo. |
| `glass-dark` | Verre sombre (teal-900 à 88 %), texte blanc. **Seule** surface de verre autorisée au-dessus d'une photo ou d'une scène de nuit. |
| `glass-tint-teal`, `glass-tint-framboise`, `glass-tint-sable` | Teinte du verre selon le rôle : information, action et chaleur, chaleur. |
| `glass-tint-green`, `glass-tint-azure`, `glass-tint-warning` | Teintes reprises des composants existants : « Bon à savoir », magazine, « Attention ». |
| `glass-edge` | Liseré lumineux d'un bord (haut par défaut, `data-edge="bottom"` pour un en-tête). |
| `glass-sheen` | Reflet au survol à la souris, suivant le pointeur si une île pose `--glass-mx` / `--glass-my`. |
| `depth-1`, `depth-2`, `depth-3` | Élévation : l'ombre s'élargit et se décale, l'élément ne change pas de taille. |
| `scene` | Fond de scène composé (dégradé, deux halos, trame au fil, grain). À combiner avec une palette. |
| `scene-aurore`, `scene-teal`, `scene-azure`, `scene-verte`, `scene-sable`, `scene-framboise`, `scene-nuit`, `scene-neutre` | Palette de la scène. |
| `scene-soutenu` | Version soutenue d'une scène (mêmes couleurs, plus présentes). |

Utilitaires Tailwind ajoutés par les jetons : `shadow-3`, et les couleurs `teal-100`, `azure-100`,
`green-100`, `raspberry-100`, `sand-deep`.

**Une seule classe de niveau par élément** (`glass` **ou** `glass-quiet` **ou** `glass-strong`), et
jamais de teinte avec `glass-dark`.

---

## 2. Jetons

### 2.1 Verre — `src/styles/glass.css`

| Jeton | Valeur | Rôle |
| --- | --- | --- |
| `--glass-base-white` … `--glass-base-warning` | `--color-white`, `--color-teal-50`, `--color-green-50`, `--color-raspberry-50`, `--color-azure-50`, `--color-sand`, `--color-warning-bg` | Couleur posée sous le verre, par teinte. |
| `--glass-base-dark` | `--color-teal-900` | Base du verre sombre. |
| `--glass-base` | `--glass-base-white` | Base de la surface courante ; c'est elle que changent les `glass-tint-*`. |
| `--glass-alpha-quiet` / `-base` / `-strong` / `-dark` | 82 % / 72 % / 88 % / 88 % | Opacité des trois niveaux et du verre sombre. |
| `--glass-alpha-fallback` | 94 % | Sans `backdrop-filter` (le brief exige 92 % au moins). |
| `--glass-alpha-opaque` | 100 % | Mouvement réduit, transparence réduite, mode confort, impression. |
| `--glass-blur-quiet` / `-base` / `-strong` | 6 px / 12 px / 20 px | Trois niveaux de flou. |
| `--glass-saturate` | 1,15 | Redonne la couleur que le flou éteint ; jamais plus de 1,2. |
| `--glass-border`, `--glass-border-strong`, `--glass-border-dark` | mélanges blanc / `--color-line` | Bordure lumineuse (décorative). |
| `--glass-edge-color` | blanc à 78 % | Liseré. |
| `--glass-sheen-color` | blanc à 10 % | Reflet. **Plafond dur** : au-delà, le bouton principal passe sous 4,5:1. |
| `--glass-sheen-size`, `--glass-mx`, `--glass-my` | 18 rem, 50 %, 0 % | Taille et centre du reflet (les deux dernières peuvent être posées par une île). |
| `--shadow-1`, `--shadow-2`, `--shadow-3` | `tokens.css` | Élévations 1, 2 et 3 (`--shadow-3` est nouveau, D-032). |

Les opacités sont **relues** par `scripts/validate/check-contrast.ts` : il recompose chaque surface à
partir de la feuille. Changer une opacité change les rapports mesurés, et le contrôle le dit.

### 2.2 Scènes — `src/styles/scenes.css`

Chaque palette ne déclare que trois couleurs et un texte :

| Jeton | Rôle |
| --- | --- |
| `--scene-base` | Couleur de fond, prise dans les rôles `--color-tint-*` quand elle existe (donc **blanche en mode confort**, sans une ligne de plus). |
| `--scene-deep` | Point le plus soutenu de la scène : toutes les couches y tendent, aucune ne la dépasse. |
| `--scene-accent` | Couleur du second halo. |
| `--scene-text` | Couleur du texte de la scène (encre, ou blanc pour la nuit). |

Composition (claire, puis `scene-soutenu`) : `--scene-gradient-alpha` 46 % → 78 %,
`--scene-gradient-alpha-mid` 16 % → 28 %, `--scene-halo-alpha` 52 % → 80 %, `--scene-weave-alpha`
5 % → 8 %, `--scene-grain-alpha` 4 % → 6 %. Géométrie : `--scene-angle`, `--scene-halo-size`,
`--scene-halo-1-position`, `--scene-halo-2-position`, `--scene-weave-step` (8 px),
`--scene-weave-angle` (115°, l'axe du fil). Le grain est un masque SVG de bruit fractal
(`--scene-noise`, environ 240 octets, aucune requête : `img-src 'self' data:` couvre déjà les URI de
données).

**Pourquoi le contraste est garanti par construction** : toutes les couches (dégradé, halos, trame,
grain) sont des mélanges de `--scene-base` vers `--scene-deep` ou `--scene-accent`. Aucun point de la
scène ne peut donc être plus sombre que ces deux couleurs : mesurer le texte sur elles suffit à
couvrir toute la surface, quelle que soit la version (claire ou soutenue).

---

## 3. Teinte par public et par famille de pages

Une scène s'applique par classe (`scene scene-teal`) **ou** par attribut, ce qui évite de recopier
une correspondance dans chaque gabarit. Les règles de `scenes.css` ne déclarent que des variables :
poser l'attribut sur un `main` ou une section suffit, toutes les scènes descendantes en héritent, et
rien n'est peint sans la classe `scene`.

| Attribut | Valeur | Scène |
| --- | --- | --- |
| `data-scene` | `aurore`, `teal`, `azure`, `verte`, `sable`, `framboise`, `nuit`, `neutre` | la scène nommée (valeurs de `HeroSection`) |
| `data-public` | `personne-agee`, `transverse` | `scene-teal` |
| `data-public` | `neuro` | `scene-azure` |
| `data-public` | `enfant-handicap` | `scene-verte` |
| `data-public` | `adulte-handicap` | `scene-sable` |
| `data-public` | `aidant` | `scene-framboise` |
| `data-famille` | `local` | `scene-teal` |
| `data-famille` | `lexique` | `scene-azure` |
| `data-famille` | `outils` | `scene-verte` |
| `data-famille` | `magazine` | `scene-framboise` |
| `data-famille` | `entreprise` | `scene-nuit` |
| `data-famille` | `legal` | `scene-neutre` (le blanc reste blanc) |

Deux pages voisines ne se ressemblent donc pas : le public décide de la couleur sur les pages de
service et de pathologie, la famille décide sur les pages locales, le magazine, le lexique, les
outils, l'entreprise et le légal.

---

## 4. Quand s'en servir — et quand ne pas s'en servir

### Le verre, oui

- Cartes, encarts, panneaux d'interaction, en-tête collant, barre d'action mobile, pastilles.
- Panneau posé **au-dessus d'une photo** : `glass-strong glass-dark`, jamais autre chose.
- Boutons secondaire (verre sombre) et fantôme (verre discret).

### Le verre, non

- **Jamais sur un texte long** : corps d'article, page locale, page légale, grille de faits restent
  sur fond plein (`scene-neutre` ou rien). La lisibilité passe avant l'effet.
- **Jamais de texte secondaire** (`text-text-soft`) sur du verre clair posé sur une photo : 3,28.
- **Jamais de reflet sur le bouton principal** : un voile blanc de 10 % ferait tomber le texte blanc
  de 4,90 à 4,34. Le bouton principal porte un liseré (`glass-edge`), pas un reflet.
- **Jamais `overflow: hidden` sur une surface de verre** : l'anneau de focus d'un élément intérieur
  serait rogné. Aucune classe d'ici n'en pose.
- **Jamais deux niveaux** sur le même élément, ni une teinte avec `glass-dark`.
- **Jamais de verre sur du verre** : deux `backdrop-filter` empilés coûtent cher et brouillent le
  texte. Un panneau dans un panneau se distingue par l'élévation (`depth-*`), pas par un second flou.

### Les scènes, oui

- Hero, en-tête de rubrique, section d'appel, bloc de réassurance, encart de mise en avant.

### Les scènes, non

- **Sous un long texte de lecture** : le blanc est réservé à cela (demande d'Arcel du 27 septembre
  2026). Utiliser `scene-neutre` si une surface est nécessaire, sinon rien.
- **Deux scènes soutenues à la suite** : une page alterne scène et fond plein, comme les tons de
  section de `docs/02` §4.
- **Avec un lien `teal-700`** : sur le point le plus soutenu d'une scène, il ne fait que 3,93. La
  feuille passe d'elle-même les liens d'une scène en `teal-800` ; ne le contredisez pas.

---

## 5. Contrastes mesurés

Fond effectif = teinte du verre composée sur la couleur de page, comme le navigateur la peint
(`color-mix(in srgb, <base> <alpha>, transparent)` sur le fond). Chaque ligne est vérifiée à chaque
`pnpm validate` par `scripts/validate/check-contrast.ts` (tolérance 0,05) : la table du contrôle et ce
tableau doivent rester identiques.

### 5.1 Verre clair (texte encre `--color-text`)

| Surface | Fond de page | Fond effectif | Texte | Rapport | Seuil |
| --- | --- | --- | --- | --- | --- |
| `glass` | blanc | `#ffffff` | encre | **14,15** | AAA |
| `glass` | sable (la section teintée la plus sombre) | `#fcfaf7` | encre | **13,58** | AAA |
| `glass` | `teal-100` (point le plus soutenu d'une scène) | `#eef8fb` | encre | **13,11** | AAA |
| `glass` | `teal-100` | `#eef8fb` | secondaire | **6,03** | AA |
| `glass` | `teal-100` | `#eef8fb` | liens `teal-800`, anneau de focus | **6,70** | AA |
| `glass` | photo noire (pire cas) | `#b8b8b8` | encre | **7,13** | AAA |
| `glass` | photo noire (pire cas) | `#b8b8b8` | secondaire | **3,28** | ✗ interdit |
| `glass-quiet` | sable | `#fdfcfa` | encre | **13,80** | AAA |
| `glass-strong` | sable | `#fefdfc` | encre | **13,93** | AAA |
| repli 94 % | sable | `#fefefd` | encre | **14,02** | AAA |
| repli 94 % | photo noire | `#f0f0f0` | encre | **12,42** | AAA |
| `glass-tint-teal` | sable | `#eaf3f2` | encre | **12,53** | AAA |
| `glass-tint-framboise` | papier | `#fcefef` | encre | **12,62** | AAA |
| `glass-tint-sable` | papier | `#f6f1e8` | encre | **12,58** | AAA |
| `glass-tint-green` | papier | `#eff7f0` | encre | **12,96** | AAA |
| `glass-tint-azure` | papier | `#edf4f8` | encre | **12,73** | AAA |
| `glass-tint-warning` | papier | `#fef5de` | `warning` | **6,56** | AA |
| `glass-quiet` (bouton fantôme) | papier | `#fefefd` | `teal-700` | **5,11** | AA |
| `glass-quiet` (bouton fantôme) | sable | `#fdfcfa` | `teal-700` | **5,03** | AA |
| `glass-quiet` (champ) | papier | `#fefefd` | bordure `field-border` | **3,63** | 3:1 |
| `glass` + reflet 10 % | sable | `#fcfbf8` | encre éclaircie | **10,06** | AAA |

### 5.2 Verre sombre (texte blanc)

| Surface | Fond de page | Fond effectif | Rapport | Seuil |
| --- | --- | --- | --- | --- |
| `glass-dark` | blanc (**pire cas**) | `#285d68` | **7,35** | AAA |
| `glass-dark` | scène claire (`teal-100`) | `#215a66` | **7,72** | AAA |
| `glass-dark` | photo noire | `#0a3e49` | **11,68** | AAA |
| `glass-dark` + reflet 10 % | blanc (pire cas) | `#3e6d77` | **5,74** | AA |

Le verre sombre est donc lisible **sur n'importe quel fond** : c'est ce qui en fait la seule surface
autorisée au-dessus d'une photo.

### 5.3 Scènes (point le plus soutenu)

| Scène | `--scene-deep` | Texte courant | Texte secondaire | Liens `teal-800` |
| --- | --- | --- | --- | --- |
| `scene-teal`, `scene-aurore` | `teal-100` `#c3e7f0` | **10,79** | **4,96** | **5,52** |
| `scene-azure` | `azure-100` `#cbe2f5` | **10,60** | **4,88** | **5,42** |
| `scene-verte` | `green-100` `#cdeedb` | **11,35** | **5,22** | **5,80** |
| `scene-framboise` | `raspberry-100` `#fbd8de` | **10,77** | **4,95** | **5,50** |
| `scene-sable` | `sand-deep` `#e9dfcd` | **10,72** | **4,93** | **5,48** |
| `scene-nuit` | `ink` `#0f2f38` | **14,15** (blanc) | — | blanc |
| `scene-neutre` | `sand` `#f4eee4` | **12,26** | **5,64** | **6,27** |

Halo clair (`teal-50`, accent de la scène neutre) : texte courant **12,66**, secondaire **5,82**,
liens `teal-800` **6,47**. La table du contrôle compte 82 couples, dont 48 introduits par D-032.

Le halo de la scène de nuit (`teal-800`) porte du texte blanc à **7,23**.

### 5.4 Couples refusés, documentés

| Couple | Rapport | Pourquoi il est écrit ici |
| --- | --- | --- |
| secondaire sur `glass` posé sur une photo | 3,28 | La règle est : texte encre seulement. |
| blanc sur bouton principal + reflet 10 % | 4,34 | Le reflet mobile est refusé sur le bouton principal. |
| `teal-700` sur `teal-100` | 3,93 | Les liens d'une scène sont en `teal-800`. |

---

## 6. Mobile, mouvement réduit, mode confort, impression

- **Mouvement réduit** (`prefers-reduced-motion: reduce`) : verre opaque, plus de `backdrop-filter`,
  plus de reflet ; scènes réduites à leur couleur de base (plus de dégradé, ni halo, ni trame, ni
  grain).
- **Transparence réduite** (`prefers-reduced-transparency: reduce`) : verre opaque.
- **Mode confort** (`:root[data-comfort="on"]`) : comme ci-dessus, et les bases claires du verre comme
  les bases claires des scènes deviennent **blanches** (les rôles `--color-tint-*` de `tokens.css`).
  Le verre d'alerte et le verre sombre gardent leur couleur : ils portent un signal.
- **Simulation** : `:root[data-motion="reduce"]` (styleguide du mouvement) se comporte comme le mode
  confort ; `:root[data-glass="fallback"]` (`/styleguide/verre/`) simule l'absence de
  `backdrop-filter`.
- **Sans `backdrop-filter`** : `@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px)))`
  passe toutes les surfaces à 94 % d'opacité.
- **Mobile** : le flou coûte du GPU. Une page ne porte pas plus de deux surfaces `glass-strong`
  visibles en même temps (en-tête et barre d'action, par exemple) ; les grandes surfaces
  (`glass-quiet`) restent préférables sur téléphone. Aucun `backdrop-filter` sur un élément qui défile
  vite sous le doigt. Les scènes ne coûtent rien de plus qu'un dégradé.
- **Impression** : verre et scènes deviennent du blanc, liseré, reflet, halos et grain disparaissent
  (`docs/02` §9).
- **Coût** : tout est en CSS. Aucun JavaScript, aucune bibliothèque, aucune image, aucune animation
  infinie. Les budgets de `docs/07` §5 sont inchangés.

---

## 7. Exemples de balisage

Carte de contenu (c'est déjà ce que fait `Card`) :

```html
<article class="glass rounded-card p-6">…</article>
```

Panneau d'interaction dans un hero, teinté et détaché :

```html
<div class="glass glass-tint-teal glass-edge glass-sheen depth-2 rounded-card p-5">…</div>
```

En-tête collant :

```html
<header class="glass-strong glass-edge sticky top-0 z-30" data-edge="bottom">…</header>
```

Panneau au-dessus d'une photo (la seule combinaison autorisée) :

```html
<div class="relative">
  <img … />
  <div class="glass glass-strong glass-dark glass-edge absolute inset-x-4 bottom-4 rounded-card p-4">…</div>
</div>
```

Section de scène, version soutenue, avec la teinte déduite du public de la page :

```html
<main data-public="aidant">
  <section class="scene scene-soutenu py-[var(--section-padding)]">…</section>
</main>
```

Section de scène nommée explicitement :

```html
<section class="scene scene-nuit py-[var(--section-padding)]">…</section>
```

Reflet qui suit le pointeur (une île de mouvement pose les deux variables, rien d'autre) :

```html
<div class="glass glass-sheen rounded-card p-5" style="--glass-mx: 42%; --glass-my: 18%">…</div>
```

---

## 8. Ce qui change dans `docs/02_DESIGN_SYSTEM.md`

- **§4 Formes et profondeur** : « deux niveaux d'ombre seulement » devient trois (`--shadow-3`) ; la
  carte n'est plus « fond blanc, bordure `line` » mais une surface de verre (`glass`), dont le repli
  opaque reprend l'ancien rendu. Les rayons, les espaces, les cibles tactiles et l'anneau de focus ne
  changent pas.
- **§5 Mouvement** : le reflet au survol (`glass-sheen`, 150 à 200 ms, opacité seulement) s'ajoute aux
  trois animations autorisées. Tout s'éteint toujours avec `prefers-reduced-motion` et en mode
  confort.
- **§2 Couleurs** : cinq jetons s'ajoutent (`teal-100`, `azure-100`, `green-100`, `raspberry-100`,
  `sand-deep`), tous mesurés ci-dessus, tous destinés aux fonds de scène.

Arcel révise `docs/02` à la prochaine passe ; d'ici là, D-032 et ce document font foi.
