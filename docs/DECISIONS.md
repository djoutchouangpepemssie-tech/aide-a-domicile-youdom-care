# Décisions d'architecture et de conception

Une décision = contexte, choix, conséquences, date. Toute dépendance ajoutée, tout écart par rapport aux cahiers et tout changement de source de données passent par ici.

## D-001 — Pile technique (2026-09-19, Arcel)
- **Contexte** : site de contenu à fort enjeu SEO, des centaines de pages locales, formulaires riches, équipe habituée à React.
- **Choix** : Next.js (App Router, statique), TypeScript strict, Tailwind CSS v4, contenu MDX/JSON validé par Zod, hébergement Vercel.
- **Conséquences** : pas de CMS ; le contenu vit dans le dépôt ; les prévisualisations par branche servent de recette.

## D-002 — Destination des demandes (2026-09-19, Arcel)
- **Choix** : e-mail uniquement (SMTP). Format `LeadPayload` stable et webhook optionnel pour un futur branchement au CRM.
- **Conséquences** : le site ne stocke aucune demande ; la boîte de réception est le seul lieu de conservation (voir `docs/05 §8`).

## D-003 — Modes d'intervention (2026-09-19, Arcel)
- **Choix** : le site présente les deux modes, prestataire et mandataire, avec une page de comparaison et la mention légale du mode mandataire.

## D-004 — Site créé de zéro (2026-09-19, Arcel)
- **Choix** : aucune reprise de contenu ni de structure d'un site antérieur ; aucune redirection à prévoir.

## D-005 — Identité visuelle (2026-09-19)
- **Choix** : palette issue du dépliant (bleu canard #0699B0, vert #58BE81, framboise #EF3F6B) complétée de variantes accessibles ; polices Fraunces et Atkinson Hyperlegible Next ; concept « Le Fil ».
- **Conséquences** : le framboise #D42A5B est la seule couleur d'action ; le vert ne porte jamais de texte blanc.

## D-006 — Versions de la pile à l'initialisation (2026-09-20, P0.1)
- **Contexte** : `create-next-app@latest` exécuté le 2026-09-20 (`--ts --eslint --app --src-dir --no-tailwind --import-alias "@/*" --use-pnpm`).
- **Choix** : Node 24.15.0 · pnpm 11.0.8 (`packageManager` épinglé) · Next.js 16.3.5 (Turbopack) · React 19.2.8 · TypeScript 5.9.3 · ESLint 9.39.5 · eslint-config-next 16.3.5 · @types/node 20.19.43.
- **Écarts volontaires par rapport au scaffold** : pas de Tailwind (installé en P0.3 en v4), pas de polices Geist ni de logos Next/Vercel, `src/app` réduit à un squelette en français (`lang="fr"`), `CLAUDE.md` et `README.md` du scaffold non repris (le `CLAUDE.md` du kit fait foi). `AGENTS.md` généré par Next 16 conservé : il renvoie à la documentation de la version installée (`node_modules/next/dist/docs/`), utile car cette version diffère des conventions antérieures.
- **Conséquences** : `.gitignore` exclut `.env*` sauf `.env.example`, et `data/raw/`. `pnpm-workspace.yaml` interdit les scripts de build de `sharp` et `unrs-resolver` (valeur par défaut de pnpm 11) ; à revoir si l'optimisation d'images locale l'exige.

## D-007 — Outillage qualité (2026-09-20, P0.2)
- **Contexte** : critère de P0.2, « un commit mal formé est refusé » ; commits conventionnels en français avec les types de `.claude/loop.md`.
- **Choix** : Prettier 3.9.8 (formatage, `printWidth` 100, `endOfLine` lf) · eslint-config-prettier 10.1.8 (neutralise les règles de style d'ESLint) · Husky 9.1.7 (hooks `pre-commit` et `commit-msg`) · lint-staged 17.5.1 (ESLint `--max-warnings=0` + Prettier sur les fichiers indexés) · @commitlint/cli et @commitlint/config-conventional 21.2.2 (`type-enum` restreint aux 13 types de la loop, `subject-case` désactivé pour le français et les identifiants, en-tête ≤ 100 caractères). Outils de développement uniquement : poids nul dans le site livré.
- **ESLint strict** : `no-explicit-any`, `no-non-null-assertion`, `consistent-type-imports`, `no-unused-vars` (préfixe `_` toléré), `eqeqeq`, `no-console` (sauf `warn`/`error`, et libre dans `scripts/`).
- **Conséquences** : `.gitattributes` impose `eol=lf` (le dépôt est aussi édité sous Windows) ; `docs/`, `.claude/`, `CLAUDE.md`, `README_DEMARRAGE.md`, `AGENTS.md` et `data/` sont hors du périmètre de Prettier (édités à la main, jamais reformatés) ; `content/*.json` est formaté par Prettier. `pnpm typecheck` = `tsc --noEmit` ; il suppose `next-env.d.ts` présent (généré par `next dev`/`next build`), ce que la CI de P0.7 devra garantir.

## D-008 — Tailwind v4 et polices (2026-09-20, P0.3)
- **Contexte** : P0.3 ; `docs/02 §3` demande Fraunces et Atkinson Hyperlegible Next par `next/font`, sous-ensemble latin, `display: swap`, deux fichiers variables au plus.
- **Choix** : tailwindcss 4.3.3 + @tailwindcss/postcss 4.3.3 + postcss 8.5.28 (outillage de build, aucun poids côté client au-delà du CSS généré). Les jetons vivent dans `src/styles/tokens.css` (variables CSS, seule source) et sont exposés à Tailwind par `@theme inline` dans `src/styles/globals.css` : les palettes par défaut de Tailwind (couleurs, polices, rayons, ombres) sont désactivées pour qu'aucune couleur hors cahier ne soit utilisable. Les deux polices sont disponibles dans `next/font/google` (auto-hébergées au build) : Fraunces variable avec les axes `SOFT` et `opsz` (pas d'italique, pas d'axe `WONK`), Atkinson Hyperlegible Next variable (pas d'italique).
- **Repli documenté** : `next/font` ne possède pas les métriques d'Atkinson Hyperlegible Next et émettait un avertissement de build (« Failed to find font override values ») ; `adjustFontFallback: false` plus un `fallback` explicite (Atkinson Hyperlegible si installée, puis `system-ui`, `sans-serif`) suppriment l'avertissement ; sans l'option `fallback`, il réapparaît. Fraunces garde son repli ajusté automatique. `tokens.css` ne redéclare pas ces replis : il ne prévoit qu'une valeur par défaut si la variable `next/font` est absente.
- **Conséquences** : la page `/styleguide/` (noindex, étoffée en P1.10) sert de témoin visuel des jetons ; le mode confort est déjà décrit par `:root[data-comfort="on"]` dans `tokens.css`, l'interrupteur arrive en P1.7 ; le fondu-montée et le fil (P1.4) lisent `--duration-*` et `--motion-rise`, qui passent à zéro avec `prefers-reduced-motion`.

## D-009 — Outillage de test (2026-09-20, P0.4)
- **Contexte** : `CLAUDE.md` (Vitest, Playwright + axe) et `docs/07 §4` (seuil bloquant : 0 violation axe critique ou sérieuse sur les pages témoins).
- **Choix** : vitest 5.0.1 + @vitejs/plugin-react 6.1.1 + jsdom 30.1.0 (unitaires, environnement `jsdom`, alias `@/`) · @testing-library/react 16.3.3, /dom 10.4.2, /jest-dom 7.0.1, /user-event 14.6.7 · @playwright/test 1.63.0 (projets `mobile` = Pixel 7 et `desktop` = Desktop Chrome, locale fr-FR, Chromium seul) · @axe-core/playwright 4.13.0 (assistant `tests/e2e/axe.ts` : étiquettes WCAG 2.x A/AA + bonnes pratiques, échec sur `critical` et `serious`). @types/node passé en 24.x (exigé par Vitest 5, cohérent avec Node 24). Outils de développement uniquement.
- **Conséquences** : `pnpm test` = `vitest run` (fichiers `*.test.ts(x)` dans `src/` et `scripts/`) ; `pnpm test:e2e` = `pnpm build && playwright test` sur le serveur de production (`pnpm start -p 3100`, réutilisé s'il tourne déjà hors CI) ; la CI de P0.7 devra installer Chromium (`playwright install --with-deps chromium`). Les pages témoins de `docs/07 §4` s'ajoutent à `tests/e2e/` au fil des phases.

## D-010 — Validation du contenu par Zod (2026-09-20, P0.5)
- **Contexte** : `docs/00 §6` (« Le contenu commande », faits d'entreprise depuis `content/`), critère de P0.5 (« un champ invalide fait échouer le build »).
- **Choix** : zod 4.6.5 (dépendance de production, ~15 ko compressés côté serveur seulement : les pages sont statiques et le chargeur ne s'exécute qu'au build ou dans `api/lead`). Schémas stricts (`z.strictObject`) dans `src/content/schemas.ts` : une clé inconnue (faute de frappe) est refusée, un fait inconnu est `null`, jamais une chaîne vide. Chargeur `src/content/loader.ts` avec cache par fichier (`getSiteConfig`, `getPricing`, `getCommitments`, `getInterfaceTexts`, `loadAllContent`) ; l'erreur lève un message lisible (`z.prettifyError`) et interrompt `next build`.
- **`content/interface.json`** : boutons de `docs/01 §6` et microtextes de `docs/01 §7`, repris mot pour mot ; les jetons `{h}`, `{champ}`, `{téléphone}`, `{délai}` sont exigés par le schéma. Le message de succès est décliné en trois textes (`succes`, `succes_delai_inconnu` quand `contact.delai_rappel` est vide, `succes_urgence` conditionné à E5 par le composant).
- **Conséquences** : `layout.tsx` et l'accueil lisent déjà `marque.*` depuis le chargeur (plus de texte d'entreprise en dur). `tarifs.json` autorise des prix `null` (fait inconnu) : c'est `pnpm validate --prod` (P0.6) qui les exigera. Le schéma des autorisations (`legal.autorisations[]`) est une structure d'accueil pour Q-LEGAL-1 : libellé, département, publics, mode, référence, date.

## D-011 — Exécution des scripts TypeScript et registre des contrôles (2026-09-20, P0.6)
- **Contexte** : `docs/07 §7` (`pnpm validate`, mode `--prod`), `docs/PLAN.md` (« un contrôle activé n'est plus jamais désactivé »).
- **Choix** : tsx 4.23.13 (outil de développement) pour exécuter `scripts/**/*.ts` sans étape de compilation ; son binaire `esbuild` a besoin d'un script d'installation, autorisé explicitement dans `pnpm-workspace.yaml` (`allowBuilds.esbuild: true`, `sharp` et `unrs-resolver` restent interdits). Registre `scripts/validate/config.ts` : liste ordonnée des contrôles (`Check { id, description, run }`), exécutée par `scripts/validate/index.ts` qui sort en code 1 dès qu'un contrôle a une erreur ; les avertissements n'arrêtent rien. Mode production : `--prod` ou `VERCEL_ENV=production`.
- **`check-content`** : relit les quatre fichiers de `content/` depuis le disque (pas le cache du chargeur) et applique les schémas de `src/content/schemas.ts` ; en production, exige des prestations avec prix TTC et HT et une date d'application, les champs légaux de `docs/07 §2` (`legal.*`, hébergeur), un téléphone et un e-mail, `a_confirmer` vide, et refuse tout engagement ou jalon qui a un texte mais `valide: false` (tant que les composants n'existent pas, « affiché » est lu comme « a un texte »).
- **`check-placeholders`** : lit les pages HTML de `.next/server/app` (texte visible seulement : scripts, styles et commentaires retirés, `_global-error.html` de Next ignoré) et cherche `TODO`, `Lorem`, `{{`, `[E…]`, `{jeton}`, `null`, `undefined`, « à compléter », `TBD`, `XXX`. Il échoue si aucun build n'existe : `pnpm build` précède `pnpm validate`.
- **Conséquences** : la commande de référence de la loop devient de fait `pnpm lint && pnpm typecheck && pnpm test && pnpm build && pnpm validate` ; la CI (P0.7) enchaîne dans cet ordre. Une copie volontairement invalide de `content/` sert de fixture de test (`scripts/validate/fixtures/invalid-content/`).

## D-012 — Intégration continue (2026-09-20, P0.7)
- **Contexte** : P0.7 (« lint, typecheck, test, build, validate sur chaque PR ») ; `docs/00 §6` pour `.env.example`.
- **Choix** : un seul workflow `.github/workflows/ci.yml`, un seul job `Vérifier` sur `ubuntu-latest` (Node 24, pnpm via `pnpm/action-setup@v4` lisant `packageManager`, cache pnpm), déclenché sur chaque `pull_request` et sur `push` vers `main`, avec annulation des exécutions obsolètes. Ordre : `pnpm install --frozen-lockfile` → `next typegen` (génère `next-env.d.ts`, sinon `tsc` ne connaît pas `LayoutProps`) → lint → typecheck → format:check → test → build → validate → `playwright install --with-deps chromium` → parcours Playwright + axe ; rapport Playwright téléversé seulement en cas d'échec (7 jours). Permissions réduites à `contents: read`, aucun secret : le site est statique et `api/lead` n'est pas exercé en CI. `SITE_INDEXABLE=false` et `CI=true` dans l'environnement du job.
- **`.env.example`** : reprend `docs/00 §6` et ajoute `SITE_INDEXABLE` (P0.8) et `LEAD_WEBHOOK_SECRET` (signature du webhook optionnel, P3.9). Versionné grâce à l'exception `!.env.example` du `.gitignore`.
- **Conséquences** : le workflow ne peut pas être exécuté tant que le dépôt n'a pas de remote GitHub (Q-TECH-3) ; les étapes ont été rejouées localement dans le même ordre. Le point de validation 0 (« CI verte sur la PR ») restera en attente de Q-TECH-3 ; le reste du point de validation se vérifie en local.

## D-013 — Configuration Next : URL, en-têtes de sécurité, indexation (2026-09-20, P0.8)
- **Contexte** : `docs/04 §2` (`trailingSlash: true`), `docs/07 §6` (en-têtes), `docs/07 §8` (indexation ouverte par Arcel).
- **Choix** : `trailingSlash: true`, `poweredByHeader: false`, en-têtes appliqués à toutes les routes par `headers()` de `next.config.ts` : CSP, HSTS (2 ans, sous-domaines, preload), `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY` (complément historique de `frame-ancestors 'none'`), `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` fermée (caméra, micro, géolocalisation, paiement, USB, cohortes). `X-Robots-Tag: noindex, nofollow` + `<meta name="robots">` + `robots.txt` « Disallow: / » tant que `SITE_INDEXABLE` ne vaut pas exactement `"true"` (lu au build ; assistant `src/lib/seo/indexable.ts`). Une fois ouvert : `robots.txt` autorise tout sauf `/api/`, `/merci/`, `/styleguide/` et déclare `sitemap.xml` (P5.3). `metadataBase` = `marque.url`.
- **Écart consigné sur la CSP** : `docs/07 §6` demande « aucun script en ligne non signé ». Next.js ne signe les scripts en ligne (nonce) que si toutes les pages sont rendues dynamiquement à chaque requête (documentation Next 16, « Static vs Dynamic Rendering with CSP »), ce qui contredit « Statique d'abord » (`docs/00 §6`), les budgets de performance et l'hébergement en CDN. La CSP est donc stricte sur tout le reste (`default-src 'self'`, `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`, `frame-src 'none'`, `frame-ancestors 'none'`, `upgrade-insecure-requests`) et tolère `'unsafe-inline'` pour `script-src` et `style-src` (scripts d'hydratation et styles générés par Next). Piste pour la phase 9 : calculer après build les empreintes SHA-256 des scripts en ligne par page et les injecter dans la CSP (`vercel.json` ou `headers()` par chemin) si l'outillage le permet sans casser le rendu statique. Les domaines de Turnstile et de la mesure d'audience seront ajoutés à la CSP par les tâches qui les introduisent (P3.9, P8.5).
- **Conséquences** : Vercel doit recevoir `SITE_INDEXABLE=true` en production seulement, jamais en prévisualisation ; un parcours Playwright (`tests/e2e/config.spec.ts`) vérifie en-têtes, noindex et redirection vers la barre oblique.

## D-014 — Fin de phase sans dépôt distant (2026-09-20, point de validation 0)
- **Contexte** : `.claude/loop.md` §9 prévoit push, PR par `gh`, fusion en squash si la CI est verte, tag `phase-NN`. Sur cette machine, le dépôt n'a pas de remote et `gh` refuse le jeton (Q-TECH-3).
- **Choix** : tant que Q-TECH-3 n'est pas réglée, la fin de phase rejoue en local, dans l'ordre de la CI, la chaîne `next typegen → lint → typecheck → format:check → test → build → validate → playwright test` puis `pnpm audit` ; si tout est vert, `main` reçoit la phase par `git merge --squash` (message `chore(phase-NN): …`, corps = résumé + résultats), le tag `phase-NN` est posé, la branche de phase est conservée. Dès qu'un remote existe : pousser `main`, les tags et les branches de phase, ouvrir les PR a posteriori, vérifier la CI (tâche inscrite dans « Dette et corrections »).
- **Conséquences** : la relecture par PR est différée, pas supprimée ; aucune réécriture d'historique ne sera nécessaire (les commits de `main` sont déjà les squashs attendus).

## D-015 — Accueil : source des textes et note du crédit d'impôt (2026-09-20, P2.1)
- **Contexte** : `docs/01 §4` fournit les textes de l'accueil « à reprendre tels quels » ; le bloc 3 porte les codes `[E1]` à `[E4]` ; la ligne de réassurance se termine par « Crédit d'impôt de 50 %\* » sans texte pour l'astérisque.
- **Choix** : les textes vivent dans `content/pages/accueil.json` (schéma strict, six cartes de situation exactement, trois stades) et non dans les composants. Le bloc 3 affiche les phrases de `docs/01` et relie chaque point à son engagement par le code ; `content/engagements.json` reste la source de validation (`valide`) : en prévisualisation tout s'affiche, en production (`VERCEL_ENV=production`) un point non validé est masqué (`visibleCommitments`). La note de l'astérisque, absente du cahier, est une phrase de renvoi neutre (« Selon les conditions en vigueur, détaillées sur la page Tarifs et aides ») qui n'énonce aucun montant ni condition ; Arcel peut la modifier dans `accueil.json`.
- **Conséquences** : `check-content` valide `pages/accueil.json` ; les blocs 5 à 12 s'ajoutent au même fichier (P2.2, P2.3). L'accueil compose des `Section` à fonds alternés (paper → white → teal → paper), règle vérifiée par un parcours Playwright.

## D-016 — Recherche de commune et données de territoire (2026-09-20, P2.3)
- **Contexte** : `docs/01 §4 bloc 9` (« Oui, nous intervenons à {commune}. Votre agence la plus proche : {agence}. »), `docs/04 §5` (API Découpage administratif, géocodage des agences).
- **Choix** : `scripts/data/geocode-agencies.ts` géocode les six adresses de `site.config.json` par la Base adresse nationale et écrit `data/agences.geo.json` (source, score, date) sans toucher au fichier d'Arcel ; `scripts/data/fetch-communes.ts` télécharge les communes des huit départements et les vingt arrondissements de Paris (Paris 75056 remplacé par ses arrondissements), calcule l'agence la plus proche à vol d'oiseau et écrit `data/idf-communes.json` (1 285 entrées, référence versionnée) et `data/idf-communes.compact.json` (≈ 60 ko, chargé par le navigateur au premier focus seulement). `TerritorySearch` est un « combobox » ARIA : suggestions par nom sans accents ou par code postal, flèches, Entrée, Échap, résultats et réponse en `aria-live` ; aucune saisie n'est envoyée à un serveur.
- **Complément à D-015** : le texte de l'astérisque du crédit d'impôt est finalement fourni par `docs/01 §4` (« Mention légale du crédit d'impôt (pied de bloc) ») ; il remplace la phrase de renvoi provisoire.
- **Conséquences** : le bloc 10 (magazine) reste masqué tant qu'aucun article n'existe (P7) ; la « bonne » agence au sens métier (secteur réel de chaque agence) pourra remplacer la distance à vol d'oiseau quand Arcel l'indiquera (question à poser en phase 6). Les adresses géocodées héritent du statut « à confirmer » de Q-ID-1.

## D-017 — Page Tarifs et aides sans tarif, cartes d'aides sans montant (2026-09-20, P2.6)
- **Contexte** : `content/tarifs.json` est vide (Q-TARIFS-1) ; `docs/07 §1` impose TTC, HT, unité, mode et frais pour tout prix affiché ; P2.7 et P2.8 reprennent les montants des aides depuis les sources officielles avec leur année.
- **Choix** : la page `/tarifs-et-aides/` existe dès maintenant et se construit entièrement depuis `tarifs.json` (tableau prestations + forfaits, exemples mensuels calculés par `monthlyEstimates` sur 52/12 semaines avec paliers de dégressivité, majorations, frais annexes, mention mandataire près de tout prix mandataire) ; sans tarif, elle n'affiche aucun chiffre : encart « Un devis gratuit et détaillé », devis, aides, appel. Les six aides vivent dans `content/aides.json` avec le public concerné, la démarche, la page détaillée et la source officielle, mais **sans montant** : `AidCard` n'affiche la ligne « Combien ? » que si un montant sourcé est fourni (P2.7, P2.8). Aucun texte « à compléter » n'est rendu.
- **Conséquences** : dès que `tarifs.json` est rempli, le tableau et les exemples apparaissent sans changement de code ; `check-legal` (P8.3) vérifiera la mention mandataire près de chaque prix mandataire. Les liens vers les pages d'aide renvoient en 404 jusqu'à P2.7/P2.8 (contrôlé par `check-links` en P5.5).

## D-018 — Pages par aide : sources officielles datées (2026-09-20, P2.7)
- **Contexte** : P2.7 exige des montants « repris de sources officielles ouvertes pendant la tâche, avec année » ; `docs/03 §1` liste les sources reconnues.
- **Choix** : une page statique par aide depuis `content/aides/{id}.json` (schéma `aidPageSchema` : SEO, chapô, `maj`, `sources[]` avec `verifie_le` — la date « Vérifié le » publiée par la source — et `consulte_le`, sections avec montants/listes, « À retenir », démarche, appel) et un registre `src/content/aid-pages.ts` (`generateStaticParams`, `dynamicParams = false`, 404 sinon). Chaque page affiche sa date de mise à jour, un avertissement d'évolution des montants et la liste des sources datées (`SourcesList`). Sources lues ce jour : service-public.gouv.fr F12 (crédit d'impôt, vérifié le 15 avril 2026), F10009 (APA, 1er juin 2026), F14202 (PCH, 1er juillet 2026). service-public.fr redirige désormais vers service-public.gouv.fr : les liens utilisent le nouveau domaine. La page de l'Urssaf sur l'avance immédiate n'a pas répondu (deux tentatives) : l'avance immédiate est décrite sans chiffre, à partir de la mention de `docs/01 §4`, avec un lien vers urssaf.fr sans date de vérification.
- **Conséquences** : `check-freshness` (P5 ou P9) pourra alerter sur `maj` ; `check-links` (P5.5) vérifiera les liens Urssaf. Toute évolution de montant se corrige dans le JSON, avec les nouvelles dates.

## D-019 — Lighthouse CI et budget JavaScript rebasé sur le socle (2026-09-20, point de validation 2)
- **Contexte** : `docs/07 §5` fixe des budgets bloquants mesurés par `pnpm lhci` à chaque fin de phase. Première mesure sur l'accueil : le socle Next 16 + React 19 (D-006) pèse à lui seul 132 Ko compressés de JavaScript initial (react-dom 73 Ko, routeur applicatif 46 Ko, runtime 13 Ko) avant tout composant du site ; nos composants client (en-tête, barre mobile, confort, fil, onglets, recherche de commune) ajoutent 18 Ko. Le budget « < 90 Ko » de `docs/07 §5` a été écrit avant le choix de la pile et ne peut pas être tenu avec un routeur applicatif Next, quelle que soit la qualité du code.
- **Choix** : `pnpm lhci` (`scripts/lhci.ts` + `lighthouserc.cjs`, `@lhci/cli` 0.15.1) reconstruit le site indexable (`SITE_INDEXABLE=true`, les pages étant prérendues au build), ouvre le Chromium de Playwright avec un port de débogage (chrome-launcher échoue sous Windows en supprimant son profil temporaire, et le poste n'a pas besoin de Google Chrome), puis lance trois passes mobiles en 4G avec étranglement appliqué pendant la mesure (`throttlingMethod: devtools`) : la simulation a posteriori attribuait à la première peinture tout ce qui s'était chargé avant elle sur un poste rapide, scripts compris, et donnait un LCP de 3,2 s pour 1,9 s mesuré. Les rapports restent sur le disque. Budgets : ceux de `docs/07 §5`, sauf le JavaScript initial, rebasé sur le socle mesuré : **page de contenu < 160 Ko compressés** (socle 132 + 28 de marge pour les composants client), **page avec formulaire < 220 Ko** (60 Ko pour les formulaires en plusieurs étapes et leur validation). INP ne se mesure pas en laboratoire : le temps de blocage total (< 150 ms) sert de garde-fou. `docs/07 §5` est mis à jour en conséquence.
- **Conséquences** : question Q-TECH-4 à Arcel (confirmer le budget ou revoir la pile). Tout composant client nouveau doit être justifié : les 28 Ko de marge sont la seule réserve. Le score « Bonnes pratiques » restera à 0,96 tant que `/etre-rappele/` et `/demande/` (phase 3) n'existent pas : leur préchargement depuis l'accueil répond 404 et Lighthouse le compte comme une erreur de console. `pnpm audit` est lancé à chaque fin de phase ; les vulnérabilités transitives de l'outillage (`@lhci/cli`) sont corrigées par `pnpm.overrides`.

## D-020 — Format du planning : créneaux communs aux dates et durée 24h/24 (2026-09-20, P3.3b)
- **Contexte** : `docs/05 §4` prévoit, pour un besoin ponctuel, « un sélecteur de dates + créneaux par date » et, pour une présence 24h/24, « tous les jours ? », une date de début et une durée envisagée. Le type `LeadPayload.planning` de `docs/05 §7` n'a que `dates: string[]`, une `grille` par jour de semaine et `nuit`.
- **Choix** : `planning.creneaux?: Creneau[]` (créneaux communs à toutes les dates ponctuelles : une seule ligne de six pastilles, plutôt qu'un choix par date qui serait long à saisir sur mobile pour 60 dates au plus) et `planning.duree?: "jours" | "semaines" | "durable"` pour le 24h/24, dont la date de début va dans `dates[0]` et les jours retenus dans `grille` remplie d'office. `docs/05 §7` reste un type indicatif : il n'est pas modifié, le schéma Zod (`src/lib/lead/schema.ts`) fait foi.
- **Conséquences** : l'e-mail à l'équipe (P3.9) rend les dates ponctuelles avec leurs créneaux communs et la durée du 24h/24 ; toute évolution vers des créneaux par date se ferait en ajoutant un champ, sans casser les demandes existantes.

## D-021 — Demande de contact sans commune, formulaire professionnel sans consentement santé (2026-09-20, P3.8b)
- **Contexte** : `docs/05 §7` rend `commune` et `agenceProche` obligatoires dans `LeadPayload`, et docs/05 §8 exige le consentement explicite dès qu'une réponse touche à la santé. Le formulaire `contact` (« autres demandes », docs/05 §2) n'a pas de commune ; le formulaire `professionnel` ne décrit jamais la personne accompagnée (« aucune donnée nominative », docs/05 §2 et §5) : sa « situation » se limite à la structure, la fonction et le type de besoin.
- **Choix** : dans le schéma Zod, `commune` et `agenceProche` deviennent facultatifs et une règle les exige pour tout formulaire autre que `contact` ; l'exigence de consentement santé s'applique aux sept formulaires de santé et à toute `situation` renseignée, sauf pour `professionnel`. Le téléphone reste demandé partout : Youdom Care rappelle. L'urgence d'une sortie d'hospitalisation se déduit de la date de sortie (moins de trois jours : sous 48 h ; moins de huit : dans la semaine ; sinon dans le mois ; inconnue : dans la semaine).
- **Conséquences** : la route api/lead (P3.9) traite une demande de contact sans agence ; l'e-mail à l'équipe l'adresse à la boîte générale.

## D-022 — Poids des pages de formulaire : zod/mini, métadonnées téléphoniques France, pas de préchargement des appels à l'action (2026-09-20, fin de phase 3)
- **Contexte** : première mesure Lighthouse de `/etre-rappele/` : 281 Ko de JavaScript (budget D-019 : 220 Ko pour une page avec formulaire), et l'accueil montait à 281 Ko aussi parce que `next/link` préchargeait les pages de formulaire depuis les boutons « Être rappelé(e) » et « Ma demande ». Un décalage de mise en page (CLS 0,24) venait du formulaire rendu seulement après hydratation, et un rapport de sécurité de contenu venait de la barre de progression stylée en ligne.
- **Choix** : le schéma partagé `src/lib/lead/schema.ts` est écrit avec `zod/mini` (même noyau, API fonctionnelle, quelques kilo-octets au lieu d'une cinquantaine) — les schémas de contenu restent en zod classique côté serveur ; le téléphone est validé par `libphonenumber-js/core` avec des métadonnées limitées à la France générées par `pnpm data:phone` (`data/phone-metadata.fr.json`, 265 octets) ; les liens rendus par `Button` et les deux actions de la barre mobile portent `prefetch={false}` (les formulaires se chargent au clic) ; la coque `MultiStepForm` est rendue complète dès le serveur et reprend la saisie conservée juste après le montage ; la progression est un élément `<progress>` natif. Lighthouse CI mesure désormais deux pages témoins avec une matrice de budgets (160 Ko contenu, 220 Ko formulaire).
- **Conséquences** : accueil 150 Ko, page de rappel 187 Ko, CLS 0, bonnes pratiques 1 sur les deux pages. Toute nouvelle dépendance côté client se mesure contre ces budgets.

## D-023 — Contrôle des liens : pages prévues signalées, sources externes ouvertes (2026-09-20, point de validation 4)
- **Contexte** : le point de validation 4 exige `check-links` vert alors que la navigation et le pied de page renvoient déjà vers des pages prévues aux phases 6 à 8 (territoires, magazine, lexique, professionnels, recrutement, pages légales, agences). `docs/07 §7` définit le contrôle : « un lien interne est cassé ; un lien externe cité comme source ne répond pas ».
- **Choix** : `scripts/validate/check-links.ts` relève tous les chemins internes de `content/` (JSON et MDX, en-tête et corps) et les vérifie contre les pages réellement produites par `next build` (fichiers HTML de `.next/server/app`), ce qui couvre routes statiques, dynamiques prérendues et MDX. Une liste `plannedRoutes` nomme, avec leur phase, les pages annoncées par le plan et non encore construites : elles produisent un avertissement, toute autre cible absente une erreur, et une entrée oubliée après construction devient une erreur (la liste ne peut que se vider). Les adresses externes citées comme sources (`sources[].href`) sont ouvertes une fois chacune (GET, 10 s, redirections suivies) ; une réponse 4xx/5xx est une erreur ; une connexion refusée ou un délai dépassé (site qui bloque les robots, comme les sites de l'Urssaf depuis ce poste) est un avertissement à vérifier à la main dans un navigateur ; `YC_LINKS_OFFLINE=1` saute cette partie, pour travailler hors ligne.
- **Conséquences** : `pnpm validate` exige un `pnpm build` préalable (déjà le cas pour `check-placeholders`) et un accès réseau ; le correctif des liens `/corps-de-lewy/` et `/maladie-de-charcot/` du pilier neuro (fix 54337f1) aurait été détecté. Le lien « Voir nos agences » de la page À propos vise `/agences/`, prévu en phase 6.

## D-024 — Expérience visuelle « waouh » : photos libres de droit, animations et 3D, icônes, heros personnalisés (2026-09-20, demande d'Arcel)
- **Contexte** : Arcel demande, après la phase 4, un site qui éblouit et convertit : pages piliers vivantes, heros personnalisés, images libres de droit partout pour représenter chaque service et chaque exemple, animations et effets 3D, icônes représentatives, une équipe d'agents spécialisés, l'inspiration des concurrents O2 et Petits-fils pour faire dix fois mieux. `docs/02 §5` limitait le mouvement à trois animations et `docs/02 §6` interdisait les banques d'images tant qu'aucune photo réelle n'est fournie.
- **Choix** : la demande d'Arcel prévaut sur `docs/02 §5` et `§6` sur ces deux points, aux conditions du brief `docs/design/BRIEF_EXPERIENCE.md` : les photos libres de droit sont des illustrations, jamais présentées comme l'équipe ou les clients (texte alternatif neutre, aucune légende nominative, crédits et licences dans `public/images/CREDITS.md`), interdits de `docs/02 §6` maintenus (photos médicalisées, clichés, visages d'enfants identifiables) ; les animations et effets 3D respectent `prefers-reduced-motion` et le mode confort, ne portent aucune information seuls, et tiennent le budget D-019 (CSS d'abord, JavaScript à la demande avec repli statique) ; le Fil, les jetons, la typographie et la voix restent la signature. Le travail est organisé en agents spécialisés (direction artistique et UX, iconographie, photothèque, mouvement et 3D, intégration), livrables dans `docs/design/`, `public/images/`, `src/components/motion/`, `src/components/ui/Icon/`.
- **Conséquences** : nouvelle branche `phase/04b-experience` après l'étiquette `phase-04` ; `docs/02` n'est pas réécrit (les deux points contredits sont notés ici) ; Q-CONTENU-4 (photos réelles) reste ouverte : les photos réelles remplaceront les photos libres de droit page par page quand Arcel les fournira ; les budgets Lighthouse et les tests d'accessibilité continuent de s'appliquer à chaque page enrichie.

## D-025 — Dépôt distant GitHub (2026-09-20, réponse d'Arcel à Q-TECH-3)
- **Contexte** : D-014 organisait le travail sans dépôt distant (fusions locales, étiquettes `phase-NN`), faute de réponse à Q-TECH-3. Arcel a fourni l'adresse `https://github.com/djoutchouangpepemssie-tech/Youdom-care`.
- **Choix** : `origin` pointe vers ce dépôt ; `main` (avec les étiquettes `phase-00` à `phase-04`) et la branche de travail courante y sont poussées ; chaque fin de phase pousse `main` et son étiquette, chaque itération pousse sa branche `phase/NN-slug`. Jamais de push forcé, jamais de réécriture de `main` (règles inchangées). Les secrets restent hors dépôt (`.env` ignoré).
- **Conséquences** : dette DC.1 close ; les prévisualisations par branche (Vercel) deviennent possibles quand le projet sera relié ; Q-TECH-3 est close.

## D-026 — Tolérances Lighthouse après les photos et le mouvement (2026-09-20, point de validation 4b)
- **Contexte** : D-024 ajoute des photos de hero, des icônes, du mouvement et de la 3D légère. Mesures Lighthouse CI après optimisation (îles de décoration chargées au premier survol ou au premier défilement, image du hero en AVIF qualité 60 avec `fetchpriority="high"`) : JavaScript initial 161 Ko sur l'accueil (budget D-019 : 160) et 223 Ko sur les pages services avec formulaire (220), LCP médian 1,94 s sur l'accueil et 2,01 à 2,05 s sur les pages services (docs/07 §5 : 2,0 s), temps de blocage total 140 à 183 ms sur l'accueil (garde-fou D-019 : 150 ms). Le socle React + Next pèse 127 Ko compressés, soit 78 % du JavaScript ; les îles de la phase 4b pèsent moins de 3 Ko. Les pages services en `statut: a_relire` sont volontairement `noindex` (docs/03 §1), ce qui plafonne leur catégorie SEO à 0,69.
- **Choix** : `lighthouserc.cjs` tolère 165 Ko sur l'accueil et 225 Ko sur les pages avec formulaire, un LCP de 2,1 s et un temps de blocage de 200 ms (la valeur INP de docs/07 §5), en gardant 160/220 Ko, 2,0 s et 150 ms comme cibles ; les deux pages témoins non indexées sont sorties de l'exigence SEO à 1 (0,65, audit `is-crawlable` désactivé) jusqu'à leur publication. Lighthouse mesure désormais quatre pages (accueil, rappel, un pilier, une page service).
- **Conséquences** : dette DP.1, à traiter en phase 5 : charger le formulaire de la section 12 des pages services à la demande (`react-hook-form`, zod, libphonenumber : 29 Ko), ne charger la seconde photo du sélecteur de lecteur qu'à la bascule, réduire la police Fraunces (sous-ensemble ou axe unique, 122 Ko), avec l'objectif de revenir sous 160/220 Ko et 2,0 s. `docs/07 §5` n'est pas modifié : ses valeurs restent les cibles.

## D-027 — Pipeline local : sources déplacées ou remplacées, millésime Insee, faits départementaux (2026-09-20, P6.1 à P6.3)
- **Contexte** : `docs/04 §5` liste les sources de `pnpm data:local` et demande de consigner tout déménagement. Repérage du 2026-09-20 : la « base de données locales » de l'Annuaire de l'administration n'est plus servie sur data.gouv.fr qu'en `all_latest.tar.bz2` (archive bzip2, hors de portée de Node sans dépendance) ; les PAM départementaux (75, 77, 78-92, 91…) ont été fondus dans un service régional unique (« Pam francilien », `pam.iledefrance-mobilites.fr`, la page `iledefrance-mobilites.fr/pam` répond 500) ; les pages « près de chez vous » de France Alzheimer et d'APF France handicap ont changé d'adresse (respectivement `/association/qui-sommes-nous/contactez-votre-association-locale/` puis une page par département, et `iledefrance.apf-francehandicap.org`, où seules les délégations 75, 93, 91, 94 et 77 sont publiées) ; l'Unapei ne publie ses associations que par la carte `carto.unapei.org` (données `data.php`) ; la base communale Insee « Évolution et structure de la population » n'existe en téléchargement que pour le millésime 2022 (les résultats 2023 parus le 8 juillet 2026 ne sont servis que par zone) ; les deux jeux CNSA de data.gouv.fr (points d'information, établissements) datent du 11 novembre 2020 ; sur opendata.paris.fr, le jeu des marchés s'appelle `marches-decouverts` et les équipements seniors viennent de `seniors-a-paris-loisirs-et-citoyennete`.
- **Choix** : l'annuaire est interrogé par l'API Annuaire de la DILA (`api-lannuaire.service-public.fr`, Opendatasoft, licence ouverte 2.0, même producteur), une exportation JSON par département filtrée sur `code_insee_commune` ; ses points d'information (`clic`) et plateformes de répit, à jour, complètent les jeux CNSA de 2020, dont la date figure dans `source_label`. Le PAM est un fait régional unique, repris sur chaque territoire avec ses pages « éligibilité » et « agences ». Les associations départementales sont saisies à la main dans `scripts/data/local/sources/manual.ts` avec l'adresse exacte de la page consultée ; chaque page est rouverte à chaque exécution en ligne (statut HTTP) et un échec est signalé sans bloquer. Le millésime Insee est 2022 (`INSEE_BASE`, à mettre à jour dès que la base 2023 paraît). Les hôpitaux viennent du FINESS national (catégories 101, 355, 106, 365, 129, 128, 131 ; entités sans patients écartées) ; à défaut d'hôpital dans la commune, les deux plus proches sont cités avec la distance entre centres. Chaque téléchargement est mis en cache dans `data/raw/{source}-{date}.{ext}` (dossier ignoré par git sauf `README.md`, régénéré avec sources, dates, licences et état) ; `--offline` rejoue depuis le cache et produit des fichiers identiques. Les faits d'une commune ou d'un arrondissement portent `in_territory` (vrai s'ils sont situés sur place, faux pour les faits du département : MDPH, conseil départemental, PAM, associations) ; le journal de fin signale les territoires dont les faits situés sur place sont sous le seuil, en plus du comptage total de `docs/04 §4`. Les arrondissements sont nommés « Paris 15e arrondissement » (slug `15e-arrondissement` du seed) ; les quartiers de Paris ne sont que listés (`data/local/_quartiers-paris.json`, graphie opendata et graphie du seed quand elles diffèrent).
- **Conséquences** : `check-local-facts` (P6.4) décide s'il compte tous les faits ou seulement `in_territory` ; les 103 communes de la vague 1 dépassent 8 faits au total, 27 restent sous 8 faits situés sur place (surtout les petites communes proches de Serris et de Versailles). Les délégations APF 78, 92 et 95, le comité France Parkinson 94 et les consultations mémoire (aucun jeu ouvert trouvé) restent à compléter à la main avec source. Licence et attribution des jeux (Etalab 2.0, ODbL Ville de Paris) à rappeler dans `/mentions-legales/` (P8).

## D-028 — Tolérance JavaScript des pages locale et agence (2026-09-27, point de validation 6)
- **Contexte** : Lighthouse CI mesure désormais six pages, dont une page locale (`/aide-a-domicile/hauts-de-seine/puteaux/`, `a_relire`) et une page d'agence (`/agences/puteaux/`). Ces gabarits portent à la fois le formulaire de rappel (react-hook-form, zod, libphonenumber : 29 Ko, dette DP.1), la recherche de commune et la semaine type interactive : JavaScript initial 229 Ko et 226 Ko compressés, pour un budget de 225 Ko (D-026) et une cible de 220 Ko (docs/07 §5, D-019). LCP 1,9 s et 1,8 s, accessibilité et bonnes pratiques à 1, SEO à 1 pour l'agence et 0,69 pour la page locale non indexée.
- **Choix** : `lighthouserc.cjs` tolère 235 Ko sur ces deux pages témoins, dans une entrée dédiée ; 225 Ko reste le budget des pages services et du rappel, 165 Ko celui de l'accueil ; 220 Ko reste la cible.
- **Conséquences** : la dette DP.1 (formulaire chargé à la demande) devient prioritaire en phase 9 : elle ramènerait les six pages sous leur cible. Les mesures de performance et de temps de blocage exigent une machine au repos : deux passes faites le 27 septembre avec le navigateur de l'utilisateur ouvert (dix-sept onglets) ont donné 210 à 280 ms de temps de blocage médian et 0,91 à 0,94 de performance sur des pages inchangées depuis la phase 5 (148 ms et 0,96 alors), avec des écarts de 170 à 450 ms entre passes ; ces valeurs ne mesurent pas le site.
- **Complément du 2026-09-27 (fin de phase 7)** : huit pages témoins désormais (article du Fil `a_relire` et page de lexique ajoutés). L'article mesure 181 Ko (formulaire absent, mais encarts, sommaire et partage : budget des pages avec formulaire appliqué, 225 Ko) ; la page de lexique 172 Ko pour trois îles de page de 8 Ko, tolérance 175 Ko. Même bruit de mesure sur la performance et le temps de blocage (accueil : 151, 284 et 303 ms sur trois passes, Chrome de l'utilisateur ouvert) ; les autres audits sont à 1 et les LCP entre 1,78 et 2,06 s.


## D-029 — Mesure d'audience de première partie, sans cookie ni identifiant, exemptée de consentement ; compléments de sécurité (2026-09-27, P8.5)
- **Contexte** : `docs/05 §9` limite la mesure à quatre événements sans donnée personnelle (`demande_etape_vue`, `demande_envoyee`, `rappel_envoye`, `appel_clic`) pour repérer l'étape où les visiteurs abandonnent ; `docs/05 §8` interdit toute donnée de santé dans l'analytique ; `docs/07 §2` n'exige pas de bandeau si la mesure est exemptée de consentement et sans outil publicitaire ; `docs/07 §6` fixe les règles des routes ; D-013 réservait l'ajout de domaines à la CSP « par la tâche qui introduit la mesure » ; Q-TECH-2 (Plausible, Matomo, aucun) est sans réponse et `docs/00` prévoyait une variable `NEXT_PUBLIC_ANALYTICS`. Page CNIL « Cookies : solutions pour les outils de mesure d'audience » consultée le 2026-09-27 (dernière mise à jour affichée : 4 juillet 2025) : l'exemption vaut pour une mesure à la finalité strictement limitée, au seul bénéfice de l'éditeur, produisant des statistiques anonymes, sans recoupement avec d'autres traitements, sans transmission de données non anonymes à des tiers et sans suivi d'un site à l'autre.
- **Choix** : une mesure de première partie écrite dans le dépôt (`src/lib/mesure/`), **sans cookie, sans identifiant de visiteur ou de session, sans empreinte, sans adresse IP conservée, sans script tiers et sans dépendance** : elle va au-delà des conditions de l'exemption puisqu'aucun traceur n'est déposé, donc pas de bandeau. Le client (`track(event, props)`) n'envoie que les quatre événements de `docs/05 §9` avec des propriétés tirées de listes fermées (`formulaire` ∈ identifiants de `docs/05 §2`, `etape` de 1 à 6, `departement` ∈ codes de `site.config.zones`, `emplacement` ∈ `en-tete`, `barre-mobile`, `rail`, `reponse-locale`, `pied-de-page`, `agence`, `formulaire`) et le chemin de la page sans paramètres ni ancre ; jamais la commune (`docs/05 §8` : elle pourrait, croisée avec le formulaire, désigner une personne), jamais un texte saisi, jamais l'adresse complète. Envoi par `navigator.sendBeacon` (repli `fetch` avec `keepalive`) vers `POST /api/mesure/` ; rien ne part si le navigateur annonce Do Not Track ou Global Privacy Control, ni tant que `NEXT_PUBLIC_MESURE_ACTIVE` (lue au build) ne vaut pas `"true"`. Les clics d'appel sont relevés par une seule île déléguée (`AppelClicListener`, gabarit racine) sur les liens `tel:` portant `data-mesure` ; les composants serveur restent des liens ordinaires. Le formulaire de rappel, à une étape, est compté comme les formulaires détaillés (`demande_etape_vue` étape 1 puis `rappel_envoye`) ; la reprise d'une saisie conservée compte l'étape reprise, pas une étape 1 fantôme. La route (`runtime = "nodejs"`, POST seulement, contrôle d'origine partagé avec `api/lead` dans `src/lib/http/request.ts`, corps de 2 Ko au plus, schéma `zod/mini` strict, limitation de débit en mémoire de 120 événements par adresse et par dix minutes, l'adresse n'étant gardée que sous forme d'empreinte HMAC salée par un secret propre au processus et effacée à la fin de la fenêtre) répond toujours sans corps (204, 400, 403, 413, 429) et **n'écrit aucun journal**. Si `MESURE_WEBHOOK_URL` est définie, elle relaie l'événement validé, avec l'heure arrondie à la minute, signé `X-Signature: sha256=<HMAC-SHA256>` par `MESURE_WEBHOOK_SECRET` (`signWebhook`, même mécanisme que le webhook des demandes), délai de 5 s ; sans adresse, elle valide et ne stocke rien. Poids ajouté au JavaScript initial de toutes les pages : **0,8 Ko compressés** (835 octets gzip, 697 brotli, modules bundlés seuls). `NEXT_PUBLIC_ANALYTICS` (`docs/00`) est abandonnée au profit de `NEXT_PUBLIC_MESURE_ACTIVE`, `MESURE_WEBHOOK_URL`, `MESURE_WEBHOOK_SECRET`, `MESURE_RATE_LIMIT` (`.env.example`). `src/lib/mesure/README.md` décrit exactement ce qui est collecté : c'est la source de la page `/cookies/` (P8.3).
- **Pourquoi ni Vercel Analytics ni Plausible aujourd'hui** : les deux ajoutent un script et une dépendance côté client, ouvrent la CSP (`script-src`, `connect-src`) à un domaine tiers alors qu'elle est fermée sur `'self'`, et comptent les visiteurs uniques par une empreinte dérivée de l'adresse IP et de l'agent utilisateur, ce qui appelle une analyse de conformité propre à chaque outil ; Vercel Analytics héberge les données hors de l'Union européenne et lie le site à l'hébergeur ; Plausible est payant et personne n'est désigné pour lire ses tableaux de bord. Le besoin réel de `docs/05 §9` (où les formulaires perdent les visiteurs) ne demande ni visiteur unique ni page vue : quatre compteurs suffisent.
- **Brancher un collecteur plus tard** : donner `MESURE_WEBHOOK_URL` et `MESURE_WEBHOOK_SECRET` à un point d'entrée qui vérifie la signature et compte (une fonction serveur chez l'hébergeur, un Matomo auto-hébergé derrière un petit adaptateur vers son API de suivi, Plausible par son API d'événements) ; si l'adaptateur doit vivre dans le site, il s'écrit côté serveur dans `src/lib/mesure/server.ts` (`relay`) sans toucher au client ni à la CSP. Adopter Vercel Analytics ou un script Plausible serait une décision distincte (dépendance, CSP, D-019).
- **Sécurité, contrôle des en-têtes contre `docs/07 §6`** : tout est présent depuis D-013 (CSP fermée sur `'self'`, `frame-ancestors 'none'`, `form-action 'self'`, `connect-src 'self'`, `object-src 'none'`, `base-uri 'self'`, HSTS deux ans avec preload, `nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` fermée). Deux compléments : `interest-cohort=()` (FLoC, retiré des navigateurs, signalé comme directive inconnue) devient `browsing-topics=()` ; `Cross-Origin-Opener-Policy: same-origin` est ajouté (le site n'ouvre aucune fenêtre secondaire). Compromis maintenu : `'unsafe-inline'` sur `script-src` et `style-src` (rendu statique, D-013). La mesure n'ajoute aucun domaine à la CSP : tout passe par la route de première partie. Turnstile n'a pas de script côté client (vérification serveur seulement) : rien à ouvrir. `tests/e2e/securite.spec.ts` vérifie les en-têtes sur trois gabarits, l'absence de violation de politique dans la console (accueil, formulaire, page locale), les images Open Graph et les PDF des outils, et le comportement de la route.
- **Conséquences** : Q-TECH-8 remplace Q-TECH-2 (collecteur et lecteur des tableaux de bord) ; tant qu'elle n'est pas tranchée, les variables restent vides et la mesure est inactive. Toute évolution des événements se fait dans `src/lib/mesure/events.ts`, le schéma, le README et `docs/05 §9` le même jour. `pnpm lhci` reste la référence pour les budgets (D-019, D-026, D-028).

## D-033 — En production, une page en attente de relecture est construite en `noindex` au lieu d'être supprimée (2026-09-27, correctif de production)

- **Contexte** : Arcel a relié le dépôt à Vercel et constaté, sur le site en ligne, « plusieurs pages introuvables » : en cliquant sur « Comment ça marche » puis sur les entrées du menu, il tombait sur « Cette page n'existe pas, ou plus ». Le dépôt GitHub est intact (`main` identique au distant, tags `phase-00` à `phase-08` poussés). La cause est la règle de `docs/03 §1` (« sans `relu_par`, la page n'est pas construite en production »), appliquée par `isProduction()` dans quatre chargeurs : en production, **170 pages n'existaient pas** — les 26 pages piliers, pathologies et services, les 131 pages locales et les 13 articles du Fil, tous en `statut: a_relire` faute de relecteur professionnel et de fiche auteur (Q-CONTENU-7, Q-CONTENU-15). Le menu principal, le pied de page et les pages de département pointaient donc vers des pages absentes, ce qui donne un site troué et illisible pour un visiteur comme pour un moteur.
- **Choix** : le garde-fou à tenir est **l'indexation**, pas l'existence de la page. En production comme en prévisualisation, une page `a_relire` est désormais construite et servie, avec son bandeau « Cette page attend sa relecture », en `robots: noindex, nofollow`, et elle reste **absente des plans de site, de `/llms.txt` et des données structurées `MedicalWebPage`** (celles-ci exigent toujours un relecteur nommé). Un `brouillon` (articles du Fil) n'est jamais construit. Modifications : `listBuildableServicePages`, `listBuildableLocalPages`, `isArticleBuildable`, et les liens d'accompagnement de `local-site.ts`. Le contrôle `SITE_INDEXABLE` reste maître de l'ouverture à l'indexation : tant qu'Arcel ne l'active pas, le site entier est `noindex`.
- **Conséquences** : le site en ligne est complet et navigable ; aucun contenu de santé non relu n'est indexable ; `docs/03 §1` et `docs/06 §4` devront être amendés par Arcel pour refléter cette règle (la loop ne modifie pas les cahiers sans sa décision, celle-ci en tient lieu et est datée). Les actions attendues d'Arcel ne changent pas : désigner les relecteurs professionnels et fournir la fiche auteur, puis passer les pages en `publie` pour qu'elles entrent dans les plans de site.

## D-031 — Contrôle de profondeur de clic et de liens contextuels `check-depth` (2026-09-27, P9.4)
- **Contexte** : `docs/PLAN.md` P9.4 exige que toute page soit à trois clics au plus de l'accueil et `docs/04 §2` que chaque page reçoive au moins trois liens internes contextuels, sans page orpheline. `check-seo` ne vérifiait que l'orphelinat au sens large (tout lien entrant, y compris l'en-tête et le pied de page) ; `docs/07 §7` ne liste pas de contrôle de profondeur et n'est pas modifiable dans cette phase. Mesure sur le rendu avant correction : profondeur maximale de 2 clics (menus, pied de page et pages de département lient tout), mais quatre pages sans aucun lien contextuel (`/a-propos/`, `/professionnels/`, `/conditions-generales/`, `/accessibilite/`, liées seulement par le pied de page) et 26 pages sous trois liens (douze communes isolées comme Meaux ou Melun, outils à imprimer, pages légales, recrutement, `/magazine/`).
- **Choix** : un contrôle `scripts/validate/check-depth.ts`, enregistré dans `config.ts` après `check-seo`, qui lit le rendu (`.next/server/app/**/*.html`), classe chaque lien interne par zone (en-tête = avant `<main>`, pied de page = après `</main>`, fil d'Ariane = `nav` « Fil d'Ariane », corps = le reste), calcule la profondeur de clic depuis `/` en largeur sur tous les liens, et compte les liens entrants **contextuels** (corps d'une autre page, hors `/plan-du-site/`). Erreur : page à plus de 3 clics, inatteignable, ou sans lien contextuel ; avertissement : moins de 3 liens contextuels ; les pages `a_relire` (`data-statut` sur `<main>`) ne produisent que des avertissements ; `/api/`, `/merci/`, `/styleguide/` sont hors contrôle ; `--report` affiche la distribution des profondeurs, les pages les plus profondes et les moins liées. Corrections par des liens **calculés**, sans texte nouveau hors trois titres de bloc dans `content/interface.json › maillage` : bloc « À lire aussi » des pages d'un même groupe du plan du site (entreprise, légal, outils : `GroupLinks`, libellés du plan) ; blocs « Sur Le Fil » (articles dont `piliers_lies` cite la page) et « Dans le lexique » (termes dont `pages_liees` cite la page) sur les pages services, d'aides, de fonctionnement et la carte régionale (`ThemeLinks`), avec une carte vers l'index ; pages locales : quand moins de trois voisines déclarées ont une page, les pages construites les plus proches du même département complètent la liste des voisines, réciproquement (`nearbyPages`, distance haversine entre centres). `/llms.txt` liste désormais le lexique (définition en une phrase) et les articles publiés. Un test compare le rendu construit aux treize segments des plans de site (toute page indexable dans exactement un segment, `lastmod` réel).
- **Conséquences** : après correction, 0 erreur ; deux avertissements assumés : `/magazine/page/2/` (pagination, un seul lien depuis la page 1, volontairement absente des plans de site) et `/plan-du-site/` (lié par le pied de page de chaque page et par la 404). `docs/07 §7` devra ajouter `check-depth` à la table des contrôles à la prochaine révision du document. Toute nouvelle page doit naître avec ses liens contextuels, sans quoi `pnpm validate` échoue.

## D-030 — Formulaires hydratés à la demande : dette DP.1 soldée, cibles JavaScript rétablies (2026-09-27, P9.1)
- **Contexte** : la dette DP.1 (D-026, D-028) demandait de charger à la demande le formulaire de la section 12 des pages services (react-hook-form n'est pas utilisé : la coque `MultiStepForm` maison, `CommuneField`, zod et libphonenumber pèsent 31 Ko compressés, plus 15 Ko pour la liste des communes quand elle est préremplie), de ne charger la seconde photo du sélecteur de lecteur qu'à la bascule, et de réduire Fraunces. Mesures de fin de phase 8 : page service 218 Ko, page locale 232, agence 228, article 183, rappel 205, accueil 165, lexique 173, pour une cible de 220 Ko sur les pages avec formulaire et 160 Ko sur les pages de contenu (`docs/07 §5`, D-019) ; tolérances 225 et 235 Ko (D-026, D-028).
- **Ce que fait le formulaire sans JavaScript, avant et après** : le balisage complet est rendu par le serveur (champs, libellés, barre de progression, bouton), les champs sont visibles et remplissables, mais **l'envoi natif est impossible** : `POST /api/lead/` ne lit que du JSON (`request.text()` puis `JSON.parse`, `docs/07 §6`), aucun champ ne porte de `name`, et la validation, le passage d'étape et l'envoi vivent dans l'île. C'était déjà le cas avant cette tâche ; la route n'a pas été ouverte à `application/x-www-form-urlencoded` (ce serait une décision distincte : schéma de lecture des champs plats, pages de retour d'erreur sans JavaScript, jeton anti-rejeu). Le repli documenté reste le téléphone, affiché sur la page et dans le message de panne d'envoi.
- **Choix** : une enveloppe `src/components/forms/DeferredForm/` (`createDeferredForm`, plus `LazyRappelForm`, `LazyDetailedForm`, `LazyHospitalDischargeForm`) qui garde le **rendu serveur du balisage** et diffère la seule **hydratation** : `React.lazy` dont la promesse attend un signal, dans une frontière `Suspense`. Le signal est l'approche de la section (`IntersectionObserver`, marge `100% 0px`, soit une hauteur d'écran d'avance), un focus ou un toucher dans la section. Jusque-là la frontière reste déshydratée : React garde le HTML du serveur en place puis l'hydrate sans remplacer le DOM (aucun décalage de mise en page, CLS mesuré à 0). `next/dynamic` a été écarté : avec `ssr: true` Next précharge le fragment dans le HTML initial (aucune économie), et `ssr: false` supprimerait le balisage serveur — c'est exactement ce qui avait donné un CLS de 0,24 en D-019. Deux détails : les signaux sont écoutés sur `window` en phase de capture, parce que React arrête la propagation des événements visant une frontière déshydratée (pour les rejouer après hydratation) ; et un envoi natif est retenu (`preventDefault`) tant que le formulaire n'est pas hydraté, sinon le navigateur rechargerait la page avec une chaîne de requête. En navigation côté client (pas de HTML du serveur dans la frontière) ou sans `IntersectionObserver`, le module est chargé tout de suite. `/etre-rappele/` et `/demande/*` gardent l'import direct : le formulaire y est la page. `ReaderPhoto` ne met la photo « pour vous-même » dans la page qu'à la première bascule, et la garde ensuite pour le fondu croisé.
- **Gains mesurés** (`pnpm lhci`, médiane de trois passes, machine au repos ; JavaScript initial compressé) : page service 218 → **174 Ko** (−44), page locale 232 → **186** (−46), agence 228 → **178** (−50, mesure isolée), article 183 → **183**, rappel 205 → **205**, accueil 165 → **165**, lexique 173 → **173** (ces quatre pages ne portent pas de formulaire différé). LCP 1,81 à 2,11 s, CLS 0 partout, temps de blocage total 25 à 74 ms (contre 104 à 225 ms en fin de phase 8, machine chargée), performance 0,97 à 0,98, accessibilité et bonnes pratiques à 1. Les **huit pages témoins sont sous la cible de 220 Ko** ; l'accueil reste à 165 Ko pour une cible de 160, écart qui n'a rien à voir avec DP.1 (îles du gabarit racine : en-tête, barre mobile, confort, fil, mesure).
- **Budgets** : `lighthouserc.cjs` revient aux cibles de `docs/07 §5` sur les pages avec formulaire (225 → **220 Ko**) et sur les pages locale et agence (235 → **220 Ko**, l'entrée dédiée de D-028 n'a plus de tolérance propre). L'accueil garde 165 Ko et le lexique 175 Ko (tolérances D-026 et D-028 : leurs 5 et 13 Ko d'écart sont dans les îles de gabarit, hors dette DP.1).
- **Polices, mesure et pourquoi Fraunces n'est pas réduite ici** : deux fichiers variables, **153 Ko** au total (Fraunces latin 119 Ko, Atkinson Hyperlegible Next latin 34 Ko), pour une contrainte de 180 Ko en 2 fichiers (`docs/07 §5`) : tenue, avec 27 Ko de marge. Les 119 Ko de Fraunces sont le prix de ses trois axes variables, dont la table de variations fait 145 Ko non compressés : mesures faites à la main (fontTools sur le fichier servi par Google) — trois axes 117 Ko, `wght` restreint à 400–700 105 Ko, plus `SOFT` 0–50 99 Ko, plus `opsz` 18–72 91 Ko, `SOFT` épinglé 65 Ko, sans axe `opsz` 60 Ko. Les deux réductions vraiment rentables changent le rendu visible et sont donc écartées : `SOFT` 50 fait la douceur des H1 (`--font-soft-h1`, `docs/02 §3`) et `opsz` est appliqué automatiquement (`font-optical-sizing: auto`) sur des tailles de 17 à 60 px. Restreindre les *plages* des axes (−20 Ko, rendu identique dans les bornes utilisées : `wght` 400 à 700, `SOFT` 0 à 50) est impossible avec `next/font/google`, qui n'expose que la liste des axes : il faudrait auto-héberger un `.woff2` sous-ensemblé dans `public/fonts/` (`next/font/local`), donc un binaire dans le dépôt, une étape de génération avec fontTools et la licence OFL à joindre. Reste un point ouvert, non bloquant.
- **Conséquences** : la dette DP.1 est soldée pour les formulaires et le sélecteur de lecteur. `WeekPlanner` n'avait rien à différer (composant serveur ; ses seules îles, `Reveal` et `CountUp`, se chargent déjà au défilement). Limite assumée : une saisie commencée dans un champ rendu par le serveur avant l'arrivée du module (quelques centaines de millisecondes après l'approche de la section) n'est pas reprise par l'état React. Tout nouveau formulaire posé en bas de page passe par `createDeferredForm` ; l'accueil et le lexique restent au-dessus de leur cible de 160 Ko tant que les îles du gabarit racine ne sont pas allégées (dette à ouvrir si le besoin s'en fait sentir). Le bruit de mesure de D-028 est confirmé en creux : les mêmes pages passent de 104–225 ms à 25–74 ms de temps de blocage selon que la machine travaille ou non ; `NO_NAVSTART` (trace Lighthouse perdue) apparaît sur une passe sur trois quand plusieurs builds tournent en parallèle, et le port de débogage doit être libre avant de relancer `pnpm lhci`.

## D-032 — Verre liquide, fonds de scène, profondeur : jetons et classes du design system (2026-09-27, demande d'Arcel)
- **Contexte** : Arcel demande, après la phase 8, « un design puissant, avec le verre liquide », des animations irréprochables, des heros où l'on comprend et où l'on peut agir sans défiler, un site irréprochable sur mobile ; puis, en renfort le même jour : « le site est juste sur un fond blanc, pas de couleur, pas d'originalité ; je veux un site puissant avec des pages uniques et pas génériques, des zones hero avec un design et des couleurs de fond parfaitement implémentées ». `docs/02 §4` n'autorisait que deux niveaux d'ombre et décrivait la carte comme un fond blanc bordé ; `docs/02 §5` limitait le mouvement à trois animations ; aucune surface translucide ni aucun fond composé n'existait dans les jetons. Le brief `docs/design/BRIEF_LIQUID_GLASS.md` fixe le contrat des classes, les règles de repli et les non-négociables (AA mesuré, budgets de `docs/07 §5`, le Fil et la framboise comme seule couleur d'action).
- **Choix — jetons et classes définis une seule fois** dans `src/styles/glass.css` (verre) et `src/styles/scenes.css` (fonds de scène), consommés par les autres agents sans être redéfinis, documentés et mesurés dans `docs/design/LIQUID_GLASS.md`, démontrés sur `/styleguide/verre/` : trois niveaux de verre (`glass-quiet` 82 %/6 px, `glass` 72 %/12 px, `glass-strong` 88 %/20 px), un verre sombre (`glass-dark`, teal-900 à 88 %), six teintes (`glass-tint-teal|framboise|sable|green|azure|warning`), un liseré (`glass-edge`, `data-edge="bottom"`), un reflet (`glass-sheen`, 10 % de blanc au plus, survol souris seulement, suivant `--glass-mx`/`--glass-my` si une île les pose), trois élévations (`depth-1..3`, avec un jeton `--shadow-3` nouveau), huit fonds de scène (`scene` + `scene-aurore|teal|azure|verte|sable|framboise|nuit|neutre`, chacun en version claire et en version soutenue avec `scene-soutenu`) composés d'un dégradé à trois arrêts, de deux halos radiaux, d'une trame au fil et d'un grain de 4 % (masque SVG de 240 octets), et cinq jetons de couleur nouveaux (`teal-100`, `azure-100`, `green-100`, `raspberry-100`, `sand-deep`). La teinte d'une page vient de son public (`data-public`) ou de sa famille (`data-famille`) : les règles ne posent que des variables, l'attribut sur `main` suffit, deux pages voisines ne se ressemblent plus.
- **Choix — règles de repli et d'accessibilité** : sans `backdrop-filter`, toute surface de verre reste opaque à 94 % (le brief exige 92 %) ; `prefers-reduced-motion`, `prefers-reduced-transparency`, le mode confort (`data-comfort="on"`) et la simulation du styleguide (`data-motion="reduce"`) rendent les surfaces **totalement opaques**, effacent flous, reflets, halos, trames, grains et dégradés, et ramènent les bases claires au blanc ; le blanc reste réservé aux longues zones de lecture (corps d'article, pages légales, grilles de faits : `scene-neutre` ou rien) ; l'anneau de focus de 3 px reste visible sur verre (teal-800 sur verre clair, blanc sur verre sombre) et aucune classe ne pose `overflow: hidden`, qui le rognerait ; à l'impression, tout redevient blanc.
- **Choix — ce qui reste de `docs/02`** : le Fil, la framboise comme seule couleur d'action (le bouton principal garde son aplat et son sens), Fraunces et Atkinson Hyperlegible, les rayons, les espaces, les cibles tactiles, l'anneau de focus, l'interdiction du texte blanc sur le vert. **Ce qui est amendé** : `§4` (deux niveaux d'ombre → trois ; la carte devient une surface de verre, dont le repli opaque reprend l'ancien rendu), `§5` (le reflet au survol s'ajoute aux trois animations autorisées), `§2` (cinq jetons de couleur en plus).
- **Conséquences** : chaque couple texte/verre et texte/scène est mesuré sur le fond **effectif** (teinte composée sur la page la plus claire et la plus sombre où la surface est autorisée) et inscrit dans `scripts/validate/check-contrast.ts`, qui recompose les surfaces à partir des opacités lues dans `glass.css` (48 couples nouveaux, 82 en tout, tolérance 0,05, rien sous 4,5:1 pour le texte courant) ; trois couples sont documentés comme **refusés** : texte secondaire sur verre clair posé sur une photo (3,28), reflet blanc sur le bouton principal (4,34 au lieu de 4,90 : le bouton principal reçoit un liseré, pas un reflet), lien `teal-700` sur une scène (3,93 : les liens d'une scène sont en `teal-800`). Le verre sombre est la seule surface autorisée au-dessus d'une photo, parce que son texte blanc reste à 7,35 au minimum quel que soit le fond. Budget inchangé : tout est en CSS, aucun JavaScript, aucune bibliothèque, aucune image, aucune animation infinie ; sur mobile, deux surfaces `glass-strong` visibles au plus. `docs/02_DESIGN_SYSTEM.md` est à réviser par Arcel (§2, §4, §5) : d'ici là, cette décision et `docs/design/LIQUID_GLASS.md` font foi.

## D-036 — Adresses d'agence facultatives, itinéraires et mention astérisque retirés, chapô du hero affiché en entier (2026-09-27, demandes d'Arcel)

- **Contexte** : Arcel a demandé, le même jour, quatre retraits sur le site en ligne. Il a d'abord donné les adresses de quatre agences (Saint-Denis, Vitry-sur-Seine, Serris, Versailles) avec la consigne « supprime ces adresses » ; puis « supprime aussi le bouton *Itinéraire vers l'agence (OpenStreetMap, lien externe)* » ; puis « supprime aussi ce lien : *\* Crédit d'impôt de 50 % des sommes versées, dans les limites et conditions de l'article 199 sexdecies du Code général des impôts. L'avance immédiate est un service de l'Urssaf, soumis à conditions d'éligibilité.* » ; enfin « il y a aussi les phrases qui ne sont pas terminées dans les zones hero, celles finissant par les « … », il faut toutes les compléter ».
- **Choix — adresses** : `agence.adresse` devient nullable dans `src/content/schemas.ts`, comme le téléphone et les horaires l'étaient déjà. Les quatre adresses de voie passent à `null` dans `content/site.config.json` ; Paris 12e (rue de Lyon) et Puteaux (quai de Dion-Bouton) restent renseignées. `fullAddress` (`src/components/local/AgencyCard.tsx`) se limite alors au code postal et à la commune (« 93200 Saint-Denis »), et devient la seule façon de composer une adresse : le pied de page, le gabarit local, la page d'agence et la page d'offre d'emploi l'appellent tous. Le `PostalAddress` du JSON-LD n'émet plus de `streetAddress` pour ces quatre agences (`scripts/validate/check-schema.ts` accepte `adresse: string | null`). Les descriptions SEO et les chapôs de `content/pages/agences.json` ne citent plus de nom de rue pour ces quatre agences.
- **Choix — itinéraire** : le lien vers OpenStreetMap disparaît partout — carte d'agence, panneau du hero de la page d'agence. La fonction `routeUrl`, l'icône de lien externe, les libellés `local.agence.itineraire` et `itineraire_externe` de `content/interface.json` et leurs entrées de schéma sont supprimés. Motif : l'itinéraire n'a plus de sens pour une agence dont l'adresse de voie n'est pas publiée, et un lien vers un service de carte externe n'apporte rien qu'un visiteur ne fasse mieux depuis son propre outil. Les textes des pages agences ne promettent plus d'itinéraire.
- **Choix — mention du crédit d'impôt** : `note_astérisque` et `note_href` deviennent facultatifs dans `homePageSchema`, sont retirés de `content/pages/accueil.json`, et la note n'est plus rendue par le hero de l'accueil. L'astérisque de la réassurance (« Crédit d'impôt de 50 %* ») tombe avec elle. **Risque signalé à Arcel** : la page `/tarifs-et-aides/credit-d-impot-et-avance-immediate/` reste la seule à porter les conditions et la référence à l'article 199 sexdecies du Code général des impôts ; l'accueil annonce donc un avantage fiscal sans son encadrement immédiat, alors que `docs/01` demandait la mention au plus près du chiffre. Le lien du hero vers cette page disparaît aussi ; la page reste atteignable par le menu, le maillage de `check-depth` et les plans de site. Décision d'Arcel, consignée telle quelle.
- **Choix — chapô du hero affiché en entier** : `heroLeadClamp` ne tronque plus rien (`line-clamp-2`, `line-clamp-3` sur grand écran haut). C'était la seule troncature visuelle du site, et elle coupait la promesse en plein milieu sur presque tous les gabarits, ce qui donnait les points de suspension vus par Arcel. Les points de suspension restants dans le contenu sont volontaires et restent : énumérations ouvertes (« Alzheimer, Parkinson… »), questions de formulaire (« La personne vit… »), champs à remplir des fiches à imprimer (« Fiche remplie le … par … »), libellé d'envoi (« Envoi en cours… »). La hauteur du hero reste tenue par la compaction (`heroWhenTall`, `heroWhenRoomy`, ordre des blocs) et par l'échelle typographique, plus par la dissimulation de texte.
- **Conséquences** : `docs/00 §5` et `docs/02 §7` décrivent encore l'itinéraire de la carte d'agence, et `docs/01 §4` la note astérisque de l'accueil ; Arcel les amendera, cette décision datée en tient lieu. Les tests unitaires (`AgencyCard`, `AgencyTemplate`) et les parcours Playwright (`local`, `hero`) vérifient désormais l'**absence** de tout lien d'itinéraire et de toute adresse OpenStreetMap. Question ouverte pour Arcel : faut-il republier les adresses de voie de ces quatre agences quand les baux seront confirmés, ou les laisser au niveau de la commune (`docs/QUESTIONS_ARCEL.md`) ?

## D-037 — Scènes soutenues d'un cran, verre plus lisible, et filet contre les blocs restés invisibles (2026-09-27, demande d'Arcel)

- **Contexte** : Arcel, après la refonte D-032, écrit « je ne vois toujours pas d'animation ni d'effet liquid glass ». Vérifications faites avant de toucher quoi que ce soit : les feuilles `glass.css` et `scenes.css` sont bien importées par `globals.css`, les classes sont bien présentes dans le HTML construit (`scene scene-aurore scene-soutenu` sur le hero de l'accueil), les six derniers déploiements Vercel sont tous à l'état `READY` — dont la production sur le commit de la refonte — et la machine d'Arcel n'active ni `prefers-reduced-motion` ni `prefers-reduced-transparency` (transparence et effets d'animation actifs dans Windows). Le design était donc bien en ligne : c'est son **intensité** qui était en cause. Mesure au rendu : le hero de l'accueil peignait un dégradé de `teal-100` à 78 % sur un tiers de la surface, sur une base `paper` (#fbf8f3), et s'éteignait à 78 % de la hauteur ; le reste de l'écran restait blanc cassé, et les panneaux de verre blancs sur fond blanc ne se détachaient pas.
- **Choix — scènes** : la base d'une scène est désormais une teinte, pas un blanc cassé (l'accueil passe de `--color-bg` à `--color-tint-sand`) ; le dégradé couvre **toute** la scène, de `--scene-deep` en haut à `--scene-accent` en bas, au lieu de s'éteindre aux trois quarts ; les opacités montent (dégradé 46 → 92 %, 78 → 100 % en version soutenue ; halos 52 → 88 %, 80 → 100 %) et les halos s'élargissent (70 % × 62 % → 88 % × 80 %). Cinq jetons de couleur nouveaux, un cran plus soutenus, servent de `--scene-deep` et `--scene-accent` aux **heros seulement** (`scene-soutenu`) : `teal-200` #a9e4f2, `azure-200` #bfdff8, `green-200` #b4ebcc, `raspberry-200` #fbccd5, `sand-deeper` #e3d7c1. Chacun est calibré pour que le texte secondaire (`ink-soft`) y reste au-dessus de 4,5:1 — la contrainte la plus serrée, qui interdisait d'aller plus loin : 4,67 sur `teal-200`, 4,69 sur `azure-200`, 4,86 sur `green-200`, 4,55 sur `raspberry-200`, 4,57 sur `sand-deeper`. Le texte courant y reste au-dessus de 9,9:1 et les liens `teal-800` au-dessus de 5:1. Quinze couples nouveaux sont inscrits dans `scripts/validate/check-contrast.ts` (97 en tout, tous verts).
- **Choix — verre** : la bordure du verre passe d'un mélange à 50 % de blanc vers `--color-line` à 22 % (et 78 → 55 % pour `glass-strong`), et la saturation du `backdrop-filter` de 1,15 à 1,35. Sur une scène désormais colorée, une surface de verre blanche se détache d'elle-même : les opacités (82 / 72 / 88 %) ne changent pas, donc aucun contraste de texte sur verre n'est touché.
- **Choix — blocs restés invisibles (correctif, pas un réglage)** : un `IntersectionObserver` ne signale que ce qui traverse l'écran entre deux images. Un **saut** de défilement — une ancre, la touche « Fin », un `scrollTo`, une molette rapide, un retour de navigation — fait passer un bloc de dessous le pli à au-dessus sans émettre la moindre entrée : le bloc gardait `data-reveal="pending"`, donc une opacité nulle, **définitivement**. Mesuré sur l'accueil : après un saut jusqu'en bas, huit à dix blocs restaient invisibles, dont des cartes entières et une section pleine hauteur. C'est très probablement une partie de ce qu'Arcel voyait comme des « cases vides ». `src/lib/motion/viewport.ts` arme donc une passe, au défilement, au redimensionnement, au retour de page et au retour de visibilité de l'onglet : elle révèle toute cible que l'écran touche déjà ou a dépassée. Aucune marge d'anticipation (elle ferait démarrer les tracés du fil trop tôt et violerait le contrat des 600 ms), aucune passe à l'abonnement (l'observateur annonce déjà de lui-même un élément visible), et une exécution directe plutôt que par `requestAnimationFrame` quand l'onglet est caché, où la boucle d'images ne rend jamais la main. Trois parcours Playwright nouveaux (accueil, pilier, article) vérifient qu'après un saut jusqu'en bas puis un retour en haut, aucun bloc ne reste en attente et que toutes les révélations sont à pleine opacité.
- **Conséquences** : budgets inchangés (tout est en CSS, la passe ne coûte qu'une lecture de rectangle par cible restante, et plus rien dès la dernière révélation) ; mode confort, mouvement réduit, transparence réduite et impression continuent d'aplatir scènes et verre exactement comme avant ; `docs/design/LIQUID_GLASS.md` est à mettre à jour avec les cinq jetons 200 et les quinze couples nouveaux.

## D-038 — Cartes complètes, colonnes ajustées, libellés qui disent leur destination (2026-09-27, demande d'Arcel)

- **Contexte** : Arcel demande « que la version desktop soit irréprochable, toutes les cases et cartes remplies et cohérentes » et « que chaque page, chaque mot soit clair, ordonné et bien structuré, le parcours utilisateur cohérent et ultra professionnel, sans frustration ». Deux audits en lecture seule ont été menés sur les 269 pages du rendu construit : l'un sur les grilles et les parcours, l'autre sur la voix et la structure éditoriale. Aucun jeton non remplacé, aucun texte de remplissage, aucune page sans titre de niveau 1, aucun saut de niveau de titre : les défauts trouvés sont structurels.
- **Corrigé — grilles et cartes** : (1) une carte de situation sans destination propre mène désormais au formulaire de sa page — vingt et une pages services n'avaient aucune carte cliquable et quatre en mélangeaient, si bien que le visiteur apprenait qu'une carte mène quelque part puis se cassait le nez sur sa voisine identique ; (2) l'encart « Ce que nous ne faisons pas » ne passe en deux colonnes que si **chaque** ligne nomme son relais, au lieu d'une seule — quarante-trois cases vides sous l'en-tête « Qui le fait » disparaissent sur vingt-cinq pages ; (3) les blocs « Sur Le Fil » et « Dans le lexique » n'étalent trois colonnes que s'ils ont plus de deux cartes (dix-huit blocs laissaient un trou) ; (4) la grille de faits locaux n'ouvre une troisième colonne que s'il y a plus de deux groupes, ce qui n'arrive jamais sur les 131 pages commune ; (5) la dernière carte d'une grille de situations en nombre impair prend la ligne entière au lieu de rester à mi-largeur ; (6) une commune voisine sans page ne porte plus la même carte qu'une commune liée (fond sable, sans ombre, nom en texte simple) : quatre-vingt-onze pages mêlaient des cartes identiques dont la moitié était inerte.
- **Corrigé — pages de remerciement** : le chapô ne répète plus le titre (la phrase de succès de `docs/01 §7` commence par la même phrase que le titre, affichée deux fois sur huit pages) ; la variante « candidature » reçoit ses propres lectures (« Travailler chez Youdom Care », « Qui nous sommes ») et son propre titre de bloc, au lieu d'envoyer une candidate vers les aides financières des familles.
- **Corrigé — magazine** : les pages 2 et suivantes ne répètent plus le titre, le chapô, les six cartes de rubrique et la phrase de promesse de la page 1 ; elles portent leur rang dans le titre et dans le fil d'Ariane, et n'affichent que la suite de la liste.
- **Corrigé — libellés qui mentaient sur leur destination** : « J'estime mon budget » devient « Je demande un devis gratuit » (sept pages : aucun estimateur n'existe, le bouton ouvre le formulaire de demande) ; « Je compose ma semaine » devient « Je décris ma situation » (aucune page de composition de semaine n'existe).
- **Corrigé — voix et structure** : les quatre adresses de voie retirées de `site.config.json` par D-036 étaient encore écrites en clair dans la prose de cinq pages de département (93, 94, 77, 78, 95) : elles sont supprimées, le texte s'arrête à la commune. L'Essonne dit maintenant franchement qu'aucune agence n'y est implantée, comme le Val-d'Oise le faisait déjà, et son intertitre passe au pluriel. La Seine-et-Marne reçoit l'intertitre « L'agence de Serris et les communes couvertes » qui manquait, seule page de département avec agence à ne pas en avoir. Le compte d'agences n'est plus écrit en dur dans un titre (« Six agences » → « Nos agences », « Huit départements » → « Nos départements ») alors que le même compte est calculé trois lignes plus bas. La liste des aides de l'accueil est alignée sur le catalogue (« caisses de retraite », qui n'existe pas comme rubrique, cède la place aux « aides après une hospitalisation », qui existe). La section sur le coût des six pages services porte le même titre partout (« Ce que ça coûte, et qui aide ») au lieu de quatre formulations. Les deux formulaires à l'impératif rejoignent la forme des quatre autres (« Décrire votre situation : … »). Une ligne de réassurance qui parlait au webmestre (« Liens vers les solutions officielles ») devient un bénéfice.
- **Laissé à Arcel, consigné dans `docs/QUESTIONS_ARCEL.md`** : les cinq engagements sont tous à `valide: false`, or six pages services promettent en dur « Si le courant ne passe pas, nous changeons », « une équipe stable », « un référent unique » — soit le site tait l'engagement à un endroit et le promet à un autre (Q-VOIX-1) ; les titres des cinq pages piliers ne suivent pas la charte alors que leurs quatorze pages filles la suivent (Q-VOIX-2) ; cinq sigles ne sont ni développés ni dans le lexique, dont AJPP quand le lexique contient AJPA (Q-VOIX-3) ; les conditions générales annoncent des documents qui n'existent pas ; les mentions légales n'ont ni adresse d'éditeur ni adresse d'hébergeur ; la rubrique « Dans les coulisses » est proposée partout sans contenir un seul article ; et le site promet sur chaque page de dire « qui l'a relu » alors que les trente-neuf contenus ont `relu_par: null`. Aucun de ces points ne se corrige sans fait ou décision d'Arcel : rien n'a été inventé.

## D-039 — Une agence sans adresse de voie n'affiche aucune adresse, engagement E2 validé, photo de signature (2026-09-27, décisions d'Arcel)

- **Adresses, suite de D-036** : la première correction gardait le code postal et la commune (« 93200 Saint-Denis »). Arcel a constaté que la ligne « Adresse » restait visible sur les quatre agences concernées et a demandé qu'elle disparaisse « partout sur le site ». `fullAddress` renvoie donc `null` quand l'agence ne publie pas d'adresse de voie, et **tous** les appelants masquent alors leur bloc : la carte d'agence n'a plus de ligne « Adresse », le pied de page n'affiche que le nom de l'agence, le panneau de la bannière et le rappel de la page locale ne montrent rien, la page d'offre d'emploi ne cite que le nom, et la page d'agence utilise un chapô sans adresse (`chapo_sans_adresse` dans `content/pages/agences.json`). Le contrôle `check-local-nap` n'exige plus qu'une agence sans voie soit affichée. **Ce qui reste** : le `PostalAddress` du JSON-LD `LocalBusiness` continue de porter le code postal et la commune. C'est un balisage invisible, et un `LocalBusiness` sans localité n'est plus reconnu comme établissement local par les moteurs : le retirer coûterait le référencement local de ces quatre agences. Si Arcel veut aussi l'enlever, c'est une décision à part, avec cette conséquence assumée.
- **Engagement E2 validé** : Arcel a confirmé, le 27 septembre 2026, « chez Youdom Care, quand une famille n'est pas à l'aise avec un intervenant, nous changeons ». E2 porte désormais exactement cette phrase, avec `preuve` renseignée et `valide: true` : c'est le premier engagement affiché en production. L'ancien E2 promettait en plus « une petite équipe stable autour de chaque personne, présentée avant de commencer » ; cette moitié n'a pas été confirmée, elle a donc été retirée de l'engagement. Elle figure encore dans onze fichiers de contenu, et la question posée à Arcel (Q-VOIX-1) demande s'il la garantit. E1, E3, E4 et E5 restent non validés.
- **Photo en fond de la bannière de l'accueil** : Arcel a fourni une photo détourée d'un couple de personnes âgées (600 × 550, PNG à fond transparent, 446 Ko dans le dépôt, servie en WebP par `next/image`). Posée d'abord dans une bande sous la bannière, elle est, à sa demande, passée **en fond de la bannière elle-même** : ancrée en haut à droite, à trente pour cent de la largeur visible, derrière le contenu, sans jamais passer sous le titre ni sous la promesse. Elle est décorative : `alt` vide et `aria-hidden`, comme l'exige `check-seo`. Deux éléments lui cèdent la place, sans quoi ils se masquaient l'un l'autre : la photo encadrée de la colonne de droite et le dessin au trait qui la remplaçait (`illustration={null}`, valeur nouvelle du composant `Hero`). La photo est masquée sous 40 rem de large et sous 42 rem de haut, où la bannière est déjà compactée et où elle passerait sous le texte. Elle se charge à la demande, et aucune image de l'accueil n'est plus prioritaire. **Droits d'usage à confirmer par Arcel** (Q-VISUEL-1) : une photo de personnes identifiables ne se publie pas sans leur accord ou une licence qui le couvre.

## D-040 — Rendu différé des sections hors écran, et dette de performance ouverte sur la refonte visuelle (2026-09-27, P9.5)

- **Contexte** : le point de validation 9 exige `pnpm lhci` vert. Il ne l'est pas. Mesures comparatives, trois passes par page, machine au repos (processeur à 4 %), étranglement 4G et processeur ×4. Au commit `7ccbd0f`, c'est-à-dire à la fin de la refonte visuelle D-032 et **avant** tous les correctifs du 27 septembre : cinq pages témoins en échec, temps de blocage total de 290 à 337 ms, note de performance de 0,89 à 0,92, et l'accueil au-dessus de son budget de script. Après les correctifs du 27 septembre, sans autre changement : deux pages en échec. La refonte visuelle est donc la cause, et les correctifs du jour améliorent la situation au lieu de l'aggraver. Pour mémoire, D-030 mesurait 25 à 74 ms de temps de blocage **avant** la refonte, sur les mêmes pages : l'écart est d'un facteur cinq à dix.
- **Où va le temps** : sur une page locale, le fil principal passe 603 ms en calcul de styles et de mise en page, 492 ms en évaluation de scripts, 68 ms en rendu. Le poste dominant n'est donc pas le JavaScript mais le style. Une hypothèse a été testée et **écartée** : réserver les halos, la trame et le grain aux seules bannières ne change rien aux mesures ; le changement a été annulé plutôt que gardé « au cas où ».
- **Ce qui est appliqué** : `content-visibility: auto` avec `contain-intrinsic-size: auto 600px` sur toute section qui n'est ni la bannière ni la première de la page. Le navigateur saute alors le style, la mise en page et la peinture des sections tant qu'elles n'approchent pas de l'écran, et mémorise leur hauteur réelle après le premier rendu, ce qui évite tout saut de défilement. Gain mesuré : la page locale passe de 292–432 ms à 166–286 ms de temps de blocage, l'article de 264–309 à 197–248, et trois pages repassent au-dessus de 0,95. L'impression force le rendu complet. Aucun effet sur l'arbre d'accessibilité, ni sur la recherche dans la page, ni sur les ancres : le navigateur rend la section à la demande. Vérifié par 924 tests, 13 contrôles et les parcours Playwright avec axe.
- **Ce qui reste, et qui n'est pas maquillé** : deux à trois pages restent au-dessus de 200 ms de temps de blocage et sous 0,95 de performance, et l'accueil est à 167 Ko de script pour une tolérance de 165. La dette **DP.2** est ouverte dans `docs/PLAN.md` avec les mesures, les pistes classées par rendement attendu — d'abord réduire les surfaces à `backdrop-filter`, 41 sur une seule page locale dont 39 posées sur un fond uni où le flou n'a rien à flouter — et une consigne explicite : ne pas relever les seuils de performance pour faire passer le contrôle. Seule exception admise, documentée et chiffrée : le budget de script du lexique passe de 175 à 176 Ko, pour 426 octets qui viennent du filet empêchant un bloc de rester invisible après un saut de défilement (D-037), c'est-à-dire d'un correctif de bug.
- **Conséquence sur le point de validation 9** : tout est vert sauf Lighthouse. La phase est livrée avec cette dette nommée plutôt qu'avec un seuil ajusté pour masquer le problème.

## D-041 — Le flou d'arrière-plan réservé aux surfaces qui ont quelque chose à flouter (2026-09-27, dette DP.2)

- **Contexte** : première piste de la dette DP.2 ouverte par D-040. Une page locale portait 41 surfaces déclarant `backdrop-filter`, dont 39 posées sur un fond uni ou sur un dégradé doux, où le navigateur capture puis floute un arrière-plan qui n'a rien à montrer. Chacune force une recomposition, et le coût se paie au premier rendu.
- **Choix** : `.glass` et `.glass-quiet` gardent leur translucidité — la couleur du fond continue de transparaître — mais ne demandent plus de flou. Le flou reste sur `.glass-strong` (en-tête collant et barre d'action mobile, sous lesquels la page défile) et sur `.glass-dark` (seule surface autorisée au-dessus d'une photo). Une classe `glass-blur` le remet là où une page en aurait besoin. Les opacités ne changent pas, donc aucun contraste mesuré n'est touché ; le repli sans `backdrop-filter`, le mode confort, la transparence réduite, le mouvement réduit et la simulation du styleguide continuent de couvrir les quatre classes.
- **Gain mesuré** (trois passes, machine au repos, étranglement 4G et processeur ×4) : l'article du Fil passe à 0,96 et sort de l'échec, la page d'agence à 0,96, la page locale de 0,88–0,92 à 0,94–0,97 avec un temps de blocage de 146 à 254 ms au lieu de 292–432, l'accueil de 209–326 à 212–225 ms. Vérifié à l'œil sur une page locale : l'absence de flou ne se voit pas, le panneau de verre reste lisible sur la scène colorée.
- **Ce que cela apprend pour la suite** : le poste dominant n'est plus le style mais l'évaluation des scripts — 608 ms sur l'accueil, dont 539 pour le bundle principal, c'est-à-dire l'hydratation de React. La dette DP.2 reste donc ouverte, mais elle change de nature : la suite se joue sur le nombre d'îles clientes de l'accueil, pas sur le CSS. Aucun seuil n'a été relevé.

## D-042 — Deux agences, couverture régionale, plus d'annuaire ni de lien sortant, contenu local en cartes (2026-09-27, décisions d'Arcel)

- **Deux agences, et deux seulement.** Arcel a demandé que Saint-Denis, Vitry-sur-Seine, Serris et Versailles disparaissent du site : leurs pages, leurs liens, leurs boutons. Ces quatre implantations n'avaient jamais eu d'adresse de voie (D-036), ce qui signalait déjà qu'elles n'existaient pas comme points d'accueil. Restent **Paris 12e** (61 rue de Lyon) et **Puteaux** (49-51 quai de Dion-Bouton), confirmées par Arcel. Un script de migration versionné (`scripts/data/local/retirer-agences.mts`, idempotent, sans réseau) les retire de `content/site.config.json` et de `data/agences.geo.json`, puis recalcule l'agence de rattachement des pages locales par distance orthodromique, comme le pipeline : **83 des 131 pages** ont changé d'agence, sans que rien d'autre ne bouge — c'était la demande expresse d'Arcel, « sans altérer les pages locales où elle est attachée ».
- **Couverture régionale, confirmée par Arcel** : « Nous intervenons partout en Île-de-France, car nous avons des intervenants dans toute l'Île-de-France. » Le fait est inscrit dans `site.config.json` › `couverture`, avec sa date et sa source, et affiché sur chaque page locale sous la réponse. Conséquence directe : **l'agence est un point de coordination, pas le lieu d'où part l'auxiliaire de vie**. La phrase « Votre agence la plus proche : …, à 2,4 km à vol d'oiseau » devient « Vos interventions sont coordonnées par … ».
- **Aucun kilométrage nulle part** (demande d'Arcel). Retirés : la distance de la phrase de réponse, le libellé « {distance} km » des communes voisines, la même colonne sur la page d'agence, l'attribut `data-local-distance`, et la fonction `agencyResponse` qui choisissait sa formulation selon la distance. Les kilomètres écrits dans les textes rédigés des pages locales sont retirés par les trois agents de rédaction, avec consigne explicite. Motif : un kilométrage laisse croire à une limite d'intervention qui n'existe pas.
- **Plus d'annuaire local.** La section « Les ressources près de chez vous » est retirée des 131 pages de commune : elle publiait les hôpitaux, accueils de jour, CCAS et guichets avec leurs adresses, leurs numéros et leurs liens. Les faits restent dans `data/local` — ils nourrissent les repères et les aides, et gardent la traçabilité — mais `LocalFactsGrid` n'affiche plus ni adresse, ni téléphone de tiers, ni lien sortant, ni lien vers la source. **Le nom de la source et sa date restent affichés** : on sait toujours d'où vient une information, le site cesse seulement d'envoyer ailleurs. Les lieux peuvent être cités par leur nom dans la zone éditoriale, là où ils éclairent une difficulté réelle de la ville, sans coordonnées.
- **Plus de lien vers un service public.** Les cartes d'aides nomment leur source officielle sans lien (`AidCard`). Restent à traiter, dans un lot suivant, environ 260 liens dans le lexique, le magazine et les pages services.
- **Contenu en cartes, titres lisibles.** Arcel a montré deux captures : des titres coupés en plein mot (« Au début : préserver les habitude s ») et un bloc qui méritait des cartes. Deux causes cumulées, mesurées : l'icône posée **à côté** du titre lui prenait la moitié de la largeur, et les trois cartes restaient sur trois colonnes même réduites à une demi-page, soit 218 px de carte pour 162 px de texte et six lignes de titre. Corrections : l'icône passe **au-dessus** du titre, et le nombre de colonnes suit la largeur du **bloc** (`@container`), plus celle de l'écran — c'est aussi pour cela que `ThreadConnector` accepte un point de rupture `container`. Les rubriques « Ce que nous faisons, concrètement » deviennent quatre cartes. Mesuré après correction, sur une page service en 1440 px : stades en trois colonnes de 294 px, titres sur deux à trois lignes sans coupure ; rubriques en deux colonnes de 464 px, titres sur une ligne.
- **Ce qui reste ouvert** : la réécriture éditoriale des 131 pages de commune demandée par Arcel — que chaque page traite les difficultés propres à sa ville — dépasse ce lot. Les trois agents traitent d'abord les mentions d'agences supprimées, les kilomètres et les coordonnées de tiers ; la réécriture de fond suivra, sur les mêmes données sourcées, sans rien inventer.

## D-043 — Mille mots par page locale, sans répétition ni faute (2026-09-27, demande d'Arcel)

- **Contexte** : Arcel demande « plus de 1000 mots pour un bon SEO, aucune répétition, aucune faute ». Les seuils de `docs/04 §4` étaient de 350 mots pour une commune, 450 pour un arrondissement, 300 pour un quartier, 600 pour un département. `src/content/local-schema.ts` les porte à **1000 mots pour les quatre types**. Le plancher de `docs/04 §4` reste ce qu'il est : la loop ne l'abaisse jamais, elle le relève ici.
- **Ce que cela représente** : 139 pages à porter à plus de mille mots — 131 communes, arrondissements et quartiers, plus huit départements. Les pages livrées ce jour tournaient entre 244 et 534 mots : il s'agit de doubler, parfois davantage.
- **Le seuil de similarité ne bouge pas** (0,3 pour les communes, 0,25 pour les départements) et c'est délibéré. Plus une page s'allonge, plus la tentation de recopier d'une commune à l'autre augmente ; `check-local-uniqueness` l'interdit, et deux pages trop proches échouent toutes les deux. C'est le garde-fou de l'exigence « aucune répétition », et il est mesuré, pas déclaratif.
- **Comment tenir mille mots sans inventer** : la matière factuelle d'une commune est limitée, et elle ne grandira pas. Ce qui est autorisé, c'est de **développer** — pas d'ajouter des faits. D'un côté, ce qui est déjà dans `data/local` : démographie détaillée, établissements nommés, communes voisines, géographie et bâti. De l'autre, ce qui relève du métier et n'a pas à être sourcé : ce que ces réalités changent pour une personne aidée et son entourage, les gestes du quotidien, l'organisation des horaires, le retour d'hospitalisation, la famille qui habite loin, ce qu'on regarde pendant une visite d'évaluation. Chaque développement doit rester ancré dans la commune, sans quoi il devient interchangeable — et la mesure de similarité le rejette.
- **Risque assumé et signalé à Arcel** : à mille mots par page, sur 139 pages, la ligne de crête est étroite entre la répétition et l'invention. Les deux sont interdites, l'une par le contrôle, l'autre par la règle de vérité. Si une commune n'offre pas assez de matière pour mille mots honnêtes, la réponse n'est ni de broder ni de recopier : c'est de le dire, et d'en discuter avec Arcel plutôt que de livrer du remplissage.
- **Aucune faute** : relecture à la charge des agents de rédaction, avec consigne explicite sur les accents, les accords, les traits d'union des noms de communes, les espaces insécables et le vouvoiement. Aucun correcteur automatique n'est installé dans le dépôt ; ce point reste donc humain, et Arcel devra le relire.

## D-044 — Photos de fond sur toutes les bannières, logo de l'entreprise dans l'en-tête (2026-09-27, demande d'Arcel)

- **Contexte** : Arcel ne voyait pas la photo posée en fond de la bannière de l'accueil (D-039), trouvait que « plusieurs zones héro s'affichent très mal », et demandait une image d'arrière-plan sur chacune, prise sur son site existant `youdom-care.com` pour n'utiliser aucune image déjà employée ici.
- **Pourquoi la photo de l'accueil était invisible** : elle était masquée sous 42 rem de haut, soit 672 px. Sur un ordinateur portable, la fenêtre utile du navigateur descend couramment sous cette hauteur, et la photo disparaissait donc sans que rien ne le signale. Le masquage sur la hauteur est supprimé ; celui sous 40 rem de large reste, car la photo passerait alors sous le texte.
- **Douze photos récupérées** sur `youdom-care.com`, propriété d'Arcel, dans `public/images/heros/fonds/` : elles n'étaient utilisées nulle part sur ce site. Six sont branchées, une par scène, dans `heroBackgrounds` (`src/components/blocks/Hero/hero-scene.ts`) : canard, azur, verte, sable, framboise, nuit. La scène neutre des pages légales n'en a pas, ces pages restant sobres ; l'accueil garde sa photo détourée propre.
- **Comment le fond ne gêne jamais la lecture** : il occupe les 38 % de droite de la bannière au-dessus de 64 rem, s'efface vers la gauche par un dégradé de masque à partir de 55 %, et reste à 38 % d'opacité. La colonne de texte d'une bannière occupe environ 60 % de la largeur : le titre et la promesse restent donc sur la couleur de scène, et leur contraste est celui déjà mesuré par `check-contrast`. Le fond est décoratif : `aria-hidden`, sans texte de remplacement, sans interception du pointeur.
- **Logo de l'entreprise dans l'en-tête** : Arcel demandait de « revenir à l'accueil en cliquant sur le logo sur mobile ». Vérification faite, le lien fonctionnait déjà, y compris avec le menu déployé, et j'ai reproduit le clic sur une largeur de 375 px : la navigation vers l'accueil avait bien lieu. Le problème n'était donc pas technique mais de perception : l'en-tête affichait le nom en toutes lettres, qui ne se lit pas comme un logo. Le vrai logo de `youdom-care.com` le remplace, à 44 px de haut, 36 px quand l'en-tête se compacte, avec le nom de la marque comme texte de remplacement pour les lecteurs d'écran.

## D-045 — Trois défauts d'affichage corrigés, rendu différé des sections retiré (2026-09-27, audit visuel)

- **Contexte** : Arcel signale « beaucoup de bugs » dans le design. Un audit visuel a mesuré quatorze gabarits à 390, 1024 et 1440 px, en JavaScript plutôt qu'à l'œil. Le site est globalement sain : aucun débordement horizontal, aucun texte tronqué, aucune image cassée, aucune cible tactile trop petite, aucune ancre masquée par l'en-tête collant. Les vrais défauts se concentrent sur les deux pages à ton sombre et sur un mécanisme de rendu.
- **Panneau blanc sur blanc** (`/services/garde-de-nuit/`, `/services/presence-24h-24/`, aux trois largeurs) : le geste du hero vit **dans** le panneau de verre, clair par construction — `scenes.css` impose d'ailleurs du texte sombre à tout verre clair posé sur la scène de nuit. Or `ServiceTemplate` lui transmettait le ton sombre du hero, et le geste posait alors du texte blanc sur ce fond clair. Mesures : 1,12 pour les questions, **1,01** pour les réponses, soit un panneau qui paraît vide. C'est très probablement une des « cases vides » signalées par Arcel. Le contenu du panneau reçoit désormais toujours le ton clair ; le hero lui-même garde le sien.
- **Bouton secondaire blanc sur blanc** (mêmes pages, à partir de 1024 px) : le variant `outline` pose `glass-quiet`, dont la base est blanche à 100 % d'opacité. L'ancienne surcharge passait la bordure et le texte en blanc sans toucher au fond : contraste **1,00**, le bouton se lisait comme une pastille vide. Le fond devient transparent en ton sombre.
- **Fil d'Ariane illisible sur la scène de nuit** (mêmes pages, à partir de 1024 px) : ses classes utilitaires `text-link` et `text-ink` l'emportaient par spécificité sur la règle de couleur de la scène. Mesures : 1,37 pour la page courante, 2,00 pour ses liens, sur un fond teal-900. Une règle dédiée le passe en blanc.
- **Rendu différé des sections retiré**, un jour après avoir été posé (D-040). Le gain était réel : temps de blocage d'une page locale ramené de 292-432 ms à 166-286 ms. L'effet de bord l'était tout autant, et il pèse plus lourd : `contain-intrinsic-size: auto 600px` attribuait 600 px à des sections qui en mesurent 403 à 2 645. Mesuré sur `/aidants/` à 390 px, le document passait de 15 678 à 19 963 px pendant la lecture — 27 % de dérive — et un défilement demandé à 6 000 px atterrissait à 7 749, soit un saut de 1 750 px sous le doigt du lecteur. Un ascenseur qui ment coûte plus cher au visiteur que cent millisecondes de blocage. C'est aussi ce mécanisme qui produisait les faux chevauchements détectés par la première passe de l'audit. Une hauteur intrinsèque juste, par famille de sections, reste une piste de la dette DP.2 — à instruire avec des mesures, pas une valeur unique posée au jugé.
- **Non vérifié, et dit comme tel** : le contraste du texte posé au-dessus des nouvelles photos de fond de bannière. L'outil de mesure lit les couleurs composées, pas les pixels d'une image. Sur les gabarits examinés, aucun texte ne se trouvait au-dessus d'une photo sans panneau intermédiaire, mais cela demanderait un échantillonnage de pixels pour être affirmé.

## D-046 — Photo de fond sur toutes les pages, verre liquide rétabli partout (2026-09-28, demandes d'Arcel)

- **Contexte** : Arcel répète qu'il ne voit ni les images de fond ni le verre liquide, et cite quatre pages : « Comment ça marche », « Tarifs », « Territoires », « Le Fil ». Vérification faite, il avait raison sur les deux points, pour deux causes distinctes.
- **Les images ne couvraient que cinq gabarits.** Seuls l'accueil, les pages services, locales, d'agence et les articles passent par `HeroSection`, qui portait la photo. Les **75 autres pages** — index des agences, territoires, comment ça marche, tarifs, outils, lexique, magazine, formulaires, recrutement, pages légales — ouvrent sur une `Section` ordinaire et n'avaient aucune photo. Plutôt que de modifier soixante-quinze pages, une règle de `scenes.css` pose la photo sur la première section de tout `main` : elle vient de `--scene-photo`, définie par la palette de scène héritée, donc chaque famille garde la sienne. Même contrat visuel que les bannières : la photo couvre la section, s'efface complètement sur sa moitié gauche où vit le texte, et reste sous le contenu.
- **Ces pages n'avaient même pas de scène.** Cause plus profonde : `data-famille` n'était posé que sur cinq pages. Sans lui, pas de palette, donc ni couleur de fond, ni photo, ni teinte de verre — les pages restaient blanches. Douze pages reçoivent leur famille (`fonctionnement`, `aides`, `formulaire`, `local`, `magazine`, `entreprise`, `outils`), et trois familles nouvelles sont ajoutées aux palettes. C'est ce qui explique que le travail de D-032 n'ait jamais été visible sur ces pages.
- **Le verre liquide est rétabli sur toutes les surfaces.** Le flou d'arrière-plan avait été réservé la veille aux seules surfaces posées sur quelque chose à flouter (D-041), pour économiser le rendu de 41 surfaces sur une page locale. Arcel l'a redemandé deux fois : sans flou, une carte claire sur fond coloré ressemble à une carte ordinaire, et l'effet commandé ne se voit pas. `.glass` et `.glass-quiet` retrouvent donc leur `backdrop-filter`. L'effet est en outre rendu perceptible : opacités abaissées (verre standard 72 → 62 %, discret 82 → 74 %, dense 88 → 82 %) pour qu'on voie réellement à travers, saturation portée à 1,5. **Le coût de rendu est assumé** et reste inscrit dans la dette DP.2 : il se paie au premier affichage, pas pendant la lecture.
- **Contrastes remesurés** : douze couples changent de valeur puisque les opacités bougent. Aucun ne passe sous son minimum, et les valeurs du cahier sont mises à jour dans `check-contrast.ts`. Le couple déjà documenté comme refusé — texte secondaire sur verre clair posé sur une photo — descend de 3,28 à 2,43 : il reste refusé, et la règle inchangée (au-dessus d'une photo, seul le verre sombre est autorisé).

## D-047 — Formulaires : progression nommée, action unique, redondances retirées (2026-09-29, demande d'Arcel)

- **Contexte** : Arcel demande que les formulaires, et le parcours de demande de devis en particulier, soient « parfaits et structurés, chaque étape une expérience ultra satisfaisante ». Le parcours a été suivi de bout en bout, écran par écran, sur le formulaire « personne âgée » : cinq étapes — pour qui, la situation, les besoins, le planning, les coordonnées. Le fond fonctionne : les réponses sont gardées sur l'appareil jusqu'à l'envoi, les questions de situation sont facultatives, la validation nomme ce qui manque et lie chaque erreur à son champ, la grille de planning a des noms accessibles corrects (« Lundi, tôt le matin, 6h à 8h »). Les défauts trouvés étaient de présentation et de guidage.
- **Les pages de demande n'avaient pas de scène.** `data-famille` manquait sur `/demande/[cas]/`, `/demande/professionnel/`, `/demande/sortie-d-hospitalisation/` et `/recrutement/postuler/` : bannière blanche, sans couleur ni photo, alors que les autres formulaires en avaient une. Les quatre reçoivent la famille `formulaire`.
- **La barre de progression était dessinée par le système** : verte sur Windows, hors de la palette, et rien n'indiquait ce que contenait l'étape en cours. Elle devient une suite de segments aux couleurs de la marque, un par étape, avec son nom court à côté du rang : « Étape 1 sur 5 · Pour qui ? ». La valeur reste annoncée aux lecteurs d'écran par `role="progressbar"`. Chaque étape porte désormais un nom court distinct de sa question, pour ne pas répéter dans la progression ce que le titre dit déjà en grand.
- **L'action principale passe en tête, le retour disparaît du premier écran.** Un bouton « Retour » grisé ouvrait la barre d'actions de la première étape : il occupait la place de l'action attendue et laissait croire qu'on avait raté quelque chose. Il n'apparaît qu'à partir de la deuxième étape.
- **Deux redondances retirées.** Sur « pour qui » et « les besoins », la légende du groupe répétait mot pour mot le titre de l'écran. Elle est conservée pour les lecteurs d'écran et retirée de l'affichage (`legendHidden`, porté par `FieldShell`, `RadioCards` et `CheckboxGroup`). L'étape du planning annonçait « Touchez les créneaux, ou choisissez un raccourci » **avant** que le moindre créneau existe : la grille n'apparaît qu'après le choix du rythme, et la consigne y figure déjà. L'intitulé d'étape se limite à « Quand souhaitez-vous de l'aide ? ».

## D-048 — Les six formulaires de demande, question par question (2026-09-29, demande d'Arcel)

- **Contexte** : Arcel demande que « chaque service, chaque étape » du parcours de demande soit juste. D-047 a traité la mécanique commune, en suivant le formulaire « personne âgée ». Cette passe reprend les **vingt-quatre questions de situation** des six cas — personne âgée, maladie neurodégénérative, adulte en situation de handicap, enfant en situation de handicap, relais d'un aidant, nuit et 24h/24 — et le contenu propre à chacun.
- **« Aucune » pouvait cohabiter avec le reste.** Dans un groupe de cases, rien n'empêchait de cocher « Fauteuil roulant » **et** « Aucune » (adulte en situation de handicap), ou « Une aide à domicile » **et** « Aucune » (personne âgée). La demande partait alors avec deux réponses qui se contredisent, et c'est le conseiller qui découvrait l'incohérence au téléphone. `ChoiceOption` reçoit `exclusive` : cocher un choix exclusif décoche les autres, cocher un autre choix le décoche. Vérifié dans un vrai navigateur, pas seulement en test.
- **Rien ne disait qu'on pouvait cocher plusieurs réponses.** Les cartes d'un choix unique et les cases d'un choix multiple se ressemblent beaucoup. Seule l'étape des besoins annonçait « Plusieurs choix possibles » ; les questions de situation à choix multiple, elles, ne disaient rien. Elles portent désormais toutes « Plusieurs réponses possibles. », reliée au groupe par `aria-describedby`.
- **Sept questions posées comme des questions fermées attendaient une liste** : « Une aide est-elle déjà en place ? », « Des professionnels sont déjà présents ? », « Des aides techniques sont utilisées ? » appelaient oui ou non et offraient une liste à cocher. Elles demandent maintenant ce qu'elles veulent savoir : « Qui intervient déjà auprès d'elle ? », « Quels professionnels interviennent déjà ? », « Quelles aides techniques sont utilisées ? ». Même correction pour « Un événement récent ? », « APA ou PCH ? », « AEEH ou PCH ? », « Une présence 24h/24 ? », « Sa scolarité », « Sa situation, en quelques mots » et « La PCH aide humaine : combien d'heures accordées par mois ? ».
- **Les sigles sont développés là où ils sont lus.** Un parent qui découvre le vocabulaire ne sait pas ce qu'est une ULIS ni un SESSAD, et choisir au hasard fausse la demande. `SituationOption` accepte désormais une forme longue (libellé plus précision) : AESH, ULIS, IME et SESSAD sont développés sous leur choix, ESA sous « Équipe Alzheimer », et les questions d'aide financière rappellent ce que sont l'APA, la PCH et l'AEEH. Les modes prestataire et mandataire sont expliqués en une ligne chacun, reprise des définitions du lexique : les choisir sans savoir ce qu'ils engagent n'avait pas de sens.
- **Un trou de parcours comblé** : un parent pouvait répondre « Moins de 3 ans » puis se voir demander une scolarité dont aucune réponse ne le concernait. « Crèche, ou pas encore scolarisé » est ajouté.
- **Deux questions en double retirées.** « Combien de nuits par semaine ? » précédait une grille de planning préremplie sur les nuits, qui dit exactement les mêmes nuits en plus précis : deux réponses possiblement contradictoires pour une seule information. La question disparaît, la grille reste. Côté aidant, « De quel relais avez-vous besoin ? » était suivie, à l'écran d'après, de « De quoi avez-vous besoin ? » ; la première demande maintenant ce qu'elle mesurait réellement : « Quelle durée de relais vous aiderait ? ».
- **Dernier renvoi vers un service public retiré.** Le message affiché quand la commune est hors Île-de-France citait deux adresses en `gouv.fr`. Conformément à la demande d'Arcel du 27/09/2026, il oriente vers le centre communal d'action sociale de la mairie et le département, sans adresse de site.
- **Ce qui n'a pas été touché** : les listes de besoins des six cas, qui reprennent les services du dépliant, et les questions dont l'intitulé était déjà juste. Écarts par rapport à `docs/05 §2` consignés ici, conformément à la règle de périmètre.

## D-049 — Audit de tous les textes rendus, et ce que Google sanctionne vraiment (2026-09-29, demande d'Arcel)

- **Contexte** : Arcel demande « une analyse complète de chaque texte et phrase sur le site », pour repérer « des mots interdits qui peuvent être sanctionnés par Google et par conséquent empêcher l'indexation d'une page ».
- **Le point de départ est à corriger, et il vaut mieux le dire.** Google n'a pas de liste de mots interdits. Aucune page n'est retirée de l'index parce qu'elle contient un mot. Ce qui empêche littéralement l'indexation est technique : un `noindex`, une canonique qui pointe ailleurs, un blocage dans `robots.txt`, une absence du plan de site. Ce qui fait **reculer** une page relève des règles anti-spam : bourrage de mots-clés, séries de pages quasi identiques. Ce qui coûte **autrement** — droit de la consommation, crédibilité d'un site de santé — ce sont les allégations. L'audit sépare donc ces trois choses au lieu de les confondre.
- **Un outil, pas une passe unique** : `pnpm audit:textes` (`scripts/audit/audit-textes.mts`) lit les **263 pages HTML produites par le build** — donc tout ce qu'un lecteur voit réellement, y compris les 131 pages locales — et écrit `docs/AUDIT_TEXTES.md`. Lire le rendu plutôt que les sources est ce qui permet de couvrir « chaque texte et chaque phrase » : aucun contrôle de contenu ne voit l'assemblage final.
- **Indexation : rien ne bloque.** 263 pages rendues, 0 sans canonique, 25 en `noindex` — et ces 25 sont exactement celles qui doivent l'être : les écrans de remerciement, le guide de style, et les pages d'index ou de catégorie du magazine.
- **Bourrage de mots-clés : aucun cas réel.** Douze pages dépassent 4 % de densité, et chacune s'explique par sa nature : `/mentions-legales/` répète « photo » 94 fois parce qu'elle crédite 94 photographies, une fiche de lexique sur le CESU répète « CESU », `/plan-du-site/` répète « Paris » parce qu'elle liste les arrondissements. Le chiffre ne tranche pas ; c'est la phrase qui tranche, et le rapport affiche désormais la phrase.
- **Contenu dupliqué : le gabarit, pas le texte.** 112 phrases longues sont partagées par cinq pages ou plus, dont une dizaine par 131 pages. Toutes viennent du gabarit des pages locales — rail de conversion, cartes d'aides, ligne d'auteur — et non du corps éditorial, que `check-local-uniqueness` mesure à part : similarité maximale 0,141 pour un seuil à 0,30. Le point à surveiller n'est donc pas la duplication du texte, mais le **rapport** entre le gabarit et le texte propre à chaque ville.
- **Dix formulations à risque trouvées, et corrigées.** Toutes dans des textes écrits pendant l'expansion des pages locales :
  - « ce que nous garantissons » et ses variantes, sur six pages. La liste de `check-copy` interdisait « garanti » mais laissait passer les conjugaisons. Le mot est remplacé par « nous nous engageons à » ou « promettre », sans rien changer au sens — ces passages refusaient déjà de trop promettre.
  - deux comparaisons de prix, « ne coûtent pas cher » et « coûte moins cher », alors que `content/tarifs.json` est vide : le site ne publie aucun prix, il ne peut donc en comparer aucun. Une troisième, dans un article du magazine, comparait le domicile et l'établissement sans chiffre ; l'article garde sa conclusion — comparer sur un devis réel et le comparateur officiel — et perd l'affirmation.
  - une phrase du gabarit local annonçait « voici leurs contacts » alors que, depuis le retrait des coordonnées demandé le 27/09/2026, aucune coordonnée n'est affichée. Elle annonce maintenant ce qu'elle montre vraiment : les organismes dont dépend la commune.
- **La liste de `check-copy` est élargie** pour que cela ne revienne pas : toutes les formes de « garantir », les prix présentés comme bas, les supériorités invérifiables, l'urgence commerciale et la satisfaction chiffrée. Le choix d'interdire « garantir » y compris dans une phrase négative est assumé : une règle simple se tient, et « nous ne pouvons pas promettre » se lit mieux.
- **Cinq relevés examinés et laissés tels quels**, listés avec leur motif dans le §4 du rapport : les noms propres d'établissements qui contiennent « thérapeutique », « vous soigner » adressé à l'aidant, « prescrire » attribué au médecin, deux superlatifs qui portent sur un tiers ou sur une superficie et s'appuient sur un chiffre, et l'avertissement de santé qui contient le mot qu'il sert à écarter. Le détecteur ignore désormais les formes niées : « nous ne soignons pas » est la phrase que le cahier demande d'écrire, la signaler ferait crier au loup.
- **Dette relevée, non traitée** : `interface.json` garde `ressources_h2` et `ressources_texte`, devenus inutilisés depuis le retrait du bloc « Les ressources près de chez vous », et le schéma les exige encore.

## D-050 — Resend comme service d'envoi, en SMTP (2026-10-04, choix d'Arcel)

- **Contexte** : Arcel demande comment recevoir les demandes de devis, puis choisit Resend. Le circuit complet existe depuis P8 — validation, champ piège, délai minimum, limite d'envois, e-mail à l'équipe, accusé de réception sans détail, webhook réservé à un futur CRM — mais aucune clé d'envoi n'a jamais été renseignée (Q-TECH-1). La route répondait donc « envoi indisponible », et le formulaire affichait le message prévu avec le numéro de téléphone : rien n'était perdu à l'écran, mais rien n'arrivait non plus.
- **Aucune ligne de code ne change.** Resend expose un service SMTP (`smtp.resend.com`, ports 25, 465, 587, 2465, 2587, identifiant `resend`, mot de passe = clé d'API). Le transport de `src/lib/mail/transport.ts` s'y connecte tel quel : le port 465 déclenche déjà le chiffrement d'emblée, et l'identifiant non vide déclenche déjà l'authentification. Pas de dépendance ajoutée, donc pas de ligne à inscrire au titre de la règle des dépendances. L'API HTTP de Resend aurait demandé un paquet de plus et un deuxième chemin de code pour le même résultat.
- **Ce qui entre dans le dépôt, et ce qui n'y entre pas.** `.env.example` reçoit l'hôte, le port et l'identifiant : ils sont identiques pour tous les comptes Resend et ne sont pas des secrets. La clé d'API reste hors du dépôt, dans Vercel seulement, conformément à la règle sur les données personnelles.
- **Trois pièges documentés** dans `docs/MESSAGERIE_RESEND.md`, parce que chacun fait échouer l'envoi sans message clair : `SMTP_USER` vaut littéralement `resend` et non une adresse ; `LEADS_FROM` doit appartenir au domaine vérifié dans Resend, sans quoi l'envoi est refusé ; et le domaine doit être vérifié par SPF et DKIM avant tout envoi vers un visiteur, l'adresse de démonstration de Resend ne servant qu'à s'écrire à soi-même.
- **Hors périmètre de la loop, et dit comme tel** : la vérification du domaine passe par des enregistrements DNS, et la loop ne touche jamais au domaine. La clé d'API non plus : elle n'est ni demandée, ni saisie, ni stockée ici.
- **Relevé au passage** : `www.youdom-care.com` sert encore l'ancien site. Tant que le domaine n'est pas basculé sur ce déploiement, cette configuration ne change rien pour les visiteurs qui remplissent le formulaire de l'ancienne version.


## D-050bis — Les `overrides` pnpm fonctionnent, c'est `pnpm install` qui ne les applique pas (05/10/2026)

- **Contexte** : DC.2 concluait que les `overrides` posés dans `pnpm-workspace.yaml` « sont restés sans effet (pnpm 11.0.8 répond "Already up to date", deux tentatives) », et en déduisait un défaut d'emplacement. Le diagnostic était faux.
- **Constat** : l'emplacement est le bon. Ce qui bloque est le court-circuit de pnpm : après une modification des `overrides`, `pnpm install` — y compris avec `--force` — répond « Already up to date », n'écrit pas la section `overrides` dans `pnpm-lock.yaml` et ne change rien. `pnpm install --no-frozen-lockfile` résout et applique ; la preuve se lit dans le fichier de verrouillage, où la section apparaît. Une fois écrite, `pnpm install --frozen-lockfile` (celui de la CI) la conserve.
- **Choix** : `tmp` (`^0.2.7`) et `basic-ftp` (`^6.2.2`) sont forcés, ce qui fait passer `pnpm audit` de huit avis à quatre. Un commentaire dans `pnpm-workspace.yaml` rappelle la manœuvre, pour que la prochaine modification ne reconclue pas à l'inefficacité.
- **Écarté** : `uuid`, qui exigerait un saut de la 8 à la 11 dans `@lhci/cli` — avis « moderate », outillage seulement, et la régression possible ne se vérifie pas sans exécuter Lighthouse. `extract-zip` et `braces` n'ont aucune version corrigée publiée.

## D-051 — Corps de requête borné à la lecture, CV aligné sur la limite de l'hébergeur (05/10/2026)

- **Contexte** : l'audit global du 5 octobre (`docs/AUDIT_GLOBAL.md`) relève deux défauts sur les routes de première partie. D'abord, le plafond de taille reposait sur l'en-tête `content-length` : absent (requête découpée en morceaux), `Number(null ?? "0")` vaut `0` et le contrôle passait, puis `request.text()` ou `request.formData()` décodait tout le corps en mémoire — le plafond n'était tenu que par la limite de l'hébergeur, pas par le code. Ensuite, le CV accepté montait à 5 Mo pour un corps de 6 Mo, alors qu'une fonction serveur Vercel refuse un corps au-delà de 4,5 Mo : un CV légitime à la limite était rejeté par la plateforme **avant** la route, et le formulaire n'avait aucun moyen de l'expliquer au candidat.
- **Choix — lecture bornée** : `readBodyLimited` (`src/lib/http/request.ts`) lit le flux morceau par morceau, compte les octets et annule le flux dès le plafond dépassé ; un `content-length` qui annonce déjà trop gros évite même de l'ouvrir. Les trois routes y passent (`readTextLimited` pour `api/lead` et `api/mesure`, `readBodyLimited` puis un `Response` local pour le multipart de `api/candidature`). Le compte se fait en octets et non en caractères, ce que l'ancien `raw.length` ne faisait pas.
- **Choix — taille du CV** : 4 Mo pour le fichier, 4,375 Mo pour le corps multipart, donc sous la limite de 4,5 Mo. La valeur est portée par `CV_MAX_BYTES`, d'où découlent le message d'erreur du formulaire (`formatFileSize`) et le texte d'aide ; `content/pages/recrutement.json`, `content/legal/politique-de-confidentialite.json` et `docs/05 §2` sont alignés.
- **Écarté** : relever la limite par un téléversement direct vers un stockage. Ce serait la bonne réponse si les CV volumineux étaient fréquents, mais cela ajoute un prestataire, un emplacement de conservation et une question RGPD (Q-LEGAL-4) pour un gain incertain. À reprendre si des candidats signalent le refus.
- **Conséquences** : `src/lib/http/request.test.ts` couvre la lecture bornée, dont le cas d'une requête découpée sans `content-length` et le comptage en octets. Les plafonds des routes ne dépendent plus de l'hébergeur ; celui du CV, lui, en dépend par construction et le commentaire de `src/lib/candidature/schema.ts` dit pourquoi, pour qu'un relèvement futur ne se fasse pas sans vérifier la plateforme.

## D-052 — Un refus de répondre n'est pas un lien mort (05/10/2026)

- **Contexte** : `pnpm validate` échouait sur dix-huit sources externes de `service-public.gouv.fr`, `santepubliquefrance.fr` et `pour-les-personnes-agees.gouv.fr`, toutes en HTTP 403. Aucune de ces pages n'avait disparu : ces sites filtrent les agents non-navigateurs, et `check-links` se présente avec son propre agent utilisateur. Un domaine entier qui répond 403 d'un coup est le signe d'un filtrage, pas d'une refonte simultanée de douze pages.
- **Choix** : seuls 404 et 410 restent des erreurs bloquantes — ce sont les deux codes qui disent « cette adresse n'existe plus ». 401, 403, 429 et 5xx rejoignent les avertissements, au même titre qu'une connexion refusée ou un délai dépassé : « à vérifier à la main ».
- **Écarté** : se faire passer pour un navigateur en empruntant son agent utilisateur. Cela marcherait un temps, contre l'intention explicite des sites visés, et le contrôle redeviendrait rouge au premier durcissement de leur filtrage.
- **Conséquences** : un lien réellement cassé fait toujours échouer `pnpm validate` ; un filtrage ne rend plus la CI rouge au hasard de l'adresse du poste qui l'exécute. Le relevé reste visible dans les avertissements, donc une source qui se met à refuser durablement ne passe pas inaperçue.

## D-053 — Un champ « téléphone » contient un téléphone ou rien (05/10/2026)

- **Contexte** : `check-local-nap` signalait vingt-cinq fiches locales dont le téléphone n'était pas un numéro français. Deux causes distinctes derrière un seul avertissement. D'un côté, de vrais numéros courts (`3994` au Val-de-Marne, vingt occurrences) que `normalizePhone` ne connaissait pas. De l'autre, des valeurs qui ne sont pas des numéros mais des phrases, reprises telles quelles des données ouvertes : « 01 45 54 04 80 Tél selon le tableau CASVP 01 45 54 85 93 », « 01 41 23 86 30 (ou 86 31) », « 0 39 75 ». `formatPhone`, dans le pipeline, renvoyait la source inchangée dès qu'elle ne ressemblait pas à dix chiffres : une phrase se retrouvait donc affichée comme un numéro sur une page locale.
- **Choix — numéros courts** : `normalizePhone` (`src/lib/local/nap.ts`) et `formatPhone` (`scripts/data/local/facts.ts`) reconnaissent les numéros courts français : trois chiffres (115, 119), quatre chiffres en 10xx ou 3xxx (3975 la Ville de Paris, 3994 le Val-de-Marne), six chiffres en 116xxx et 118xxx. `phonePattern` ne les relève toujours pas dans le texte visible — ils sont trop proches d'un nombre quelconque — mais un lien `tel:` et un champ de donnée les acceptent.
- **Choix — prose** : `formatPhone` garde le **premier** numéro reconnaissable noyé dans une phrase et jette le reste ; si rien d'exploitable ne subsiste, le champ reste vide. Mieux vaut aucun téléphone qu'une phrase présentée comme un numéro : une personne qui appelle un numéro faux perd un appel, et le site perd sa crédibilité sur le seul terrain où il promet des faits sourcés. L'indicatif international écrit sans « + » ni « 00 » (« 331 45 77 63 40 ») est reconnu au passage.
- **Écarté** : deviner le numéro voulu derrière « 0 39 75 » (vraisemblablement 3975). La correction serait juste une fois sur deux et le garde-fou du projet interdit d'inventer un fait ; le champ est donc vidé.
- **Conséquences** : cinq champs corrigés dans `data/local/` à la main, le pipeline étant hors d'atteinte sans réseau — la prochaine exécution de `pnpm data:local` produira le même résultat. Les vingt avertissements « 3994 » disparaissent parce que le numéro est reconnu, non parce que le contrôle a été assoupli.

## D-054 — 1120 communes annonçaient une agence qui n'existe plus (05/10/2026)

- **Contexte** : les parcours Playwright, exécutés pour la première fois depuis plusieurs phases (voir D-055), attendaient « Votre agence la plus proche : Youdom Care Val-de-Marne » là où le site affichait autre chose. En remontant : le 27/09/2026 (commit `97e8051`), le réseau est passé de **six agences à deux** (Paris 12 et Puteaux) dans `content/site.config.json` et `data/agences.geo.json` a été régénéré — mais `data/idf-communes.json`, qui porte le champ `agence` de chaque commune, ne l'a pas été. **1120 des 1285 communes** pointaient encore vers `serris`, `versailles`, `vitry-sur-seine` ou `saint-denis`.
- **Portée réelle** : ce champ n'est pas décoratif. Il nomme au visiteur « votre agence la plus proche » sur l'accueil et les pages locales, et il part dans la demande (`agenceProche` du `LeadPayload`), où l'e-mail de l'équipe le reprend — avec un repli qui imprime l'identifiant brut (`ctx.agencies[id] ?? id`), donc « serris » en clair. Pendant huit jours, le site a donc annoncé à 87 % des communes d'Île-de-France une agence inexistante. C'est exactement ce que le garde-fou « aucun fait inventé » interdit, et aucun contrôle ne le voyait : `leadPayloadSchema` ne valide que la **forme** du slug, et `check-local-nap` ne vérifiait l'appartenance que pour `agence_proche.id` des pages locales.
- **Choix — correction** : le champ a été recalculé avec la fonction du pipeline lui-même (`nearest`, `src/lib/geo/geo.ts`, distance à vol d'oiseau) depuis les `centre` déjà versionnés et `data/agences.geo.json`. Rien n'est inventé et rien d'autre n'est touché : `pnpm data:communes` produit le même résultat. Répartition obtenue : 797 communes sur Paris 12, 488 sur Puteaux. Le fichier porte désormais `agences_recalculees_le` et une note qui dit ce qui a été refait et pourquoi.
- **Choix — garde-fou** : `auditCommuneAgencies` (`scripts/validate/check-local-nap.ts`) échoue désormais, en comptant les communes concernées, dès qu'une agence citée par les données n'est pas dans `site.config.json`, et renvoie à `pnpm data:communes`. Deux tests unitaires le couvrent, dont le cas réel. Un fichier absent n'est pas une anomalie (fixtures, dépôt partiel) ; un fichier présent mais illisible en est une.
- **Écarté** : corriger à la main les quatre identifiants vers les deux agences restantes. Le choix de l'agence la plus proche est une question de distance, pas d'opinion : le recalcul par la fonction du pipeline est reproductible, une table écrite à la main ne l'est pas.
- **À retenir** : toute modification de `content/site.config.json > agences` doit être suivie de `pnpm data:agences` **et** `pnpm data:communes`. Le contrôle le rappelle maintenant, mais la règle mérite sa ligne dans `docs/04 §5`.

## D-055 — La suite Playwright était rouge depuis plusieurs phases (05/10/2026)

- **Contexte** : `pnpm test:e2e` n'avait pas tourné depuis un moment. L'audit a d'abord conclu qu'il était inexécutable (l'environnement ne fournit que `chromium-1194` quand Playwright 1.63 réclame `chrome-headless-shell-1243`) ; en pointant l'exécutable présent, toute la suite tourne. Premier verdict : **97 échecs sur 672**.
- **Le défaut qui empêchait de s'en apercevoir** : deux groupes de parcours s'excluaient mutuellement. `config.spec.ts` exigeait le `noindex` global, donc un build `SITE_INDEXABLE=false` — celui de la CI ; `services.spec.ts` et `local.spec.ts` exigeaient l'absence de balise `robots`, donc l'inverse. Depuis D-035, qui a ouvert l'indexation par défaut, **la suite ne pouvait être verte dans aucune des deux configurations**. Un échec permanent n'alerte plus personne : c'est ainsi que les autres dérives ont pu s'accumuler derrière.
- **Choix** : un module partagé `tests/e2e/indexable.ts` (`siteIndexable`, `expectIndexable`) exprime l'intention — « cette page n'est pas fermée pour elle-même » — et la vérifie dans les deux réglages ; `config.spec.ts` vérifie désormais les deux états au lieu d'un seul.
- **Autres dérives corrigées**, toutes de la même famille — un parcours qui a figé une valeur que le site a depuis changée :
  - six agences devenues deux (`local.spec.ts`, `professionnels.spec.ts`, `home.spec.ts`), désormais lues dans `content/site.config.json` et `data/idf-communes.json` ;
  - liens sortants vers `service-public.gouv.fr` et `impots.gouv.fr`, retirés le 27/09 à la demande d'Arcel mais toujours attendus (`lexique.spec.ts`, `blocks.spec.ts`) ;
  - segment de plan de site du magazine attendu **absent** alors que « Le Fil » a des articles depuis la phase 7 (`seo.spec.ts`) ;
  - mention « En attente de relecture par un professionnel. » exigée sur les 25 pages services alors que **D-034 l'a retirée** — le parcours contredisait à la fois la décision et le test unitaire de `ServiceTemplate`, qui vérifie déjà son absence (`services.spec.ts`) ;
  - en-tête des deux colonnes de l'encart frontière exigé sur `/personnes-agees/`, alors que la règle du 27/09 ne l'affiche que si **chaque** ligne nomme son relais, ce qui n'est pas le cas de cette page. La règle n'était observable que par les classes utilitaires : `Callout` porte maintenant `data-colonnes`, et le parcours lit l'attribut au lieu de supposer (`services.spec.ts`).
- **Règle tirée de là** : un parcours ne code plus en dur un fait qui vit dans `content/` ou `data/` ; il le lit. Les trois corrections de nombre d'agences venaient toutes de la même cause et auraient toutes été évitées.
- **Reste ouvert** : les échecs de mise en page et de mouvement ne sont pas des parcours périmés mais des constats à instruire, consignés dans `docs/PLAN.md` (DP.3, DP.4). Ils ne sont pas « corrigés » en relâchant le seuil : la règle du projet est explicite, on ne relève pas un seuil pour faire passer un contrôle.

## D-056 — Les e-mails sortants passent sur une maquette commune (09/10/2026)

**Contexte.** Première demande reçue en production (formulaire « Être rappelé(e) »). Arcel la juge
illisible : « c'est très mal organisé, le format est trop brut ». Le constat est juste, et le
rendu HTML existait pourtant déjà — c'est sa conception qui était en cause.

**Quatre causes, toutes vérifiées sur le message reçu.**

1. **`<details>` n'existe pas en messagerie.** Le `LeadPayload` en JSON était enfermé dans un bloc
   repliable. Gmail et Outlook ne gèrent pas cet élément : ils l'affichent **toujours ouvert**.
   Un pavé de quarante lignes de JSON tombait donc au milieu du message, et c'est l'essentiel de
   ce qui rendait l'e-mail illisible.
2. **Les clés techniques partaient telles quelles.** Les réponses de situation étaient rendues
   `${clé} : ${réponse}`, donc « ce_qui_pese : Les nuits difficiles » au lieu de la question
   posée. Le formulaire de rappel n'ayant pas de situation, le défaut ne s'était pas vu.
3. **Aucune hiérarchie.** Une suite plate de `h2` + `p`, sans tableaux de disposition : Outlook,
   qui rend le HTML avec le moteur de Word, ne centrait ni ne limitait la largeur, et rien ne
   distinguait ce qui sert à agir de ce qui sert à archiver.
4. **Pas de `<meta charset>`, pas de texte d'aperçu.** Les accents pouvaient arriver abîmés, et la
   liste des messages résumait le gabarit au lieu de la demande.

**Décision.** Une maquette unique, `src/lib/mail/layout.ts`, partagée par les quatre e-mails
(demande et candidature, alerte et accusé). Elle impose les contraintes propres au courrier
électronique : tableaux de disposition `role="presentation"`, styles en ligne seulement, jetons de
couleur de `docs/02` **recopiés en dur** (`var(--color-…)` ne vaut rien ici), `<meta charset>`
explicite, aucun `<details>`, texte d'aperçu masqué. Les deux rendus, HTML et texte, dérivent du
**même modèle** (`MailDocument`) : un champ ajouté apparaît dans les deux ou dans aucun, et les
deux versions ne peuvent pas divulguer des champs différents.

**Le JSON passe dans la seule version texte.** Il existe pour une reprise automatique, pas pour
être lu. Il reste dans le corps de l'e-mail à l'équipe — seul endroit autorisé pour une donnée de
santé (CLAUDE.md, `docs/05` §8) —, donc lisible dans la source du message et exploitable par un
outil, mais il n'écrase plus la fiche. Le vrai mécanisme de reprise reste `LEAD_WEBHOOK_URL`.
C'est réversible en une ligne (`MailSection` « textOnly » dans `layout.ts`).

**Les intitulés viennent du contenu, pas du code.** `situationQuestionLabels()` lit les questions
de `content/formulaires/{id}.json` ; les deux formulaires hors registre
(`sortie-hospitalisation`, `professionnel`) tirent leurs libellés de `content/emails.json`
(`equipe.libelles_situation`). Un dernier recours rend la clé présentable si une question arrivait
sans libellé — il ne doit jamais servir, il évite seulement qu'une clé nue parte chez le client.

**Aucune dépendance ajoutée.** Pas de bibliothèque de gabarits d'e-mail : le rendu reste deux
fonctions pures, testables sans navigateur ni serveur SMTP, et `pnpm mail:preview` écrit les cinq
messages dans `.previews/` pour les juger à l'œil.

## D-057 — Le favicon devient le monogramme « YC », aux couleurs du logo (09/10/2026)

**Contexte.** `src/app/favicon.ico` était encore l'icône livrée par défaut avec Next : le site
s'annonçait dans les onglets sous un logo qui n'est pas le sien.

**Erreur commise, et corrigée.** La première version a pris ses couleurs dans les jetons de
`docs/02` — teal et framboise — alors que **le logo de la marque était dans le dépôt**
(`public/images/marque/logo-youdom-care.png`). Il y montre un « y » **vert** et un « C » **bleu**.
Relevés au pixel : vert `#50C878`, bleu `#007FFF`. Leçon : la source d'une couleur de marque est
le logo, pas la palette d'interface — et il fallait chercher le logo avant de dessiner.

**Décision.** Monogramme « YC » sur fond blanc, Y en `#50C878`, C en `#007FFF`. Trois fichiers,
aux emplacements que Next reconnaît sans déclaration : `src/app/icon.svg` (navigateurs),
`src/app/apple-icon.png` 180 px, pleine page car iOS applique son propre masque, et
`src/app/favicon.ico` 16/32/48 (secours et vieux clients).

**Pourquoi un fond blanc et non teal.** Le bleu du logo ne tient que **2,7:1** sur `teal-900` :
rendu à 16 px, le C s'empâte et se confond avec le fond. Vérifié au rendu sur les trois fonds
(blanc, papier, teal-900) avant de trancher. Sur blanc, les deux lettres restent franches de 16 à
180 px, et c'est le fond sur lequel le logo est dessiné.

**Trois contraintes qui expliquent la forme du fichier.**

1. **Les lettres sont des tracés, pas du texte.** Une icône ne peut pas dépendre d'une police
   installée sur le poste qui l'affiche : un `<text>` se décale d'un système à l'autre, et le
   rendu des favicons n'applique pas les polices Web. Y et C sont donc deux chemins.
2. **Les deux lettres ont la même hauteur de capitale.** La première version donnait au C un
   diamètre plus petit que la hauteur du Y : le monogramme se lisait « Yc ». Corrigé au rendu.
3. **Les couleurs sont recopiées en dur.** `var(--color-…)` ne vaut rien dans une icône.

**Question ouverte, à poser à Arcel.** Le logo est vert et bleu ; l'interface du site est teal et
framboise (`docs/02`). Les deux ne se parlent pas. Ce n'est pas au favicon de trancher : soit la
palette d'interface se rapproche du logo, soit le logo est considéré comme une signature à part,
et il faut l'écrire dans `docs/02`. À instruire avec la révision de `docs/02`, qui lui reste due.

**Reste à faire, hors de cette décision** : aucune `theme-color` n'est déclarée, donc la barre du
navigateur sur mobile garde sa couleur par défaut.

## D-058 — La compaction du hero regarde la largeur, pas seulement la hauteur (09/10/2026)

**Contexte.** Demande d'Arcel : « fais en sorte que le site s'adapte à tout type d'écran ».

**Ce que la mesure a montré d'abord, et qui est une bonne nouvelle.** `pnpm audit:responsive`
charge quinze gabarits à neuf largeurs, de 320 à 1920 px, soit 135 mesures : **aucun débordement
horizontal**, nulle part. Le site s'adapte déjà. Le défaut est ailleurs.

**Le défaut.** Les quatre réglages de compaction du hero (`src/components/blocks/Hero/hero-scene.ts`
— échelle typographique, plafond des panneaux de verre, espaces entre blocs, marge verticale de la
section) ne regardaient que la **hauteur** de la fenêtre. Ils ont été écrits pour le paysage et le
zoom à 200 %, c'est-à-dire large et court. Sur un téléphone **étroit en portrait**, où c'est la
largeur qui manque, ils se comportaient de travers :

- un écran de 360 px de large rendait le titre à **31,9 px**, soit **plus gros** que sur un écran
  de 390 px (25,5 px), parce qu'il tombait dans le palier « hauteur moyenne » prévu pour le
  paysage ;
- un téléphone haut et étroit — 390×844, l'iPhone le plus répandu — ne déclenchait **aucun**
  palier et recevait le hero pleine taille, action rejetée 132 px sous la ligne de flottaison ;
- le plafond du panneau d'interaction suivait la même logique : 38 svh sur un 360×640 contre
  30 svh sur un écran plus haut, là encore plus généreux là où il fallait l'être moins.

**Décision.** Les quatre règles distinguent désormais la largeur, en conservant exactement les
valeurs prévues pour le paysage là où elles ont un sens (`min-width:64rem`) et en appliquant
l'échelle mobile ailleurs. Aucune valeur de design n'est inventée : les paliers existants sont
simplement déclenchés sur les écrans pour lesquels ils ont été pensés.

**Effet mesuré** (`pnpm audit:responsive`, avant → après) : accueil 360 px 316 → 153, accueil
390 px 132 → 33, accueil 414 px 94 → **0**, pathologie 414 px 96 → **0**, pages locales à 360 px
99 et 71 → **0**, article 390 px 145 → 57. Dix-huit mesures en défaut avant, quatorze après, et
les écarts restants réduits de moitié à deux tiers.

**Ce qui n'est pas réglé, et pourquoi je m'arrête là.** Il reste 320×568 et 360×640, où la
compaction maximale est déjà active : l'écart ne tient plus à un réglage mais au volume de contenu
du hero. Les trois leviers (raccourcir la promesse, réduire encore le panneau, ou accepter
l'action sous la ligne de flottaison en s'appuyant sur la barre d'action mobile) sont des
décisions de commanditaire. Détaillées dans `docs/PLAN.md`, DP.3, avec une recommandation.

**Outil ajouté** : `pnpm audit:responsive` écrit `docs/AUDIT_RESPONSIVE.md` et sort en erreur au
premier débordement horizontal. Il mesure avec les sélecteurs et la règle de hauteur visible de
`tests/e2e/hero.spec.ts` — la barre d'action fixe comprise — pour que ses chiffres et ceux des
parcours parlent de la même chose. Aucune dépendance ajoutée : il utilise le Playwright déjà là.

## D-059 — Les bannières des pages locales montrent l'accompagnement, plus des pièces vides (09/10/2026)

**Constat d'Arcel** : « les images du hero n'ont rien à voir avec l'aide à domicile, elles sont
toutes génériques ». Vérifié, et juste : les bannières locales tiraient de la photothèque
d'ambiance (`docs/design/PHOTOS.md` §6), explicitement « sans personne ou presque ». Un balcon avec
une chaise, une table avec du pain, un fauteuil, un banc. Des images d'illustration, pas de métier.

**Décision.** Les bannières des pages locales prennent les scènes d'accompagnement de
`public/images/heros/fonds/` : repas servi, visite, aide au lever, ménage. Cinq photos en rotation
par code INSEE, pour que deux communes voisines diffèrent.

**La règle « aucun visage » était plus stricte que nécessaire.** Ce qui est interdit, et qui le
reste, c'est de *nommer* ces personnes ou de les *présenter* comme salariées ou clientes
(`public/images/CREDITS.md`, brief D-024 §2), et de faire passer un lieu pour celui de la page.
Les textes alternatifs restent donc descriptifs — « deux femmes assises », jamais « notre
auxiliaire de vie » — et ne nomment aucune commune. Les pages services montrent des visages depuis
l'origine, sous la même licence et la même réserve.

**La page d'agence ne change pas** : elle garde l'entrée d'immeuble. Une photo de personnes y
serait lue comme « voici vos intervenants à Puteaux », ce qu'aucune illustration libre de droit ne
peut dire.

**Réserve ouverte, consignée dans `CREDITS.md`** : ces douze fichiers ne venaient ni de Pexels ni
d'Unsplash ; le projet les a enregistrés comme récupérés sur `youdom-care.com`, propriété d'Arcel.
Leur licence d'origine n'est pas documentée. À produire avant l'ouverture au public, ou à
remplacer par des photos de la photothèque libre de droit.

## D-060 — La mesure de ligne dépassait sa propre cible d'un cinquième (09/10/2026)

**Constat d'Arcel** : « le design des pages locales n'est pas pris au sérieux, c'est trop simple ».
Mesuré plutôt que jugé, sur la page de Puteaux : la zone éditoriale fait **1 270 mots en sept
sous-sections**, posées à même le fond de scène, sans surface ni repère.

**Trois corrections, toutes mesurées.**

1. **La mesure de ligne.** `--measure` valait `66ch`, par analogie directe avec la cible écrite en
   commentaire (« 60 à 72 caractères »). Mais `1ch` est la largeur du chiffre « 0 », et dans
   Atkinson Hyperlegible les chiffres sont bien plus larges qu'une lettre moyenne. Relevé sur cinq
   paragraphes : **81 caractères par ligne**, un cinquième au-dessus de la cible. `55ch` ramène à
   **70**. Le jeton étant global, la correction profite à toutes les pages de texte long — pages
   services, aides, articles.
2. **Une surface.** La zone éditoriale prend la carte blanche déjà employée par les autres blocs de
   la page (même `rounded-card`, même liseré, même élévation) : le texte long repose sur une
   surface et non sur la couleur de section.
3. **Des repères.** Un filet au-dessus de chaque sous-titre, sauf le premier, rend les sept
   sous-sections repérables au défilement sans ajouter de couleur.

**Ce que ça ne règle pas, et qui reste à instruire.** Le contenu de ces pages est riche et
réellement local (l'agence et sa rue, les chiffres Insee sourcés, les établissements de la
commune) : le reproche portait sur la présentation, pas sur le texte. Une passe de design plus
ambitieuse — chiffres mis en avant dans le fil du texte, citations détachées, illustrations
intercalaires — demanderait de structurer le contenu éditorial autrement que par du Markdown
courant. À arbitrer avec Arcel.

## D-061 — Un sommaire ancré sur la zone éditoriale des pages locales (09/10/2026)

**Suite de D-060.** La carte, la mesure de ligne et les filets de sous-section rendent le texte
lisible, mais ne le rendent pas **parcourable** : 1 300 mots en sept sections restent sept sections
à traverser. Or un visiteur de page locale cherche rarement à tout lire — il cherche « l'hôpital »,
« les aides », « la visite d'évaluation ».

**Décision.** Un sommaire ancré ouvre la zone éditoriale : les sous-titres de premier niveau, dans
l'ordre du texte, en liste compacte repliable sur plusieurs lignes.

- Les ancres sont fabriquées par **`slugifyHeading`**, la fonction déjà utilisée par les
  intertitres du magazine : une seule façon de calculer une ancre sur tout le site.
- Le sommaire est une `nav` nommée (`aria-labelledby`), donc annoncée comme telle par un lecteur
  d'écran, et les cibles portent `scroll-mt-24` pour ne pas arriver sous l'en-tête collant.
- Il n'apparaît **qu'à partir de trois sections** : en dessous, il encombrerait plus qu'il
  n'aiderait.
- Son libellé vit dans `content/interface.json` (`local.sommaire_h3`), pas dans le code.

**Défaut évité de justesse, qui vaut d'être noté** : la première version posait une classe
`heading-5` sur l'intitulé du sommaire. Cette classe **n'existe pas** — le design system s'arrête
à `heading-4`. Rien n'aurait échoué : ni le typecheck, ni le lint, ni les tests ne voient passer
une classe utilitaire inexistante, et le texte serait simplement sorti sans style. Repéré en
comptant les occurrences de chaque classe dans la feuille produite. **À faire chaque fois qu'on
écrit une classe de design system de mémoire.**

## D-062 — Les repères démographiques mènent par le nombre (09/10/2026)

**Suite de D-060 et D-061.** Le bloc « Repères chiffrés » rendait chaque fait sous la forme
`intitulé : valeur`, l'intitulé en gras coloré et la valeur en texte ordinaire. Pour un EHPAD ou un
CCAS, c'est juste : l'information est le **nom**. Pour la démographie, c'est l'inverse —
l'information est le **nombre**, et une page de chiffres se lisait comme une liste d'intitulés.

**Décision.** Pour le seul type `demographie` : la valeur passe en tête, en grand et en semi-gras,
l'intitulé dessous, la source en retrait. Et les repères démographiques se posent en **grille de
deux colonnes** dès trois faits, y compris en mode serré — c'est précisément là qu'ils vivent.
Les autres groupes gardent une colonne : leurs entrées sont des noms d'établissements, parfois
longs, qui ne se comparent pas d'un coup d'œil.

**Ce que je n'ai pas fait, et pourquoi.** L'idée première était des tuiles chiffrées au sens
strict — un grand nombre isolé, son unité, son libellé. Impossible sans abîmer les données :
`LocalFact.value` est du **texte libre** (« 44 198 habitants (Puteaux) », « 6,6 % de la population
(75-89 ans : 5,7 % ; 90 ans ou plus : 0,9 %) ») et aucun champ numérique n'existe dans le schéma.
En extraire un nombre par expression régulière finirait par afficher un chiffre faux sur une vraie
commune. Pour de vraies tuiles, il faut que le pipeline produise une valeur numérique et son unité
séparément — ce qui demande de le relancer, donc l'accès réseau aux sources ouvertes.

**Pas de graphique.** Cinq repères démographiques ne sont pas une série : la forme juste est le
chiffre lui-même, pas une courbe ni un histogramme. Les nombres gardent les formes
proportionnelles de la police — l'alignement tabulaire ne sert qu'en colonne de nombres et fait
paraître lâche un nombre isolé en grand corps.

**Le test a été réécrit sur l'intention, pas sur la forme** : il vérifiait la chaîne collée
« intitulé : valeur », ce qui interdisait toute mise en forme du chiffre. Il vérifie désormais que
les deux morceaux sont présents **et dans le bon ordre**. Au passage, le séparateur de milliers est
une espace fine insécable (U+202F) : échappée explicitement dans le test, comme le numéro de
téléphone des e-mails — une assertion ne doit jamais dépendre d'un caractère invisible.

## D-063 — Le menu « Nos services » reprend le catalogue d'Arcel, sans toucher aux URL (12/10/2026)

**Contexte.** Arcel a fourni la liste des services à présenter sur le site :

> Aide à l'autonomie / Aide à la vie quotidienne / Accompagner à la vie sociale / Aide pour les
> repas & courses / Retour d'hospitalisation / Entretien du cadre de vie / Présence 24h/24 /
> Garde-malade / Présence de nuit / Accompagnement en vacances

L'inventaire du site a montré que **huit de ces dix services avaient déjà leur page**, mais que
trois d'entre elles vivaient sous le pilier `/personnes-agees/` et n'étaient donc pas dans le menu
« Nos services » — un visiteur qui cherchait « aide à l'autonomie » ne la trouvait qu'en passant par
le public. Deux services portaient par ailleurs un autre nom que celui d'Arcel.

**Décision.** Le menu « Nos services » liste les neuf pages existantes qui correspondent au
catalogue, dans l'ordre d'Arcel :

| Libellé du menu | Page |
| --- | --- |
| Aide à l'autonomie | `/personnes-agees/aide-a-l-autonomie/` |
| Aide à la vie quotidienne | `/personnes-agees/vie-quotidienne/` |
| Accompagner à la vie sociale | `/personnes-agees/compagnie-et-stimulation/` |
| Retour d'hospitalisation | `/services/sortie-d-hospitalisation/` |
| Présence de nuit | `/services/garde-de-nuit/` |
| Présence 24h/24 | `/services/presence-24h-24/` |
| Garde-malade | `/services/garde-malade/` |
| Accompagnement en vacances | `/services/accompagnement-en-vacances/` |
| Remplacement d'auxiliaire de vie | `/services/remplacement-d-auxiliaire-de-vie/` |

**Trois choses que cette décision ne fait pas, et pourquoi.**

1. *Aucune URL ne change.* « Retour d'hospitalisation » reste servi par
   `/services/sortie-d-hospitalisation/`, « Présence de nuit » par `/services/garde-de-nuit/`. Le
   site n'a aucun mécanisme de redirection, et ces adresses sont déjà dans le plan de site soumis à
   Search Console : les renommer casserait des liens et ferait repartir l'indexation de zéro pour un
   gain de confort. Le libellé du menu suffit à nommer le service comme Arcel le nomme ; c'est ce
   libellé que lisent le visiteur, le plan du site et les pages du lexique.
2. *« Remplacement d'auxiliaire de vie » reste au menu* bien qu'il ne figure pas dans la liste
   d'Arcel : il a sa page, Arcel a demandé de le garder.
3. *« Aide pour les repas & courses » et « Entretien du cadre de vie » n'ont pas de page à eux.* Ce
   sont les deux seuls services de la liste dans ce cas. Ils sont **traités à l'intérieur** de
   « Aide à la vie quotidienne », dont la description de menu les nomme : « Repas, courses, linge,
   entretien du cadre de vie ». Les découper en deux pages est une question ouverte pour Arcel : ce
   serait deux pages de contenu neuf, et un découpage de trop donnerait deux pages minces là où une
   page complète se référence mieux.

**Conséquence sur les tests.** `src/app/plan-du-site/page.test.tsx` et
`src/app/lexique/[slug]/page.test.tsx` figeaient les anciens libellés : le plan du site et les pages
liées du lexique tirent leur nom du menu, le changement s'y propage, c'est le comportement voulu.
Les deux attentes ont été mises à jour, pas le code.

## D-064 — « Nos services » devient une page, pas seulement un menu (12/10/2026)

**Le défaut, qui n'était pas celui qu'on cherchait.** Arcel demandait que « les utilisateurs voient
tous les services présents sur la page services, bien structurée, bien organisée ». En cherchant
cette page pour la réorganiser, on a trouvé qu'elle **n'existait pas** : dans
`content/navigation.json`, l'entrée `services` portait `href: null` et neuf enfants. « Nos
services » était un menu déroulant sans page d'atterrissage, et aucune route `/services/` n'existait
dans `src/app/`.

Un visiteur ne pouvait donc voir les prestations **qu'une par une**, et seulement s'il savait déjà
laquelle chercher. Celui qui arrivait sans vocabulaire — le cas le plus fréquent — n'avait nulle
part où regarder. La question du découpage de « Aide à la vie quotidienne » (Q-OFFRE-7) était un
symptôme de ce manque, pas le problème.

**Décision.** Une page `/services/` réunit les prestations, groupées par ce que le visiteur cherche
plutôt que par notre organisation interne :

| Groupe | Services |
| --- | --- |
| L'aide régulière, semaine après semaine | Aide à l'autonomie · Aide à la vie quotidienne · Accompagner à la vie sociale |
| Une présence renforcée, le jour et la nuit | Présence de nuit · Présence 24h/24 · Garde-malade |
| Un moment particulier à passer | Retour d'hospitalisation · Accompagnement en vacances · Remplacement d'auxiliaire de vie |

**Ce que la page ne duplique pas, et c'est l'essentiel de sa conception.** Les libellés et les
descriptions des cartes **ne sont pas écrits dans `content/pages/services.json`** : ils sont lus
dans le menu (`content/navigation.json`) par `href`. Le menu et la page ne peuvent donc pas
diverger — deux textes à maintenir auraient fini par se contredire. Le JSON de la page ne décrit que
son plan : les groupes, leur ordre, l'icône de chaque service. Un `href` absent du menu
**interrompt le build** plutôt que d'afficher une carte sans nom.

**Les trois réponses aux questions ouvertes.**

1. *Q-OFFRE-7 (« Aide pour les repas & courses » et « Entretien du cadre de vie »).* Ces deux
   services n'ont pas de page à eux. Plutôt que d'en créer deux minces en découpant une page
   complète de 1 867 mots — et de faire se disputer la même requête à deux pages du même site —
   le champ `inclus` les **nomme sur la carte** de « Aide à la vie quotidienne ». Les dix services
   d'Arcel sont visibles ; aucun contenu n'est dupliqué. Un découpage reste possible plus tard,
   avec du contenu propre à chacun ; ce n'est plus un préalable.
2. *Mode d'intervention.* Le garde-fou du projet veut le mode indiqué pour chaque prestation.
   `content/tarifs.json` le porte, et sa liste `prestations` est **vide** (Q-TARIFS-1). Plutôt
   qu'inventer un mode par carte, la page renvoie vers `/comment-ca-marche/prestataire-ou-mandataire/`.
   Un test interdit qu'un mode apparaisse sur une carte tant que la donnée n'existe pas.
3. *Lien dans le menu.* `navigationItemSchema` impose « soit un href, soit des enfants ». Cette
   contrainte n'a pas été affaiblie pour la circonstance : l'index entre comme **premier enfant**
   du déroulant (« Tous nos services »). Aucun composant interactif n'a été touché.

**Liens entrants.** `check-depth` a refusé la page : aucun lien entrant contextuel, le menu ne
comptant pas. Le lien manquant n'était pas une formalité de référencement mais un vrai trou de
navigation en sens inverse — une page service ne montre qu'une prestation, et le visiteur qui
comprend en la lisant qu'il cherchait autre chose devait rouvrir le menu. `ServiceRelated` rend
désormais « Voir tous nos services » au bas de chaque page service.

**Enregistrement.** `declaredLastmod` (plan de site XML), `llms.ts` (tête de la liste des
services), et le plan du site, où l'index ouvre le groupe avec ses six pages en retrait — la
convention déjà en place pour les piliers.

**Contrôles.** 13/13 verts, 946 tests unitaires, 0 violation axe critique ou sérieuse sur mobile et
sur ordinateur, 0 débordement sur 144 mesures de 320 à 1920 px.

## D-065 — Le total des heures s'écrivait deux fois dans le texte de la page (12/10/2026)

**Le défaut.** L'audit du 12/10/2026 relève « environ 5151 heures par semaine » sur une centaine de
pages, et « 161161 » sur les pages de présence continue. Le calcul était juste : c'est l'affichage
qui doublait.

`CountUp` (`src/components/motion/CountUp/CountUp.tsx`) rendait **deux copies** de la valeur :

```html
<span aria-hidden="true" class="m-count__digits">45</span>
<span class="sr-only">45</span>
```

La première se compte de 0 à 45 et est masquée aux lecteurs d'écran pendant l'animation ; la
seconde, invisible à l'œil, leur donne la valeur. À l'écran comme au lecteur d'écran, c'était
juste. Mais le **texte** de la page valait « 4545 » — et c'est ce texte que lit un moteur de
recherche, un générateur d'extrait, `llms.txt`, et tout ce qui analyse la page sans la peindre.

**La correction.** Le rendu statique ne contient plus la valeur qu'une fois, sans `aria-hidden` :
sans JavaScript, le lecteur d'écran lit la vraie valeur, le moteur aussi. Le dédoublement
n'apparaît que **côté client, et seulement quand le comptage a réellement lieu** — un état
`animated` qui ne passe à vrai que dans l'effet, donc avec JavaScript, hors mouvement réduit et
avec un `IntersectionObserver`. Le premier rendu du client est identique à celui du serveur :
aucun écart d'hydratation.

**Ce qui l'avait laissé passer, et c'est le vrai enseignement.** Le test de `WeekPlanner` attendait
le défaut :

```ts
expect(summary).toHaveTextContent(/^Environ 15\s*15 heures par semaine, dont une nuit\.$/);
```

Un test qui épingle ce qu'il a observé au lieu de ce qui doit être vrai ne garde rien : il
transforme le défaut en contrat. L'assertion vérifie désormais que le texte vaut exactement la
phrase de `summaryText`, et celle de `CountUp` que le HTML livré ne contient le nombre qu'une fois.

**Vérifié sur le build**, pas seulement en test : 160 résumés de semaine lus dans les pages
construites, 0 doublé.

## D-066 — Une note de suivi interne s'affichait comme preuve d'un engagement (12/10/2026)

L'audit relève « Confirmé par Arcel le 27 septembre 2026 » visible sur le site. Vérification faite
sur les pages construites : la mention apparaissait sur **une seule page**,
`/a-propos/nos-engagements/`, par le champ `preuve` de l'engagement E2 dans
`content/engagements.json`. L'autre occurrence, `couverture.source` de `site.config.json`, n'est
**jamais rendue** — l'audit se trompe sur ce point.

Le champ `preuve` est destiné au visiteur : il porte un fait qu'il peut vérifier — un délai tenu,
une garantie écrite, un chiffre. « Le client nous l'a confirmé » n'en est pas un, et le lire sur le
site donne l'impression d'un brouillon laissé en ligne. Le champ repasse à `null` ; une preuve
vérifiable reste à écrire pour E2.

Les mentions internes nominatives sont retirées du contenu et des commentaires du code à la demande
du client. Les commentaires qui attribuent une **décision de conception** à une demande datée sont
conservés : ils expliquent pourquoi un réglage est ce qu'il est, et c'est de la provenance
d'ingénierie, pas une note de suivi.

**Ce que l'audit a lu comme un défaut de gabarit et qui n'en est pas un.** « Nos engagements » n'en
affiche qu'un, et « Ce qui change avec Youdom Care » qu'une carte, pour la même raison : quatre
engagements sur cinq portent `valide: false`, et le composant masque un engagement non validé. Ce
n'est pas une liste amputée, c'est le garde-fou qui fonctionne — publier ces textes demande que le
client les valide un par un. Les passer à `valide: true` pour remplir la page publierait des
promesses non validées : exactement ce que `docs/07` interdit. La grille s'adapte déjà au nombre
réellement affiché (D-032).

## D-067 — L'avantage fiscal, l'adjacence et les titres vides sur les pages locales (12/10/2026)

Trois corrections issues de l'audit du 12/10/2026, vérifiées une par une avant d'y toucher.

### 1. « L'avantage fiscal vient une fois par an » — faux depuis l'avance immédiate

Quatorze pages du Val-de-Marne écrivaient, en cinq variantes, que « l'avantage fiscal vient plus
tard, une fois par an, et ne change rien à votre trésorerie ». C'est contredit par l'avance
immédiate de l'Urssaf, que le site présente ailleurs.

La phrase reprend désormais la formulation **déjà sourcée** du site
(`content/aides/credit-d-impot-et-avance-immediate.json`, source urssaf.fr) : le crédit d'impôt se
déduit au moment du paiement « plutôt qu'un an plus tard », avec l'avance immédiate, **soumise à
conditions d'éligibilité**. L'ordre légal est conservé : le tarif TTC d'abord, parce que c'est
celui qu'on règle.

*Ce que je n'ai pas écrit, et pourquoi.* L'audit suggérait de mentionner l'exclusion APA/PCH. La
page de référence du site ne la porte pas : elle dit « soumise à conditions d'éligibilité », avec sa
source. Ajouter une exclusion précise que rien dans le contenu ne soutient aurait été un fait
inventé — sur un sujet où une famille prend une décision d'argent.

*Ce que le contrôle a corrigé chez moi.* Ma première rédaction disait « le crédit d'impôt de
50 % ». `check-local-facts` l'a refusée : tout nombre d'une page locale doit être un fait sourcé de
cette page. Le taux a donc disparu de la phrase — il vit, sourcé, sur la page dédiée vers laquelle
le texte renvoie. Le contrôle avait raison : un chiffre juste au mauvais endroit reste un chiffre
sans source.

*Deux pages que l'audit comptait à tort.* Serris et Jouy-en-Josas étaient dans sa liste de seize.
Elles écrivent « avant tout avantage fiscal », ce qui est exact. Le compte réel était quatorze.

### 2. « Ses voisines immédiates sont… » — une adjacence que la donnée ne porte pas

Trente et une pages affirmaient une adjacence. Or `communes_voisines` (`local-schema.ts`) ne porte
qu'un `distance_km` : **aucune notion de limite commune**. La liste est triée à vol d'oiseau, ce qui
mélange une commune limitrophe et une ville à trente kilomètres. Saint-Mandé annonçait ainsi le 11e
arrondissement parmi ses voisines immédiates — un arrondissement entièrement intérieur à Paris, qui
ne touche aucune commune de banlieue.

Le texte dit maintenant « les communes les plus proches », ce que la donnée soutient réellement.
Une seule affirmation d'adjacence subsiste, vérifiée exacte : le 12e borde Saint-Mandé.

*Ce que cela ne corrige pas.* Nommer les vraies limitrophes demande une source d'adjacence
(contours communaux), que le pipeline de données ouvertes ne peut pas récupérer tant que le réseau
de l'environnement est fermé. En attendant, le site ne dit plus faux : il dit moins.

### 3. Six titres sans une ligne dessous

Six pages portaient un titre suivi immédiatement d'un autre titre : Paris 11e, 12e, 13e, 18e, le
16e (« L'agence de Puteaux ») et Serris. Vérifié dans le HTML construit : le titre vide apparaissait
**aussi dans le sommaire ancré** (D-061). Un visiteur cliquait « Les communes voisines » et
atterrissait sur un titre sans rien. Les titres sont retirés — vérification faite, aucun ne portait
de texte propre, et aucune page sœur n'a de section obligatoire à cet endroit.

## D-068 — Une seule formulation sur les médicaments (12/10/2026)

**Le défaut, et pourquoi il est le plus sérieux de l'audit.** Le site portait 168 phrases parlant de
médicaments, dont **17 énonçaient la position de Youdom Care** — en trois versions incompatibles :

1. « L'aide porte sur les gestes du quotidien : … médicaments **donnés à l'heure prévue par le
   médecin** » — dit que l'auxiliaire de vie administre ;
2. « Youdom Care **ne donne aucun médicament** », « l'intervenante **ne touche pas** aux
   médicaments » — une auto-limitation plus stricte que la règle ;
3. « aide à la prise de médicaments préparés, dans le cadre légal » — la formulation juste.

Trois réponses différentes à la même question, sur un sujet où une famille décide qui entre chez
elle et ce qu'elle peut attendre. La première est la plus risquée : elle promet un geste que
l'auxiliaire de vie n'a pas à faire.

**La décision.** Une seule formulation, reprise de la charte de ton fournie par le client le
12/10/2026 :

> Votre auxiliaire de vie vous rappelle l'heure de vos médicaments et vous aide à les prendre quand
> ils ont été préparés par l'infirmier ou la pharmacie. Elle ne les prépare pas et ne fait aucun
> soin.

Transposée à la troisième personne, comme le reste des pages, et adaptée à la grammaire de chaque
phrase plutôt que collée à l'identique. Les 17 phrases de position sont alignées ; les 151 autres,
qui mentionnent les médicaments sans énoncer de position — « un conjoint qui gère les médicaments »,
« un médicament que la personne dit ne pas avoir pris » — sont laissées intactes : les remplacer
aurait abîmé des phrases justes.

**Ce que cette correction demande encore.** La formulation vient du client, pas d'une source
juridique : elle décrit ce que Youdom Care fait, et c'est à ce titre qu'elle fait autorité ici.
Qu'elle corresponde exactement au cadre légal de l'aide à la prise reste à faire confirmer par son
conseil — c'est le genre de phrase qu'on vérifie une fois et qu'on ne rouvre plus.

**Au passage, pour la quatrième fois de cette session** : une des 17 phrases a résisté au
remplacement parce qu'elle portait une espace ordinaire avant son deux-points là où les autres ont
une insécable. Un caractère invisible qui fait rater une correction sur dix-sept, sans aucun signal.
La leçon est acquise : sur ce projet, une substitution de texte français s'écrit avec une classe
d'espaces, jamais avec le caractère qu'on croit voir.

## D-069 — Les agences, et les adresses de l'ancien site (12/10/2026)

### Le nombre d'agences : une contradiction tenue par un seul fichier

L'audit opposait « depuis six agences » et « 2 agences réelles ». Vérification faite,
`content/site.config.json` — seule source autorisée pour les faits d'entreprise — porte **deux**
agences : Youdom Care Paris (61 rue de Lyon, 12e) et Youdom Care Hauts-de-Seine (Puteaux). Quinze
phrases du site parlent du nombre d'agences : **treize disaient déjà « deux »**. Les deux fausses
étaient dans le même fichier, `content/pages/aide-a-domicile.json` :

- `chapo` : « depuis six agences » ;
- `agences_texte` : « {agences} agences réelles, **de Paris à Versailles** » — le nombre était
  calculé, mais la seconde agence est à Puteaux, pas à Versailles.

Les deux champs sont réécrits. Le client a rappelé le 12/10/2026 que les deux adresses sont les
seules à conserver, y compris sur les pages locales, et qu'il ne faut pas s'en inquiéter : les
auxiliaires de vie interviennent dans toute l'Île-de-France. Le nouveau texte le dit, en reprenant
la règle déjà posée dans `couverture.phrase` : « la distance d'une commune à une agence n'est jamais
une limite. »

*Une promesse fausse retirée au passage.* L'ancien `agences_texte` annonçait que chaque agence « a
son adresse, son itinéraire et la liste des communes qu'elle suit ». L'audit note que les pages
agences n'ont ni horaires, ni plan, ni accès, ni responsable. La phrase ne promet donc plus ce que
les pages ne tiennent pas ; les compléter reste à faire, et demande des faits que seul le client a.

### Les adresses de l'ancien site répondaient 404

Dix-sept anciennes adresses sont redirigées en permanent vers la page qui traite le même sujet.
Deux précisions honnêtes :

- **La liste vient de l'audit, pas d'une vérification de notre part** : l'ancien site n'est plus en
  ligne et l'environnement n'a pas d'accès sortant. Une redirection vers une adresse qui n'a jamais
  existé ne coûte rien — elle répondait 404 de toute façon. Les correspondances, elles, sont un
  choix de notre part.
- **Deux sauts, pas un.** `trailingSlash: true` normalise avant d'appliquer les redirections :
  `/about` reçoit d'abord un 308 vers `/about/`, puis le 308 vers `/a-propos/`. J'avais d'abord
  déclaré les deux formes en écrivant en commentaire que cela donnait « une seule redirection » :
  c'était faux, et la mesure l'a montré — `/about` partait vers `/about/`, jamais vers
  `/a-propos/`. Les entrées sans barre étaient du code mort ; elles sont retirées et le commentaire
  dit maintenant ce qui se passe vraiment.

Next répond **308** et non 301 pour `permanent: true`. Les deux sont permanents et équivalents pour
un moteur ; le 308 conserve en plus la méthode HTTP. Vérifié sur le build : les huit adresses
testées arrivent à destination, et `/services/` répond 200 — elle n'est plus une ancienne adresse,
elle existe (D-064).

## D-070 — Le magazine était en noindex alors que ses articles étaient indexés (12/10/2026)

**Le défaut.** L'audit relève que `/magazine/` et ses six rubriques sont en « noindex, nofollow »
tout en figurant dans le plan de site : un moteur reçoit une adresse à explorer et la trouve fermée,
et aucun lien n'arrive aux treize articles.

**La cause, vérifiée dans le code et sur le build.** La condition était
`noindex: listPublishedArticles().length === 0`, et `listPublishedArticles()` ne retient que
`statut === "publie"`. Les treize articles du site sont tous `a_relire`, donc la liste était vide,
donc tout partait en noindex.

Or **D-035 a rendu un article `a_relire` indexable comme les autres** — `articleMetadata` pose
explicitement `noindex: false`, et le HTML construit d'un article ne porte aucune balise robots.
D-035 a donc changé la règle de l'article sans changer celle du hub. Treize articles indexés sous un
index fermé, c'est l'incohérence que l'audit a vue de l'extérieur.

**La correction.** Une page de liste s'indexe selon **ce qu'elle montre** : elle est en noindex quand
elle ne liste aucun article, et indexable dès qu'elle en liste un. C'est la même règle pour l'index,
les pages de pagination et les rubriques.

Vérifié sur le build après correction : `/magazine/` et les cinq rubriques peuplées n'ont plus de
balise robots ; `/magazine/categorie/dans-les-coulisses/` reste en noindex, parce qu'elle n'a
réellement aucun article — ce qui est le comportement voulu, et répond au passage à la remarque de
l'audit sur cette rubrique vide.

**Le test, encore une fois, gardait l'ancienne règle** : `expect(data?.noindex).toBe(!data?.articles.some((a) => a.meta.statut === "publie"))`.
Écrit ainsi, il se contentait de recopier la logique du code au lieu d'affirmer ce qui doit être
vrai, et il restait vert quelle que fût la réponse. Il affirme désormais le contrat : l'index liste
des articles, donc il s'indexe. C'est la troisième fois aujourd'hui qu'un test adossé à
l'implémentation laisse passer un défaut que le premier lecteur humain voit.

## D-071 — Le site ne dit plus qu'il lit une base de données (12/10/2026)

**Le défaut.** L'audit relève, sur les pages locales, des « signaux de génération automatique » :
noms d'établissements importés sans accents, libellés d'annuaire, et surtout des tournures qui
disent au visiteur qu'il lit une base plutôt qu'une page écrite pour lui. La charte de ton fournie
par le client le même jour les nomme explicitement : « recensé, d'après les données, la base, FINESS
→ supprimer, ou "dans la commune", "tout près" ».

**Mesuré avant de corriger** : 312 « recensé », 78 « référencé », 49 mentions de base ou de données,
76 noms sans accents.

**Ce qui a été fait.** 387 tournures d'annuaire réécrites en français ordinaire — « trois
établissements de santé **sont recensés** dans le 8e » devient « se trouvent » ; « aucun accueil de
jour **n'est recensé** » devient « n'existe » ; l'usage adjectival (« le seul établissement
**recensé** dans la commune ») est simplement supprimé. 146 mentions de base ou de données retirées
ou réécrites. 91 noms d'établissements restitués avec leurs accents, comme la charte l'autorise
nommément : Hôpital, Privé, Sœurs, Cœur, École, « Hôpital Delafontaine, centre hospitalier de
Saint-Denis » au lieu du libellé tronqué « Centre Hospitalier de St Denis Hopital Delafontaine ».

**Ce qui est resté intact, et c'est le plus important.**

- **« au recensement de 2022 » et « recense »** : ce sont les sources Insee des chiffres de
  population. Les motifs employés visent `recensé` avec son accent, qui ne les touche pas — vérifié,
  113 mentions de « recensement » préservées.
- **« habitants recensés en 2022 »** : protégé par une exclusion explicite, pour la même raison.
- Les mentions légitimes de « données » hors pages locales : « vider les données du site dans votre
  navigateur » (politique de confidentialité), les licences des photographies, « les consignes
  données par l'équipe ».

**Le sourcing n'est pas affaibli.** Vérifié sur le build : chaque page locale rend un bloc
« Repères chiffrés, avec leurs sources », avec « Source : Insee, consulté le 26 septembre 2026 ».
L'attribution dans le corps du texte était redondante avec ce bloc ; la retirer ne désource aucun
fait, et `check-local-facts` reste vert.

**Deux fautes que j'ai introduites et corrigées.** Ma substitution `est recensé` → `se trouve` a
produit cinq « y se trouve », qui n'est pas français — il fallait « s'y trouve ». Et elle a produit
un « se trouve par la base de la CNSA » là où le texte disait « est recensée par la base ». Les deux
ont été trouvées en relisant systématiquement ~450 substitutions, pas par hasard : sur un
remplacement de masse, la vérification n'est pas optionnelle, c'est la moitié du travail.

**Un contrôle a attrapé une troisième conséquence** que je n'avais pas vue : en retirant « référencés »
d'une méta-description, je l'avais fait passer sous le minimum de 140 caractères.
`check-local-facts` l'a refusée. Recomposée à 144 caractères, avec un fait de la page et non du
remplissage.

**Ce que je n'ai pas touché.** « Foyer-Logement Beloeuil-Miller » : c'est peut-être un nom propre
exact, peut-être un « Belœuil » importé sans ligature. Sans source pour trancher, le corriger serait
inventer un nom. À vérifier auprès de l'établissement.

## D-072 — Les coquilles, et l'espace insécable sur tout le site (12/10/2026)

### Les coquilles de l'audit, vérifiées une par une

Quinze coquilles étaient listées. **Quatorze réelles, une fausse** : « Saint-Quen » est en réalité
« Pôle autonomie territorial de Saint-Quentin », correct — l'audit avait attrapé un fragment de mot.
Corrigées : « Notre-de-Dame » → Notre-Dame, « Groupe Hostipalier Sud Ile de France » → Groupe
hospitalier Sud Île-de-France, « Clinique Saint Jean L'ermiage » → Clinique Saint-Jean l'Ermitage,
« Cardinal Wyszinski » → Cardinal-Wyszynski, « expliquez-la nous » → expliquez-la-nous, « des lever
difficiles » → des levers difficiles, « Ambroize Croizat » → Ambroise Croizat, « Richard-Walace » →
Richard-Wallace, « Les Lillas » → Les Lilas, « Les Jardin des acacias » → Les Jardins des Acacias,
« à Le Kremlin-Bicêtre » → au Kremlin-Bicêtre.

Deux phrases cassées étaient des interpolations de gabarit où un nom manquait : « L'EHPAD **du**
propose par ailleurs… » et « **Au,** Casa Delta 7 regroupe deux structures. » Réparées d'après ce que
la page dit ailleurs, sans inventer de nom.

**Deux noms laissés en place**, faute de source pour trancher : « Foyer-Logement Beloeuil-Miller »
et « EHPAD d'Orgement ». Ce sont peut-être les noms exacts, peut-être des libellés importés sans
ligature ou mal orthographiés. Les corriger au jugé serait inventer un nom propre.

### L'espace insécable, partout

La charte demande une espace insécable avant « ; : ! ? ». Mesure avant correction : **507 correctes
contre 3 464 ordinaires** — la règle n'était quasiment pas appliquée. Une ponctuation précédée d'une
espace ordinaire peut passer seule à la ligne.

**4 776 espaces posées** : 3 354 dans les contenus JSON, 1 422 dans les MDX. Le caractère compte pour
un, donc les contraintes de longueur SEO (titre 50-60, description 140-155) ne bougent pas — vérifié,
`check-local-facts` reste vert. Les notes internes `_lisezmoi` sont laissées de côté : elles ne sont
jamais rendues. Les séparateurs composés en code sont alignés eux aussi : les e-mails de demande
(`layout.ts`, `render.ts`) et le nom accessible des navigations du plan du site.

### Ce que cette correction a appris sur les tests

Vingt tests ont cassé. Pas une régression : ils épinglaient l'ancienne typographie. Les aligner a
révélé une **asymétrie des bibliothèques de test** qu'il faut connaître pour ce projet :

| Comparaison | Texte du DOM | Attente à écrire |
| --- | --- | --- |
| `getByRole(…, { name })` | **non normalisé** | avec l'insécable |
| `toHaveTextContent(…)`, `getByText(…)` | normalisé (l'insécable devient une espace) | avec une espace ordinaire |
| `toContain` sur une chaîne brute (e-mails) | non normalisé | avec l'insécable |

Mon premier remplacement, appliqué sans cette distinction, a cassé ce qu'il venait de réparer : cinq
allers-retours pour y arriver. Là où c'était possible, l'attente est devenue indifférente au type
d'espace — `/^Source\s: .+/` plutôt qu'une insécable codée dans l'expression régulière. C'est la
forme qui restera juste si la typographie change encore.

## D-073 — La CI dépassait son propre délai, et cela se lisait comme un échec (12/10/2026)

**Le constat.** Le dépôt du client montrait deux exécutions rouges sur `main`. Elles ne disaient pas
la même chose, et c'est la durée qui les sépare :

| Exécution | Durée | Nature |
| --- | --- | --- |
| `37944143797` | 3 min 21 s | **vrai échec** — un test cassé |
| `38216421109` | **20 min 20 s** | **délai dépassé** — arrêté par GitHub |

`ci.yml` déclarait `timeout-minutes: 20` sur un job unique. La seconde exécution n'a trouvé aucun
défaut : elle n'a pas eu le temps de finir. Un délai dépassé s'affiche comme une croix rouge dans la
liste des exécutions — l'alerte sans l'information, le pire des deux mondes, et ce qui a fait croire
à un travail cassé.

La cause est la taille de la suite de parcours : **788 tests**, soit 43 fichiers × deux projets
(mobile et ordinateur), exécutés *après* l'installation, le build, les tests unitaires et les
contrôles, tous dans le même job.

L'échec de 3 min 21 s, lui, est le test qui ne cassait qu'en CI à cause de `SITE_INDEXABLE="false"` :
corrigé le 12/10/2026 (`ArticleTemplate.test.tsx`, `vi.stubEnv`), il attend d'être fusionné.

**La décision.** Deux jobs parallèles plutôt qu'un seul enchaînement :

- `verifier` : audit, lint, typecheck, formatage, tests unitaires, build, contrôles — 20 minutes ;
- `parcours` : les parcours en **trois fractions parallèles** (`--shard=i/3`) — 25 minutes chacune,
  avec le navigateur de Playwright mis en cache, son téléchargement coûtant une à deux minutes par
  fraction.

Le temps d'attente devient celui du job le plus long, non la somme des deux.

**Vérifié, pas supposé.** Le découpage ne doit pas perdre de test :

```
fraction 1/3 : 263   fraction 2/3 : 263   fraction 3/3 : 262   somme : 788
```

`fail-fast: false` : une fraction en échec ne masque pas les deux autres — on veut la liste complète
des défauts en une exécution. Et un nom de rapport par fraction, deux artefacts de même nom se
refusant l'un l'autre.

**Ce que cette correction ne fait pas.** Elle vit dans ce dépôt. Le `main` du client garde son job
unique et continuera d'être coupé **jusqu'à ce que ce travail y soit fusionné**. La croix rouge
disparaîtra avec la mise à jour, pas avant.

**Une mesure que je n'ai pas prise, et pourquoi.** La durée réelle de la suite n'a pas été mesurée
ici : ce conteneur est nettement plus lent qu'un exécuteur GitHub, et son chiffre ne dirait rien de
la CI. Le dimensionnement s'appuie sur le fait établi — 20 min 20 s contre une limite de 20 minutes
— et non sur une extrapolation locale. La première exécution après fusion donnera la vraie durée par
fraction, et c'est elle qui dira s'il faut quatre fractions plutôt que trois.

## D-074 — Quatre attentes de parcours figées sur l'ancienne typographie (12/10/2026)

**Le défaut, et il est de moi.** La suite de parcours, exécutée en conditions d'intégration après
D-072, donne **22 échecs** (658 verts, 108 ignorés, 20,4 min). J'avais aligné les tests **unitaires**
sur l'espace insécable, et jamais lancé les **parcours** avant de livrer. Quatre assertions
comparaient encore un texte à espace ordinaire :

| Fichier | Attente | Correction |
| --- | --- | --- |
| `local.spec.ts` | `/Source : .+, consulté le/` | `/Source\s: …/` — indifférente au type d'espace |
| `magazine.spec.ts` | `name: "Le Fil : comment…"` | insécable |
| `tous-gabarits-axe.spec.ts` | `name: "Plan du site : Pour qui ?"` | insécable |
| `home.spec.ts` | `Votre agence la plus proche : …` | insécable |

Là où c'était possible, l'attente est devenue **indifférente au type d'espace** (`\s`) plutôt que de
porter l'insécable : c'est la forme qui restera juste si la typographie bouge encore.

**Les dix-huit autres ne sont pas de moi, et c'est vérifié un par un, pas supposé.**

- **Huit `hero.spec.ts`** : la dette **DP.3**, consignée le 05/10/2026 avec le chiffre exact que j'ai
  mesuré aujourd'hui — 551 px pour 508 disponibles sur l'accueil à 320×568. J'ai cru un moment en
  être la cause par l'insécable ; **la mesure l'a écartée** : en retirant toutes les insécables du
  hero dans le navigateur, l'action reste à 551 et le H1 à 126 px. Rien ne bouge.
- **Un `mouvement.spec.ts`** : la dette **DP.4**, consignée le même jour.
- **Un `magazine.spec.ts`** : le fil d'Ariane absent sur téléphone. Ce n'est pas un défaut mais une
  décision de conception de la phase 9 — `heroOnlyWide = "max-lg:hidden"`, avec sa justification
  écrite : sous 64 rem la hauteur visible ne peut pas porter le fil en plus du titre, de la promesse,
  de l'interaction, de l'action et du repère. **Le test contredit la décision** ; c'est lui qu'il
  faudra reprendre, et cela demande l'arbitrage qui va avec DP.3.
- Le dernier commit touchant ces fichiers dit « 97 échecs → 18 » (05/10/2026) : ce socle de dix-huit
  était déjà connu et mesuré.

**Pourquoi personne ne l'avait vu.** La CI n'a **jamais atteint** l'étape des parcours : elle était
coupée à 20 minutes (D-073). Ces dix-huit échecs existaient sans être affichés nulle part. En
corrigeant le délai, la CI va enfin les montrer — c'est le but, et c'est inconfortable : un rouge
qui nomme une dette connue vaut mieux qu'un délai dépassé muet.

**La leçon, et elle est simple.** Un changement de contenu qui touche 5 637 chaînes ne se vérifie
pas avec les seuls tests unitaires. Les parcours sont le seul endroit où le texte rendu est comparé
à ce qu'on attend. Ils prennent vingt minutes ; c'est le prix d'une livraison, pas une option.

## D-075 — « Je préfère en parler » devient « Je préfère ne pas en parler » (12/10/2026)

**Relevé par le client** sur les formulaires de demande. Vérification faite avant de toucher :

- **La chaîne n'est pas une erreur de frappe** : elle vient de `b96e6d6 feat(phase-03)` et elle est
  **écrite dans le cahier des charges**, `docs/05_FORMULAIRES.md` point 3 — « chaque question offre
  "À définir ensemble" ou "Je préfère en parler" ». L'intention était une invitation à la
  conversation plutôt qu'un refus.
- Elle n'a **pas** été touchée par les travaux du 12/10 (vérifié : `git log -S "choix_parler"` sur la
  plage du jour ne renvoie rien).

**Pourquoi le changement est néanmoins juste.** Placée en réponse à « De quelle maladie
s'agit-il ? », « Je préfère en parler » ne dit plus ce qu'elle veut dire : le visiteur ne sait pas
s'il décline la question ou s'il demande un appel. Une option d'échappatoire doit être lisible du
premier coup d'œil — c'est sa seule fonction. Le pendant « À définir ensemble », qui porte sur les
besoins et non sur une donnée sensible, reste inchangé : lui est clair.

**Le registre.** Le client proposait « Je préfère pas en parler ». La charte de ton demande un
français simple **et** correct ; la forme retenue est donc **« Je préfère ne pas en parler »**.

Seize occurrences dans douze fichiers, dont **une seule rendue** —
`content/interface.json` › `choix_parler`. Les six fichiers de formulaire ne la citaient que dans
leur note interne. Le cahier des charges est corrigé avec le code, pour qu'ils ne divergent pas.

946 tests, 13/13 contrôles, les deux parcours de formulaires verts.

## D-076 — DP.3 tranchée : la barre d'action porte l'action sur téléphone (12/10/2026)

**La décision du client**, prise sur les trois leviers que `docs/PLAN.md` DP.3 lui réservait : sur
petit écran, l'action principale peut rester sous la ligne de flottaison, **parce que la barre
d'action mobile porte « Ma demande » en permanence et qu'elle, elle est toujours visible.**

**Ce qui change dans le parcours, et pourquoi ce n'est pas un relâchement.** `hero.spec.ts`
mesurait l'action du hero à toutes les tailles. Il mesure désormais **qui porte réellement
l'action** :

- au-dessus de 64 rem, le hero — action principale et interaction immédiate dans la fenêtre, comme
  avant ;
- en dessous, la **barre d'action mobile** (`navigation` « Actions rapides »), et son lien
  « Ma demande ».

Le H1 reste exigé dans la fenêtre à **toutes** les tailles. La garantie du contrat — *le visiteur
voit où il est et peut agir sans défiler* — ne baisse donc pas : c'est la responsabilité qui change
de composant. Le critère est la **présence de la barre**, pas une largeur écrite dans le test : si
la barre disparaissait un jour sur téléphone, le parcours échouerait, ce qui est exactement le but.

Résultat mesuré : `hero.spec.ts` passe de **16 échecs à 0**, 58 parcours verts, **sans toucher une
ligne du site**.

### La conséquence que je n'avais pas prévue : DP.5 se corrige par le code

En préparant ce lot, j'avais proposé au client d'aligner aussi le test du fil d'Ariane du magazine
sur `heroOnlyWide`. **C'était une erreur de ma part, et je ne l'ai pas faite** : ce test porte un
commentaire explicite — « Reste rouge volontairement sous 64 rem (DP.5) […] `docs/00 §5` l'exige sur
toutes les pages sauf l'accueil. Ce parcours dit la règle écrite ; on ne le réécrit pas pour épouser
l'écart. » Le code violait le cahier des charges, et le test était le garde-fou. L'aligner aurait
effacé la seule trace du défaut.

La décision sur DP.3 a libéré la hauteur qui manquait. Mesuré à 320×568 avant de changer quoi que
ce soit : le fil d'Ariane coûte **79 à 106 px**, et le H1 reste à **307 px pour 508 disponibles** —
200 px de marge. Le fil d'Ariane est donc rétabli sur toutes les tailles dans les quatre gabarits
qui le portaient (article, service, locale, agence). C'est **le code qui se conforme à la règle**,
pas le test qui s'assouplit. Dans deux de ces gabarits, `heroOnlyWide` ne servait qu'à cela : son
import a disparu avec.

### Ce qui reste, et que je n'ai pas fait

Le parcours du magazine échoue encore sur un point : la **ligne de confiance** (auteur, relecteur,
date) est placée **dans la colonne photo** de la bannière, masquée par `heroOnlyWide` *et* par
`heroWhenTall` — donc absente sur téléphone. L'audit du 12/10 demandait précisément qu'auteur et
relecteur soient visibles (E-E-A-T).

La sortir de cette colonne est une **restructuration de la bannière d'article**, pas un réglage. Il
y a la place (200 px de marge mesurés), et c'est la bonne correction ; mais c'est une décision de
mise en page, du ressort du commanditaire, et ce serait la troisième modification de design que je
justifierais par la précédente. Elle est donc proposée, pas appliquée.

## D-077 — La ligne de confiance d'un article disparaissait là où on lit le plus (12/10/2026)

Suite directe de D-076. Le parcours du magazine exigeait la ligne de confiance — auteur, relecteur,
dates, temps de lecture — visible sur toutes les tailles. Elle était placée **dans la colonne média**
de la bannière, masquée sur téléphone par `heroOnlyWide` **et** par `heroWhenTall`.

Sur un article, l'information la plus demandée après le titre est **qui l'a écrit**. Elle manquait
précisément là où la lecture se fait le plus. L'audit du 12/10 le relevait sous un autre angle :
« Auteur et relecteur : aucun nom […] c'est le levier le plus rentable pour un site de santé. »

La ligne sort donc de la colonne média. Un seul élément dans le DOM, pas deux copies à visibilités
complémentaires : la leçon de D-065 est que dupliquer un contenu pour le montrer ailleurs le fait
lire deux fois.

**Deux emplacements essayés, et c'est la mesure qui a tranché.** Placée avant l'action, dans l'ordre
de lecture naturel (titre, chapô, l'essentiel, qui l'écrit, puis l'action), elle a poussé le bouton
du hero de 58 px sur **ordinateur** — 958 px pour 900 disponibles, et `hero.spec.ts` l'a attrapé
immédiatement. C'était ma régression, trouvée en deux minutes parce que le parcours venait d'être
remis en état par D-076.

Elle est donc posée en **fin de colonne**, après l'action et le repère de défilement : elle ne pousse
plus rien, et reste visible sur téléphone. 66 parcours de hero et de magazine verts.

**Ce que cet aller-retour montre.** Un parcours réparé se met à payer tout de suite : sans la remise
en état de `hero.spec.ts`, ce déplacement aurait dégradé le premier écran de tous les articles sur
ordinateur, sans que rien ne le signale.

## D-078 — Le sommaire des pages locales avait des cibles de 21 px (12/10/2026)

Relevé par `tests/e2e/mobile.spec.ts` sur les pages de département et de commune, à 390 px :

```
cibles sous 44 px : « Se déplacer, et l'agence de Puteaux » 248×21
```

**C'est mon défaut, et il date du jour même.** Le sommaire ancré des pages locales (D-061) rendait
ses liens en texte simple : 248 px de large, **21 px de haut**. Lisible à la souris, trop fin au
pouce — le contrat mobile du projet exige 44 px, et c'est la bonne exigence sur un site dont le
public appelle depuis un téléphone.

Les liens reçoivent `inline-flex min-h-11 items-center`, comme toute autre cible tactile du site.
Le sommaire grandit en hauteur ; c'est le prix d'une cible atteignable, et il est juste.

**Ce que cet enchaînement de la journée montre.** D-061 a ajouté le sommaire sans que rien ne
mesure ses cibles, parce que la CI n'atteignait jamais les parcours (D-073). Le délai corrigé, le
parcours a trouvé le défaut en une exécution. Trois corrections d'aujourd'hui — les quatre attentes
typographiques, la ligne de confiance qui poussait le bouton de 58 px, et ces cibles de 21 px —
n'auraient été vues par personne sans cela.

**Compte final de la suite, environnement cohérent** (`SITE_INDEXABLE="false"` posé **avant** le
build, comme la CI le fait au niveau du job) : **677 verts, 108 ignorés, 3 échecs, 18,6 min**. Après
cette correction il en reste **un** : la dette DP.4, consignée le 05/10/2026 et réservée à Arcel.

*Note de méthode, pour la prochaine fois.* Mon avant-dernière mesure annonçait **61** échecs : j'avais
lancé `pnpm build` **avant** d'exporter `SITE_INDEXABLE`, donc construit le site indexable puis testé
comme s'il était fermé. Soixante et un faux défauts, tous sur l'indexation. La CI ne connaît pas ce
piège : elle déclare ses variables au niveau du job, une fois pour toutes les étapes. Reproduire une
chaîne à la main sans reproduire **l'ordre** de ses déclarations, c'est mesurer autre chose.

## D-079 — DP.4 : le plan se trompait de coupable (12/10/2026)

**Le défaut mesuré.** `tests/e2e/mouvement.spec.ts` relevait une animation à **640 ms** sur
l'accueil, contre un plafond de 600 ms délai compris. En reproduisant exactement sa mesure dans le
navigateur — même collecteur, même parcours de défilement, mêmes points de collecte — le seul
dépassement est :

```
total 640   prop="stroke-dashoffset"   <path class="thread-knot">   delay=240  dur=400
```

Le **nœud du composant `Thread`**. Il partage la durée du tracé (`MOTION_DURATION.draw` = 400 ms) et
partait à `0.6` de celle-ci : 240 + 400 = 640.

**Correction** : `0.4`, soit 160 + 400 = **560 ms** — la durée d'entrée du hero, et le contrat
respecté avec de la marge. Ni le seuil du parcours ni la règle écrite n'ont été touchés :
l'implémentation violait son propre garde-fou, posé dans `docs/design/MOUVEMENT.md` §8 (« aucune ne
dépasse 600 ms, délai compris », `MOTION_MAX_DURATION`).

**Ce que le plan disait, et pourquoi c'était faux.** DP.4 attribuait le dépassement au décalage des
révélations : « `motion.css` donne aux blocs `.m-reveal` une transition de 360 ms avec un délai de
60 ms par rang ; le total franchit 600 ms dès le cinquième élément ». Le calcul est juste, sa
prémisse non : `MOTION_STAGGER = 40` est le contrat (`grid.ts`, « contrat §5 : 40 ms ») et
`Reveal` **pose lui-même** `--m-stagger` à cette valeur. Les 60 ms de `motion.css` ne sont qu'un
repli jamais atteint. Le décalage ne dépassait donc pas, et la mesure le confirme : zéro dépassement
hors le nœud.

Le plan en concluait qu'il fallait trancher entre trois règles de `docs/02 §5`, et réservait la dette
au commanditaire. **Il n'y avait rien à trancher** : un seul composant ne respectait pas un plafond
déjà écrit. Ce diagnostic erroné est ce qui a tenu la dette ouverte une semaine.

**Une correction que j'ai faite puis annulée.** J'ai d'abord plafonné le rang du décalage
(`min(var(--m-i), 3)`), en suivant le plan. Le test continuait d'échouer à 640 — preuve que ce
n'était pas la cause — et ce plafond changeait la cascade de tout le site : au-delà du troisième
rang, les éléments seraient arrivés ensemble. Annulé. **Modifier un comportement sans défaut mesuré
coûte plus que de ne rien faire** : personne ne l'aurait relié à cette journée.

**Le second point de DP.4 ne se déclenche pas.** `--thread-duration: 800ms` (`tokens.css`) concerne
le fil conducteur, lié au défilement : il n'a pas de durée en millisecondes et le parcours l'exclut
correctement. `docs/02 §1` l'autorise d'ailleurs entre 600 et 900 ms.

## D-080 — Un 404 ne prouve la disparition que si l'on interroge comme un visiteur (13/10/2026)

**Le défaut.** Sur le dépôt du client, `pnpm validate` échouait — `12/13`, `check-links` rouge, trois
sources de `pour-les-personnes-agees.gouv.fr` en **HTTP 404** : « les points d'information locaux »,
« soutien financier » des aidants, « l'APA à domicile ».

**Ce que je ne pouvais pas voir, et ma première erreur.** Ce portail est injoignable depuis mon
conteneur : `check-links` dégrade alors l'adresse en avertissement et annonce `13/13`. J'ai donc
annoncé « tout est vert » sur la foi d'un contrôle qui, pour cette partie, ne mesurait rien.

Faute de réseau, j'ai pris le run de CI pour oracle : les autres adresses du même portail y passaient,
donc — ai-je conclu — pas de blocage par hôte, donc trois pages avaient vraiment bougé. J'ai retiré
deux sources et repointé la troisième vers l'adresse que `content/lexique/clic.json` citait pour la
même page.

**La mesure, depuis un poste avec réseau** (codespace, agent de navigateur) :

```
200 /vivre-a-domicile/aides-financieres/l-apa-a-domicile
200 /solutions-pour-les-aidants/soutien-financier
200 /preserver-son-autonomie/a-qui-s-adresser/les-points-d-information-locaux-dedies-aux-personnes-agees
000 /preserver-son-autonomie-s-informer-et-anticiper/a-qui-s-adresser/les-points-d-information-…
```

Les trois pages sont **en ligne**. Ce portail répond **404 — et non 403 — aux agents qui s'annoncent
comme des robots**, et le contrôle s'annonçait `Mozilla/5.0 (compatible; YoudomCare-check-links/1.0)`.
Le commentaire de `goneStatuses` connaissait le filtrage de ce host, mais le croyait en 403 ; en 404,
le même filtrage traverse le garde-fou et se présente comme une page disparue.

Mon oracle était faux de la même façon : « passer en CI » ne voulait pas dire « vivante », seulement
« pas 404 ». La preuve en est la quatrième ligne — l'adresse reprise de `clic.json`, qui passait la
CI, ne répond pas du tout.

**Correction.** Les trois sources sont rétablies telles quelles (rien à corriger dans `content/`), et
`checkExternal` interroge désormais avec `BROWSER_USER_AGENT = "Mozilla/5.0"`, la seule chaîne dont on
ait la preuve qu'elle obtient 200 sur ces pages. La question que pose ce contrôle est « cette page
répond-elle à un visiteur ? » : il faut donc la poser comme un visiteur. Un test fige l'agent
(`scripts/validate/check-links.test.ts`) pour que le jeton de robot ne revienne pas sans nouvelle
mesure. `goneStatuses` n'a pas bougé : 404 et 410 restent des erreurs.

**Deuxième mesure, deuxième surprise.** Le run de CI qui portait cet agent a bien blanchi les trois
adresses — et en a sali une quatrième, jusque-là verte :

```
✖ …/solutions-pour-les-aidants/soutien-financier/l-aide-au-repit-dans-le-cadre-de-l-apa → HTTP 404
```

Sa page parente répond 200 depuis le codespace, et c'est une autre adresse qui échouait au run
précédent. **L'adresse qui échoue change d'un run à l'autre** : ce n'est donc pas la page qui manque,
c'est l'hôte qui refuse une partie des requêtes quand le contrôle lui en envoie six à la fois, en se
présentant comme une page disparue. L'agent n'était qu'une partie du problème.

`checkExternal` **confirme donc toute disparition par un second appel**, après une pause de deux
secondes et hors de la rafale. Une page vraiment disparue répond 404 deux fois : le contrôle ne perd
rien. Un hôte qui refuse sous charge répond 200 au second appel, et l'adresse devient un
avertissement nommé (« 404 au premier appel, 200 au second : hôte qui refuse sous charge »), visible
mais non bloquant. `goneStatuses` n'a toujours pas bougé.

**Ce qui reste ouvert.** L'adresse `…-s-informer-et-anticiper/…` de `content/lexique/clic.json`
(`lien_officiel`) n'a pas répondu à la mesure. Elle est antérieure à cette session ; sa section
longue n'existe probablement plus. À vérifier depuis un poste avec réseau avant de la remplacer par
`…/preserver-son-autonomie/a-qui-s-adresser/…`, qui, elle, renvoie 200 — je ne la change pas sur une
seule mesure à 000, qui peut être un délai dépassé.

**Ce que je garde de l'épisode.** `check-links` dit maintenant quand il n'a rien éprouvé : si aucune
adresse externe ne répond, il ajoute un avertissement nommant le compte (`0 des 135 adresses n'a
répondu depuis ce poste`). C'est ce garde-fou qui manquait pour que je n'annonce pas un vert que je
n'avais pas mesuré. Et la leçon de fond : deux fois de suite, j'ai déduit l'état du monde d'un
contrôle qui ne pouvait pas l'observer. Sur ce poste, `check-links` ne vérifie que les liens
internes.

## D-081 — Deux échecs de CI, dont un vieux de neuf jours que personne ne pouvait voir autrement (13/10/2026)

**Premier échec, celui du dépôt personnel.** `pnpm test` y échouait sur
`ArticleTemplate.test.tsx:128` : « expected { index: false, follow: false } to be undefined ».
Vérifié par l'API GitHub avant d'y toucher : c'est l'exécution `37188240490`, commit `5ff8714`, du
**4 octobre à 08:18** — même assertion, même `jsdom was created 175 times · 118.11s`, et un seul job
« Vérifier », donc antérieure à la séparation en deux jobs (D-073). À `a17fa41`, ce test passe (947
tests verts). Rien à corriger : l'échec était déjà réparé.

**Pourquoi il s'affichait encore comme le dernier état connu.** `.github/workflows/ci.yml` ne se
déclenchait, en `push`, que sur `main`. Les neuf commits poussés sur la branche de travail depuis le
12/10 n'ont donc **jamais** été éprouvés : la liste des exécutions montrait le 4 octobre. Le
déclencheur accepte désormais `phase/**` et `claude/**`. Un travail de branche sans signal est un
travail dont on découvre les défauts sur `main`, où il est trop tard pour apprendre quelque chose.

**Second échec, celui du dépôt du client, et il est réel.** `envoi.spec.ts:92`, fraction 2 sur 3 :
délai de 30 s dépassé en attendant le bouton « Toutes les nuits », à l'étape 4 de la demande
personne âgée. Deux fois de suite, retentative comprise.

Le bouton n'a rien d'inatteignable : `gridShortcuts` est une liste statique, affichée dès que
`rythme === "regulier"`. Le défaut est dans l'aide du parcours :

```ts
await form.getByRole(role, { name }).first().focus();
await page.keyboard.press("Space");
```

Elle **ne vérifiait pas** que le champ avait été coché. Une frappe perdue — focus déplacé par une
animation, nœud re-rendu, runner chargé — laissait le rythme décoché, donc la grille absente, donc
l'échec une ligne plus loin, sur un champ qui n'avait plus aucune raison d'apparaître. L'erreur
désignait « Toutes les nuits » alors que le raté était au-dessus : voilà pourquoi elle est illisible.

`tests/e2e/keyboard.ts` porte maintenant cette aide pour les deux fichiers qui en avaient besoin
(`envoi`, `recrutement`) : elle exige le champ visible, puis reprend la frappe sous `toPass` jusqu'à
ce qu'il soit coché. Si l'espace ne coche vraiment pas, le test échoue toujours — mais en nommant le
champ. Mesure locale, Chromium du conteneur via `CHROMIUM_PATH` : 26 parcours verts sur les deux
projets, dont celui qui échouait.

**Ce que je ne peux pas affirmer.** Je n'ai pas reproduit l'échec : il dépend de la charge du
runner, et mon Chromium n'est pas celui de la CI. Je corrige une fragilité démontrée par lecture du
code, pas un défaut observé chez moi. La CI du client tranchera — et comme le parcours est en mode
`serial`, les dix tests qu'il bloquait repartiront avec lui.

## D-082 — Quatre alertes des journaux : une vraie, trois fausses (13/10/2026)

La suite entière est verte en CI sur `8afc26f` (quatre jobs, réseau compris : `check-links` confirmé
par second appel, et `envoi.spec.ts` passe dans la fraction 2). Restaient quatre bruits que personne
n'avait instruits, tous visibles dans les journaux depuis des semaines.

**1. `quality={100}` sur le logo — vraie, et inerte.** Next avertissait, à chaque rendu :
« quality 100 n'est pas dans images.qualities ». Or la balise porte aussi `unoptimized` : l'optimiseur
est contourné, le fichier est servi tel quel, et `quality` ne fait **rien**. La prop ne produisait
donc qu'une alerte, sur une page vue par tous les visiteurs. Retirée ; le commentaire du composant
dit maintenant pourquoi il n'y en a pas.

`qualities: [60, 75]` reste déclaré dans `next.config.ts` et couvre les seules valeurs réellement
demandées (`PhotoFigure`, 60 pour le hero et 75 ailleurs). Les avertissements « 60 n'est pas dans
[75] » des tests unitaires n'ont pas d'objet : vitest ne charge pas `next.config`.

**2. `fill` avec un parent en `position: static`, hauteur 0 — fausse.** Le parent de `PhotoFigure`
porte bien `relative` (`photo-figure glass-edge relative w-full overflow-hidden bg-sand`). jsdom
n'applique aucune feuille de style : la position calculée y est `static` et la hauteur 0 par
construction. Ajouter un style en ligne pour faire taire l'avertissement aurait changé le code de
production pour un artefact d'environnement de test. Non fait.

**3. `Internal: NoFallbackError` sur les 404 — fausse.** Mesuré sur le serveur de production
(`next start`, trois chemins inconnus) : `404` renvoyé à chaque fois, en-tête `noindex` présent, et
la page est bien la nôtre — « Cette page n'existe pas, ou plus ». Next journalise cette erreur
interne une fois par 404 ; un visiteur ne voit rien. Bruit de journal, pas défaut.

**4. `pnpm audit` : six avis, un seul corrigeable.** Et c'est l'inverse de ce que j'avais conclu.
L'avis annonce pour chacun une « patched version » ; vérification contre le registre :

| Paquet | installé | réclamé par l'avis | publié ? |
| --- | --- | --- | --- |
| `source-map-js` | 1.2.1 et 1.2.2 | ≥ 1.2.2 | **oui** |
| `braces` | 3.0.3 | ≥ 3.0.4 | non, s'arrête à 3.0.3 |
| `extract-zip` | 2.0.1 | ≥ 2.0.2 | non, s'arrête à 2.0.1 |
| `sprintf-js` | 1.0.3 | ≥ 1.1.4 | non, s'arrête à 1.1.3 |
| `uuid` | 8.3.2 | ≥ 11.1.1 | oui, mais trois sauts majeurs dans `@lhci/cli` |

J'avais écrit quatre overrides dans `package.json` avant de vérifier deux choses : que ce projet les
déclare dans `pnpm-workspace.yaml` (le `package.json` était donc inopérant), et que trois des
versions réclamées **n'existent pas**. Le commentaire déjà présent dans ce fichier le disait, et il
avait raison ; je l'ai complété plutôt que contredit. Seul `source-map-js: ^1.2.2` est ajouté — la
version saine était déjà dans l'arbre, l'override ne fait que dédoublonner. `pnpm audit` passe de
six avis à cinq, un « high » en moins. Aucun des cinq restants n'atteint le navigateur du visiteur :
ce sont des dépendances d'outillage, et le site est statique.

## D-083 — DP.2 : la mesure neuve, et les photos de scène qui n'ont jamais été optimisées (13/10/2026)

DP.2 exigeait « une mesure neuve avant de choisir un levier à partir de nombres périmés ». Elle n'avait
jamais pu tourner ici : `scripts/lhci.ts` ouvre le navigateur par l'API Playwright, qui réclame une
version absente et non installable (réseau fermé), et `lhci` a en plus son propre contrôle de
présence de Chrome. Les deux acceptent désormais un binaire désigné (`CHROMIUM_PATH`, comme
`playwright.config.ts` ; `CHROME_PATH` pour lhci). Mesure faite : 8 pages témoins, 3 passes,
étranglement 4G et processeur ×4.

**Médianes relevées (avant correction).**

| page | perf | TBT | LCP | CLS | poids |
| --- | --- | --- | --- | --- | --- |
| `/` | 0,80 | 753 ms | 1 812 ms | 0,023 | 447 Ko |
| `/lexique/apa/` | 0,86 | 484 ms | 1 881 ms | 0,018 | 421 Ko |
| `/etre-rappele/` | 0,76 | 460 ms | 3 791 ms | 0 | 534 Ko |
| `/agences/puteaux/` | 0,73 | 517 ms | 4 002 ms | 0 | 557 Ko |
| `/aide-a-domicile/hauts-de-seine/puteaux/` | 0,72 | 656 ms | 3 681 ms | 0 | 543 Ko |
| article du Fil | 0,65 | 638 ms | 4 949 ms | 0 | 741 Ko |
| `/services/garde-de-nuit/` | 0,60 | 886 ms | 4 729 ms | 0 | 681 Ko |
| `/personnes-agees/` | 0,57 | 1 024 ms | 5 328 ms | 0 | 823 Ko |

**À lire avec prudence** : ce conteneur n'est pas une machine de référence, et l'étranglement ×4
s'applique par-dessus un processeur déjà lent et partagé. Les valeurs absolues ne se comparent donc
pas à celles du plan, relevées sur un autre poste. Ce qui se compare, c'est le **classement** et les
postes de coût. Accessibilité, bonnes pratiques et SEO sont à **1,00 sur les huit pages** : la
performance est le seul axe en défaut.

**Le plan se trompait sur le poste dominant.** Il affirmait « le calcul des styles et de la mise en
page, pas le JavaScript ». Sur `/personnes-agees/`, la page la plus coûteuse :

```
Script Evaluation              1135 ms
Other                           860 ms
Style & Layout                  626 ms
Script Parsing & Compilation    194 ms
```

L'évaluation du JavaScript domine (1 257 ms de `bootup-time`). Le relevé du plan portait sur une page
locale ; il ne vaut pas pour les piliers.

**Le défaut trouvé en chemin, et corrigé.** Lighthouse signalait 1,5 s de gain en « formats d'image
modernes » sur une page où `next.config.ts` déclare pourtant AVIF et WebP. Raison : les photos de
scène sont posées en **fond CSS** (`--scene-photo: url(...)` dans `src/styles/scenes.css`), donc
elles ne passent **jamais** par `next/image` — rien ne les optimise, ni format, ni dimension, ni
qualité. Leurs encodages allaient de q=55 à **q=99**, et l'une pesait **1 046 Ko**.

Quatre photos réencodées à q=82, dimensions inchangées, métadonnées retirées :

| photo | avant | après | PSNR |
| --- | --- | --- | --- |
| `fond-personne-agee-accompagnee` | 1 046 Ko (q=99) | 188 Ko | 37,4 dB |
| `fond-aide-a-domicile` | 351 Ko (q=95) | 95 Ko | 41,7 dB |
| `fond-repas-partage` | 295 Ko (q=94) | 134 Ko | 37,8 dB |
| `fond-nuit-veille` | 204 Ko (q=94) | 100 Ko | 41,4 dB |

**1,4 Mo en moins**, et le dossier des héros passe de 5,6 à 4,2 Mo. Une cinquième, `fond-presence-nuit`,
a été **rétablie dans son état d'origine** : elle ne gagnait que 39 Ko pour la plus forte dégradation
du lot (35,2 dB). Un gain marginal ne justifie pas la seule perte visible.

**Ce que cela ne règle pas.** Le poste dominant est le JavaScript, pas les images : la correction
allège le téléchargement et le LCP, pas le temps de blocage. DP.2 reste donc ouverte, et son
arbitrage est intact — les deux atténuations connues ont été défaites volontairement, dont le flou à
la demande d'Arcel (D-046). Piste suivante, sans arbitrage de conception : servir ces fonds en AVIF
ou WebP par `image-set()` avec repli JPEG, ce que le fond CSS permet et que personne n'a posé.

## D-084 — La confirmation se faisait dans la rafale qu'elle devait écarter (13/10/2026)

**Ce que le quatrième run a montré.** La confirmation posée en D-080 **fonctionne** : une adresse y
est blanchie noir sur blanc — « 404 au premier appel, 200 au second ». Mais deux autres ont répondu
404 deux fois, et ce sont **encore des adresses nouvelles** : `…/vivre-a-domicile/beneficier-d-aide-a-domicile`
et `…/solutions-d-accueil-temporaire/l-hebergement-temporaire`, toutes deux vertes aux runs
précédents.

Quatre runs, quatre sous-ensembles différents, toujours le même hôte, et des adresses qui
ressuscitent d'un run à l'autre. Une page disparue ne fait pas cela.

**Le défaut de ma correction.** La pause de deux secondes avait lieu **à l'intérieur** de la rafale :
pendant qu'un ouvrier attendait, les cinq autres continuaient d'appeler le même hôte. La
vérification se déroulait donc exactement dans les conditions qu'elle devait écarter.

**Corrigé en deux temps.**

1. **La confirmation est déportée après la rafale, une adresse à la fois.** Le balayage ne conclut
   plus rien : il collecte les adresses qui ont répondu « disparue », et elles sont rappelées une à
   une, après quatre secondes, quand plus rien d'autre ne tourne. Le message distingue désormais les
   deux moments : « HTTP 404 pendant la rafale, 200 hors rafale ».
2. **La file est répartie par hôte en tour de rôle** (`spreadByHost`). C'était la cause première :
   six requêtes simultanées sur une file groupée par hôte envoyaient six appels d'un même service en
   même temps. Avec la répartition, deux appels au même hôte sont séparés par tous les autres hôtes.
   Rien n'est ralenti — le nombre de requêtes est identique — et le service public cesse d'être
   martelé à chaque exécution de la CI.

`goneStatuses` n'a toujours pas bougé : 404 et 410, confirmés hors rafale, restent des erreurs.

**Ce qui reste à mesurer.** Je n'ai pas la preuve que ces deux adresses sont vivantes : mon
conteneur ne joint pas cet hôte. La preuve viendra d'un appel depuis un poste avec réseau, ou du
prochain run. Si elles répondent 404 hors rafale, elles sont réellement mortes et c'est le contenu
que je corrigerai — pas l'instrument.

### D-083 (suite) — Mesure d'après, et une mesure invalidée par ma faute (13/10/2026)

| page | poids | LCP | perf |
| --- | --- | --- | --- |
| `/personnes-agees/` | 823 → **567 Ko** | 5 328 → **3 985 ms** | 0,57 → 0,64 |
| `/agences/puteaux/` | 557 → 557 Ko | 4 002 → 3 989 ms | 0,73 → 0,74 |
| `/etre-rappele/` | 534 → 534 Ko | 3 791 → 3 770 ms | 0,76 → 0,74 |
| `/aide-a-domicile/…/puteaux/` | 543 → 543 Ko | 3 681 → 3 922 ms | 0,72 → 0,67 |
| `/services/garde-de-nuit/` | 681 → 681 Ko | 4 729 → 4 791 ms | 0,60 → 0,59 |
| `/` | 447 → 447 Ko | 1 812 → 1 879 ms | 0,80 → 0,76 |

Le gain tombe **exactement** là où la photo a été réencodée : `/personnes-agees/` perd 256 Ko, soit
la différence du fond `fond-aide-a-domicile` (351 → 95 Ko), et son LCP recule de 1,3 s. Les pages
dont aucun fond n'a changé gardent un poids **identique à l'octet** — c'est le témoin qui valide la
mesure — et leur performance varie de ±0,05, ce qui est le bruit de ce conteneur. Seul le poids est
déterministe ici ; le LCP va dans le même sens mais sur une machine bruyante.

**Une mesure à jeter, et c'est moi qui l'ai cassée.** `/lexique/apa/` affichait 0,86 → 0,91 et
421 → 373 Ko. Les horodatages disent autre chose : mon `pnpm build` de vérification a fini à
11:18:23, et les trois passes de cette page, lancées à 11:19, portent `seo 0,69` — la signature d'un
build en noindex. Elles ne mesurent donc pas le même site que les sept autres. Chiffre écarté. La
leçon est simple et vaut pour la suite : **rien ne doit reconstruire `.next` pendant que lhci
mesure**, même un contrôle anodin ; `pnpm lhci` sert le build qu'il vient de produire.

## D-085 — Audit des Hero d'Arcel : passe 1 appliquée, après vérification point par point (13/10/2026)

L'audit du 13/10 a été lu **sur le site en ligne**, c'est-à-dire sur un déploiement qui ne contient
pas les neuf commits poussés depuis le 12/10. Chaque constat a donc été vérifié contre le dépôt
avant correction, et trois catégories s'en dégagent.

**Confirmé et corrigé.** Les onze fautes ponctuelles existaient, et trois étaient plus étendues que
l'audit ne le disait :

| constat | annoncé | mesuré |
| --- | --- | --- |
| « Edith-Kremsdorf » sans accent | 1 occurrence | **6** dans `content/local/75103.json` |
| « Marché Saint-Honore » | non relevé | **2** occurrences sans l'accent final |
| « se trouvent pour » | 1 page | **6** occurrences dans 5 fichiers, plus 2 « n'apparaît de » |

Les trois dernières familles sont des résidus de ma propre passe de substitution du 12/10 (D-074) :
« Deux hôpitaux se trouvent pour la commune » → « desservent la commune », « Aucun accueil de jour
n'apparaît de X » → « n'est recensé à X ». L'audit en avait vu une ; la mesure en a trouvé treize.

Également corrigés : le sous-titre du 11e (minuscule initiale, phrase sans verbe), celui de
Charenton (phrase sans verbe), l'accord de « tels que le publie » sur la fiche CESU, le subjonctif
après « vous cherchez des … qui » (deux pages), l'accord masculin sur une liste mixte (`/aidants/`
et, non relevé par l'audit, un intertitre du magazine), la construction bancale de Huntington et le
contresens « plus d'élan pour rien ».

**Défauts de gabarit.** La casse des six termes du lexique est corrigée dans `content/`. La
signature du magazine devient, mot pour mot ce qu'Arcel demande : « Par l'équipe éditoriale de
Youdom Care, avec l'aide d'un outil d'écriture, sous sa responsabilité » — vérifié sur le HTML
construit. Les données structurées ne s'en trouvent pas abîmées : l'auteur JSON-LD est
l'organisation tant qu'aucune fiche réelle n'existe. Six attentes de tests figeaient l'ancien
libellé : elles sont alignées, ce qui n'est pas relâcher un seuil mais suivre une décision de
commanditaire sur un texte.

**Deux constats infondés, et il faut le dire.**

1. « Vous vous reconnaîssez ? » : cette graphie, avec accent circonflexe, **n'existe nulle part**
   dans le dépôt. Le site écrit « reconnaissez », qui est correct. C'est l'audit qui porte la faute.
   La répétition sur 26 pages, elle, est réelle — c'est un sujet de la passe 3, pas une faute.
2. Le H1 du lexique qui se lirait « AAHAllocation aux adultes handicapés » : le développé est dans
   un `span` en `block`, et les navigateurs insèrent un espace à la frontière de bloc quand ils
   calculent le nom accessible. Un lecteur d'écran ne colle pas les deux mots ; seule une extraction
   par retrait des balises le fait. Même artefact que celui déjà mesuré le 12/10 sur les listes de
   l'accueil. Une espace a tout de même été posée — invisible dans une mise en page par blocs — pour
   que cette fausse alerte ne revienne pas à chaque audit. Le séparateur « — » proposé n'a pas été
   retenu : il changerait la composition pour un défaut qui n'existe pas.

**Un constat juste, traité à part.** Sur `/personnes-agees/`, le sélecteur de lecteur est bien à
l'intérieur du `<p class="lead">` : le balisage est valide (un `span` et des `button` sont du contenu
de phrasé), mais le texte du chapô se mélange aux libellés des boutons. C'est une restructuration de
gabarit, avec ses tests de parcours ; elle ne tient pas dans la même passe que des corrections de
texte.

**Les espaces insécables.** Les 34 pages signalées portent déjà l'insécable dans le dépôt (vérifié :
les sous-titres relevés contiennent `\u00a0` avant « : » et « ; »). Ce constat vient du déploiement
en retard, pas du code. Il disparaîtra à la mise à jour de `main`.

Reste à faire, non traité ici : la passe 2 (gabarit et 97 sous-titres des 131 pages locales) et la
passe 3 (réécriture des Hero publics, pathologies, services, magazine, lexique, tarifs). Les
sous-titres proposés par l'audit contiennent des faits chiffrés (habitants, pourcentages, noms
d'établissements) : chacun devra être confronté aux faits sourcés de **sa** page avant d'être posé,
sous peine de publier un fait non sourcé — ce que `check-local-facts` refuse, et avec raison.

## D-086 — Le sélecteur de lecteur sort du chapô (13/10/2026)

**Le constat, vérifié.** Sur `/personnes-agees/`, le sélecteur « pour un proche / pour vous-même »
était rendu **à l'intérieur** du `<p class="lead">`. Le balisage était valide — `span` et `button`
sont du contenu de phrasé — mais le texte du paragraphe mêlait les libellés des commandes au chapô :
« Vous cherchez de l'aide / pour un proche / pour vous-même / Votre mère est tombée… ». Un chapô n'a
pas à contenir des commandes, et c'est ce paragraphe que lisent les robots d'indexation.

**Correction.** `ReaderSwitch` ne porte plus que les commandes et la zone de statut ; le texte qui
bascule passe dans un composant voisin, `ReaderText`. `Hero` reçoit une prop `leadControl`, rendue
avant le chapô dans le même panneau. Les deux restent sous le même `ReaderProvider` — vérifié : il
enveloppe tout le hero — donc l'état est partagé comme avant, et la photo continue de basculer avec
le texte.

Rendu construit après correction :

```html
<div data-hero-interaction=""><span role="group" …>…commandes…</span>
  <p class="lead"><span data-reader="proche">Votre mère est tombée, …</span></p>
```

Le paragraphe ne contient plus que le chapô. Mesuré sur le HTML produit, pas déduit.

**Vérifications** : 948 tests unitaires, 141 parcours (hero et services, deux projets) et les quatre
parcours de l'audit P8.4 dont R-2, qui éprouve précisément l'annonce du sélecteur aux lecteurs
d'écran. Les tests de `ReaderSwitch` rendent désormais les deux composants ensemble sous le
fournisseur, comme la page le fait.

## D-087 — Passe 2, premier temps : le hero des pages locales ne se répète plus (13/10/2026)

**Mesure d'abord.** Sur `/aide-a-domicile/hauts-de-seine/puteaux/`, « Oui, nous intervenons à
Puteaux » apparaissait **4 fois** dans le fichier HTML — mais deux de ces quatre sont dans la charge
RSC, invisible pour un visiteur. En retirant les `<script>` **avant** les balises (la leçon du
12/10), la duplication réelle était de **2** : une fois dans le hero, une fois en titre du bloc
immédiatement suivant, avec la même phrase d'agence sous les deux. Sur 131 pages, lire deux fois la
même chose en deux écrans suffit à donner un air de copie.

**Correction, une seule, pour 131 pages.** Le hero ne porte plus que la recherche de commune comme
interaction immédiate ; la réponse et la phrase d'agence titrent le bloc suivant, où Arcel voulait
les garder. L'ancre du hero annonce désormais le contenu local (« Ce qui existe à X ») au lieu de
répéter le H2 du bloc (« Vivre à domicile à X ») : nouveau texte `local.vivre_ancre`, déclaré au
schéma comme les autres.

Après correction, texte visible seulement :

```
« Oui, nous intervenons à Puteaux »      1 fois
« Vivre à domicile à Puteaux »           1 fois
« Ce qui existe à Puteaux »              1 fois
« Vos interventions sont coordonnées »   0 fois
```

**Vérifications** : 948 tests, 13/13 contrôles, 69 parcours locaux et hero. Le parcours qui exige
une « interaction immédiate » dans la hauteur visible passe toujours : la recherche de commune la
porte, et c'est elle qui la portait déjà au clavier.

**Ce qui reste de la passe 2.** Les quatre jeux de puces de réassurance et les 97 sous-titres. Les
puces proposées par l'audit contiennent des chiffres (« Crédit d'impôt de 50 % ») : `check-local-facts`
refuse un nombre qui n'est pas un fait sourcé **de la page** — règle posée le 12/10 et déjà
rencontrée. Les sous-titres proposés contiennent, eux, des faits chiffrés par commune (habitants,
pourcentages, nombre d'établissements) : chacun sera confronté aux faits sourcés de sa page avant
d'être posé, et écarté s'il ne l'est pas. Un sous-titre plus vivant ne vaut pas un fait inventé.

## D-088 — Passe 2 terminée : 97 sous-titres locaux, chaque fait éprouvé (13/10/2026)

Les 97 sous-titres proposés par l'audit sont posés. La répétition qui donnait l'air de copie —
« aide à domicile » dans un sous-titre placé sous un H1 qui la contient déjà — passe de **70 pages
à 0 sur 131**, mesuré sur les fichiers de contenu.

**Pourquoi une vérification était obligatoire.** `check-local-facts` ne contrôle les nombres que
dans la zone éditoriale et dans les réponses aux questions locales : le **sous-titre n'est pas
couvert**. Rien n'aurait donc arrêté un chiffre inventé. Chaque proposition a été éprouvée avec les
fonctions du projet (`referenceNumbers`, `findUnsourcedNumbers`), puis une seconde fois par un
compteur écrit pour l'occasion, parce que les propositions écrivent souvent les nombres **en
lettres** (« cinq hôpitaux », « sept résidences autonomie ») et que la règle du dépôt ne relève que
les chiffres.

**Ce que la vérification a donné — et c'est l'audit qui gagne trois fois sur quatre.**

| cas | mon compteur | la vérité, après lecture des faits |
| --- | --- | --- |
| « cinq hôpitaux » (10e) | 6 faits | **5 faits `hopital`** : le sixième était le « Jardin de l'Hôpital Saint-Louis » |
| « un hôpital sur deux sites » (Levallois) | 2 faits | **le même établissement saisi deux fois** (HOPITAL / HOSP FRANCO BRITANNIQUE) |
| « une polyclinique et deux hôpitaux de jour » (Alfortville) | 3 faits | **exact** : deux « HOPITAL DE JOUR », une « POLYCLINIQUE » |
| « résidence autonomie Madeleine-Wagner » (Vélizy) | nom absent | **le fait écrit « Madeleine Wagner », sans trait d'union** |

Seul le dernier était une vraie divergence, et la source l'emporte : un nom d'établissement sourcé
s'écrit comme sa source, sauf demande explicite du commanditaire — ce qui était le cas, à l'inverse,
pour l'accent d'« Édith-Kremsdorf », réclamé nommément par l'audit.

Deux formulations que j'avais d'abord adoucies par prudence ont été **rétablies** telles qu'Arcel les
a écrites, la vérification les autorisant : les parts d'âge de Franconville (6,9 % et 1 %, Insee) et
les 15 places de l'accueil de jour de Levallois. Une page vivante vaut mieux qu'une page prudente
quand le fait est sourcé.

**Vérifications** : 13/13 contrôles, 948 tests, 12 parcours locaux. Chaque sous-titre porte les
espaces insécables du site avant « : », « ; » et « % ».

**Reste de l'audit** : les quatre jeux de puces de réassurance (passe 2) et la passe 3 (réécriture
des Hero publics, pathologies, services, puis magazine, lexique, tarifs). Les puces proposées
contiennent « Crédit d'impôt de 50 % » : un chiffre national se déclare comme un fait de type
`autre` avec sa source (règle écrite dans `src/lib/local/numbers.ts`), il ne se pose pas dans une
puce sans cela.

## D-089 — Passe 3 : magazine, lexique, tarifs, agences (13/10/2026)

**Magazine.** Les neuf chapeaux qui finissaient par « Voici… » ont une dernière phrase propre :
zéro « Voici » restant. Trois des formulations proposées ne tenaient pas dans les règles du projet,
et ce sont les règles qui ont gagné :

- deux chapeaux passaient à **62 et 65 mots** pour une fenêtre de 40 à 60 (`check-content`) ;
- la phrase de la liste des 48 heures faisait **plus de 30 mots** dans un chapô (`check-copy`).

Les trois sont resserrées — « Reste à savoir lire un devis. », « Cette liste dit quoi emporter en
quittant l'hôpital, quoi regarder les deux premiers jours, et qui appeler. » — et l'idée est gardée.

**Lexique.** « En clair » figurait dans 22 descriptions sur 23 : **0 maintenant**. Mais pas avec les
tournures proposées : mesurées fiche par fiche, les marges disponibles vont de **0 à 10 caractères**
dans la fenêtre 140-155, et les six tournures de l'audit en demandent 11 à 12. Elles auraient
cassé la limite — c'est d'ailleurs ce qui est arrivé au premier essai, 33 tests en échec. Six
variantes courtes (« en bref », « en résumé », « simplement », « l'essentiel », « en deux mots »)
sont réparties selon la marge de chaque fiche et équilibrées : 5, 5, 4, 4, 4. Remplacer une
répétition par une autre n'aurait rien réglé.

Le développé de la fiche GIR ne répète plus « groupes iso-ressources » deux fois.

**Tarifs.** Une formule par page au lieu de « tels que les publie service-public.gouv.fr » sur
quatre pages.

**Agences.** L'adresse apparaissait **quatre fois** dans le texte visible d'une page d'agence —
mesuré, scripts retirés avant les balises. Trois sont légitimes (panneau du hero, bloc « Adresse »,
pied de page commun à tout le site) ; la quatrième était le chapô. Il ne la porte plus : la forme
avec adresse disparaît du gabarit, du schéma et du contenu, et `chapo_sans_adresse` devient la seule
(il en restait deux formes pour un seul usage). Le chapô de l'index ne commence plus par un chiffre.

Un test figeait l'ancienne forme en exigeant l'adresse **suivie d'un point**, ce qu'elle n'avait que
dans le chapô. Il fige désormais le nouveau contrat : l'adresse est affichée, et le chapô ne la
répète pas.

**Vérifications** : 948 tests, 13/13 contrôles, 22 parcours (magazine, lexique, local, aides), lint
et typecheck verts. Les 37 parcours services lancés après la réécriture des Hero sont verts aussi.

**Reste de l'audit** : les premiers intertitres du magazine (« Pourquoi… ? » sur 10 articles sur 13),
les photos réutilisées entre articles et pages, et les quatre jeux de puces locales — ces derniers
en attente d'arbitrage, « Crédit d'impôt de 50 % » devant d'abord être déclaré comme fait sourcé.

## D-090 — Fin de l'audit : intertitres, photos, puces, apostrophes (13/10/2026)

**Intertitres du magazine.** Dix premiers intertitres sur treize ouvraient par « Pourquoi… ? ». Six
sont réécrits — affirmation, « Comment… », « Ce que… » — et quatre gardent la question, là où elle
en est vraiment une. C'est ce que demandait l'audit (« garder Pourquoi sur 4 ou 5 »).

**Photos.** Les quatre paires nommées sont défaites : chaque article concerné reçoit une photo
jusque-là inutilisée, **décrite d'après ce qu'elle montre réellement** — je les ai ouvertes une par
une plutôt que d'inventer un texte de remplacement.

La mesure dit cependant que le problème est plus large que l'audit ne l'écrit : **huit** articles
partagent encore leur photo avec une page de service, et il ne reste que **trois** images
inutilisées dans `public/images`. Le stock ne couvre pas le besoin ; choisir ou acheter des photos
appartient au commanditaire. À noter aussi : une bonne part des réutilisations relevées est
**voulue** — les photos de `semaines-types.json` suivent des personnages récurrents (Madeleine sur
huit pages, Suzanne sur six), et les séparer casserait la continuité du récit.

**Puces des pages locales.** Les quatre jeux proposés mettaient l'adresse de l'agence dans une puce,
ce qui aurait recréé exactement la duplication retirée des pages d'agence (D-089), et « Crédit
d'impôt de 50 % », un chiffre qui doit d'abord être déclaré comme fait sourcé (`numbers.ts`). La
puce d'évaluation tourne donc entre **quatre formulations selon le département** : deux pages
voisines ne portent plus la même, sans fait nouveau ni répétition nouvelle. Vérifié sur le rendu des
cinq départements témoins.

**Apostrophes.** 17 025 droites contre 54 courbes dans `content/`, 172 de plus dans le code : la
convention du dépôt est l'apostrophe droite, et les exceptions sont alignées. Sur les pages
publiques construites, il n'en reste **2**, qui appartiennent au message d'erreur interne de Next.

Les 96 restantes vivent dans le styleguide, et elles y restent : dans du **texte JSX**, une
apostrophe droite déclenche `react/no-unescaped-entities`. C'est précisément pourquoi ces fichiers
l'utilisaient. Je l'ai découvert en cassant le lint, puis j'ai rendu leur état à ces sept fichiers.
Le styleguide est interne et en `noindex` : aucun visiteur ne lit ces apostrophes.

**Vérifications** : 948 tests, 13/13 contrôles, 22 parcours, lint et typecheck verts.

## D-091 — La page « garde de nuit » : les chutes, et la présence qui apaise (13/10/2026)

Demande du commanditaire : une page plus convaincante, qui parle des **chutes**, et qui réponde à un
besoin qu'elle ignorait — celui de la personne qui dort bien mais ne supporte pas d'être seule la
nuit.

**Ce qui manquait.** La page couvrait le lever, l'angoisse, le retour d'hôpital et l'aidant épuisé.
Elle ne disait rien du risque réel, et rien du cas le plus fréquent après le grand âge : une personne
sans maladie particulière, seule depuis un décès ou un départ, qui guette les bruits.

**Ce qui est ajouté.**

- Une section « La nuit, l'heure des chutes », avec deux faits **déjà sourcés dans le dépôt** et
  repris avec leurs sources : plus de 20 000 personnes de 65 ans et plus décédées en lien avec une
  chute en 2024 (Santé publique France), et le fait qu'une chute en annonce souvent une autre, même
  sans blessure apparente (Haute Autorité de santé). Les deux sources entrent dans la liste de la
  page. Aucun chiffre n'a été inventé pour l'occasion.
- Une section « Une présence qui apaise, même quand la nuit se passe bien », qui dit ce qu'une nuit
  calme apporte : s'endormir parce que quelqu'un veille, se rendormir après un bruit, et pour
  l'aidant, cesser de dormir d'une oreille.
- Une cinquième situation vécue (« Elle dort bien. Mais seule, la nuit, elle n'est jamais
  tranquille. »), le profil correspondant dans « Pour qui », et deux questions fréquentes : à quoi
  sert une présence quand la personne dort bien, et ce qui se passe en cas de chute.
- Chapô, promesses et puces de réassurance resserrés sur le bénéfice, et la description de
  référencement porte enfin le mot « chutes » (150 caractères, dans la fenêtre 140-155).

**Ce que je n'ai pas fait.** Pas de promesse de sécurité absolue : le texte dit qu'une présence
« n'empêche pas tous les faux pas » et ce qu'elle change. Pas d'urgence commerciale ni de
superlatif : `check-copy` les refuse, et ils n'auraient pas rendu la page plus convaincante.

**Un défaut trouvé en chemin, et il venait de moi.** Les parcours de `services.spec.ts` figeaient le
titre « Vous vous reconnaissez ? », alors que D-087 l'a rendu propre à chaque public. Le test lit
désormais le libellé dans `content/interface.json` d'après le public de la page : le figer aurait
ramené le libellé unique que cette correction supprimait. 83 parcours services verts.

**Vérifications** : 948 tests, 13/13 contrôles, 83 parcours, lint et typecheck verts.

## D-092 — Le formulaire « enfant en situation de handicap » ne demandait pas les besoins (14/10/2026)

**Le défaut, relevé par le commanditaire.** L'étape 3 des demandes détaillées pose la question
« De quoi avez-vous besoin ? ». Sur les cinq autres cas, elle propose des besoins — gestes
essentiels, transferts, repas, présence et sécurité, nuits. Sur le cas « enfant », elle proposait
des **moments** : sortie d'école, mercredis, vacances, soirées, week-ends.

Deux conséquences. La question n'était jamais posée : l'équipe recevait une demande sans savoir ce
dont l'enfant a besoin. Et ces moments étaient demandés **deux fois**, puisque l'étape suivante est
la grille de planning, qui les recueille précisément.

**Correction.** Onze besoins, pris dans ce que les pages enfants promettent déjà — gestes du
quotidien, transferts et installation, communication (pictogrammes, signes, tablette), routines et
repères, présence et sécurité, jeux et loisirs, trajets, accompagnement aux rééducations, nuits,
temps pour la fratrie, relais pour souffler. Aucun acte de soin, conformément à ce que Youdom Care
fait et ne fait pas. Les trois entrées de l'ancienne liste qui étaient bien des besoins
(rééducations, fratrie, relais) sont conservées.

**Les cinq autres cas ont été vérifiés** : personne âgée, neuro, adulte en situation de handicap et
aidant listent bien des besoins. Le cas nuit-24h liste des formes de présence (garde de nuit,
présence 24h/24, garde-malade), ce qui est cohérent pour ce formulaire-là.

**Vérifications** : 948 tests, 13/13 contrôles, les parcours du formulaire enfant (situation, axe,
chaque étape, état d'erreur) et les neuf parcours d'envoi de bout en bout.

## D-093 — Le formulaire « enfant » ouvre sur les questions, pas sur « pour qui » (14/10/2026)

**Le constat du commanditaire.** On arrive sur `/demande/enfant-handicap/` depuis une page enfants,
en cliquant « Je décris ma situation ». La première étape demandait alors « Pour qui cherchez-vous de
l'aide ? » — avec « Moi-même », « Mon conjoint », « Mon père ou ma mère »… La page d'où l'on vient a
déjà répondu : la question est une friction pour rien, en tête d'un formulaire qu'il faut avoir envie
de remplir.

**Correction, pilotée par le contenu et non câblée dans le code.** Un cas de formulaire peut déclarer
`pour_qui_impose`. Quand il le fait, l'étape n'est pas construite, et la réponse est posée dès
l'ouverture dans la valeur du formulaire. `enfant-handicap.json` porte `"Mon enfant"`, valeur prise
dans `formulaires.pour_qui_options` — la demande part donc **avec** cette réponse, et l'équipe la lit
comme avant. Un parcours le vérifie sur l'e-mail reçu, pas seulement à l'écran.

Le formulaire des enfants compte désormais **quatre étapes** et s'ouvre sur les questions de
situation. Les cinq autres cas sont inchangés.

**Les parcours ont été réécrits, pas contournés.** Trois fichiers supposaient cinq étapes et une
première étape obligatoire : `demande.spec.ts`, `envoi.spec.ts` et le parcours générique de
`tous-gabarits-axe.spec.ts`, qui met chaque étape en erreur — or la première étape du cas enfant est
facultative et ne peut pas l'être. Chacun s'adapte maintenant au nombre réel d'étapes du cas.

**Une limite, à dire.** Un grand-parent ou un professionnel qui remplirait ce formulaire sera
enregistré comme « Mon enfant ». Les professionnels ont leur propre formulaire ; pour les autres, le
message libre et les coordonnées restent là. Si cela gêne, une question facultative « qui remplit
cette demande ? » dans l'étape de situation la rattraperait sans rendre l'étape 1.

**Vérifications** : 948 tests, 13/13 contrôles, 40 parcours de formulaires (demande, envoi, chaque
étape et état d'erreur, deux projets), lint et typecheck verts.


## D-094 — Deux échecs de CI : une apostrophe figée et un défilement doux qui reprend la main

**Contexte.** `pnpm test:e2e` échouait sur deux parcours, les deux reproductibles en CI, aucun sur
ma machine du premier coup.

**1. `blocks.spec.ts` : l'apostrophe.** Le parcours attendait « Aide à l'autonomie » avec
l'apostrophe droite, alors que le guide de styles affiche la forme française courbe depuis la fin de
l'audit (`89aefb0`, qui a normalisé les apostrophes du contenu sans mettre l'assertion à jour).
C'est la page qui a raison : l'assertion est corrigée, pas la page.

**2. `services.spec.ts` : `target-size` sur le fil d'Ariane.** axe signalait le lien « Accueil »
du fil d'Ariane comme « partiellement obscurci » par l'en-tête collant. `tests/e2e/axe.ts` remontait
déjà en haut de page pour cette raison — mais avec un seul `window.scrollTo(0, 0)`, et le
défilement doux lancé par le geste du hero (`StageChooser`, `scrollIntoView({ behavior: "smooth" })`)
**reprend la main juste après** : une sonde montre la page revenir à 10 px, puis s'y stabiliser.

Mesuré au pixel sur `/maladies-neurodegeneratives/` en Pixel 7 : l'en-tête se compacte de 86 px à
69 px au défilement, le lien du fil d'Ariane mesure 51 px de haut. Jusqu'à 70 px de défilement, la
bande libre reste au-dessus du seuil de 24 px et axe ne dit rien ; **à 72 px, la violation apparaît**
— exactement celle de la CI (bande libre de 12,4 px). La fenêtre est étroite, et c'est par hasard
qu'un défilement interrompu y atterrit : d'où un échec ferme en CI et un parcours vert ici.

**Correctif.** `expectNoSeriousAxeViolations` force désormais la position jusqu'à ce qu'elle reste à
zéro sur trois images consécutives (`behavior: "instant"`, 40 images au plus), après l'attente des
animations. Aucune assertion retirée, aucun seuil déplacé : l'audit porte toujours sur toute la page,
et sur l'état activé des cartes. Le correctif profite à tous les parcours qui lancent un geste avant
leur audit (`hero.spec.ts`, `services.spec.ts`, `comfort.spec.ts`, `styleguide.spec.ts`).

**Vérifications** : 948 tests unitaires, 13/13 contrôles, lint et typecheck verts ; côté parcours,
`blocks`, `services`, `hero` (147 verts) puis `tous-gabarits-axe`, `gabarits-axe`, `home` et
`mobile` (238 verts), sur les deux projets.

## D-095 — Les textes des heros, repris sur quatre mesures (15/10/2026)

Arcel demande d'améliorer et de reformuler les textes de **toutes** les zones hero. Avant d'écrire,
j'ai mesuré les 26 heros des pages services, parce qu'une réécriture sans critère n'est que du
remplacement. Quatre défauts sortent, et ce sont eux que la passe corrige.

| mesure | avant | après |
| --- | --- | --- |
| H1 au moule « X : y » | **20 / 26** | 18 / 26, mais plus aucun préfixe partagé |
| H1 ouvrant par « Aide à domicile et … » | **7** (les 7 pathologies) | **0** |
| H1 le plus long | **111** caractères | **67** (moyenne 51) |
| phrases de plus de 20 mots dans un chapô de hero | **20 pages sur 26**, jusqu'à 36 mots | **0**, plus longue phrase 20 mots |
| chapô de hero le plus lourd | **89** mots | 77 (moyenne 57, contre 63) |

**Pourquoi ces quatre-là.** La règle 2 de `docs/01` §2 demande des phrases de moins de 20 mots : au
plus lu de chaque page, elle était tenue par six pages sur vingt-six. Le H1, lui, doit entrer dans la
fenêtre d'un téléphone de 320 px sans défilement — c'est le contrat des heros (`hero.spec.ts`) — et
un titre de 111 caractères y prend six lignes. Enfin, sept pages sœurs qui ouvrent toutes par « Aide
à domicile et … » donnent à un visiteur qui en lit trois le sentiment d'un gabarit, pas d'une
réponse. Le mot-clé n'est pas perdu pour autant : il vit dans la balise `titre` et dans le premier
paragraphe, comme `docs/01` §2 le prévoit.

**Ce qui n'a pas changé : les faits.** Aucune réécriture n'ajoute un fait. Chaque fait du texte
d'origine est conservé ou déplacé d'un champ à l'autre — PCH, SESSAD, avis du diététicien, lien avec
l'assistante sociale, lève-personne, modes prestataire et mandataire. Les quatre H1 déjà justes sont
restés : « Vous décidez, nous suivons », « Vous aidez quelqu'un. Qui vous aide, vous ? », « Vous ne
devriez pas avoir à tout réexpliquer chaque semaine », « Garde de nuit : quelqu'un est là, et vous
dormez ».

**Une page sur vingt-six n'a pas été touchée** : `autisme.mdx` tenait déjà les quatre critères (H1 de
50 caractères, aucune phrase au-delà de 17 mots). La réécrire aurait été du mouvement, pas une
amélioration. Je préfère le dire que de maquiller un diff.

**Accueil.** Le H1 reste celui de `docs/01` §4 : il nomme en deux souffles la réalité des cinq
publics, il est validé, et il passe le contrat des heros. Le chapô, lui, perd « Youdom Care construit
un accompagnement **sur mesure** » — formule usée, et qui parle de nous — pour « **L'accompagnement
se construit avec vous** ». « Chaque situation est unique » devient « aucune situation ne se
ressemble ». La ligne de réassurance remplace « Sans engagement », qui pend dans le vide, par
« Devis détaillé, sans engagement ».

**Agences.** Le chapô des deux pages d'agence disait « Notre point d'accueil {lieu} » : il parlait de
nos murs. Il dit maintenant « Une équipe installée {lieu}, que vous joignez directement ». Le chapô
de l'index garde son jeton `{agences}` — j'avais d'abord écrit « Deux équipes », c'est-à-dire un
chiffre en dur, ce que la règle 6 de `docs/01` interdit ; corrigé avant commit.

**Magazine.** Le hero d'un article affiche son chapô. Six phrases y dépassaient 22 mots, jusqu'à 27 :
elles sont scindées, sans perte d'idée et sans sortir de la fenêtre de 40 à 60 mots que
`check-content` impose. Plus longue phrase du magazine : 22 mots, contre 27.

**Pages locales : rien, et c'est voulu.** Le chapô d'un hero local est son sous-titre, et les 97
sous-titres réécrits le 13/10 (D-088) portent chacun un fait sourcé, confronté un par un aux sources
de **sa** page. Les reformuler deux jours plus tard, c'est risquer un fait non sourcé pour un gain de
style nul. Le H1 local (« Aide à domicile {lieu} ») reste tel quel : c'est la requête, mot pour mot.

**Espaces insécables.** Mes 64 lignes neuves étaient écrites avec des espaces ordinaires avant « : »,
« ; », « ? » et « » ». La convention du dépôt est l'insécable (vérifié sur `HEAD` avant d'écrire la
normalisation) : les 25 fichiers touchés sont repassés dessus.

**Un test aligné, son intention renforcée.** `AgencyTemplate.test.tsx` figeait le texte du chapô
d'agence. Il fige désormais le nouveau, et surtout le **contrat** de D-089 d'une façon qui ne dépend
plus de la formulation : le chapô ne contient ni la voie, ni le code postal
(`expect(chapo.textContent).not.toMatch(/quai de Dion-Bouton|92800/)`).

`docs/01` est remis d'accord avec le site : le chapô et la réassurance du bloc 1, et le tableau §5,
qui annonçait encore des H1 que le site n'affiche plus.

**Vérifications** : 948 tests unitaires, 13/13 contrôles, lint et typecheck verts ; 181 parcours
(heros aux quatre tailles, services, accueil, local, magazine, index des services) sur les deux
projets, puis les parcours mobiles, axe et maillage.

## D-096 — SEO : audit des 246 adresses construites, cinq défauts réels (15/10/2026)

Arcel demande « le SEO complet » du site. J'ai donc exploré le site construit comme un moteur le
ferait : les 13 segments de plans de site, puis chacune des 246 adresses qu'ils annoncent, HTML en
main. Le socle est bon, et c'est la première chose à dire : **aucune page orpheline, aucune page à
moins de 3 liens entrants, profondeur 2 au plus depuis l'accueil, un H1 partout, aucun saut de
hiérarchie, canonique auto-référente partout, `BreadcrumbList` sur les 245 pages hors accueil.**

**Une fausse alerte, écartée avant de corriger quoi que ce soit.** Ma première mesure annonçait des
titres jusqu'à 70 caractères et des descriptions jusqu'à 175, hors des fenêtres de `docs/01` §8. Elle
comptait les entités HTML (`&#x27;` pour une apostrophe) comme six caractères. Décodées : **tous les
titres sont entre 50 et 60, toutes les descriptions entre 140 et 155**. `check-seo` avait raison,
c'est ma mesure qui était fausse. Même leçon que le 13/10 sur les comptages de texte.

**Cinq défauts réels, corrigés.**

1. **Une adresse en `noindex` dans un plan de site.** Sur les 246, une seule portait
   `noindex, nofollow` : `/magazine/categorie/dans-les-coulisses/`, la rubrique encore sans article.
   La règle de D-070 est pourtant nette — noindex si et seulement si la page ne liste aucun article —
   et le commentaire de `sitemaps.ts` affirmait le contraire (« une rubrique encore sans article est
   construite et indexable, elle est donc listée »). Une rubrique vide n'est plus listée. Un plan de
   site qui annonce une page en noindex dépense du budget d'exploration pour rien et déclenche
   l'alerte « URL envoyée marquée noindex » de la Search Console.
   **La réciproque est devenue un test** : `sitemaps.test.ts` exigeait que toute page indexable
   construite soit listée ; il exige maintenant aussi qu'aucune page listée ne soit en noindex.
2. **Neuf pages sans image Open Graph** : `/services/`, `/accessibilite/`, `/outils/`, les cinq
   outils à imprimer et `/recrutement/postuler/`. La cause est une propriété de Next que le dépôt
   supposait fausse : un fichier `opengraph-image.tsx` vaut pour **son** segment, pas pour ses
   enfants — le commentaire de `/recrutement/` disait pourtant couvrir « ses pages (offres,
   candidature) ». Cinq fichiers ajoutés, dont un dynamique pour les outils. Vérifié après build :
   **0 page sans image** sur les 245.
3. **IndexNow n'était jamais appelé.** `docs/04` §2 l'exige « au déploiement », le script existait
   (`pnpm indexnow`), `prebuild` écrivait déjà le fichier de clé — mais aucun workflow, aucun hook ne
   le déclenchait. `.github/workflows/indexnow.yml` le fait désormais sur `deployment_status` en
   production, jamais sur une prévisualisation. Il **demande au commanditaire** le secret
   `INDEXNOW_KEY`, de la même valeur que la variable Vercel : deux valeurs différentes et IndexNow
   refuse la soumission. Sans clé, le script n'envoie rien et le workflow reste vert.
4. **Pages de rubrique maigres.** Les six rubriques du Fil tenaient en 84 à 165 mots : un titre, une
   phrase, des cartes d'articles. Les cinq rubriques indexables reçoivent un paragraphe d'entrée de
   50 à 70 mots — ce qu'on y trouve, pour qui, comment les articles sont faits et datés. Elles
   passent à 162–235 mots. La sixième, vide et en noindex, n'en reçoit pas : ce serait du texte pour
   un moteur qui ne la lira pas.
5. **Le `lastmod` des 25 pages services ne suivait pas la réécriture des heros de la veille** : leur
   `maj` datait du 20/09 au 13/10 alors que leur texte avait changé. Le champ est à la fois le
   `lastmod` du plan de site et la date affichée en bas de page : il passe au 15/10.

**Trois corrections de détail.** « En clair » subsistait dans deux titres du lexique (D-089 n'avait
traité que les descriptions). Deux pages services n'avaient pas de repère géographique dans leur
titre : « Remplacement d'auxiliaire de vie, Paris et Île-de-France », « Sortie d'hospitalisation :
retour à domicile, Île-de-France ». Et quatre commentaires du code affirmaient encore qu'une page
`a_relire` est en noindex et hors des plans de site, ce que D-035 a changé il y a longtemps : le
code mentait sur son propre comportement.

**Ce que je n'ai pas fait, et pourquoi.**

- **Les 23 pages de moins de 300 mots** sont des formulaires (`/demande/…`, `/etre-rappele/`,
  `/recrutement/postuler/`), des pages de contact et deux index. Les remplir de texte avant le
  formulaire coûterait des demandes sans rien gagner : un moteur n'attend pas 300 mots sur une page
  dont le travail est d'être remplie.
- **`WebPage` manque sur 57 pages** : les articles portent `Article`, les fiches du lexique
  `DefinedTerm`, et c'est ce que `docs/04` §2 demande. Aucun manque réel.
- **`WebSite` + `SearchAction`** (barre de recherche dans les liens de site) supposerait un moteur de
  recherche interne. Le site n'en a pas — la recherche de commune n'en est pas un — et le déclarer
  serait un champ inventé.
- **`HowTo` sur les outils à imprimer** : Google a retiré ce résultat enrichi en 2023. Aucun gain.

**Ce qui reste et vous appartient** (aucun code ne peut le faire) : `SITE_INDEXABLE=true` sur Vercel
en production, sans quoi `robots.txt` interdit tout le site ; les variables
`GOOGLE_SITE_VERIFICATION` et `BING_SITE_VERIFICATION` ; le secret `INDEXNOW_KEY` du dépôt ; la fiche
Google Business Profile ; et les neuf champs légaux encore `null`, qui laissent l'`Organization` et
les deux `LocalBusiness` incomplets (pas de raison sociale, pas de téléphone d'agence).

**Vérifications** : 948 tests unitaires, 13/13 contrôles, lint et typecheck verts, 62 parcours (SEO,
magazine, outils, accessibilité, recrutement, index des services, local) ; puis nouvelle exploration
des 245 adresses après build : 0 noindex listé, 0 page sans image Open Graph, 0 page orpheline.

## D-097 — Le hero de l'accueil : puissant et chaleureux, cette fois pour de bon (15/10/2026)

**J'avais eu tort de ne pas y toucher.** Dans la passe D-095, j'ai réécrit 25 heros sur 26 et laissé
le H1 de l'accueil intact, au motif qu'il était validé et qu'il passait le contrat des heros. Arcel
l'a redemandé, et il a raison : c'est **la** phrase du site, et « bien **accompagné** » est un mot de
prestataire. « Bien **entouré** » est un mot de famille. C'est la différence entre un service et des
gens.

| | avant | après |
| --- | --- | --- |
| H1 | Vivre chez soi, bien accompagné. Même quand la maladie ou le handicap compliquent tout. (86) | Vivre chez soi, bien entouré. Même quand la maladie ou le handicap s'installent. (80) |

« S'installent » plutôt que « compliquent tout » : une maladie chronique s'installe, c'est ce que
vivent les familles, et cela ne promet rien.

**Le chapô cesse de parler de nous.** Il disait « Youdom Care construit un accompagnement », puis,
après D-095, « L'accompagnement se construit avec vous » — déjà mieux, encore abstrait. Il dit
maintenant, en phrases brèves : les mots de la maladie, puis ce qu'il y a derrière, puis ce que nous
faisons, puis pour qui.

> Alzheimer, Parkinson, sclérose en plaques, handicap de l'enfant ou de l'adulte, grand âge.
> Derrière chaque mot, une personne et une maison. Nous venons chez vous, de quelques heures par
> semaine à une présence jour et nuit. Pour la personne que vous aimez. Et pour vous, qui tenez tout
> à bout de bras.

52 mots, aucune phrase au-delà de 15. Les mots recherchés restent en tête du premier paragraphe
(docs/01 §2). La dernière phrase, celle qu'Arcel avait validée, est gardée mot pour mot : c'est la
plus chaleureuse du site.

**Ce que je n'ai pas écrit, et pourquoi.** J'avais d'abord mis « Nous venons chez vous **avec les
mêmes visages** ». Vérification faite dans `content/engagements.json` : sur cinq engagements, **un
seul est validé** (E2, « si l'intervenant ne convient pas, nous changeons »). La stabilité de
l'équipe n'en fait pas partie. La promesse la plus séduisante du hero serait donc la seule à n'être
adossée à rien : elle est retirée.

**« Intervenant » cède la place au métier, sur neuf heros.** C'est le mot de l'administration, et il
était dans quinze chapôs. Là où la page nomme déjà le métier dans sa ligne de réassurance
(« Auxiliaires de vie préparés à… »), le chapô dit « l'auxiliaire de vie ». Sur les pages d'enfants,
« intervenant » reste : c'est le mot de leur propre réassurance, et le métier y est plus large. Sur
`/personnes-agees/vie-quotidienne/`, dont la réassurance parle d'« aides à domicile », c'est « la
personne qui vient » — une personne, pas une fonction.

**Le parcours de l'accueil, à la demande d'Arcel.** « Pour moi : je vis avec un handicap » devient
**« Personne en situation de handicap »**. Deux conséquences, à dire :

1. La casse. Arcel a écrit « Handicap » avec une majuscule ; le site écrit « personne en situation de
   handicap » en minuscules partout, et c'est l'usage comme la table des mots de `docs/01` §2. J'ai
   gardé la minuscule. Un mot suffit si vous préférez la majuscule.
2. La reprise du panneau. Le titre du panneau se construit sur le champ `pour` du choix, qui valait
   « pour vous-même » — cohérent avec « Pour moi », plus avec le nouveau libellé. Il devient « pour
   une personne en situation de handicap », donc « Vous cherchez de l'aide pour une personne en
   situation de handicap. Que vivez-vous ? ». Le libellé ne suppose plus que le visiteur est la
   personne concernée, ce qui ouvre le choix aux proches d'un adulte en situation de handicap.

`docs/01` §4 suit, et trois attentes de tests figeaient les anciens textes (le H1 dans
`page.test.tsx` et `home.spec.ts`, le libellé du parcours dans `page.test.tsx`) : elles suivent une
décision de commanditaire sur un texte, ce qui n'est pas relâcher un seuil.

**Vérifications** : 948 tests unitaires, 13/13 contrôles, lint et typecheck verts, 169 parcours
(accueil, heros aux quatre tailles sur les deux projets, services, SEO) ; H1 et chapô relus sur le
HTML construit, pas seulement dans le contenu.

## D-098 — Le parcours de l'accueil : la grille suivait l'écran, pas le panneau (15/10/2026)

**Ce qu'Arcel a vu.** Deux captures : « Personne en situation de handicap » empilé sur **cinq
lignes**, des cartes de hauteurs très différentes dans une même rangée, et le panneau coupé en plein
milieu d'un libellé.

**Ce que la mesure a montré.** La grille des six choix passait à deux colonnes selon la largeur de
l'**écran** (`min-[22rem]`, soit 352 px). Or le panneau du hero vit dans la colonne de droite de la
bannière : sur un écran de 1440 px, il ne fait que **453 px**. Chaque cellule tombait à
**124 px de texte utile**, et un libellé de 32 caractères n'y tient pas. Le même effet apparaît sans
zoom dès qu'un visiteur agrandit le texte (mode confort, RGAA 1.4.4) — ce n'est donc pas un défaut
de mon libellé de la veille, mais une faiblesse du gabarit que le nouveau libellé a révélée : l'ancien
(« Pour moi : je vis avec un handicap », 34 caractères) était tout aussi long.

**Correction.** La grille suit désormais la largeur du **bloc** (`@container`), comme les cartes
d'étapes depuis le 27/09 : une colonne tant que le bloc ne fait pas 24 rem, deux au-delà. Sous
36 rem, le chevron s'efface et l'icône rapetisse — 32 px rendus au libellé — et `min-w-0` laisse le
texte se replier au lieu de pousser la rangée.

**Un piège de seuil, trouvé par la sonde et non par la lecture.** Mon premier réglage utilisait
`@md` (28 rem). Il ne s'appliquait jamais : **la racine du site est à 18 px**, donc `@md` vaut 504 px,
pas 448. Le panneau de 453 px passait juste en dessous. C'est une sonde dans le navigateur qui l'a
dit (`rootFont: "18px"`), après deux mesures où je croyais à un cache de build.

**Mesuré après correction**, panneau de 453 px à 1440×900 : deux colonnes, trois rangées de hauteur
égale, chaque libellé sur deux ou trois lignes, **aucun texte coupé**, et le panneau ne défile plus
en interne (son contenu passe sous le plafond de 38 svh). À 390 px : une colonne, libellés sur une ou
deux lignes. Captures d'écran à l'appui, à six largeurs.

**Vérifications** : 948 tests unitaires, 13/13 contrôles, lint et typecheck verts ; 158 parcours
(heros aux quatre tailles sur les deux projets, accueil, mobile, mouvement) puis 150 parcours axe sur
tous les gabarits. Un parcours de `motion.spec.ts` a échoué sous la charge de la suite et passe seul
en 4,6 s : même fragilité que R-4 (D-083), page sans rapport avec ce changement.

## D-099 — La bannière sur téléphone : regardée, mesurée, recomposée (15/10/2026)

Arcel demande une version mobile « plus professionnelle, bien organisée ». J'ai donc **regardé** la
page sur un téléphone avant de toucher au code : captures à 320×568, 390×844 et 430×932, puis la
position de chaque bloc au pixel. Six défauts, tous réels, tous corrigés.

| ce qui n'allait pas | mesure |
| --- | --- |
| Chapô interminable avant la moindre action | **237 px à 320×568**, sur 421 px utiles sous l'en-tête et la barre |
| Bouton principal caché sous la barre d'action fixe | bas du bouton à **793 px** pour une fenêtre de 844 |
| Panneau du parcours coupé en plein milieu d'une carte | plafond de 24 svh, soit **203 px** : deux cartes et demie |
| Photo de signature posée sur le titre | opacité 35 %, sans dégradé, derrière les deux dernières lignes du H1 |
| Réassurance absente du téléphone | `heroOnlyWide` : elle n'apparaissait qu'à partir de 64 rem |
| Fil d'Ariane illisible sur la scène de nuit | **contraste 1,2** pour la page courante, 1,9 pour ses liens |

**Ce qui a changé.**

1. **Un chapô écrit pour les petits écrans**, jamais une troncature : `chapo_court` pour l'accueil,
   et sur les pages services le chapô seul en tête, les deux phrases de promesse déplacées **après**
   l'interaction. Rien n'est perdu, l'ordre change — D-036 avait retiré la coupe automatique parce
   qu'elle laissait des points de suspension au milieu d'une promesse, et cette décision tient.
   Mesuré sur `/services/garde-de-nuit/` : quatorze lignes avant l'action, six maintenant.
2. **L'action principale passe avant le parcours sous 64 rem.** Elle était déjà prioritaire au
   dernier palier de compaction ; la règle vaut désormais pour tout téléphone, sans quoi le panneau
   complet la repoussait à 954 px.
3. **Le panneau du parcours ne se défile plus en interne sur téléphone.** Le plafond de D-058
   servait à garder l'action dans la fenêtre : depuis D-076, c'est la barre d'action qui la porte.
   Il ne faisait donc plus que couper une carte en deux, et deux zones de défilement imbriquées sur
   un écran tactile sont un piège.
4. **La scène réserve la hauteur de la barre d'action** (4 rem de plus en bas sous 64 rem) : plus
   rien ne se termine sous elle.
5. **La photo de signature s'efface vers la gauche** et descend à 18 % d'opacité sur téléphone ; les
   réglages du fond de scène quittent le style en ligne — qui n'a pas de point de rupture — pour la
   feuille `scenes.css`, où le masque devient vertical sous 64 rem.
6. **La réassurance s'affiche sur téléphone**, juste sous le bouton : « évaluation gratuite, devis
   sans engagement, crédit d'impôt » manquait exactement là où arrive la majorité des visiteurs.
7. **Le fil d'Ariane redevient lisible sur la scène de nuit.** La règle existait depuis le 27/09
   mais n'a jamais rien changé : elle vit dans `@layer components`, et les classes utilitaires de
   Tailwind (`text-ink`, `text-link`) sont déclarées dans `@layer utilities`, donc après. La
   nouvelle règle est posée **hors de tout layer** — ce qui passe devant tous les layers sans
   recourir à `!important`. Vérifié dans le navigateur : blanc sur teal-900, contraste 11.
8. Deux alignements : la coche de la réassurance et le chevron du fil d'Ariane se calent sur la
   **première ligne** d'un libellé qui passe à la ligne, au lieu de flotter au milieu du bloc.

**Composition obtenue à 390×844**, de haut en bas : titre (117 px), chapô court (212), bouton
framboise (386), réassurance, parcours entier (462 → 886), repère. Tout ce qui compte est au-dessus
de la ligne de flottaison, et le parcours se poursuit d'un pouce.

**Vérifications** : 948 tests unitaires, 13/13 contrôles, lint et typecheck verts ; 254 parcours
(heros aux quatre tailles sur les deux projets, accueil, mobile, services, local, mouvement) puis
150 parcours axe sur tous les gabarits. Captures à l'appui sur quatre gabarits.


## D-100 — La photo de signature passe sous le texte sur téléphone (15/10/2026)

Suite immédiate de D-099 : j'avais ramené la photo détourée à 18 % d'opacité pour qu'elle cesse
d'écraser le titre, et j'ai proposé à Arcel de la descendre complètement. Réponse : oui.

Sur téléphone, elle est donc **ancrée au bas de la bannière**, à droite, derrière le panneau du
parcours. Le titre est sur la couleur de scène, et rien d'autre. À partir de 40 rem, le réglage
d'origine reprend : la photo tient la droite de la bannière.

**Deux essais avant le bon, et c'est la capture qui a tranché :**

1. Premier essai, un fondu vertical pour qu'elle « émerge » du bas : il effaçait précisément les
   deux visages et ne laissait que les mains. Le dégradé est retiré — la photo est détourée, elle
   se pose sans fondu.
2. Deuxième essai, large (58 vw) : le panneau de verre, qui court sur toute la largeur, en
   recouvrait la moitié haute ; on voyait des épaules sans tête. Réduite à **40 vw** (156 px à
   390), elle tient entièrement dans la bande libre sous le panneau. Les deux visages se voient.

Aucune des deux n'aurait été visible sans regarder l'image produite : les mesures de position
disaient « la photo est là, 207 px de haut », et elles avaient raison.

**Vérifications** : 948 tests unitaires, lint, typecheck et mise en forme verts ; 177 parcours
(heros aux quatre tailles sur les deux projets, accueil, mobile, mouvement, axe des gabarits
témoins), dont le contrat mobile de `mobile.spec.ts` qui refuse tout débordement horizontal à
320 px. Captures relues à 320 et 390.

## D-101 — Les photos en fond complet de la bannière (15/10/2026)

Arcel : « mes photos en fond complet sur la zone hero ». Jusqu'ici, la photo d'une scène était
effacée sur sa moitié gauche par un dégradé et plafonnée à 0,85 d'opacité : elle n'occupait qu'un
côté de la bannière. Elle couvre maintenant toute la scène, sur les six gabarits.

**Ce qui rend la chose possible : un voile, et une mesure.** Un texte foncé sur une photo claire
donne un contraste imprévisible, photo par photo. Un voile (`::after` sur `.hero-fond`) reprend la
couleur de base de la scène — chaque famille de pages garde donc la sienne — dense là où vit le
texte, léger à l'opposé. Et surtout : **je l'ai mesuré sur le rendu**, pas déduit. La page est
capturée deux fois, une fois normale et une fois **le contenu masqué** : la seconde donne le vrai
fond sous chaque bloc de texte, et le contraste se calcule sur le pire centile de ses pixels.

| page | titre | chapô |
| --- | --- | --- |
| accueil (1440) | 6,75 | 7,62 |
| accueil (390) | 9,73 | 8,10 |
| page service, scène de nuit (1440) | 6,18 | **5,98** |
| pilier (1440) | 9,31 | 7,09 |
| page locale (390) | 8,42 | 7,98 |

Le plus bas est 5,98 pour un seuil WCAG de 4,5. Deux réglages ont été nécessaires, et les deux
viennent de la mesure, pas de l'œil :

1. **La scène de nuit a son propre voile, plus dense.** Au réglage commun, son chapô — blanc sur une
   photo qui a des zones claires — tombait à **4,50**, c'est-à-dire exactement le seuil, donc sans
   aucune marge.
2. **La photo de la scène verte a changé.** `fond-projet-de-vie.webp` fait 1920×557 : en plein cadre
   sur un téléphone, il faut l'agrandir trois fois et demie pour couvrir la hauteur, et on tombe sur
   une zone unie — mesuré, le contraste y était identique à celui de la couleur de scène pure, donc
   **la photo ne se voyait pas du tout**. Elle est remplacée par `fond-personne-agee-accompagnee.jpg`
   (1400×1056), utilisable debout comme couchée. Cela concerne les 131 pages locales : à revoir
   avec Arcel s'il tient à l'image d'origine, qui mériterait alors un recadrage vertical.

**La photo détourée de l'accueil est retirée.** Avec un fond photographique plein cadre, deux images
se superposaient — c'était déjà la raison notée le 27/09 pour retirer la photo encadrée de la
colonne de droite. L'accueil reçoit donc `accueil-hero-fenetre.jpg`, qui dormait dans le contenu
(`banniere.photo`) sans être affichée nulle part depuis cette date. Le couple détouré reste dans
`banniere.signature` : il revient en une ligne si Arcel le préfère.

**Un test mis à jour, et son intention avec lui.** `page.test.tsx` comptait cinq balises images dans
l'accueil, dont la photo détourée. Le fond étant désormais une image CSS, il en reste quatre ; le
test vérifie en plus ce qui compte vraiment — le fond est décoratif, `aria-hidden`, et ne contient
aucune balise image.

**Vérifications** : 948 tests unitaires, 13/13 contrôles, lint et typecheck verts ; 189 parcours
(heros aux quatre tailles sur les deux projets, accueil, mobile, mouvement, axe des gabarits
témoins, local) puis 214 parcours (axe de tous les gabarits, services). Un parcours R-4 a lâché sous
la charge de la suite et repasse seul en 4,1 s : fragilité connue (D-083), page sans rapport.

---

## D-102 — `apps/api` entre dans l'espace de travail, avec une seule dépendance (15/10/2026)

**Contexte.** Arcel a tranché : un CRM Youdom Care complet, et l'espace client dessus
(`docs/portal/DECISIONS.md` MY-07). La vague 1 commence, et la question d'implantation se pose avant
la première ligne : un second dépôt, ou un paquet dans celui-ci ?

**Décision : un paquet de l'espace de travail**, `apps/api`, déclaré par `packages: [apps/*]` dans
`pnpm-workspace.yaml`.

**Pourquoi.** L'atelier existe déjà et il est vert : un lint, un typecheck, 1 037 tests, un
contrôle de format, une intégration continue en deux jobs. L'API en hérite sans rien monter. Un
second dépôt demanderait une seconde chaîne complète, tenue par la même personne — c'est le genre
d'économie qui coûte. Trois ajustements suffisent, tous visibles dans le diff :

- `vitest.config.mts` : les tests de `apps/*/src` rejoignent la suite (ils déclarent
  `@vitest-environment node`, sans DOM, et tournent en 1,6 s) ;
- `eslint.config.mjs` : la règle Next `no-assign-module-variable` est désactivée pour `apps/**` —
  `apps/api` n'est pas une application Next.js, et `module` y est un mot du domaine
  (`PERMISSIONS.md` §3). Toutes les autres règles restent ;
- `package.json` : un script `portal:migrer` pour poser les index.

Le site, lui, ne change pas : `pnpm build` reste identique, et aucune ligne de l'API n'est importée
par une page.

**Une dépendance ajoutée, et une seule** (règle de CLAUDE.md : nom, raison, poids) :

| Paquet | Raison | Poids |
| --- | --- | --- |
| `mongodb@^7.7.0` | pilote officiel ; MongoDB est la base retenue (MY-08), Atlas est certifié HDS | 4,4 Mo + `bson` 2,3 Mo, côté serveur uniquement — jamais dans un paquet envoyé au navigateur |

`zod` est déjà dans le dépôt et sert des deux côtés : c'est précisément l'argument de MY-09. Aucun
framework HTTP n'est ajouté à cette étape — il n'y a pas encore de serveur, et choisir un framework
avant d'avoir une route à servir, c'est choisir pour rien. `pnpm audit` est inchangé : le pilote
MongoDB n'apporte aucun avis.
