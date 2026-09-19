# PLAN — Phases, tâches, points de validation

Légende : `[ ]` à faire · `[x]` fait (ajouter le hash court) · `[~]` bloqué (ajouter le numéro de question). Une itération de loop = une tâche. Chaque tâche indique ses **références**, ses **critères** et ses **contrôles** propres ; les contrôles communs (`pnpm lint && pnpm typecheck && pnpm test && pnpm validate`) s'appliquent toujours.

Les contrôles de `pnpm validate` s'activent au fil des phases : chaque script est ajouté par la tâche qui l'introduit et inscrit dans `scripts/validate/config.ts`. Un contrôle activé n'est plus jamais désactivé.

---

## Phase 0 — Amorçage · branche `phase/00-amorcage`

- [ ] **P0.1 Initialiser le projet.** `create-next-app` (dernière version stable, TypeScript, App Router, dossier `src`, pnpm). Réf. `CLAUDE.md`, `docs/00 §6`. Critères : `pnpm dev` et `pnpm build` fonctionnent ; versions consignées dans `docs/DECISIONS.md` ; fichiers du kit conservés intacts. Commit : `build: initialisation Next.js`.
- [ ] **P0.2 Outillage qualité.** ESLint strict, Prettier, Husky, lint-staged, commitlint (types de `.claude/loop.md`), scripts `lint`, `typecheck`. Critères : un commit mal formé est refusé.
- [ ] **P0.3 Styles et polices.** Tailwind CSS v4, `src/styles/tokens.css` avec tous les jetons de `docs/02 §2–4`, polices Fraunces et Atkinson Hyperlegible Next via `next/font` (repli documenté si indisponible). Critères : une page de test affiche les deux polices et les couleurs.
- [ ] **P0.4 Tests.** Vitest + Testing Library, Playwright + axe, un test de fumée de chaque type. Scripts `test`, `test:e2e`.
- [ ] **P0.5 Contenu et schémas.** `src/content/schemas.ts` (Zod) pour `site.config.json`, `tarifs.json`, `engagements.json`, `interface.json` ; chargeur typé ; `content/interface.json` créé depuis `docs/01 §6–7`. Critères : un champ invalide fait échouer le build.
- [ ] **P0.6 Contrôles.** `scripts/validate/` avec `config.ts`, `check-content.ts`, `check-placeholders.ts`, commande `pnpm validate` (+ option `--prod` selon `docs/07 §7`). Tests unitaires des contrôles.
- [ ] **P0.7 Intégration continue.** GitHub Actions : lint, typecheck, test, build, validate sur chaque PR. `.env.example` selon `docs/00 §6`.
- [ ] **P0.8 Configuration Next.** `trailingSlash`, en-têtes de sécurité de `docs/07 §6`, `robots` en noindex global tant que la phase 9 n'est pas finie (variable `SITE_INDEXABLE=false`).

**Point de validation 0** : CI verte sur la PR ; `pnpm build` sans avertissement ; `docs/DECISIONS.md` liste la pile et les versions.

## Phase 1 — Design system « Le Fil » · `phase/01-design-system`

- [ ] **P1.1 Jetons et contrastes.** `check-contrast.ts` avec la table des couples autorisés de `docs/02 §2`. Critères : toutes les valeurs du cahier sont retrouvées par le calcul (tolérance 0,05).
- [ ] **P1.2 Texte.** Composants `Heading`, `Lead`, `Prose` (longueur de ligne, échelle de `docs/02 §3`), styles d'impression de base.
- [ ] **P1.3 Primitives.** `Button` (principal framboise, secondaire, contour, lien), `Card`, `Badge`, `Callout` (4 variantes), champs de formulaire (`TextField`, `CheckboxGroup`, `RadioCards`, `Select`, `Textarea`) avec états et erreurs accessibles.
- [ ] **P1.4 Le fil.** Composant `Thread` (tracé SVG animé au défilement, respect de `prefers-reduced-motion`) et six premières illustrations au fil : maison, mains, tasse, lune, cartable, carnet. Réf. `docs/02 §1`.
- [ ] **P1.5 En-tête.** `Header` collant, méga-menus accessibles, lien d'évitement, téléphone depuis la configuration.
- [ ] **P1.6 Pied de page et barre mobile.** `Footer` (coordonnées, agences, labels s'ils existent) et `MobileActionBar`.
- [ ] **P1.7 Mode confort de lecture.** `ComfortToggle`, mémorisation locale, effets de `docs/02 §2`.
- [ ] **P1.8 Semaine type (lecture).** `WeekPlanner` variante `display` : tableau réel, légende, mention « Exemple illustratif », version mobile.
- [ ] **P1.9 Blocs de contenu.** `StepsTimeline`, `FollowUpTimeline`, `PriceCard` (hiérarchie de `docs/07 §1`, masquage si tarif vide), `AidCard`, `FAQ`, `Breadcrumb`, `SituationCard`, `StageCards`.
- [ ] **P1.10 Guide de styles.** Page `/styleguide/` (noindex) qui montre tout ; tests axe ; capture à 320 px sans débordement.

**Point de validation 1** : 0 violation axe sérieuse sur `/styleguide/` ; parcours clavier complet de l'en-tête ; `check-contrast` vert.

## Phase 2 — Accueil et pages de fonctionnement · `phase/02-accueil`

- [ ] **P2.1 Accueil, blocs 1 à 4.** Textes exacts de `docs/01 §4`. Engagements lus dans `engagements.json`.
- [ ] **P2.2 Accueil, blocs 5 à 8.** Trois semaines types en onglets accessibles ; bloc prix masqué si tarifs vides.
- [ ] **P2.3 Accueil, blocs 9 à 12 et recherche de commune.** Script `scripts/data/fetch-communes.ts` (API Découpage administratif) → `data/idf-communes.json` ; `TerritorySearch` avec agence la plus proche. Réf. `docs/04 §5`.
- [ ] **P2.4 « Comment ça marche ».** Réf. `docs/03 §9`, `docs/01 §4 bloc 6`.
- [ ] **P2.5 « Prestataire ou mandataire ».** Tableau comparatif, composant `MandataireNotice`. Réf. `docs/07 §1`.
- [ ] **P2.6 « Tarifs et aides ».** Tableau des prestations depuis `tarifs.json`, exemples mensuels calculés (`src/lib/pricing`), cartes d'aides. Tests unitaires des calculs.
- [ ] **P2.7 Pages par aide (1/2).** Crédit d'impôt et avance immédiate, APA, PCH. Montants et conditions repris de sources officielles ouvertes pendant la tâche, avec année.
- [ ] **P2.8 Pages par aide (2/2).** AEEH, CESU, aides après hospitalisation.
- [ ] **P2.9 « À propos ».** Manifeste, engagements, charte éditoriale ; blocs équipe et histoire masqués sans contenu fourni.

**Point de validation 2** : `pnpm lhci` sur l'accueil dans les budgets de `docs/07 §5` ; aucun texte hors voix (`check-copy.ts` ajouté ici).

## Phase 3 — Formulaires · `phase/03-formulaires`

- [ ] **P3.1 Schéma de demande.** `LeadPayload` en Zod, types, tests. Réf. `docs/05 §7`.
- [ ] **P3.2 Grille de planning (saisie).** Rythme, grille 7 × 6, raccourcis, résumé `aria-live`, estimation d'heures. Réf. `docs/05 §4`.
- [ ] **P3.3 Planning avancé.** Horaires précis (plages passant minuit, copie de jour), dates ponctuelles, 24h/24, question sur la nuit, estimation de budget si tarifs.
- [ ] **P3.4 Coque multi-étapes.** Progression, retour, conservation locale, résumé d'erreurs, page `/merci/…`.
- [ ] **P3.5 Formulaire de rappel** et branchement de l'en-tête et de la barre mobile.
- [ ] **P3.6 Formulaires `neuro` et `personne-agee`.** Réf. `docs/05 §5`.
- [ ] **P3.7 Formulaires `adulte-handicap` et `enfant-handicap`.**
- [ ] **P3.8 Formulaires `aidant`, `sortie-hospitalisation`, `nuit-24h`, `professionnel`, `contact`.**
- [ ] **P3.9 Route `api/lead`.** Validation serveur, anti-robots, e-mail à l'équipe (planning en tableau, JSON repliable), accusé de réception sans donnée de santé, webhook optionnel signé, aucune journalisation de contenu. Tests avec un serveur SMTP simulé.
- [ ] **P3.10 Parcours de bout en bout.** Playwright : chaque formulaire au clavier, axe à chaque étape, cas hors Île-de-France, panne d'envoi.

**Point de validation 3** : tous les parcours verts ; vérification manuelle qu'aucune donnée de santé n'apparaît dans les URL, l'objet des e-mails, l'accusé de réception et les journaux.

## Phase 4 — Pages services, cas par cas · `phase/04-services`

- [ ] **P4.1 Gabarit 13 sections** et schéma MDX. Réf. `docs/03 §2`.
- [ ] **P4.2 Pilier « Maladies neurodégénératives ».**
- [ ] **P4.3 Alzheimer et maladies apparentées.**
- [ ] **P4.4 Maladie de Parkinson.**
- [ ] **P4.5 Sclérose en plaques.**
- [ ] **P4.6 Maladie à corps de Lewy · dégénérescence fronto-temporale.**
- [ ] **P4.7 Maladie de Charcot (SLA) · maladie de Huntington.**
- [ ] **P4.8 Pilier « Personnes âgées ».**
- [ ] **P4.9 Sous-pages personnes âgées** (autonomie, vie quotidienne, compagnie et stimulation).
- [ ] **P4.10 Pilier « Adultes en situation de handicap ».**
- [ ] **P4.11 Pilier « Enfants en situation de handicap ».**
- [ ] **P4.12 Autisme (TSA) · polyhandicap.**
- [ ] **P4.13 Handicap moteur · déficience intellectuelle.**
- [ ] **P4.14 Espace Aidants**, solutions de répit, « Où en êtes-vous ? » (aucune donnée conservée).
- [ ] **P4.15 Garde de nuit · présence 24h/24 · sortie d'hospitalisation.**
- [ ] **P4.16 Garde-malade · accompagnement en vacances · remplacement d'auxiliaire de vie.**

Critères communs : 13 sections présentes ; sources ouvertes avec succès et datées ; semaine type illustrée ; encart « Ce que nous ne faisons pas » ; formulaire du cas intégré ; pages pathologie en `statut: a_relire` ; maillage de `docs/03 §2` respecté.

**Point de validation 4** : `check-copy`, `check-links` verts ; relecture croisée par un sous-agent de trois pages tirées au hasard contre `docs/01 §2` et `docs/03 §1` ; liste des relectures professionnelles attendues ajoutée à `docs/QUESTIONS_ARCEL.md`.

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
