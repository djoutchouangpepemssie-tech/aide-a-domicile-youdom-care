# Brief — Expérience visuelle « Waouh » (demande d'Arcel du 2026-09-20, décision D-024)

Ce brief s'adresse à chaque agent qui travaille sur la refonte de l'expérience. Il complète `docs/01` (voix), `docs/02` (design system « Le Fil »), `docs/03` (pages services) et `docs/07` (qualité). Là où il contredit `docs/02 §5` (trois animations seulement) et `docs/02 §6` (jamais de banque d'images), c'est la décision D-024 qui s'applique.

## 1. Ce qu'Arcel demande

- Des **pages piliers vivantes** (neuro, personnes âgées, adultes et enfants en situation de handicap, aidants) et des **heros personnalisés** par page : chaque public doit sentir que la page a été faite pour lui.
- Des **images libres de droit partout**, qui représentent bien chaque service et chaque exemple (semaines types, situations vécues).
- Des **animations**, y compris des effets **3D**, et des **icônes représentatives** de chaque service.
- Un site qui **éblouit** dès l'arrivée (« waouh, quel site ») et qui **convertit** : pensé pour la conversation, l'interaction, l'appel et la demande.
- Une équipe d'agents spécialisés, chacun avec l'exigence d'un senior de trente ans de métier (développement web, UX et design pour l'aide à domicile).
- S'inspirer des concurrents O2 (o2.fr) et Petits-fils (petits-fils.com) pour faire dix fois mieux, sans rien copier.

## 2. Ce qui ne bouge pas (non négociable)

- **Vérité** : aucun fait Youdom Care inventé (chiffres, délais, agences, équipe, labels, témoignages). Les photos libres de droit sont des **illustrations** : jamais présentées comme l'équipe ou les clients de Youdom Care, jamais de légende qui les nomme, texte alternatif descriptif et neutre (« Une femme âgée et une jeune femme préparent un repas dans une cuisine lumineuse »). Aucune note, aucun avis, aucun témoignage fictif.
- **Santé** : on informe, on ne soigne pas ; pas de photo médicalisée (blouse, perfusion, hôpital), pas de fauteuil roulant vide, pas de mains jointes en gros plan, pas de seniors hilares devant une tablette (docs/02 §6). **Aucun visage d'enfant identifiable** : pour les pages enfants, plans larges, de dos, mains, jeux, objets.
- **Accessibilité** : AA partout, clavier complet, `prefers-reduced-motion` et mode confort coupent toute animation non essentielle (les contenus restent visibles d'emblée), aucun contenu porté par une animation seule, aucun carrousel automatique, aucune vidéo avec son, pas de lumière stroboscopique, cibles 48 px.
- **Performance** (D-019) : JavaScript initial ≤ 160 Ko compressés sur une page de contenu, ≤ 220 Ko sur une page de formulaire ; LCP < 2,5 s, CLS 0. Donc : animations en CSS d'abord, JavaScript minimal (IntersectionObserver, `requestAnimationFrame`), pas de bibliothèque lourde chargée d'emblée ; tout effet 3D ou WebGL est chargé à la demande, après l'interaction ou hors écran, et a un repli statique. Images via `next/image`, formats modernes, tailles adaptées, `priority` uniquement pour l'image du hero.
- **Le Fil** reste la signature (docs/02 §1) : le trait continu, les jetons de couleur, Fraunces et Atkinson Hyperlegible, une seule couleur d'action (framboise), les composants existants. On enrichit, on ne remplace pas.
- **Voix** (docs/01 §2) : vouvoiement, phrases courtes, pas de superlatifs ni de mots interdits (`check-copy`), pas de « Cliquez ici ».
- **Pas de secret, pas de donnée personnelle** dans le dépôt ; licences des images notées dans `public/images/CREDITS.md` (auteur, source, licence, adresse).

## 3. Ce que « dix fois mieux » veut dire ici

- **Un hero par public** : une photo forte et juste, un titre qui parle à la situation, un geste d'entrée (choisir sa situation, dire « pour qui », voir sa semaine), le fil qui se dessine, un effet de profondeur discret.
- **De la matière visuelle** sur les pages piliers et services : photo de situation par section clé, icône par service, semaine type illustrée, cartes qui répondent au pointeur, chiffres sourcés qui se comptent, étapes qui se révèlent au défilement.
- **De l'interaction utile** : un parcours « Pour qui cherchez-vous de l'aide ? » en page d'accueil, le sélecteur de lecteur, le questionnaire aidants, la semaine type manipulable, un rappel toujours à portée.
- **Une profondeur 3D légère** : couches en parallaxe discret, cartes inclinables au survol, objet 3D CSS ou SVG animé dans le hero (maison, fil, tasse), jamais au détriment du budget ni de l'accessibilité.
- **Des icônes cohérentes** : un jeu complet dans le style du fil (trait 2 px, extrémités rondes, tracé ouvert, nœud framboise), une icône par service, par public, par rubrique d'action.

## 4. Livrables attendus par agent

| Agent | Livrable | Où |
| --- | --- | --- |
| Direction artistique et UX conversion | Concept page par page (accueil, cinq piliers, gabarit service), spécification du mouvement, leviers de conversion, ce qu'on prend et ce qu'on refuse des concurrents | `docs/design/CONCEPT.md` |
| Iconographie | Jeu d'icônes SVG au fil (composant `Icon`, registre typé, page styleguide, tests) | `src/components/ui/Icon/`, `docs/design/ICONES.md` |
| Photothèque | Sélection de photos libres de droit par page et par section (source, auteur, licence, cadrage, texte alternatif), téléchargées et optimisées | `public/images/`, `public/images/CREDITS.md`, `docs/design/PHOTOS.md` |
| Mouvement et 3D | Infrastructure d'animation (révélation au défilement, compteurs, inclinaison, parallaxe, hero 3D) respectant reduced-motion et le budget, avec démonstration dans le styleguide et tests | `src/components/motion/`, `src/lib/motion/`, `docs/design/MOUVEMENT.md` |
| Intégration (ensuite) | Heros personnalisés, accueil, piliers, gabarit service enrichis | pages et composants existants |

Chaque agent lit ce brief, `docs/02`, et regarde le site en cours (`pnpm dev`, ou `pnpm build && pnpm start -p 3100`) avant de proposer. Chaque livrable de code passe `pnpm lint && pnpm typecheck && pnpm test` et respecte Prettier.
