# Suivi SEO — gabarit mensuel (docs/04 §6)

Ce gabarit se remplit chaque mois après l'ouverture de l'indexation (`SITE_INDEXABLE=true`, action d'Arcel). Sources : Google Search Console (Performances, Pages, Sitemaps), Bing Webmaster Tools, la mesure d'audience de première partie si un collecteur est branché (D-029, Q-TECH-8), `pnpm validate` et `pnpm lhci`. Aucune donnée personnelle n'entre ici.

## 1. Tableau mensuel

| Mois | Impressions | Clics | CTR | Position moyenne | Pages indexées / publiées | Requêtes locales gagnées | Conversions (rappel + demandes) | Taux par gabarit |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| AAAA-MM | | | | | | | | |

Définitions : « pages indexées / publiées » compare la couverture de la Search Console au nombre de pages `statut: publie` construites (`pnpm build` puis `pnpm exec tsx scripts/validate/index.ts`) ; « requêtes locales gagnées » compte les requêtes « aide à domicile + commune ou arrondissement » sur lesquelles une page locale apparaît en première page ; le taux par gabarit rapporte les envois de formulaire (`demande_envoyee`, `rappel_envoye`) aux sessions du gabarit (accueil, pilier, service, locale, article) quand la mesure est active.

## 2. Par famille d'intention (docs/04 §3)

| Famille | Pages cibles | Impressions | Clics | Position | Remarque |
| --- | --- | --- | --- | --- | --- |
| Locale (« aide à domicile + lieu ») | `/aide-a-domicile/…`, `/agences/…` | | | | |
| Public (« aide à domicile personne âgée », « Alzheimer domicile ») | piliers, pages pathologie | | | | |
| Service (« garde de nuit », « sortie d'hospitalisation ») | `/services/…` | | | | |
| Information (« refus d'aide », « épuisement aidant ») | `/magazine/…`, `/lexique/…` | | | | |
| Choix (« prestataire ou mandataire », « combien d'heures ») | `/comment-ca-marche/…`, `/tarifs-et-aides/` | | | | |
| Professionnels et emploi | `/professionnels/`, `/recrutement/` | | | | |

## 3. Pages à enrichir

Impressions fortes et clics faibles (CTR sous la moyenne du gabarit) : revoir le titre moteur et la description (docs/01 §8) avant le contenu.

| Page | Impressions | CTR | Position | Action | Fait le |
| --- | --- | --- | --- | --- | --- |
| | | | | | |

## 4. Santé technique du mois

- `pnpm validate --prod` : résultat et échecs restants.
- `pnpm lhci` : performance, LCP, TBT, JavaScript par page témoin (huit pages, `lighthouserc.cjs`).
- Search Console : erreurs d'exploration, pages exclues, données structurées en erreur (`Organization`, `LocalBusiness`, `Article`, `FAQPage`, `DefinedTerm`, `JobPosting`).
- Plans de site : treize segments envoyés, dernière lecture, pages découvertes.
- IndexNow : dernier envoi (`scripts/indexnow.ts`, clé Q-TECH-6).
- `check-freshness` : articles et pages d'aide à réviser.

## 5. Décisions du mois

Liste datée des actions décidées à partir des chiffres (nouvelle page locale de la vague 2, article à réécrire, question à Arcel), avec la tâche correspondante dans `docs/PLAN.md` (phase 10 ou 11).
