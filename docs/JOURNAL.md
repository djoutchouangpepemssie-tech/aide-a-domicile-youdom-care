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

## 2026-09-20 — P1.1 Jetons et contrastes
- Fait : branche `phase/01-design-system` créée depuis `main` ; `scripts/validate/contrast.ts` (luminance relative, rapport WCAG, lecture des jetons `--color-*` de `tokens.css`, bloc de base et bloc confort) ; `scripts/validate/check-contrast.ts` : table des 34 couples de `docs/02 §2` avec rapport annoncé et seuil d'usage (7 texte courant, 4,5 texte, 3 interface et grands textes, aucun pour le décoratif et les couples documentés comme interdits) ; contrôle enregistré dans `config.ts` ; 6 tests unitaires.
- Décisions : aucune nouvelle. Une valeur déduite (teal-800 sur sable) a été retirée de la table : seules les valeurs écrites dans le cahier sont vérifiées.
- Fichiers clés : `scripts/validate/contrast.ts`, `scripts/validate/check-contrast.ts`, `scripts/validate/check-contrast.test.ts`, `scripts/validate/config.ts`.
- Contrôles : lint ✔ · typecheck ✔ · format:check ✔ · test ✔ (24/24) · validate ✔ (3/3, check-contrast vert : critère « toutes les valeurs du cahier retrouvées à 0,05 près » ✔) · build et e2e inchangés depuis P0.8.
- Questions ouvertes : aucune nouvelle.
- Suite : P1.2 Texte (`Heading`, `Lead`, `Prose`, styles d'impression).

## 2026-09-20 — P1.2 Texte
- Fait : `Heading` (niveau sémantique 1–4, niveau visuel découplé), `Lead`, `Prose` (balise `div`/`article`/`section`), utilitaires `heading-1..4` et `lead` dans `globals.css` (les balises h1–h4 les appliquent), styles `.prose` (mesure 66ch, rythme vertical, listes, citations en italique, tableaux, légendes, abréviations), feuille d'impression de base (`@page`, noir sur blanc, `nav`/`[data-print="hide"]`/`.no-print` masqués, URL des liens externes imprimée, coupures de page évitées), assistant `src/lib/cn.ts`, section « Texte courant » du guide de styles avec un exemple illustratif ; 5 tests de composants.
- Décisions : aucune nouvelle.
- Fichiers clés : `src/components/ui/Heading/Heading.tsx`, `src/components/ui/Lead/Lead.tsx`, `src/components/ui/Prose/Prose.tsx`, `src/styles/globals.css`, `src/lib/cn.ts`, `src/app/styleguide/page.tsx`.
- Contrôles : lint ✔ · typecheck ✔ · format:check ✔ · test ✔ (29/29) · build ✔ sans avertissement · validate ✔ (3/3) · test:e2e ✔ (10/10, axe vert sur le guide de styles enrichi).
- Questions ouvertes : aucune nouvelle.
- Suite : P1.3 Primitives (`Button`, `Card`, `Badge`, `Callout`, champs de formulaire).

## 2026-09-20 — Découpage de P1.3
- Fait : P1.3 (neuf composants) découpée en P1.3a (Button, Card, Badge, Callout) et P1.3b (TextField, Textarea, Select, CheckboxGroup, RadioCards), avec les critères de `docs/02 §4, §7` et `docs/05` repris tâche par tâche.
- Décisions : aucune (application de `.claude/loop.md` §2).
- Fichiers clés : `docs/PLAN.md`.
- Contrôles : sans objet (aucun code modifié).
- Questions ouvertes : aucune nouvelle.
- Suite : P1.3a.

## 2026-09-20 — P1.3a Primitives : actions et blocs
- Fait : `Button` (variantes primary/secondary/outline/link, `href` → `next/link`, `block`, icône décorative, cibles 48/56 px, transitions sur les jetons de durée, `motion-reduce`), `Card` (balise au choix, `interactive`, espacements), `Badge` (six tons, encre sur fonds teintés, « fait » sur vert-500), `Callout` (quatre variantes du cahier, `role="note"`, `aria-labelledby`, icône au fil en tracé ouvert) ; 11 tests ; guide de styles enrichi (boutons avec les libellés de `interface.json`).
- Décisions : aucune nouvelle. Anomalie trouvée par axe et corrigée : le titre vert-700 sur vert-50 (4,47) de l'encart « Bon à savoir » passe en encre ; ce couple n'est pas dans la table du cahier, rappel que seuls ses couples sont autorisés.
- Fichiers clés : `src/components/ui/Button/Button.tsx`, `src/components/ui/Card/Card.tsx`, `src/components/ui/Badge/Badge.tsx`, `src/components/ui/Callout/Callout.tsx`, `src/app/styleguide/page.tsx`.
- Contrôles : lint ✔ · typecheck ✔ · format:check ✔ · test ✔ (40/40) · build ✔ sans avertissement · validate ✔ (3/3) · test:e2e ✔ (10/10, axe vert).
- Questions ouvertes : aucune nouvelle.
- Suite : P1.3b champs de formulaire.

## 2026-09-20 — P1.3b Primitives : champs de formulaire
- Fait : `FieldShell` (enveloppe commune : étiquette ou légende, aide, erreur avec icône au fil, `describedBy`), `TextField`, `Textarea`, `Select` (natif), `CheckboxGroup` et `RadioCards` (`fieldset` + `legend` en premier enfant, cartes cliquables `has-[:checked]`, focus visible sur la carte, modes contrôlé et non contrôlé, composants client) ; 12 tests unitaires ; `tests/e2e/fields.spec.ts` (tabulation, flèches dans le groupe radio, Espace sur les cases, description accessible de l'erreur) ; section « Champs de formulaire » du guide de styles avec les microtextes d'`interface.json`.
- Décisions : aucune nouvelle. Deux corrections en cours de route : la légende doit être le premier enfant du `fieldset` pour nommer le groupe ; `aria-invalid` n'est pas permis sur un rôle `group` (erreur reliée par `aria-describedby` seulement), il l'est sur `radiogroup`.
- Fichiers clés : `src/components/ui/FieldShell/FieldShell.tsx`, `src/components/ui/TextField/TextField.tsx`, `src/components/ui/Textarea/Textarea.tsx`, `src/components/ui/Select/Select.tsx`, `src/components/ui/CheckboxGroup/CheckboxGroup.tsx`, `src/components/ui/RadioCards/RadioCards.tsx`, `tests/e2e/fields.spec.ts`.
- Contrôles : lint ✔ · typecheck ✔ · format:check ✔ · test ✔ (52/52) · build ✔ sans avertissement · validate ✔ (3/3) · test:e2e ✔ (14/14 : clavier vérifié, axe vert).
- Questions ouvertes : aucune nouvelle.
- Suite : P1.4 Le fil (`Thread` et six illustrations).

## 2026-09-20 — P1.4 Le fil
- Fait : `src/components/ui/Thread/illustrations.ts` (six tracés ouverts dans une boîte 120 × 120, un `knot` par illustration : maison, mains, tasse, lune, cartable, carnet), `Thread` (composant client : `aria-hidden`, `pathLength=1`, états `idle` → `pending` → `drawn` par IntersectionObserver, visible d'emblée avec `prefers-reduced-motion`, en mode confort et sans JavaScript ; tons clair teal-700 / sombre blanc), jetons `--thread-width` (1,75 px puis 2 px) et `--thread-duration` (800 ms, 0 en mouvement réduit), styles `.thread` dans `globals.css`, section « Le fil » du guide de styles (six illustrations + fond sombre) ; 4 tests unitaires et 2 parcours Playwright (tracé complet, `reducedMotion: "reduce"`).
- Décisions : aucune nouvelle. Les tracés sont volontairement simples ; ils pourront être redessinés en P10.6 sans changer l'API (nom + `main`/`knot`).
- Fichiers clés : `src/components/ui/Thread/Thread.tsx`, `src/components/ui/Thread/illustrations.ts`, `src/styles/tokens.css`, `src/styles/globals.css`, `tests/e2e/thread.spec.ts`, `src/app/styleguide/page.tsx`.
- Contrôles : lint ✔ · typecheck ✔ · format:check ✔ · test ✔ (56/56) · build ✔ sans avertissement · validate ✔ (3/3) · test:e2e ✔ (18/18).
- Questions ouvertes : aucune nouvelle.
- Suite : P1.5 En-tête.

## 2026-09-20 — P1.5 En-tête
- Fait : `content/navigation.json` (six entrées de `docs/00 §5`, deux menus avec descriptions courtes, `rappel_href`) et son schéma ; microtextes `en_tete` dans `interface.json` ; `src/lib/phone.ts` (`toTelHref`, `formatFrenchPhone`) ; `Header` (client) : lien d'évitement vers `#contenu`, marque en Fraunces (logo SVG attendu : Q-CONTENU-6), menus « disclosure » au clavier (Entrée/Espace, Tab, Échap avec retour du focus, fermeture au focus sortant et au clic extérieur), téléphone `tel:`, bouton framboise, menu mobile (`details/summary`, Échap), état compact 80 → 64 px au défilement avec `shadow-2` ; `SiteHeader` (serveur) branché sur le contenu et monté dans le layout ; `<main id="contenu">` sur les pages ; 5 tests unitaires, 4 parcours Playwright (évitement, clavier ordinateur, mobile, compact) ; check-content couvre `navigation.json`.
- Décisions : aucune nouvelle. Le téléphone se masque si `contact.telephone_principal` est null.
- Fichiers clés : `src/components/layout/Header/Header.tsx`, `src/components/layout/SiteHeader/SiteHeader.tsx`, `content/navigation.json`, `content/interface.json`, `src/content/schemas.ts`, `src/lib/phone.ts`, `tests/e2e/header.spec.ts`, `src/app/layout.tsx`.
- Contrôles : lint ✔ · typecheck ✔ · format:check ✔ · test ✔ (63/63) · build ✔ sans avertissement · validate ✔ (3/3) · test:e2e ✔ (24/24, 2 ignorés par projet ; axe vert sur l'accueil avec en-tête et sur le menu mobile ouvert).
- Questions ouvertes : Q-CONTENU-6 (logo) déjà posée.
- Suite : P1.6 Pied de page et barre mobile.

## 2026-09-20 — P1.6 Pied de page et barre mobile
- Fait : `Footer` (repère `contentinfo`, fond teal-900 / blanc, coordonnées et six agences depuis `site.config.json`, colonnes pour qui / services / territoires (8 départements + agences) / entreprise, labels affichés seulement si `detenu === true` — aucun aujourd'hui, mentions légales, © et signature, `comfortSlot` réservé à P1.7, `data-print="hide"`), `MobileActionBar` (client, fixe en bas, `safe-area-inset-bottom`, trois voies : Appeler / Être rappelé(e) / Ma demande, `inert` + translation dès qu'un champ de saisie a le focus), `SiteFooter` et `SiteMobileActionBar` (serveur) montés dans le layout, marge basse du `body` sous 64 rem ; `navigation.json` étendu (`demande_href`, `contact_href`, `pied_de_page.entreprise/legal`) et `interface.json` (`pied_de_page`, `barre_mobile`) avec leurs schémas ; 5 tests unitaires, 3 parcours Playwright.
- Décisions : aucune nouvelle. `inert` plutôt qu'`aria-hidden` sur la barre retirée : un conteneur `aria-hidden` avec des liens focusables serait une violation axe sérieuse.
- Fichiers clés : `src/components/layout/Footer/Footer.tsx`, `src/components/layout/SiteFooter/SiteFooter.tsx`, `src/components/layout/MobileActionBar/MobileActionBar.tsx`, `src/components/layout/SiteMobileActionBar/SiteMobileActionBar.tsx`, `content/navigation.json`, `content/interface.json`, `src/app/layout.tsx`, `tests/e2e/footer-bar.spec.ts`.
- Contrôles : lint ✔ · typecheck ✔ · format:check ✔ · test ✔ (68/68) · build ✔ sans avertissement · validate ✔ (3/3) · test:e2e ✔ (28/28, 4 ignorés par projet ; axe vert avec en-tête, pied de page et barre).
- Questions ouvertes : Q-ID-4 (labels réellement détenus) déjà posée.
- Suite : P1.7 Mode confort de lecture.

## 2026-09-20 — P1.7 Mode confort de lecture
- Fait : `ComfortToggle` (client, `aria-pressed`, `useSyncExternalStore` sur l'attribut `data-comfort` de `<html>`, mémorisation `localStorage` clé `yc-confort`, synchronisation entre instances par événement), monté dans l'en-tête (≥ 80 rem et dans le menu mobile) et dans le pied de page ; `ComfortScript` (script en ligne minuscule qui restaure le choix avant le premier rendu, `suppressHydrationWarning` sur `<html>`) ; textes `confort` dans `interface.json` ; les effets (texte 112,5 %, interlignage 1,75, encre #06222A, liens #004A57 soulignés, animations et fil coupés, fonds teintés blancs) étaient déjà dans `tokens.css` ; 2 tests unitaires, 1 parcours Playwright (rapport de taille 1,125, interligne 1,75, soulignement, fond blanc, persistance après rechargement, synchronisation en-tête/pied).
- Décisions : aucune nouvelle. Anomalie corrigée en cours de route : une constante importée d'un module `"use client"` dans un composant serveur n'est qu'une référence (`getItem(undefined)`) ; la clé vit désormais dans `src/lib/comfort.ts`, sans directive.
- Fichiers clés : `src/components/ui/ComfortToggle/ComfortToggle.tsx`, `src/components/layout/ComfortScript/ComfortScript.tsx`, `src/lib/comfort.ts`, `src/components/layout/Header/Header.tsx`, `src/components/layout/SiteHeader/SiteHeader.tsx`, `src/components/layout/SiteFooter/SiteFooter.tsx`, `src/app/layout.tsx`, `tests/e2e/comfort.spec.ts`.
- Contrôles : lint ✔ · typecheck ✔ · format:check ✔ · test ✔ (70/70) · build ✔ sans avertissement · validate ✔ (3/3) · test:e2e ✔ (30/30, 4 ignorés par projet).
- Questions ouvertes : aucune nouvelle.
- Suite : P1.8 Semaine type (lecture).

## 2026-09-20 — P1.8 Semaine type (lecture)
- Fait : `src/lib/week/week.ts` (jours, créneaux et heures de `docs/05 §4`, activités de la légende, `parseHours` avec plages passant minuit, `summarizeWeek`, `indexWeek`) ; `WeekPlanner` variante `display` (serveur, sans JavaScript : `table` avec `caption`, `th scope=col` jours et `th scope=row` créneaux, cases vides annoncées « Libre », liste par jour sous 48 rem, chaque case porte le texte de l'activité, les heures réelles et le libellé, légende limitée aux activités utilisées, résumé « Environ N heures par semaine, dont X nuits », mention « Exemple illustratif ») ; `content/semaines-types.json` : six exemples repris de `docs/03` (Madeleine, Jacques, Claire, Suzanne, Karim, Noé) avec leur source, schéma strict (une entrée par jour et créneau, source obligatoire) ; textes `semaine_type` ; 6 tests unitaires, 1 parcours Playwright (tableau sur ordinateur, liste sur mobile, mention visible) ; section du guide de styles.
- Décisions : aucune nouvelle. L'exemple « Bernard, 74 ans, retour d'hospitalisation » attendu par l'accueil (`docs/01 §4 bloc 5`) n'est décrit dans aucun cahier : il sera écrit en P2.2 comme illustration sourcée sur `docs/03` (sortie d'hospitalisation) et consigné.
- Fichiers clés : `src/lib/week/week.ts`, `src/components/blocks/WeekPlanner/WeekPlanner.tsx`, `content/semaines-types.json`, `content/interface.json`, `src/content/schemas.ts`, `src/content/loader.ts`, `tests/e2e/week.spec.ts`.
- Contrôles : lint ✔ · typecheck ✔ · format:check ✔ · test ✔ (76/76) · build ✔ sans avertissement · validate ✔ (3/3, `semaines-types.json` couvert par check-content) · test:e2e ✔ (32/32, 4 ignorés par projet).
- Questions ouvertes : aucune nouvelle.
- Suite : P1.9 Blocs de contenu.

## 2026-09-20 — Découpage de P1.9
- Fait : P1.9 (huit composants) découpée en P1.9a (StepsTimeline, FollowUpTimeline, FAQ, Breadcrumb) et P1.9b (PriceCard, AidCard, SituationCard, StageCards), critères repris de `docs/02 §7` et `docs/07 §1`.
- Décisions : aucune (application de `.claude/loop.md` §2).
- Fichiers clés : `docs/PLAN.md`.
- Contrôles : sans objet (aucun code modifié).
- Questions ouvertes : aucune nouvelle.
- Suite : P1.9a.

## 2026-09-20 — P1.9a Blocs de contenu : parcours et navigation
- Fait : `StepsTimeline` (`ol`, numéros en Fraunces, fil vertical teal-700, nœud framboise sur la dernière étape), `FollowUpTimeline` (jalons de `engagements.json > suivi`, `visibleMilestones` masque les jalons sans texte et, en production via `VERCEL_ENV`, les jalons non validés ; rien n'est rendu s'il ne reste aucun jalon ; fil vertical puis horizontal), `FAQ` (`details`/`summary` natifs, sans JavaScript, réponse en `.prose`), `Breadcrumb` (`nav` nommé, `ol`, accueil en tête, page courante `aria-current="page"` sans lien) ; `src/lib/env.ts` (`isProduction`) ; textes `fil_ariane` ; 5 tests unitaires, 2 parcours Playwright (FAQ au clavier, jalons visibles, page courante) ; section « Parcours et navigation » du guide de styles (étapes de `docs/01 §4 bloc 6`, jalons réels du dépliant).
- Décisions : aucune nouvelle. Balisages `BreadcrumbList` et FAQ décidés en P5.2.
- Fichiers clés : `src/components/blocks/StepsTimeline/StepsTimeline.tsx`, `src/components/blocks/FollowUpTimeline/FollowUpTimeline.tsx`, `src/components/blocks/FAQ/FAQ.tsx`, `src/components/blocks/Breadcrumb/Breadcrumb.tsx`, `src/lib/env.ts`, `tests/e2e/blocks.spec.ts`.
- Contrôles : lint ✔ · typecheck ✔ · format:check ✔ · test ✔ (82/82) · build ✔ sans avertissement · validate ✔ (3/3) · test:e2e ✔ (36/36, 4 ignorés par projet).
- Questions ouvertes : aucune nouvelle.
- Suite : P1.9b (PriceCard, AidCard, SituationCard, StageCards).

## 2026-09-20 — P1.9b Blocs de contenu : prix, aides, situations
- Fait : `src/lib/pricing/pricing.ts` (`formatEuro` rond ou au centime, `formatRate`, `afterTaxCredit`, `monthlyExample` sur 52/12 semaines) ; `PriceCard` (article nommé, TTC en Fraunces `text-h2`, « Prix avant avantage fiscal · HT », montant après crédit d'impôt en petit, exemple mensuel si unité horaire, pastille de mode, emplacement `notice` pour la mention mandataire de P2.5, « Devis personnalisé gratuit » ; `isDisplayablePrice` → rien sans TTC et HT) ; `AidCard` (`dl` pour qui / combien / comment, lien officiel `rel="noopener noreferrer"` avec icône et mention « site officiel, lien externe » pour le lecteur d'écran, aucun chiffre porté par le composant) ; `SituationCard` (citation en Fraunces entre guillemets, un seul lien étiré sur toute la carte, pastille au fil) ; `StageCards` (`ol` de trois cartes reliées par le fil, empilement linéaire sur mobile) ; textes `tarifs`, `aides`, `situations` ; 7 tests unitaires, 1 parcours Playwright ; section du guide de styles où la carte de prix reste masquée (tarifs vides, aucun chiffre inventé).
- Décisions : aucune nouvelle. Les tests unitaires de `PriceCard` utilisent des chiffres de test explicitement marqués comme tels.
- Fichiers clés : `src/lib/pricing/pricing.ts`, `src/components/blocks/PriceCard/PriceCard.tsx`, `src/components/blocks/AidCard/AidCard.tsx`, `src/components/blocks/SituationCard/SituationCard.tsx`, `src/components/blocks/StageCards/StageCards.tsx`, `content/interface.json`, `tests/e2e/blocks.spec.ts`.
- Contrôles : lint ✔ · typecheck ✔ · format:check ✔ · test ✔ (91/91) · build ✔ sans avertissement · validate ✔ (3/3) · test:e2e ✔ (38/38, 4 ignorés par projet).
- Questions ouvertes : Q-TARIFS-1 (la carte de prix ne s'affichera qu'avec des tarifs réels).
- Suite : P1.10 Guide de styles, dernière tâche de la phase 1.

## 2026-09-20 — P1.10 Guide de styles
- Fait : sommaire (`nav` nommé, douze ancres vérifiées par Playwright), parcours `tests/e2e/styleguide.spec.ts` : fenêtre de 320 px, aucun élément au-delà de 320 px (le test nomme les fautifs), pas de défilement horizontal, axe sans violation sérieuse, capture pleine page `test-results/styleguide-320.png` (ignorée par git).
- Décisions : aucune nouvelle. Anomalie trouvée par le contrôle à 320 px et corrigée : le bouton « Être rappelé(e) » de l'en-tête restait visible sous 640 px (sa classe `inline-flex` l'emportait sur `hidden`) et poussait le bouton « Menu » hors écran ; il est désormais dans un conteneur `hidden sm:block`.
- Fichiers clés : `src/app/styleguide/page.tsx`, `tests/e2e/styleguide.spec.ts`, `src/components/layout/Header/Header.tsx`.
- Contrôles : lint ✔ · typecheck ✔ · format:check ✔ · test ✔ (91/91) · build ✔ sans avertissement · validate ✔ (3/3) · test:e2e ✔ (42/42, 4 ignorés par projet).
- Questions ouvertes : aucune nouvelle.
- Suite : toutes les tâches de la phase 1 sont cochées → point de validation 1.

## 2026-09-20 — Point de validation 1 (phase 1 — Design system « Le Fil »)
- Critères : 0 violation axe sérieuse sur `/styleguide/` ✔ (parcours `smoke`, `styleguide` à 320 px, `header`, `footer-bar`, `comfort`) · parcours clavier complet de l'en-tête ✔ (`tests/e2e/header.spec.ts` : lien d'évitement, menus déroulants Entrée/Tab/Échap, fermeture au focus sortant, menu mobile) · `check-contrast` vert ✔ (34 couples du cahier). Chaîne rejouée dans l'ordre de la CI : typegen ✔ · lint ✔ · typecheck ✔ · format:check ✔ · test ✔ (91/91) · build ✔ · validate ✔ (3/3) · Playwright + axe ✔ (42/42) · `pnpm audit` ✔ (aucune vulnérabilité connue). CI GitHub toujours non exécutable (Q-TECH-3, D-014).
- Fusion : `phase/01-design-system` (26 commits) fusionnée en squash sur `main`, tag `phase-01` ; branche conservée pour la PR a posteriori (DC.1).
- Contenu de la phase : jetons et contrôle des contrastes, Heading/Lead/Prose et impression, Button/Card/Badge/Callout, cinq champs de formulaire accessibles, le fil (Thread + six illustrations), en-tête et menus, pied de page et barre mobile, mode confort, WeekPlanner en lecture avec six semaines types sourcées, StepsTimeline/FollowUpTimeline/FAQ/Breadcrumb, PriceCard/AidCard/SituationCard/StageCards, guide de styles complet.
- Questions ouvertes : Q-TECH-3 (publication), Q-CONTENU-6 (logo), Q-ID-4 (labels), Q-TARIFS-1 (cartes de prix).
- Suite : phase 2 — Accueil et pages de fonctionnement, branche `phase/02-accueil`, tâche P2.1.
