# Icônes « au fil »

Jeu d'icônes du site, dessiné dans l'esprit du fil (`docs/02 §1`) : un trait continu, ouvert, avec un seul nœud framboise. Code dans `src/components/ui/Icon/` (registre `icons.ts`, composant `Icon.tsx`, tests `Icon.test.tsx`), démonstration sur `/styleguide/icones/` (non indexée). Livrable du brief `docs/design/BRIEF_EXPERIENCE.md` §4.

## 1. La grille de dessin

- **Boîte de 24 × 24** (`viewBox="0 0 24 24"`), **marge de 2** : toute extrémité de tracé reste entre 2 et 22. Le test `Icon.test.tsx` suit la plume et refuse un point d'arrivée hors de cette zone. Une courbe peut effleurer la marge, jamais la dépasser.
- **Trait** : 2 px sur ordinateur, 1,75 px sur mobile, c'est le jeton `--thread-width` du fil. Le composant applique `vector-effect="non-scaling-stroke"` : l'épaisseur ne change pas avec la taille de l'icône (20, 24 ou 32 px), comme pour les illustrations `Thread`.
- **Extrémités et jonctions rondes** (`stroke-linecap="round"`, `stroke-linejoin="round"`). Un point se dessine avec un segment quasi nul (`h.01`) : le chapeau rond fait le reste.
- **Rayons** : 2 pour les angles intérieurs (coins d'une bulle, d'un porte-bloc), 3 à 5 pour les formes (têtes, anses, couronnes), 8 pour les grands cercles ouverts (horloge, lune, euro). Rien en dessous de 1,5 : à 20 px, un rayon plus petit se lit comme un angle vif.
- **Pas moins de 2 unités entre deux traits parallèles** (soit 1,7 px à 20 px) : au-dessous, ils fusionnent.
- **Un cercle n'est jamais fermé** : on le dessine en arc de 270° (`a4 4 0 1 1-4-4`) et l'ouverture devient une partie du sens (le soleil s'ouvre vers son rayon, l'horloge se prolonge en flèche, l'arbre s'ouvre sur son tronc).

## 2. Les règles de style

1. **Tracé ouvert, jamais rempli.** Aucune commande `Z`, `fill="none"` sur le SVG. Le test refuse un `Z`. Quand une forme se referme naturellement (un cœur, un combiné), le trait revient à son point de départ sans se fermer, comme les illustrations du fil ; on préfère quand même laisser une ouverture qui a un sens : la porte de la maison, le bas du tee-shirt, la pointe de la bulle, les brins du balai.
2. **Un ou deux traits continus quand c'est possible.** Les détails qui ne servent pas la lecture à 20 px sont supprimés. Test : à 20 px, sur fond sombre, l'icône doit se reconnaître sans son nom.
3. **Une seule couleur de trait, un seul nœud.** `teal-700` sur fond clair, `white` sur fond sombre, `ink` à côté du texte courant. Le nœud (`knot`) est un segment repassé en `raspberry-500` : le point d'attention (le manche du balai, la canne, la coche, l'anse). Il fait toujours partie du tracé principal : sans la couleur d'accent (impression, forçage des couleurs), l'icône reste complète. Le nœud est optionnel, jamais multiple.
4. **Cohérence avec les illustrations `Thread`** : `maison`, `mains`, `cahier-de-liaison`, `nuit`, `ecole` reprennent les gestes des illustrations au fil (`Thread/illustrations.ts`), en plus simple.
5. **Décoratives.** Sans `label`, l'icône est `aria-hidden`. Elle ne porte jamais seule une information : le texte voisin dit toujours ce qu'elle montre (une liste « Ce que nous faisons » garde ses libellés ; une légende de semaine type garde ses mots). Avec `label`, elle devient `role="img"` : réservé aux rares cas où l'icône est seule dans un bouton ou un lien (icône de téléphone dans l'en-tête réduit, par exemple), et le libellé reprend alors le verbe de l'interface (`content/interface.json`).
6. **Pas de pictogramme médicalisé, pas de fauteuil vide** (docs/02 §6, brief §2) : `fauteuil` est un fauteuil de salon ; `public-adultes` montre toujours une personne dans son fauteuil, en mouvement ; `retour-hopital` est une maison, pas une croix ; `garde-malade` est une personne couchée chez elle, pas un lit d'hôpital.
7. **Jamais comme seul porteur d'information ni de couleur** : le nœud framboise n'a pas de sens propre, et le contraste du trait (`teal-700` : 5,16 sur blanc, 4,87 sur papier) suffit à AA pour un élément graphique, mais l'icône reste toujours accompagnée d'un texte.

## 3. Le composant

```tsx
import { Icon } from "@/components/ui/Icon/Icon";

<Icon name="repas" />                          // 24 px, teal-700, décorative
<Icon name="telephone" size="sm" tone="ink" /> // 20 px, dans une phrase
<Icon name="maison" size="lg" tone="white" />  // 32 px, sur fond teal-900
<Icon name="rappel" label="Être rappelé" />   // seule dans un bouton : image nommée
```

| Propriété | Valeurs | Défaut |
| --- | --- | --- |
| `name` | un `IconName` du registre | obligatoire |
| `size` | `sm` 20 px (texte courant, boutons) · `md` 24 px (cartes, listes) · `lg` 32 px (titres de section, cartes de public) | `md` |
| `tone` | `teal` (teal-700, fond clair) · `white` (fond sombre) · `ink` (encre, aligné sur le texte) | `teal` |
| `label` | texte pour les lecteurs d'écran ; sans lui, `aria-hidden` | aucun |
| autres | toute propriété SVG (`className`, `style`, `data-*`) | — |

Le SVG porte `data-icon="<nom>"` (utile aux tests d'intégration) et les classes `icon` et `icon-knot`. Aucune règle CSS globale n'est nécessaire : l'épaisseur vient d'un style en ligne (`stroke-width: var(--thread-width, 2px)`), les couleurs des jetons Tailwind.

## 4. Les icônes et leur usage prévu

Groupes du registre (`groupe`) : `quotidien`, `service`, `objet`, `public`, `action`. Les usages renvoient au gabarit de page de `docs/03 §2` (sections 1 à 13), aux blocs de l'accueil de `docs/01` et aux composants de `docs/02 §7`.

### Gestes du quotidien (`quotidien`)

| Nom | Dessin | Nœud | Usage prévu |
| --- | --- | --- | --- |
| `lever` | Lit vu de côté, flèche qui monte | la flèche | Listes « Ce que nous faisons » (section 3), légende « lever et coucher » du `WeekPlanner`, page Personnes âgées |
| `toilette` | Baignoire, robinet | le robinet | Section 3 (aide à la toilette), légende du `WeekPlanner` |
| `repas` | Bol, vapeur | la vapeur | Section 3 (repas), légende « repas » du `WeekPlanner`, accueil bloc 2 (« repas sautés ») |
| `courses` | Sac ouvert, anse | l'anse | Section 3 (courses), sortie d'hospitalisation (« courses, repas ») |
| `menage` | Balai, brins libres | le manche | Section 3 (entretien du logement), page Adultes (« ce qui épuise ») |
| `linge` | Tee-shirt ouvert par le bas | le col | Section 3 (linge), page Adultes |
| `promenade` | Arbre sur un chemin | le tronc | Section 3 (sorties, promenades), légende « sorties » du `WeekPlanner`, pages Parkinson et DFT (« sorties et activités physiques ») |
| `compagnie` | Deux tasses, vapeur partagée | une vapeur | Section 3 (présence, compagnie), légende « compagnie » du `WeekPlanner`, page Personnes âgées |
| `jeux` | Pièce de puzzle | le tenon du haut | Section 3 (stimulation, jeux), pages Enfants (« jouer par terre »), Alzheimer (stimulation) |
| `lecture` | Livre ouvert | la reliure | Section 3 (lecture, lien social), page Alzheimer, magazine |
| `marche` | Silhouette en marche | la jambe avant | Section 3 (aide à la marche), page Parkinson, SEP |
| `communication` | Bulle avec trois points, ouverte à la pointe | la pointe | Pages Enfants (autisme : pictogrammes, communication alternative), Charcot (outils de communication) |
| `transferts` | Lève-personne, personne assise dans la sangle | la sangle | Section 3 (transferts), pages Charcot, handicap moteur, polyhandicap, Adultes |

### Services et moments (`service`)

| Nom | Dessin | Nœud | Usage prévu |
| --- | --- | --- | --- |
| `nuit` | Croissant de lune, étoile | l'étoile | Page Garde de nuit, cartes « Là quand ça se complique » (accueil bloc 3), créneau « nuit » du `WeekPlanner`, formulaire `nuit-24h` |
| `jour` | Soleil ouvert, huit rayons | le rayon qui prolonge l'ouverture | Créneaux de jour du `WeekPlanner`, garde-malade de jour |
| `24h` | Horloge dont le cadran se prolonge en flèche | la flèche | Page Présence 24h/24, accueil bloc 3, `StageCards` (« présence continue ») |
| `retour-hopital` | Maison, flèche qui rentre | la flèche | Page Sortie d'hospitalisation, formulaire express, `AidCard` « aides après hospitalisation » |
| `garde-malade` | Personne alitée chez elle | la tête | Page Garde-malade |
| `vacances` | Soleil sur l'eau | le rayon du haut | Page Accompagnement en vacances, espace Aidants (« des vacances ») |
| `remplacement` | Deux flèches qui se relaient | la flèche du bas | Page Remplacement d'auxiliaire de vie |
| `fauteuil` | Fauteuil de salon vu de face | l'assise | Accueil (« rester chez soi »), page Personnes âgées, section 7 (« Et pour vous, les proches ») |
| `ecole` | Cartable à rabat | la boucle | Page Enfants (sortie d'école), page Adultes (« s'occupe des enfants à la sortie de l'école »), semaine type de Claire |

### Objets et repères (`objet`)

| Nom | Dessin | Nœud | Usage prévu |
| --- | --- | --- | --- |
| `fiche-de-vie` | Feuille cornée, silhouette | la tête | Section 6 « Le suivi » (évaluation, fiche de vie), `FollowUpTimeline` J0, `StepsTimeline` |
| `memoire` | Bulle de pensée qui s'éloigne | la petite bulle | Pages Alzheimer, corps de Lewy (consultation mémoire, troubles de la mémoire), pilier Neuro |
| `coeur` | Cœur d'un seul trait | le lobe droit | Nos engagements, section 8 « Qui intervient ? », accueil bloc 3 |
| `telephone` | Combiné, onde d'appel | l'onde | En-tête (téléphone cliquable), `MobileActionBar` « Appeler », pied de page, `AgencyCard` |
| `rappel` | Combiné, flèche qui revient | la flèche | `MobileActionBar` « Être rappelé(e) », page Être rappelé, appel final (accueil bloc 11) |
| `calendrier` | Page de calendrier, bande de la semaine | la bande | Section 5 « Exemple de semaine », `WeekPlanner`, accueil bloc 5, `FollowUpTimeline` (points réguliers) |
| `maison` | Maison, porte ouverte | le linteau | Accueil (bannière, « chez vous »), pages locales (« Oui, nous intervenons à… »), `Breadcrumb` racine |
| `mains` | Deux bras qui se rejoignent | la boucle des doigts | Section 7 « Et pour vous, les proches », espace Aidants, `Callout` « Bon à savoir » |
| `cahier-de-liaison` | Carnet à spirale, ligne écrite | la ligne | Section 6 « Le suivi » (cahier de liaison), `FollowUpTimeline` (chaque mois) |
| `aide-financiere` | Signe euro | la barre haute | Section 10 « Combien ça coûte, quelles aides ? », page Tarifs et aides, `PriceCard`, `AidCard` (APA, crédit d'impôt, CESU) |
| `dossier-mdph` | Chemise à onglet, étiquette | l'étiquette | `AidCard` PCH et AEEH, pages Adultes et Enfants (dossier MDPH), `LocalFactsGrid` (MDPH) |
| `aidant` | Deux silhouettes, bras sur l'épaule | le bras | Section 7, espace Aidants (« reconnaître la fatigue »), questionnaire « Où en êtes-vous ? », accueil bloc 8 « Les proches » |

### Publics (`public`)

Une icône par pilier, pour les cartes « Pour qui cherchez-vous de l'aide ? » de l'accueil (bloc 2), le méga-menu de l'en-tête, la bannière de chaque pilier (section 1, taille `lg`) et le `Breadcrumb`.

| Nom | Dessin | Nœud | Pilier |
| --- | --- | --- | --- |
| `public-neuro` | Tête, le fil qui s'enroule à l'intérieur | la spirale | Maladies neurodégénératives |
| `public-personnes-agees` | Silhouette debout avec sa canne | la canne | Personnes âgées |
| `public-adultes` | Personne dans son fauteuil, en mouvement | la jambe avant | Adultes en situation de handicap |
| `public-enfants` | Ballon, ficelle qui danse | la ficelle | Enfants en situation de handicap |
| `public-aidants` | Cœur porté par une main ouverte | le lobe droit | Espace Aidants |
| `public-services` | Quatre cases ouvertes | une case | Services transverses (nuit, 24h/24, hospitalisation, garde-malade, vacances, remplacement) |

### Rubriques d'action (`action`)

Les quatre rubriques de la section 3 « Ce que nous faisons, concrètement » (`docs/03 §2`), et les colonnes de la page Comment ça marche.

| Nom | Dessin | Nœud | Rubrique |
| --- | --- | --- | --- |
| `action-gestes` | Main ouverte | le pouce | Gestes du quotidien |
| `action-presence` | Silhouette sous un toit | la tête | Présence et sécurité |
| `action-lien` | Le fil noué en deux boucles, d'un seul trait | la boucle centrale | Lien social et stimulation |
| `action-coordination` | Porte-bloc, coche | la coche | Coordination (référent, soignants, cahier de liaison) |

## 5. Ajouter une icône

1. **Dessiner** sur la grille de 24 (papier quadrillé ou éditeur vectoriel réglé sur 24 × 24, sans remplissage, trait de 2). Commencer par le geste principal en un trait ; n'ajouter un second trait que s'il est indispensable à la lecture à 20 px. Arrondir les coordonnées au demi-point (`.5`) : les décimales plus fines n'apportent rien.
2. **Écrire le tracé** dans `src/components/ui/Icon/icons.ts` : clé en minuscules sans accent (`mot-compose`), commentaire d'une ligne (ce que c'est, où est le nœud), `main`, `knot` optionnel (un segment de `main`, repassé), `groupe`. Commandes autorisées : `M L H V C S Q T A` et leurs relatives ; jamais `Z`.
3. **Vérifier** : `pnpm exec vitest run src/components/ui/Icon` (grammaire, marge, nœud), puis ouvrir `/styleguide/icones/` (`pnpm dev`) et regarder l'icône à 20 px sur fond sombre. Si elle ne se reconnaît pas sans son nom, simplifier.
4. **Documenter** : ajouter la ligne dans le tableau de son groupe ci-dessus, avec l'usage prévu (page, section).
5. **Ne pas** importer une icône de bibliothèque, ni convertir un pictogramme existant : le jeu doit rester d'une seule main.

## 6. Ce qui reste à décider

- `public-aidants` (cœur dans une main) et `aidant` (deux silhouettes) coexistent : à l'intégration, choisir laquelle porte les cartes de public et laquelle porte la section « Et pour vous, les proches », pour ne pas montrer les deux côte à côte.
- `public-adultes` montre une personne dans un fauteuil roulant : c'est le symbole le plus lu, mais il réduit le handicap adulte au handicap moteur. Alternative possible si Arcel préfère : une clé (autonomie, « chez soi ») ou la silhouette debout.
- Le nœud framboise sur fond `teal-900` (ton `white`) est décoratif et n'a pas besoin d'atteindre 3:1 ; si la loop de contraste le signale, le composant peut passer le nœud en blanc dans le ton `white`.
- Les légendes du `WeekPlanner` (couleur par activité) peuvent gagner une icône par activité (`lever`, `repas`, `promenade`, `compagnie`, `nuit`) : à valider avec la spécification de `docs/05`.
