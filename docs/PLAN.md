# PLAN — Phases, tâches, points de validation

Légende : `[ ]` à faire · `[x]` fait (ajouter le hash court) · `[~]` bloqué (ajouter le numéro de question). Une itération de loop = une tâche. Chaque tâche indique ses **références**, ses **critères** et ses **contrôles** propres ; les contrôles communs (`pnpm lint && pnpm typecheck && pnpm test && pnpm validate`) s'appliquent toujours.

Les contrôles de `pnpm validate` s'activent au fil des phases : chaque script est ajouté par la tâche qui l'introduit et inscrit dans `scripts/validate/config.ts`. Un contrôle activé n'est plus jamais désactivé.

---

## Phase 0 — Amorçage · branche `phase/00-amorcage`

- [x] (456c81a) **P0.1 Initialiser le projet.** `create-next-app` (dernière version stable, TypeScript, App Router, dossier `src`, pnpm). Réf. `CLAUDE.md`, `docs/00 §6`. Critères : `pnpm dev` et `pnpm build` fonctionnent ; versions consignées dans `docs/DECISIONS.md` ; fichiers du kit conservés intacts. Commit : `build: initialisation Next.js`.
- [x] (ebf37b6) **P0.2 Outillage qualité.** ESLint strict, Prettier, Husky, lint-staged, commitlint (types de `.claude/loop.md`), scripts `lint`, `typecheck`. Critères : un commit mal formé est refusé.
- [x] (595ef18) **P0.3 Styles et polices.** Tailwind CSS v4, `src/styles/tokens.css` avec tous les jetons de `docs/02 §2–4`, polices Fraunces et Atkinson Hyperlegible Next via `next/font` (repli documenté si indisponible). Critères : une page de test affiche les deux polices et les couleurs.
- [x] (77410a9) **P0.4 Tests.** Vitest + Testing Library, Playwright + axe, un test de fumée de chaque type. Scripts `test`, `test:e2e`.
- [x] (382e922) **P0.5 Contenu et schémas.** `src/content/schemas.ts` (Zod) pour `site.config.json`, `tarifs.json`, `engagements.json`, `interface.json` ; chargeur typé ; `content/interface.json` créé depuis `docs/01 §6–7`. Critères : un champ invalide fait échouer le build.
- [x] (12abeba) **P0.6 Contrôles.** `scripts/validate/` avec `config.ts`, `check-content.ts`, `check-placeholders.ts`, commande `pnpm validate` (+ option `--prod` selon `docs/07 §7`). Tests unitaires des contrôles.
- [x] (d452478) **P0.7 Intégration continue.** GitHub Actions : lint, typecheck, test, build, validate sur chaque PR. `.env.example` selon `docs/00 §6`.
- [x] (c792334) **P0.8 Configuration Next.** `trailingSlash`, en-têtes de sécurité de `docs/07 §6`, `robots` en noindex global tant que la phase 9 n'est pas finie (variable `SITE_INDEXABLE=false`).

**Point de validation 0** : CI verte sur la PR ; `pnpm build` sans avertissement ; `docs/DECISIONS.md` liste la pile et les versions.

## Phase 1 — Design system « Le Fil » · `phase/01-design-system`

- [x] (f3d8666) **P1.1 Jetons et contrastes.** `check-contrast.ts` avec la table des couples autorisés de `docs/02 §2`. Critères : toutes les valeurs du cahier sont retrouvées par le calcul (tolérance 0,05).
- [x] (02bfaf9) **P1.2 Texte.** Composants `Heading`, `Lead`, `Prose` (longueur de ligne, échelle de `docs/02 §3`), styles d'impression de base.
- [x] (5b7ab26) **P1.3a Primitives : actions et blocs.** `Button` (principal framboise, secondaire, contour, lien ; états repos, survol, focus, actif, désactivé ; cible 48 px, 56 px pour le principal ; rendu `a` ou `button`), `Card` (fond blanc, bordure `line`, rayon 20 px, `shadow-1`, survol `shadow-2` −2 px), `Badge`, `Callout` (4 variantes « À retenir », « Bon à savoir », « Attention », « Ce que nous ne faisons pas », rôle `note`, icône au fil). Réf. `docs/02 §4, §7`, `docs/01 §6`. Critères : chaque composant a son test ; un seul bouton framboise par écran reste une règle d'usage rappelée dans la documentation du composant ; axe vert sur `/styleguide/`. (Découpage de P1.3, 2026-09-20.)
- [x] (d253cf8) **P1.3b Primitives : champs de formulaire.** `TextField`, `Textarea`, `Select`, `CheckboxGroup`, `RadioCards` avec étiquette visible, aide, erreur sous le champ liée par `aria-describedby`, `aria-invalid`, états désactivé et erreur, bordure `field-border`, rayon 10 px, cible 48 px, groupes en `fieldset`/`legend`. Réf. `docs/02 §4, §7`, `docs/05 §4–6`, `docs/01 §7`. Critères : chaque champ a son test (étiquette associée, erreur annoncée) ; navigation clavier vérifiée ; axe vert sur `/styleguide/`. (Découpage de P1.3, 2026-09-20.)
- [x] (5ea327e) **P1.4 Le fil.** Composant `Thread` (tracé SVG animé au défilement, respect de `prefers-reduced-motion`) et six premières illustrations au fil : maison, mains, tasse, lune, cartable, carnet. Réf. `docs/02 §1`.
- [x] (01565c3) **P1.5 En-tête.** `Header` collant, méga-menus accessibles, lien d'évitement, téléphone depuis la configuration.
- [x] (bd4a2ed) **P1.6 Pied de page et barre mobile.** `Footer` (coordonnées, agences, labels s'ils existent) et `MobileActionBar`.
- [x] (13b6f46) **P1.7 Mode confort de lecture.** `ComfortToggle`, mémorisation locale, effets de `docs/02 §2`.
- [x] (8c07850) **P1.8 Semaine type (lecture).** `WeekPlanner` variante `display` : tableau réel, légende, mention « Exemple illustratif », version mobile.
- [x] (a4935cd) **P1.9a Blocs de contenu : parcours et navigation.** `StepsTimeline` (liste ordonnée sémantique, étapes numérotées reliées par le fil vertical), `FollowUpTimeline` (jalons de `engagements.json > suivi`, un jalon sans texte est masqué), `FAQ` (`details`/`summary` natifs, une question par bloc, sans JavaScript), `Breadcrumb` (`nav aria-label`, liste ordonnée, page courante `aria-current`, balisage `BreadcrumbList` prévu en P5.2). Réf. `docs/02 §7`, `docs/00 §5`. Critères : chaque composant a son test ; axe vert sur `/styleguide/`. (Découpage de P1.9, 2026-09-20.)
- [x] (b7e8f27) **P1.9b Blocs de contenu : prix, aides, situations.** `PriceCard` (hiérarchie de `docs/07 §1` : prix TTC en grand, mode d'intervention, montant après crédit d'impôt plus petit, exemple mensuel ; se masque si le tarif est `null` ; `MandataireNotice` réservé à P2.5), `AidCard` (pour qui, combien, comment la demander, lien officiel signalé comme externe), `SituationCard` (citation en Fraunces, une phrase, lien fléché, toute la carte cliquable avec un seul lien pour le lecteur d'écran, pastille au fil), `StageCards` (trois cartes reliées par le fil : début · évolution · stade avancé, ordre linéaire sur mobile). Réf. `docs/02 §7`, `docs/07 §1`, `docs/01 §4 bloc 2`. Critères : chaque composant a son test ; aucun prix affiché sans `prix_ttc`, `prix_ht`, `unite` et mode ; axe vert sur `/styleguide/`. (Découpage de P1.9, 2026-09-20.)
- [x] (08f3822) **P1.10 Guide de styles.** Page `/styleguide/` (noindex) qui montre tout ; tests axe ; capture à 320 px sans débordement.

**Point de validation 1** : 0 violation axe sérieuse sur `/styleguide/` ; parcours clavier complet de l'en-tête ; `check-contrast` vert.

## Phase 2 — Accueil et pages de fonctionnement · `phase/02-accueil`

- [x] (87078d1) **P2.1 Accueil, blocs 1 à 4.** Textes exacts de `docs/01 §4`. Engagements lus dans `engagements.json`.
- [x] (cb5ceb6) **P2.2 Accueil, blocs 5 à 8.** Trois semaines types en onglets accessibles ; bloc prix masqué si tarifs vides.
- [x] (e84a52c) **P2.3 Accueil, blocs 9 à 12 et recherche de commune.** Script `scripts/data/fetch-communes.ts` (API Découpage administratif) → `data/idf-communes.json` ; `TerritorySearch` avec agence la plus proche. Réf. `docs/04 §5`.
- [x] (59aa0ae) **P2.4 « Comment ça marche ».** Réf. `docs/03 §9`, `docs/01 §4 bloc 6`.
- [x] (1f334e4) **P2.5 « Prestataire ou mandataire ».** Tableau comparatif, composant `MandataireNotice`. Réf. `docs/07 §1`.
- [x] (f737dee) **P2.6 « Tarifs et aides ».** Tableau des prestations depuis `tarifs.json`, exemples mensuels calculés (`src/lib/pricing`), cartes d'aides. Tests unitaires des calculs.
- [x] (554f350) **P2.7 Pages par aide (1/2).** Crédit d'impôt et avance immédiate, APA, PCH. Montants et conditions repris de sources officielles ouvertes pendant la tâche, avec année.
- [x] (6a6ab0a) **P2.8 Pages par aide (2/2).** AEEH, CESU, aides après hospitalisation.
- [x] (963f8b2) **P2.9 « À propos ».** Manifeste, engagements, charte éditoriale ; blocs équipe et histoire masqués sans contenu fourni.

**Point de validation 2** : `pnpm lhci` sur l'accueil dans les budgets de `docs/07 §5` ; aucun texte hors voix (`check-copy.ts` ajouté ici). — Fait le 2026-09-20 : `check-copy` vert, `pnpm lhci` vert sur 10 budgets sur 11 (bonnes pratiques 0,96 : 404 des routes de la phase 3, à revérifier au point 3), voir JOURNAL et D-019.

## Phase 3 — Formulaires · `phase/03-formulaires`

- [x] (6d52392) **P3.1 Schéma de demande.** `LeadPayload` en Zod, types, tests. Réf. `docs/05 §7`.
- [x] (3fa3a63) **P3.2 Grille de planning (saisie).** Rythme, grille 7 × 6, raccourcis, résumé `aria-live`, estimation d'heures. Réf. `docs/05 §4`.
- [x] (5c20a13) **P3.3a Planning avancé (1/2).** Horaires précis (plages passant minuit, copie de jour), question sur la nuit, date de début, estimation de budget si tarifs. Découpage de P3.3 le 2026-09-20.
- [x] (eb0f091) **P3.3b Planning avancé (2/2).** Dates ponctuelles (dates ou période, créneaux communs), présence 24h/24 (tous les jours ou jours choisis, date de début, durée envisagée), grille remplie d’office et modifiable.
- [x] (b7c7c33) **P3.4 Coque multi-étapes.** Progression, retour, conservation locale, résumé d'erreurs, page `/merci/…`.
- [x] (816c6f8) **P3.5 Formulaire de rappel** et branchement de l'en-tête et de la barre mobile.
- [x] (dd5e18a) **P3.6 Formulaires `neuro` et `personne-agee`.** Réf. `docs/05 §5`.
- [x] (e52a4ca) **P3.7 Formulaires `adulte-handicap` et `enfant-handicap`.**
- [x] (75270b0) **P3.8a Formulaires `aidant` et `nuit-24h`** sur la fabrique des formulaires détaillés (grille préréglée sur les nuits). Découpage de P3.8 le 2026-09-20.
- [x] (61628a5) **P3.8b Formulaires `sortie-hospitalisation` (quatre écrans, bandeau moins de 48 h), `professionnel` (aucune donnée nominative de la personne) et `contact`.**
- [x] (e4964e0) **P3.9 Route `api/lead`.** Validation serveur, anti-robots, e-mail à l'équipe (planning en tableau, JSON repliable), accusé de réception sans donnée de santé, webhook optionnel signé, aucune journalisation de contenu. Tests avec un serveur SMTP simulé.
- [x] (d93809c) **P3.10 Parcours de bout en bout.** Playwright : chaque formulaire au clavier, axe à chaque étape, cas hors Île-de-France, panne d'envoi.

**Point de validation 3** : tous les parcours verts ; vérification manuelle qu'aucune donnée de santé n'apparaît dans les URL, l'objet des e-mails, l'accusé de réception et les journaux. — Fait le 2026-09-20 : parcours verts (134), vérification manuelle consignée au JOURNAL (URL, objets, accusé, journaux), `pnpm lhci` vert sur l’accueil et le rappel (D-022), audit : dette DC.2.

## Phase 4 — Pages services, cas par cas · `phase/04-services`

- [x] (f840290) **P4.1 Gabarit 13 sections** et schéma MDX. Réf. `docs/03 §2`.
- [x] (aa61790) **P4.2 Pilier « Maladies neurodégénératives ».**
- [x] (37a3941) **P4.3 Alzheimer et maladies apparentées.**
- [x] (a151199) **P4.4 Maladie de Parkinson.**
- [x] (bea1629) **P4.5 Sclérose en plaques.**
- [x] (1a18d23) **P4.6 Maladie à corps de Lewy · dégénérescence fronto-temporale.**
- [x] (837b4b2) **P4.7 Maladie de Charcot (SLA) · maladie de Huntington.**
- [x] (3165b2a) **P4.8 Pilier « Personnes âgées ».**
- [x] (440b527) **P4.9 Sous-pages personnes âgées** (autonomie, vie quotidienne, compagnie et stimulation).
- [x] (506511f) **P4.10 Pilier « Adultes en situation de handicap ».**
- [x] (652d4cc) **P4.11 Pilier « Enfants en situation de handicap ».**
- [x] (0bf2ecc) **P4.12 Autisme (TSA) · polyhandicap.**
- [x] (5dd5f38) **P4.13 Handicap moteur · déficience intellectuelle.**
- [x] (f70e7b2) **P4.14 Espace Aidants**, solutions de répit, « Où en êtes-vous ? » (aucune donnée conservée).
- [x] (a3ce539) **P4.15 Garde de nuit · présence 24h/24 · sortie d'hospitalisation.**
- [x] (363e609) **P4.16 Garde-malade · accompagnement en vacances · remplacement d'auxiliaire de vie.**

Critères communs : 13 sections présentes ; sources ouvertes avec succès et datées ; semaine type illustrée ; encart « Ce que nous ne faisons pas » ; formulaire du cas intégré ; pages pathologie en `statut: a_relire` ; maillage de `docs/03 §2` respecté.

**Point de validation 4** : `check-copy`, `check-links` verts ; relecture croisée par un sous-agent de trois pages tirées au hasard contre `docs/01 §2` et `docs/03 §1` ; liste des relectures professionnelles attendues ajoutée à `docs/QUESTIONS_ARCEL.md`. — Fait le 2026-09-20 : `check-links` créé (ef41925, D-023) et vert avec deux avertissements Urssaf (sites qui bloquent les robots, vérifiés dans un navigateur) ; relecture croisée de polyhandicap, sortie d'hospitalisation et handicap moteur, corrections appliquées (4568dc7) ; Q-CONTENU-7 (relectures attendues) et Q-CONTENU-8 (phrases longues) ajoutées (47ecf65).

## Phase 4b — Expérience visuelle « waouh » (D-024) · `phase/04b-experience`

Demande d'Arcel du 2026-09-20 : heros personnalisés, images libres de droit partout, animations et 3D légère, icônes représentatives, pages piliers vivantes, conversion. Brief : `docs/design/BRIEF_EXPERIENCE.md`. Non négociables inchangés (vérité, santé, accessibilité, budgets D-019, le Fil).

- [x] (3fdcd91) **P4b.1 Concept et spécification** (`docs/design/CONCEPT.md`) : diagnostic, concept, accueil bloc par bloc, heros par public, gabarit service, mouvement, conversion, lots de mise en œuvre.
- [ ] **P4b.2 Jeu d'icônes au fil** (`src/components/ui/Icon/`, styleguide, tests, `docs/design/ICONES.md`).
- [x] (838e117) **P4b.3 Photothèque libre de droit** (`public/images/`, `CREDITS.md`, `docs/design/PHOTOS.md`) : sources, licences, textes alternatifs, interdits de docs/02 §6 respectés.
- [x] (838e117) **P4b.4 Infrastructure de mouvement et 3D** (`src/components/motion/`, `src/lib/motion/`, `motion.css`, styleguide, tests, `docs/design/MOUVEMENT.md`) : reduced-motion et mode confort, budget mesuré.
- [ ] **P4b.5 Heros personnalisés** : accueil et cinq piliers (photo, titre, geste d'entrée, profondeur), variantes mobile, `priority` sur l'image, LCP mesuré.
- [ ] **P4b.6 Accueil réinventé** : parcours « Pour qui cherchez-vous de l'aide ? », blocs illustrés et animés, appels à l'action, barre mobile.
- [ ] **P4b.7 Piliers et gabarit service enrichis** : photos par section, icônes par service et rubrique, semaine type illustrée, cartes inclinables, révélations au défilement, sous-pages en cartes visuelles.
- [ ] **P4b.8 Point de validation 4b** : axe et clavier sur chaque page enrichie, `pnpm validate` (check-copy, check-links, placeholders), Lighthouse CI étendu à un pilier et une page service (budgets D-019), reduced-motion vérifié en e2e, crédits photos complets, relecture croisée d'un sous-agent sur le rendu (voix docs/01, vérité).

Fin de phase 4b : `pnpm audit`, fusion locale squash dans `main`, étiquette `phase-04b`.

## Phase 5 — SEO technique · `phase/05-seo`

- [ ] **P5.1 Métadonnées.** Assistants de titres, descriptions, canoniques ; `check-seo.ts`. Réf. `docs/04 §2`.
- [ ] **P5.2 Données structurées.** `src/lib/jsonld/` pour tous les types du tableau ; `check-schema.ts` ; aucun type interdit.
- [ ] **P5.3 Plans de site segmentés, `robots.txt`, script IndexNow.**
- [ ] **P5.4 Images Open Graph générées.**
- [ ] **P5.5 Maillage.** Blocs « À lire aussi », plan du site, page 404 utile, détection des pages orphelines.
- [ ] **P5.6 `llms.txt`, balises de vérification, configuration Lighthouse CI des pages témoins.**

**Point de validation 5** : `check-seo`, `check-schema`, `check-links` verts sur tout le site ; Lighthouse SEO à 100 sur les pages témoins.

## Phase 6 — Référencement local, vague 1 · `phase/06-local`

- [ ] **P6.1 Données : territoires.** Communes, arrondissements, quartiers ; contrôle croisé avec `data/territoires.seed.json`. Réf. `docs/04 §5`.
- [ ] **P6.2 Données : ressources.** Points d'information locaux, accueils de jour, annuaire de l'administration (CCAS, MDPH, départements), hôpitaux. Chaque fait avec source et date.
- [ ] **P6.3 Données : démographie, agences géocodées, distances, communes voisines, sélection de la vague 1** (règle de `docs/04 §4`).
- [ ] **P6.4 Schéma `LocalData` et contrôles locaux** (`check-local-facts`, `check-local-uniqueness`, `check-local-nap`), avec tests sur des pages factices trop proches.
- [ ] **P6.5 Gabarit de page locale**, `LocalFactsGrid`, page `/aide-a-domicile/` avec carte d'Île-de-France accessible (liste équivalente).
- [ ] **P6.6 Pages des six agences.**
- [ ] **P6.7 Paris : pilier.**
- [ ] **P6.8 Paris : arrondissements 1 à 5.**
- [ ] **P6.9 Paris : arrondissements 6 à 10.**
- [ ] **P6.10 Paris : arrondissements 11 à 15.**
- [ ] **P6.11 Paris : arrondissements 16 à 20.**
- [ ] **P6.12 Départements : Hauts-de-Seine, Seine-Saint-Denis, Val-de-Marne.**
- [ ] **P6.13 Départements : Seine-et-Marne, Yvelines, Essonne, Val-d'Oise.**
- [ ] **P6.14 Communes des agences** : Puteaux, Saint-Denis, Vitry-sur-Seine, Serris, Versailles.
- [ ] **P6.15 Communes de la vague 1 : Hauts-de-Seine.**
- [ ] **P6.16 Communes de la vague 1 : Seine-Saint-Denis.**
- [ ] **P6.17 Communes de la vague 1 : Val-de-Marne.**
- [ ] **P6.18 Communes de la vague 1 : Yvelines et Essonne.**
- [ ] **P6.19 Communes de la vague 1 : Seine-et-Marne et Val-d'Oise.**

Critères communs : anatomie de `docs/04 §4` ; zone éditoriale écrite pour la page à partir de ses faits ; seuils bloquants respectés ; une page sous les seuils n'est pas créée et le motif est consigné au journal.

**Point de validation 6** : 100 % des pages locales passent les trois contrôles ; tirage de cinq pages relues par un sous-agent avec une seule question : « cette page apprend-elle quelque chose de propre à ce territoire ? ».

## Phase 7 — Magazine et lexique · `phase/07-magazine`

- [ ] **P7.1 Gabarit d'article, rubriques, pagination, fiche auteur.** Réf. `docs/06 §2–4`.
- [ ] **P7.2 Lexique : gabarit et 20 premiers termes.**
- [ ] **P7.3 Articles ★ n° 1, 2, 3.**
- [ ] **P7.4 Articles ★ n° 7, 9, 12.**
- [ ] **P7.5 Articles ★ n° 14, 16, 21.**
- [ ] **P7.6 Articles ★ n° 22, 26, 27, 29.**
- [ ] **P7.7 Outils à imprimer** (cinq documents, PDF balisés) et feuilles d'impression.

**Point de validation 7** : chaque article a ses sources vérifiées, son « essentiel », ses trois actions, un seul encart d'appel ; tous en `statut: a_relire`.

## Phase 8 — Professionnels, recrutement, légal, mesure · `phase/08-complements`

- [ ] **P8.1 Page « Professionnels »** et formulaire express.
- [ ] **P8.2 Recrutement** : page, offres en JSON, `JobPosting`, candidature avec pièce jointe.
- [ ] **P8.3 Pages légales** générées depuis la configuration ; `check-legal.ts`. Réf. `docs/07 §1–2`.
- [ ] **P8.4 Déclaration d'accessibilité** et audit clavier manuel consigné.
- [ ] **P8.5 Mesure d'audience** et événements de `docs/05 §9`, sans donnée personnelle ; logique de consentement si nécessaire.

## Phase 9 — Qualité finale · `phase/09-qualite`

- [ ] **P9.1 Performance** : budgets tenus sur toutes les pages témoins.
- [ ] **P9.2 Accessibilité** : axe sur tous les gabarits, corrections.
- [ ] **P9.3 Relecture de voix** : tout le site contre `docs/01 §2` ; boutons conformes à la bibliothèque.
- [ ] **P9.4 Exploration interne** : liens, orphelines, profondeur de clic (toute page à 3 clics au plus de l'accueil), plans de site.
- [ ] **P9.5 Bilan de lancement** : résultat de `pnpm validate --prod` (les échecs attendus deviennent la liste d'actions d'Arcel), `docs/SUIVI_SEO.md`, mise à jour de `docs/QUESTIONS_ARCEL.md`. `SITE_INDEXABLE` reste à `false` : c'est Arcel qui ouvre l'indexation.

**Point de validation 9** : `pnpm validate` vert, `pnpm lhci` vert, `git status` propre, PR fusionnée, tag `phase-09`. La loop rédige son bilan et s'arrête.

## Phase 10 — Croissance (bloquée jusqu'à la mise en ligne : question Q-LANCEMENT) · `phase/10-croissance`

- [~] (Q-LANCEMENT) **P10.1 Quartiers de Paris éligibles**, par lots de quatre arrondissements (cinq tâches à créer).
- [~] (Q-LANCEMENT) **P10.2 Communes de plus de 20 000 habitants** non couvertes, par département.
- [~] (Q-LANCEMENT) **P10.3 Pages « pathologie × département »** pour Alzheimer et Parkinson.
- [~] (Q-LANCEMENT) **P10.4 Articles n° 4 à 36 restants**, trois par tâche.
- [~] (Q-LANCEMENT) **P10.5 Lexique : termes restants.**
- [~] (Q-LANCEMENT) **P10.6 Illustrations au fil restantes** et remplacement progressif par les photos réelles fournies.

## Dette et corrections

(La loop ajoute ici les anomalies découvertes en cours de route, avec la phase concernée.)

- [~] (Q-TECH-3) **DC.1 Publier le dépôt.** Créer le dépôt GitHub, ajouter le remote, pousser `main`, les tags `phase-NN` et les branches `phase/*`, ouvrir a posteriori les PR de phase, vérifier que la CI de `.github/workflows/ci.yml` est verte, relier Vercel (prévisualisations). Réf. D-014.
- [ ] **DC.2 Dépendances transitives de `@lhci/cli`.** `pnpm audit` (2026-09-20) signale cinq vulnérabilités, toutes dans l’outillage de développement (`tmp` via inquirer, `extract-zip` via puppeteer-core, `uuid`) : aucune n’est exécutée par le site. Les `overrides` posés par `pnpm audit --fix=override` dans `pnpm-workspace.yaml` sont restés sans effet (pnpm 11.0.8 répond « Already up to date », deux tentatives). À reprendre à la prochaine version de `@lhci/cli` ou avec des `overrides` vérifiés.
