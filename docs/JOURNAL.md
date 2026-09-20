# Journal des itérations

Une entrée par itération, la plus récente en bas. Format imposé :

```
## AAAA-MM-JJ HH:MM — P0.1 Initialiser le projet
- Fait : …
- Décisions : … (renvoi à docs/DECISIONS.md si besoin)
- Fichiers clés : …
- Contrôles : lint ✔ · typecheck ✔ · test ✔ · validate ✔ · (propres à la tâche) …
- Questions ouvertes : … (numéros dans docs/QUESTIONS_ARCEL.md)
- Suite : prochaine tâche prévue
```

---

## 2026-09-19 — Kit déposé
- Fait : cahiers 00 à 07, plan, questions, données d'amorçage déposés dans le dépôt.
- Suite : P0.1.

## 2026-09-20 — P0.1 Initialiser le projet
- Fait : dépôt git local créé (branche `main`, kit committé en 1735113), branche `phase/00-amorcage` ouverte ; `create-next-app@latest` (Next.js 16.3.5, TypeScript, App Router, `src/`, pnpm) fusionné à la racine sans toucher aux fichiers du kit ; `src/app` réduit à un squelette en français ; `.gitignore` complété (`!.env.example`, `data/raw/`).
- Décisions : D-006 (versions de la pile et écarts par rapport au scaffold).
- Fichiers clés : `package.json`, `next.config.ts`, `tsconfig.json`, `eslint.config.mjs`, `src/app/layout.tsx`, `src/app/page.tsx`, `AGENTS.md`.
- Contrôles : lint ✔ · `pnpm build` ✔ sans avertissement (2 routes statiques) · `pnpm dev` ✔ (GET / 200, `lang="fr"`) · typecheck, test, validate : scripts introduits par P0.2, P0.4 et P0.6.
- Environnement : `gh auth status` échoue (jeton `GH_TOKEN` invalide) et le dépôt n'a pas de remote ; note ajoutée sous Q-TECH-3. Git remplace LF par CRLF à l'écriture (Windows) : un `.gitattributes` `eol=lf` sera ajouté en P0.2 avec Prettier.
- Questions ouvertes : Q-TECH-3.
- Suite : P0.2 Outillage qualité.

## 2026-09-20 — P0.2 Outillage qualité
- Fait : ESLint strict (règles supplémentaires + eslint-config-prettier), Prettier (`.prettierrc.json`, `.prettierignore`), Husky (`pre-commit` → lint-staged, `commit-msg` → commitlint), commitlint restreint aux 13 types de la loop, scripts `lint`, `typecheck`, `format`, `format:check`, `.gitattributes` `eol=lf`, `content/*.json` formatés.
- Décisions : D-007.
- Fichiers clés : `eslint.config.mjs`, `.prettierrc.json`, `.prettierignore`, `commitlint.config.mjs`, `.husky/pre-commit`, `.husky/commit-msg`, `.gitattributes`, `package.json`.
- Contrôles : lint ✔ · typecheck ✔ · format:check ✔ · critère « commit mal formé refusé » ✔ (`mauvais message sans type` et `wip: truc` rejetés par le hook `commit-msg`) · test, validate : introduits en P0.4 et P0.6.
- Questions ouvertes : aucune nouvelle.
- Suite : P0.3 Styles et polices.

## 2026-09-20 — P0.3 Styles et polices
- Fait : Tailwind CSS 4.3.3 via @tailwindcss/postcss ; `src/styles/tokens.css` (tous les jetons de `docs/02 §2–4` + mouvement §5 + mode confort) ; `src/styles/globals.css` (`@theme inline`, palettes Tailwind par défaut désactivées, base typographique, focus visible, utilitaires `container-site`, `figure`, `tabular-figures`) ; Fraunces (axes SOFT, opsz) et Atkinson Hyperlegible Next par `next/font/google` ; page témoin `/styleguide/` (noindex) : typographie, 27 pastilles de couleur, formes et ombres.
- Décisions : D-008 (Tailwind, polices, repli documenté pour Atkinson).
- Fichiers clés : `src/styles/tokens.css`, `src/styles/globals.css`, `src/app/layout.tsx`, `src/app/styleguide/page.tsx`, `postcss.config.mjs`.
- Contrôles : lint ✔ · typecheck ✔ · format:check ✔ · `pnpm build` ✔ sans avertissement (build propre après `rm -rf .next`) · critère « page de test affiche les deux polices et les couleurs » ✔ vérifié dans le navigateur (`document.fonts` : Fraunces et Atkinson Hyperlegible Next chargées ; h1 Fraunces 560 « SOFT » 50 ; texte 17 px / interligne 1,65 ; fond #FBF8F3 ; lien #00788D ; bouton #D42A5B) · test, validate : introduits en P0.4 et P0.6.
- Questions ouvertes : aucune nouvelle.
- Suite : P0.4 Tests.

## 2026-09-20 — P0.4 Tests
- Fait : Vitest 5 (jsdom, Testing Library, `tests/setup.ts`), Playwright 1.63 (projets mobile Pixel 7 et Desktop Chrome, serveur de production sur le port 3100), assistant `tests/e2e/axe.ts` appliquant le seuil de `docs/07 §4` ; un test de fumée unitaire (`src/app/page.test.tsx`) et deux parcours (`tests/e2e/smoke.spec.ts`). Chromium installé localement.
- Décisions : D-009. Anomalie trouvée par axe et corrigée dans la foulée : étiquettes des pastilles du guide de styles écrites sur des aplats trop peu contrastés (`teal-500`, `raspberry-500`…) ; elles sont désormais sous la pastille, sur blanc.
- Fichiers clés : `vitest.config.mts`, `playwright.config.ts`, `tests/setup.ts`, `tests/e2e/axe.ts`, `tests/e2e/smoke.spec.ts`, `src/app/page.test.tsx`, `package.json`.
- Contrôles : lint ✔ · typecheck ✔ · format:check ✔ · test ✔ (1/1) · test:e2e ✔ (4/4, 0 violation axe) · build ✔ sans avertissement · validate : introduit en P0.6.
- Questions ouvertes : aucune nouvelle.
- Suite : P0.5 Contenu et schémas.

## 2026-09-20 — P0.5 Contenu et schémas
- Fait : `src/content/schemas.ts` (Zod 4, objets stricts) pour les quatre fichiers de `content/`, chargeur typé `src/content/loader.ts` (cache, erreur lisible), `content/interface.json` repris mot pour mot de `docs/01 §6–7`, layout et accueil branchés sur le chargeur, 5 tests unitaires des schémas.
- Décisions : D-010.
- Fichiers clés : `src/content/schemas.ts`, `src/content/loader.ts`, `src/content/schemas.test.ts`, `content/interface.json`, `src/app/layout.tsx`, `src/app/page.tsx`.
- Contrôles : lint ✔ · typecheck ✔ · format:check ✔ · test ✔ (6/6) · test:e2e ✔ (4/4) · build ✔ sans avertissement · critère « un champ invalide fait échouer le build » ✔ (URL cassée → `Build error: content/site.config.json est invalide → at marque.url`, fichier restauré, build de nouveau vert) · validate : introduit en P0.6.
- Questions ouvertes : aucune nouvelle (la structure `legal.autorisations[]` attend Q-LEGAL-1).
- Suite : P0.6 Contrôles.

## 2026-09-20 — P0.6 Contrôles
- Fait : `scripts/validate/` (`types.ts`, `config.ts` = registre, `index.ts` = exécuteur, `check-content.ts`, `check-placeholders.ts`), commande `pnpm validate` et option `--prod` (ou `VERCEL_ENV=production`), fixture de contenu invalide, 11 tests unitaires des contrôles. `tsx` ajouté ; script d'installation d'`esbuild` autorisé dans `pnpm-workspace.yaml`.
- Décisions : D-011.
- Fichiers clés : `scripts/validate/index.ts`, `scripts/validate/config.ts`, `scripts/validate/check-content.ts`, `scripts/validate/check-placeholders.ts`, `package.json`, `pnpm-workspace.yaml`.
- Contrôles : lint ✔ · typecheck ✔ · format:check ✔ · test ✔ (16/16) · validate ✔ (2/2 en prévisualisation) · validate --prod ✖ attendu (15 erreurs : tarifs vides, 8 champs légaux null, hébergeur incomplet, 9 éléments dans a_confirmer, E1–E4 non validés) · build inchangé depuis P0.5.
- Questions ouvertes : les erreurs de `validate --prod` renvoient toutes à Q-TARIFS-1, Q-ID-1, Q-ID-2 et E1–E5, déjà posées.
- Suite : P0.7 Intégration continue.

## 2026-09-20 — P0.7 Intégration continue
- Fait : `.github/workflows/ci.yml` (job unique : install, `next typegen`, lint, typecheck, format:check, test, build, validate, Chromium + Playwright/axe, rapport en cas d'échec) ; `.env.example` selon `docs/00 §6` + `SITE_INDEXABLE` + `LEAD_WEBHOOK_SECRET`.
- Décisions : D-012.
- Fichiers clés : `.github/workflows/ci.yml`, `.env.example`.
- Contrôles : lint ✔ · typecheck ✔ (après `next typegen` sur un `next-env.d.ts` supprimé, comme en CI) · format:check ✔ · test ✔ (16/16, inchangé) · validate ✔ (inchangé) · workflow non exécuté sur GitHub : pas de remote ni de `gh` fonctionnel (Q-TECH-3).
- Questions ouvertes : Q-TECH-3 (bloque la vérification « CI verte » du point de validation 0).
- Suite : P0.8 Configuration Next.

## 2026-09-20 — P0.8 Configuration Next
- Fait : `next.config.ts` (`trailingSlash`, `poweredByHeader: false`, en-têtes de sécurité de `docs/07 §6`, `X-Robots-Tag` conditionnel), `src/lib/seo/indexable.ts`, `src/app/robots.ts` (fermé tant que `SITE_INDEXABLE` ≠ "true"), `metadataBase` et `robots` dans le layout, tests unitaires de `robots.ts` et parcours `tests/e2e/config.spec.ts`.
- Décisions : D-013 (CSP sans nonce : écart consigné par rapport à `docs/07 §6`, piste d'empreintes SHA-256 pour la phase 9).
- Fichiers clés : `next.config.ts`, `src/app/robots.ts`, `src/lib/seo/indexable.ts`, `src/app/layout.tsx`, `tests/e2e/config.spec.ts`.
- Contrôles : lint ✔ · typecheck ✔ · format:check ✔ · test ✔ (18/18) · build ✔ sans avertissement · validate ✔ (2/2) · test:e2e ✔ (10/10 : en-têtes présents, `x-powered-by` absent, noindex, redirection 308 vers `/styleguide/`).
- Questions ouvertes : aucune nouvelle.
- Suite : toutes les tâches de la phase 0 sont cochées → point de validation 0 à l'itération suivante.

## 2026-09-20 — Point de validation 0 (phase 0 — Amorçage)
- Critères : `pnpm build` sans avertissement ✔ · `docs/DECISIONS.md` liste la pile et les versions ✔ (D-006 à D-013) · CI verte sur la PR ✖ impossible ici (pas de remote, `gh` sans jeton valide : Q-TECH-3) → chaîne CI rejouée en local dans le même ordre : typegen ✔ · lint ✔ · typecheck ✔ · format:check ✔ · test ✔ (18/18) · build ✔ · validate ✔ (2/2) · Playwright + axe ✔ (10/10) · `pnpm audit` ✔ (aucune vulnérabilité connue).
- Décisions : D-014 (fin de phase sans remote : fusion locale en squash + tag, PR a posteriori).
- Fusion : `phase/00-amorcage` (16 commits) fusionnée en squash sur `main`, tag `phase-00` ; branche conservée pour la PR à venir. Tâche DC.1 ajoutée dans « Dette et corrections », bloquée par Q-TECH-3.
- Questions ouvertes : Q-TECH-3 (publication), et pour `validate --prod` : Q-TARIFS-1, Q-ID-1, Q-ID-2, E1–E5.
- Suite : phase 1 — Design system « Le Fil », branche `phase/01-design-system`, tâche P1.1.
