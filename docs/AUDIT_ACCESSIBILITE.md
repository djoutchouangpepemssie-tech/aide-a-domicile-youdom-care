# Audit d'accessibilité (P8.4) — RGAA 4.1, WCAG 2.2 AA

Date : 27 septembre 2026. Auditeur : équipe du site (audit interne, avant l'audit complet par un tiers prévu avant l'ouverture). Version auditée : branche `phase/08-complements`, build de production servi par `pnpm start`. Étendu le même jour à tous les gabarits en phase 9 (§7, branche `phase/09-qualite`).

Ce document est la source de la déclaration d'accessibilité (`content/pages/accessibilite.json`, page `/accessibilite/`). Il est mis à jour à chaque audit ; la déclaration reprend l'état de conformité, le décompte des critères et la liste des contenus non accessibles.

## 1. Méthode

- **Clavier** : sur chaque page, tabulation complète (ordre, visibilité du focus, pièges, lien d'évitement), Entrée et Espace sur les commandes, Échap sur les menus et la liste de suggestions, flèches sur les onglets et la liste de communes, Début et Fin sur les onglets.
- **Composants interactifs** : menus déroulants et menu mobile, sélecteur de lecteur (pilier personnes âgées), parcours « pour qui ? » et exemples de semaine (accueil), recherche de commune (combobox), formulaires (résumé d'erreurs, liaison champ-erreur, focus après erreur, conservation des réponses, panne d'envoi simulée : la route `/api/lead/` répondait 503, aucune demande n'a été envoyée ; données fictives « Test Essai, 06 00 00 00 00 »).
- **Adaptation** : fenêtre de 320 px de large (mobile émulé), 640 px (équivalent d'un zoom de 200 % sur 1 280 px), espacement du texte de WCAG 1.4.12 injecté par feuille de style (interligne 1,5, lettres 0,12 em, mots 0,16 em, paragraphes 2 em), préférence `prefers-reduced-motion: reduce`, mode confort de lecture du site.
- **Automatique** : axe-core 4.13 (règles `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, `wcag22aa`, `best-practice`) sur chaque page, sur ordinateur (1 280 px) et sur mobile (320 px) ; contrastes des jetons par `check-contrast` (`pnpm validate`).
- **Revue de code** pour les critères non observables (rôles ARIA, `hidden`, `inert`, langue, autocomplétion).
- Outils : Chromium 141 piloté par Playwright 1.63, inspecteur d'accessibilité du navigateur. Aucun lecteur d'écran réel n'a été utilisé : les critères qui en dépendent (annonces effectives, ordre de lecture vocal) sont notés « à confirmer avec NVDA/VoiceOver » et ne sont pas comptés conformes sur cette seule base.

Captures (sans donnée personnelle) dans `docs/audit/` :

| Fichier | Contenu |
| --- | --- |
| `accueil-menu-clavier.png` | Menu « Pour qui ? » ouvert au clavier, focus sur le premier lien |
| `accueil-320px.png` | Accueil à 320 px, sans défilement horizontal |
| `accueil-recherche-commune-clavier.png` | Recherche de commune : suggestion sélectionnée à la flèche bas |
| `demande-320px.png` | Formulaire personne âgée à 320 px |
| `demande-erreurs-etape-1.png` | Étape 1 soumise vide : résumé d'erreurs relié au groupe |
| `tarifs-zoom-200.png` | Tarifs et aides à 200 % (640 px), en-tête replié |
| `pilier-mode-confort.png` | Pilier personnes âgées en mode confort de lecture |
| `menu-mobile-focus-derriere.png` | Menu mobile ouvert : le focus est passé derrière le panneau (défaut corrigé) |
| `tarifs-320px-apres-correctif.png` | Tarifs et aides à 320 px après correction des cartes d'aides |
| `accessibilite-320px.png` | Déclaration d'accessibilité à 320 px |

## 2. Périmètre

| Page | Gabarit |
| --- | --- |
| `/` | Accueil (parcours « pour qui ? », exemples de semaine, recherche de commune) |
| `/personnes-agees/` | Pilier, avec sélecteur de lecteur et exemple de semaine |
| `/maladies-neurodegeneratives/alzheimer/` | Pathologie |
| `/demande/personne-agee/` | Formulaire en cinq étapes, chaque étape et l'état d'erreur |
| `/etre-rappele/` | Formulaire court |
| `/aide-a-domicile/hauts-de-seine/puteaux/` | Page locale |
| `/magazine/prevenir-les-chutes-le-tour-du-logement-piece-par-piece/` | Article |
| `/tarifs-et-aides/` | Tarifs et aides |
| `/lexique/` | Lexique (recherche, ancres) |
| `/outils/tour-du-logement-anti-chutes/` | Outil à imprimer |
| `/plan-du-site/` | Plan du site |

## 3. Résultats par page

Résultats communs à toutes les pages : `lang="fr-FR"`, un seul H1, hiérarchie de titres sans saut, repères `header`, `nav` (nommés), `main`, `footer`, lien d'évitement premier élément focalisable (visible au focus, cible `#contenu`, la tabulation reprend ensuite dans le contenu), focus visible sur chaque arrêt (anneau 3 px `teal-800`, décalage 2 px ; sur les boutons radio et cases à cocher, l'anneau est porté par la carte via `:has(:focus-visible)`), aucun piège clavier, aucune animation en boucle, aucune lecture automatique, 0 violation axe critique ou sérieuse.

| Page | Arrêts de tabulation | axe (ordinateur / 320 px) | 320 px | 200 % | Observations |
| --- | --- | --- | --- | --- | --- |
| Accueil | 87 | 0 / 0 | OK | OK | Menus : Entrée et Espace ouvrent, Tab entre dans le panneau, Échap ferme et rend le focus au bouton, la sortie par Tab ferme. Parcours « pour qui ? » : Entrée sur un choix déplace le focus sur le titre du panneau (`h2` `tabindex=-1`). Exemples de semaine : boutons `aria-pressed`, un panneau affiché ; la rangée défile horizontalement à 320 px. Combobox : `aria-expanded`, `aria-controls`, `aria-activedescendant`, Échap ferme, Entrée choisit, résultat dans une zone `aria-live`. |
| Personnes âgées | 111 | 0 / 0 | OK | OK | Sélecteur de lecteur : deux boutons `aria-pressed`, Entrée bascule le chapô et la photo, le focus reste sur le bouton ; aucune annonce du changement (voir §5). Tableau de semaine : `caption`, `th scope="col"`. |
| Alzheimer | 101 | 0 | **13 px de débordement** (corrigé) | OK | Cartes des aides : voir NC-2. |
| Demande personne âgée | 61 (étape 1) ; 69, 95, 56 aux étapes 2, 4, 5 | 0 / 1 modérée (`landmark-unique`) | OK | OK | Étape 1 vide : résumé `role="alert"` avec liens vers les champs, `aria-invalid` et `aria-describedby` sur le groupe, **focus resté sur le bouton « Continuer »** (NC-1, corrigé) ; étape 5 vide : cinq erreurs, focus sur « Votre prénom ». Changement d'étape : focus sur le titre de l'étape. Grille de la semaine : 42 cases nommées « Lundi, tôt le matin, 6 h à 8 h »…, total annoncé par `aria-live`. Panne d'envoi : alerte annoncée, réponses conservées. |
| Être rappelé(e) | 66 | 0 / 1 modérée (`landmark-unique`) | OK | OK | Formulaire vide : quatre erreurs reliées, focus sur le prénom. |
| Puteaux | 54 | 0 | OK | OK | Liens externes signalés « (site officiel, lien externe) ». |
| Article chutes | 84 | 0 / 1 modérée (`landmark-unique`) | OK | OK | |
| Tarifs et aides | 73 | 0 / 0 | **13 px de débordement** (corrigé) | OK | Cartes des aides : voir NC-2. |
| Lexique | 93 | 0 | OK | OK | Recherche : `searchbox`, compte annoncé par `role="status"`. |
| Outil anti-chutes | 68 | 0 | OK | OK | Deux `header`/`footer` (celui du document imprimable est dans `main`) : sans effet sur les repères, à surveiller. |
| Plan du site | 275 | 0 / 1 modérée (`landmark-unique`) | OK | OK | Navigations homonymes du pied de page (« Pour qui ? », « Nos services »). |

Menu mobile (320 px) : Entrée ouvre, `aria-expanded`, groupes en `details/summary`, Échap ferme et rend le focus au bouton « Menu ». **Après le dernier lien du panneau, Tab passait au contenu situé derrière le panneau ouvert** (NC-3, corrigé).

Mouvement réduit : 0 animation en cours, aucun bloc `m-reveal` masqué, transition du fil à 0 s, `scroll-behavior: auto`. Sans la préférence : aucune animation infinie.

Mode confort : `data-comfort="on"` posé sur `html`, racine à 20,25 px (× 1,125), interligne 1,75, choix mémorisé (`localStorage`) et restauré au rechargement, `aria-pressed` synchronisé sur les trois boutons (barre, menu mobile, pied de page), aucun débordement horizontal. Le soulignement permanent des liens s'applique aux liens de texte ; les liens présentés en bouton (`no-underline`) gardent leur forme de bouton, ce qui est voulu.

Espacement du texte (WCAG 1.4.12) : aucun texte tronqué ; débordement horizontal de 2 à 5 px sur l'accueil et le pilier (liens-icônes du hero, `whitespace-nowrap`), de 13 px puis 68 px sur les pages à cartes d'aides avant correction. Après correction des cartes, seul le débordement de 2 à 5 px subsiste : sans perte de contenu ni de fonction, noté comme réserve.

## 4. Résultats par critère RGAA 4.1

C : conforme sur les pages du périmètre. NC : non conforme. NA : non applicable. NT : non testé (non compté).

| Critère | Résultat | Constat |
| --- | --- | --- |
| 1.1, 1.2, 1.3 Images | C | Alternatives présentes et pertinentes ; icônes et fils décoratifs en `aria-hidden` |
| 3.1 Information par la couleur | C | États pressés et onglets : fond, bordure et ARIA ; erreurs : icône, texte et bordure |
| 3.2, 3.3 Contrastes | C | `check-contrast` sur les jetons, axe `color-contrast` sans violation |
| 5.6, 5.7 Tableaux | C | Tableau de semaine : `caption`, `th scope="col"` |
| 6.1, 6.2 Liens | C | Intitulés explicites, liens externes signalés |
| 7.1 Scripts compatibles | C | Motifs ARIA respectés : disclosure, combobox, tabs, `aria-pressed`, `progress` |
| 7.3 Scripts contrôlables au clavier | C | Menus, combobox, onglets, parcours, semaine, confort |
| 7.4 Changement de contexte | C | Aucun changement de contexte non initié |
| 7.5 Messages de statut | C | `aria-live` sur les résultats de recherche, le total de la semaine, le compte du lexique |
| 8.3, 8.4 Langue | C | `lang="fr-FR"` |
| 8.5, 8.6 Titre de page | C | Titres uniques et pertinents |
| 8.9 Balises détournées | C | Listes, tableaux, boutons réels |
| 9.1, 9.2, 9.3 Structure | C | Un H1, hiérarchie continue, repères, listes réelles |
| 10.4 Agrandissement 200 % | C | Aucune perte à 640 px |
| 10.7 Focus visible | C | Anneau 3 px partout |
| 10.8 Contenus cachés | C | `hidden`, `inert` sur le rail replié |
| 10.11 Redistribution à 320 px | **NC → corrigé** | Débordement de 13 px sur les cartes des aides (NC-2) |
| 10.12 Espacement du texte | C (réserve levée en phase 9) | 2 à 5 px de débordement sans perte de contenu ; phase 9 : 2 à 15 px relevés sur six gabarits, corrigés, 0 px sur les douze gabarits contrôlés |
| 10.13, 10.14 Contenus additionnels | C | Panneaux au clic, atteignables au clavier |
| 11.1, 11.2 Étiquettes | C | `label` visibles, légendes de groupe, mention « (facultatif) » |
| 11.5, 11.6, 11.7 Regroupements | C | `fieldset`/`legend` pour chaque groupe |
| 11.9 Intitulés de boutons | C | Première personne, explicites |
| 11.10 Contrôle de saisie | **NC → corrigé** | Focus absent sur la première erreur d'un groupe (NC-1) |
| 11.11 Suggestion de correction | C | Messages « Il manque… Nous en avons besoin pour… » |
| 11.13 Autocomplétion | C | `autocomplete` sur prénom, nom, téléphone, courriel |
| 12.1, 12.2 Navigation | C | Menu, plan du site, fil d'Ariane, cohérents |
| 12.6 Zones de regroupement | C (réserve levée en phase 9) | Repères présents ; régions et navigations homonymes sur quatre gabarits (R-1), corrigées ; axe `landmark-unique` sans violation sur les 45 gabarits |
| 12.7 Lien d'évitement | C | Premier élément, visible au focus, fonctionnel |
| 12.8, 12.9 Ordre et pièges | C | Ordre logique, aucun piège |
| 12.10 Raccourcis clavier | NA | Aucun raccourci à une touche |
| 12.11 Contenus additionnels au clavier | C | Menus ouverts au clavier |
| 13.1 Limite de temps | NA | Aucune |
| 13.7 Flashs | NA | Aucun |
| 13.8 Mouvement | C | Animations courtes, coupées sous `prefers-reduced-motion` et en mode confort |
| 13.9 Orientation | C | Aucune restriction |
| 13.10 Gestes complexes | NA | Aucun |
| 13.11 Actions au pointeur | C | Activation au relâchement, annulable |

Décompte (phase 8) : 52 critères testés, 46 conformes, 2 non conformes (tous deux corrigés le jour même), 4 non applicables ; porté à 60 testés, 50 conformes, 8 non applicables en phase 9 (§7.4). Non testés : thèmes 2 (cadres, aucun), 4 (multimédia, aucun), 8.1, 8.2, 8.7, 8.8 (validité du code, langue des passages), 8.10, 5.1 à 5.5, 5.8, 6.x hors 6.1 et 6.2, 7.2, 9.4, 10.1 à 10.3, 10.5, 10.6, 10.9, 10.10, 11.3, 11.4, 11.8, 11.12, 12.3 à 12.5, 13.2 à 13.6, 13.12. **Absence d'audit complet : l'état de conformité retenu est « non conforme »**, avec publication du décompte partiel.

## 5. Non-conformités et réserves

| Id | Gravité | Page(s) | Composant | Critère | Correction |
| --- | --- | --- | --- | --- | --- |
| NC-1 | Sérieuse | `/demande/*` (étape 1 « Pour qui ? », toute étape dont l'erreur porte sur un groupe) | `MultiStepForm` | RGAA 11.10 | **Faite** : `check()` vise le premier contrôle du groupe quand l'identifiant est porté par le `fieldset` ; repli sur le résumé d'erreurs (`tabIndex=-1`). Test unitaire ajouté ; parcours `gabarits-axe.spec.ts`. |
| NC-2 | Moyenne | Tarifs, piliers, pathologies, pages locales | `AidCard` (lien « site officiel ») | RGAA 10.11 | **Faite** : `overflow-wrap: anywhere` sur le lien ; le nom `monparcourshandicap.gouv.fr` peut se couper, la grille ne déborde plus. |
| NC-3 | Moyenne (WCAG 2.2 2.4.11, hors RGAA 4.1) | Toutes les pages jusqu'à 1 280 px | `Header` (menu mobile) | WCAG 2.4.11 | **Faite** : le menu se ferme quand le focus quitte l'en-tête (`onBlur`), comme le menu ordinateur. Test unitaire ajouté. |
| R-1 | Mineure (axe `landmark-unique`, modérée) | `/demande/*`, `/etre-rappele/`, articles, `/plan-du-site/` (et, relevé en phase 9 : contact, postuler, professionnel, sortie d'hospitalisation, index des demandes, agences, page d'agence, pages d'aide, charte, engagements, carte régionale) | Gabarits de page (`section aria-labelledby="titre"` doublée par la section de corps nommée du même H1) ; `nav` du plan du site homonymes de celles du pied de page ; section « Nos agences » du pied de page homonyme de celle de la carte régionale | RGAA 12.6 (recommandation) | **Faite (phase 9)** : la section de corps est nommée par le libellé court du fil d'Ariane (`ariane`, distinct du H1) ou n'est plus une région quand elle n'a pas de titre propre (article, page d'agence, index des agences) ; navigations du plan nommées « Plan du site : Pour qui ? » ; bloc des agences du pied de page en `nav`. Tests unitaires du plan adaptés ; contrôle des doublons dans `tous-gabarits-axe.spec.ts`. |
| R-2 | Mineure | Pilier personnes âgées | `ReaderSwitch` | RGAA 7.5 (recommandation) | **Faite (phase 9)** : zone `role="status"` (`aria-live="polite"`, masquée visuellement), vide au chargement, qui reçoit « Vous cherchez de l'aide pour vous-même » ou « … pour un proche » à chaque bascule. Test unitaire et parcours. |
| R-3 | Mineure (WCAG 2.5.8) | Toutes | `Footer` (liens légaux, 22 px de haut) | WCAG 2.5.8 | **Faite (phase 9)** : liens légaux en `inline-flex min-h-11` (44 px) ; le retrait du padding de la ligne compense la hauteur ajoutée, le dessin ne bouge que d'un pixel. Parcours : hauteur mesurée ≥ 44 px. |
| R-4 | Mineure | `/demande/*` | `MultiStepForm` (panne d'envoi) | Bonne pratique | **Faite (phase 9)** : l'encart d'alerte (`Callout`, `role="alert"`, `tabIndex=-1`) reçoit le focus dès que l'envoi échoue ; `Callout` accepte désormais `ref`. Test unitaire et parcours (route `/api/lead/` en 503, rien n'est envoyé). |
| R-5 | À vérifier | `/outils/*` (PDF) | Documents imprimables | RGAA 13.3 | **À faire** : vérifier le balisage des PDF avec un lecteur d'écran ; la page web reste la version de référence. |
| R-6 | À vérifier | Toutes | Lecteur d'écran | — | **À faire** : passe NVDA + Firefox et VoiceOver + Safari (annonces des zones `aria-live`, lecture des cartes radio, du tableau de semaine). |

## 6. Suites

- Audit complet des 106 critères par un tiers avant l'ouverture, puis mise à jour de `content/pages/accessibilite.json` (`etat`, décompte, `non_accessibles`) et de ce document.
- Contrôle continu : `tests/e2e/gabarits-axe.spec.ts` (pages témoins de docs/07 §4, formulaire à chaque étape et en erreur, seuil 0 violation critique ou sérieuse), `tests/e2e/tous-gabarits-axe.spec.ts` (tous les gabarits, §7) et `tests/e2e/accessibilite.spec.ts` (déclaration, pied de page, plan du site, lien d'évitement).

## 7. Phase 9 (P9.2) : tous les gabarits

Date : 27 septembre 2026, branche `phase/09-qualite`, build de production (`pnpm build` puis `pnpm start`), Chromium 141 piloté par Playwright 1.63, axe-core 4.13 (règles `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, `wcag22aa`, `best-practice`), projets « mobile » (Pixel 7) et « ordinateur » (1 280 px).

### 7.1 Parcours `tests/e2e/tous-gabarits-axe.spec.ts`

Une page par gabarit, 45 pages, chacune analysée sur mobile et sur ordinateur (un seul H1, statut 200, ou 404 pour la page introuvable) : accueil ; piliers personnes âgées (sélecteur de lecteur) et aidants ; pathologie (Alzheimer) ; sous-page de pilier (aide à l'autonomie) ; page service (garde-malade) ; « Où en êtes-vous ? » ; index des formulaires ; merci (demande détaillée et rappel) ; carte régionale, département (Hauts-de-Seine), commune (Puteaux), arrondissement (Paris 12e) ; agences (index et page) ; magazine (index, page 2, rubrique, article) ; lexique (index, terme) ; outils (index, outil) ; tarifs et aides et page d'aide (APA) ; comment ça marche ; prestataire ou mandataire ; à propos, engagements, charte éditoriale ; professionnels ; recrutement ; quatre pages légales ; déclaration d'accessibilité ; plan du site ; 404 ; styleguide et ses quatre sous-pages. La page « postuler » et les formulaires sont couverts par la suite des formulaires. Aucune fiche d'auteur ni offre d'emploi n'est construite aujourd'hui : ces deux gabarits ne sont pas couverts.

Formulaires, à chaque étape et en état d'erreur (soumission vide, aucune demande envoyée) : les six formulaires détaillés (`/demande/personne-agee/`, `maladie-neurodegenerative`, `adulte-handicap`, `enfant-handicap`, `relais-aidant`, `nuit-et-24h`), cinq étapes chacun, erreurs aux étapes 1, 4 et 5 ; rappel ; professionnel (deux étapes, chacune en erreur) ; sortie d'hospitalisation (quatre étapes, erreur de commune et coordonnées vides) ; contact ; candidature.

Seuil : 0 violation critique ou sérieuse, bloquant. Les violations modérées et mineures sont consignées en annotations du rapport (`axe-moderate`, `axe-minor`, par page et par sélecteur), sans faire échouer le parcours. Le parcours vérifie aussi R-1 (doublons de repères visibles, nom « Plan du site : Pour qui ? »), R-2 (zone de statut), R-3 (hauteur des liens légaux ≥ 44 px), R-4 (focus sur l'alerte de panne) et 10.12 (espacement du texte forcé à 320 px sur douze gabarits, 0 px de débordement exigé).

### 7.2 Résultats

| Contrôle | Résultat |
| --- | --- |
| axe, 45 gabarits × 2 fenêtres | 0 violation critique ou sérieuse partout |
| axe, formulaires (environ 80 analyses) | 0 violation critique ou sérieuse |
| Violations modérées avant correction | 1 : `landmark-unique` sur `/aide-a-domicile/` (section « Nos agences » homonyme de celle du pied de page) ; corrigée |
| Violations modérées après correction | 0 |
| Violations mineures | 0 |
| Espacement du texte à 320 px, avant correction | 5 px (accueil, section « Alzheimer, Parkinson… » : colonne dilatée par les cartes de stades), 2 px (piliers et pages de services : cartes « À lire aussi »), 15 px (professionnels : « Professionnels » dans le H1 dilate la colonne) |
| Espacement du texte à 320 px, après correction | 0 px sur les douze gabarits contrôlés |

Corrections de la phase 9, par critère :

- RGAA 12.6 (R-1) : voir §5. Fichiers : pages `demande/[cas]`, `demande`, `demande/professionnel`, `demande/sortie-d-hospitalisation`, `etre-rappele`, `contact`, `recrutement/postuler`, `tarifs-et-aides/[aide]`, `a-propos/charte-editoriale`, `a-propos/nos-engagements`, `agences`, `plan-du-site` ; `AgencyTemplate`, `ArticleTemplate`, `Footer`.
- RGAA 7.5 (R-2) : `ReaderSwitch`, zone de statut.
- WCAG 2.5.8 (R-3) : `Footer`, liens légaux de 44 px.
- Bonne pratique (R-4) : `MultiStepForm` et `Callout` (`ref`), focus sur l'alerte.
- RGAA 10.12 : `min-w-0` sur les colonnes et cartes concernées (`page.tsx` de l'accueil, `StageCards`, page professionnels, éléments de liste des cartes « À lire aussi » de `RelatedLinks`) ; le mot long se coupe dans sa boîte (`overflow-wrap: break-word` du `body`) au lieu d'élargir la page.
- RGAA 6.1 (relevé à l'arbre d'accessibilité) : `LocalFactsGrid`, les liens « Site officiel » (jusqu'à treize par page locale) portent désormais le nom du lieu dans leur nom accessible (« Site officiel : CCAS de Puteaux (lien externe) »).
- RGAA 11.1 (relevé à l'arbre d'accessibilité) : `FieldShell`, un espace réel sépare l'étiquette de la mention « (facultatif) » (le nom se lisait « …rappelé(e) ?(facultatif) »).

### 7.3 Arbre d'accessibilité (à défaut de lecteur d'écran)

Relu sur trois gabarits avec l'instantané ARIA de Playwright (`ariaSnapshot`), plus l'en-tête et le pied de page.

- Formulaire personne âgée, étape 1 en erreur : `main` › région « Décrire votre situation : aide à domicile d'une personne âgée » (fil d'Ariane, H1, chapô) › région « Personne âgée » › `form` « Pour qui cherchez-vous de l'aide ? » : paragraphe et `progressbar` « Étape 1 sur 5 », `alert` avec la liste des erreurs (lien vers le groupe), H2 de l'étape, `radiogroup` « Pour qui ? » marqué `invalid` avec le message d'erreur, boutons « Retour » (désactivé) et « Continuer », phrase de conservation. Rien de douteux ; ordre de lecture conforme à l'écran.
- Page locale Puteaux : région d'en-tête nommée par le sur-titre « Hauts-de-Seine » (le H1 « Aide à domicile à Puteaux (92800) » serait un meilleur nom : à revoir avec le chantier des gabarits locaux), régions par bloc, sous-régions par type de ressource, `complementary` « Nous joindre » (rail), `form` du rappel. Noms douteux : treize liens identiques « Site officiel (lien externe) » (corrigé, voir 7.2) ; « Quand préférez-vous être rappelé(e) ?(facultatif) » (corrigé) ; deux liens « Combien ? » vers deux pages d'aide différentes (cartes APA et PCH : le nom de l'aide est dans la carte, pas dans le lien ; à surveiller).
- Article « Prévenir les chutes » : région du titre, région « L'essentiel », `navigation` « Sommaire », H2 du corps hors région (voulu), région « Et concrètement, demain ? », `complementary` nommé par le titre de l'encart, régions « Sources », « À lire ensuite », « Partager cet article » (deux boutons, zone `status` vide pour la copie du lien). Rien de douteux.
- En-tête : « Aller au contenu », « Youdom Care, accueil », `navigation` « Navigation principale » (boutons « Pour qui ? », « Nos services » affiché « Services », liens), « Confort de lecture », « Appeler le 01 84 80 17 03 », « Être rappelé(e) ». Les noms accessibles contiennent le texte visible (WCAG 2.5.3).
- Pied de page : `contentinfo`, région « Nous joindre », navigations « Pour qui ? », « Nos services », « Territoires », « Nos agences », « Youdom Care », « Pied de page ». Libellé à revoir côté contenu : « Aide à domicile en Paris » (`pied_de_page.aide_a_domicile_en` avec le nom du département), signalé à la relecture de voix, hors périmètre de ce chantier.

### 7.4 Décompte et restes

Critères ajoutés au décompte, vérifiés à l'occasion de ce passage : 10.9 (information par la forme ou la position : états portés par `aria-pressed`, `aria-current`, texte) C ; 11.3 (étiquettes cohérentes d'un formulaire à l'autre : « Votre prénom », « Votre nom », « Votre téléphone », « Votre commune ou votre code postal ») C ; 12.3 (plan du site pertinent : toutes les pages construites, vérifié par `maillage.spec.ts`) C ; 12.4 (plan du site atteignable de chaque page par le pied de page) C ; 11.12 (données financières ou juridiques) NA ; 12.5 (moteur de recherche) NA ; 13.2 (ouverture de fenêtre sans action : aucune) NA ; 13.12 (mouvement de l'appareil) NA. Décompte : 60 critères testés, 50 conformes, 2 non conformes (corrigés), 8 non applicables. L'état retenu reste « non conforme » faute d'audit complet.

Restes :

- R-5 (PDF des outils, RGAA 13.3) et R-6 (lecteur d'écran réel : NVDA + Firefox, VoiceOver + Safari) : inchangés, prévus avec l'audit complet.
- Nom de la région d'en-tête des pages locales (sur-titre plutôt que H1) ; liens « Combien ? » des cartes d'aides ; libellé « Aide à domicile en Paris » du pied de page.
- Gabarits non construits, donc non audités : fiche d'auteur du magazine, offre d'emploi.
