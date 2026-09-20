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

## 2026-09-20 — P2.1 Accueil, blocs 1 à 4
- Fait : branche `phase/02-accueil` créée depuis `main` ; `content/pages/accueil.json` (textes exacts de `docs/01 §4` blocs 1 à 4, schéma strict `homePageSchema`, chargeur `getHomePage`, contrôle check-content) ; `Section` (fonds alternés, conteneur, `padding-block` du cahier) ; `Hero` (sur-titre, H1, chapô, bouton principal « Être rappelé(e) », bouton contour « Je décris ma situation », lien « Ou appelez le {téléphone} » masqué si inconnu, réassurance en liste, note de l'astérisque vers la page crédit d'impôt, illustration maison) ; six `SituationCard` ; `Commitments` (phrases du bloc 3 reliées aux codes E1–E4 ; `visibleCommitments` masque en production ce qui n'est pas validé) ; `StageCards` (texte facultatif) + bouton secondaire vers le pilier neuro ; `src/app/page.tsx` composé (paper → white → teal → paper) ; 7 tests unitaires, 2 parcours Playwright (contenu, axe, alternance des fonds), test de fumée mis à jour.
- Décisions : D-015 (source des textes, note de l'astérisque).
- Fichiers clés : `content/pages/accueil.json`, `src/app/page.tsx`, `src/components/blocks/Hero/Hero.tsx`, `src/components/blocks/Commitments/Commitments.tsx`, `src/components/layout/Section/Section.tsx`, `src/content/schemas.ts`, `tests/e2e/home.spec.ts`.
- Contrôles : lint ✔ · typecheck ✔ · format:check ✔ · test ✔ (98/98) · build ✔ sans avertissement · validate ✔ (3/3) · test:e2e ✔ (46/46, 4 ignorés par projet).
- Questions ouvertes : E1–E4 (à valider avant production : sinon le bloc 3 se vide), Q-ID-1 (téléphone à confirmer).
- Suite : P2.2 Accueil, blocs 5 à 8.

## 2026-09-20 — P2.2 Accueil, blocs 5 à 8
- Fait : `Tabs` (client ; `tablist` nommée, activation automatique, flèches, Début/Fin, `tabpanel` focusable relié par `aria-labelledby`) ; bloc 5 : trois semaines types en onglets (`WeekPlanner`) + « Je compose ma semaine » ; bloc 6 : `StepsTimeline` avec la phrase « Si le courant ne passe pas, nous changeons. » reliée à E2 (masquée en production si E2 n'est pas validé) ; bloc 7 : carte « Nos tarifs » (`PriceCard` de la première prestation tarifée + « Je consulte les tarifs ») masquée tant que `tarifs.json` est vide, carte « Les aides possibles » (six aides du cahier) + « Je découvre les aides » ; bloc 8 : proches + « J'ai besoin de relais » + fil tasse ; `accueil.json` étendu (schéma strict) ; exemple « Bernard, 74 ans, retour d'hospitalisation » ajouté à `semaines-types.json` avec sa source (docs/03 §8 : présence dès le premier jour, courses, repas, aide aux gestes, vigilance ; jours et nuits choisis pour l'illustration) ; 2 tests `Tabs`, test d'accueil étendu, parcours Playwright (onglets au clavier, étapes, prix masqué, aides, proches, axe).
- Décisions : interprétation de « bloc prix masqué si tarifs vides » : seule la carte de prix est masquée, le titre, le texte et la carte des aides restent (ils ne portent aucun prix) ; à revoir si Arcel préfère masquer tout le bloc.
- Fichiers clés : `src/components/ui/Tabs/Tabs.tsx`, `src/app/page.tsx`, `content/pages/accueil.json`, `content/semaines-types.json`, `src/content/schemas.ts`, `tests/e2e/home.spec.ts`.
- Contrôles : lint ✔ · typecheck ✔ · format:check ✔ · test ✔ (101/101) · build ✔ sans avertissement · validate ✔ (3/3) · test:e2e ✔ (48/48, 4 ignorés par projet).
- Questions ouvertes : Q-TARIFS-1 (carte de prix), E2 (phrase de l'étape 3).
- Suite : P2.3 Accueil, blocs 9 à 12 et recherche de commune.

## 2026-09-20 — P2.3 Accueil, blocs 9 à 12 et recherche de commune
- Fait : `scripts/data/geocode-agencies.ts` (Base adresse nationale, six agences trouvées avec des scores de 0,735 à 0,98, `data/agences.geo.json` avec source et date) ; `scripts/data/fetch-communes.ts` (API Découpage administratif : 1 265 communes des huit départements + 20 arrondissements de Paris, agence la plus proche à vol d'oiseau, `data/idf-communes.json` 379 ko de référence et `data/idf-communes.compact.json` 66 ko pour le navigateur) ; `src/lib/geo/geo.ts` (haversine, `nearest`, `normalizeName`, `searchCommunes` par nom sans accents ou code postal) ; `TerritorySearch` (combobox ARIA : listbox, flèches, Entrée, Échap, `aria-activedescendant`, deux zones `aria-live`, liste chargée à la première saisie, aucune donnée envoyée) ; bloc 9 (nombre d'agences calculé depuis `site.config.json` : « 6 agences, huit départements »), bloc 11 (trois boutons), bloc 12 (recrutement) ; bloc 10 masqué tant qu'aucun article n'existe (P7) ; note de l'astérisque remplacée par la mention légale de `docs/01 §4` ; scripts `data:agences` et `data:communes` ; 4 tests geo, 3 tests TerritorySearch, test d'accueil étendu, parcours Playwright (Vitry → agence Val-de-Marne, Marseille → hors Île-de-France, axe).
- Décisions : D-016 (données de territoire, combobox, complément à D-015). Anomalie corrigée : le minuteur de fermeture de la liste survivait à un retour du focus.
- Fichiers clés : `scripts/data/fetch-communes.ts`, `scripts/data/geocode-agencies.ts`, `data/idf-communes.json`, `data/idf-communes.compact.json`, `data/agences.geo.json`, `src/lib/geo/geo.ts`, `src/components/blocks/TerritorySearch/TerritorySearch.tsx`, `src/app/page.tsx`, `content/pages/accueil.json`, `content/interface.json`.
- Contrôles : lint ✔ · typecheck ✔ · format:check ✔ · test ✔ (109/109) · build ✔ sans avertissement · validate ✔ (3/3) · test:e2e ✔ (50/50, 4 ignorés par projet).
- Questions ouvertes : Q-ID-1 (adresses géocodées à confirmer) ; à poser en phase 6 : secteur réel de chaque agence (la distance à vol d'oiseau n'est qu'une approximation).
- Suite : P2.4 « Comment ça marche ».

## 2026-09-20 — P2.4 « Comment ça marche »
- Fait : `content/pages/comment-ca-marche.json` (SEO 54/151 caractères, H1, chapô, suivi, trois recours, cinq questions fréquentes avec liens vers P2.5 et le territoire, appel) et schéma `howItWorksSchema` (`seoFieldsSchema` : titre 50–60, description 140–155, réutilisable) ; `src/app/comment-ca-marche/page.tsx` (`generateMetadata` avec `pageTitle` et canonique, fil d'Ariane, `StepsTimeline` sur les étapes de `accueil.json` — source unique —, `FollowUpTimeline`, cartes « Et si ça ne va pas ? » avec téléphone cliquable, `FAQ` dont l'item « nuit et week-end » n'apparaît que si `disponibilite` l'affirme, boutons d'appel) ; `src/lib/seo/title.ts` ; 3 tests de page (longueurs SEO, structure, masquage en production), 2 tests `pageTitle`, 1 parcours Playwright (200, un seul H1, repères, axe).
- Décisions : aucune nouvelle. Aucun fait ajouté : évaluation et devis gratuits, modification ou arrêt à tout moment, 7j/7 et 24h/24 viennent du dépliant (`site.config.json`, `engagements.json`) ; la définition prestataire/mandataire vient de `docs/07 §1`.
- Fichiers clés : `content/pages/comment-ca-marche.json`, `src/app/comment-ca-marche/page.tsx`, `src/lib/seo/title.ts`, `src/content/schemas.ts`, `tests/e2e/comment-ca-marche.spec.ts`.
- Contrôles : lint ✔ · typecheck ✔ · format:check ✔ · test ✔ (114/114) · build ✔ sans avertissement · validate ✔ (3/3) · test:e2e ✔ (52/52, 4 ignorés par projet).
- Questions ouvertes : E2, E3 (phrases de recours), Q-ID-3 (astreinte : la FAQ « nuit et week-end » repose sur la disponibilité du dépliant).
- Suite : P2.5 « Prestataire ou mandataire ».

## 2026-09-20 — P2.5 « Prestataire ou mandataire »
- Fait : `content/pages/prestataire-ou-mandataire.json` (SEO 57/153, H1 et première phrase de `docs/01 §5`, tableau de sept critères en termes généraux — employeur, recrutement, remplacement, paie, prix sans chiffre, arrêt, pour qui —, note crédit d'impôt, « la question qui tranche » en deux cartes, appel) ; `MandataireNotice` (`Callout` « Attention » repérable par `data-notice="mandataire"`, texte dans `interface.json > mandataire_notice`) ; page avec fil d'Ariane (« Comment ça marche › Prestataire ou mandataire »), tableau réel avec `caption`, zone défilante focusable et nommée sur petit écran, mention affichée si le mode mandataire est dans `site.config.json`, lien vers les tarifs ; 1 test de composant, 2 tests de page, 1 parcours Playwright.
- Décisions : aucune nouvelle. Anomalie trouvée par axe (mobile) et corrigée : zone défilante sans accès clavier. Note ajoutée sous Q-LEGAL-3 : formulation provisoire de la mention mandataire.
- Fichiers clés : `content/pages/prestataire-ou-mandataire.json`, `src/app/comment-ca-marche/prestataire-ou-mandataire/page.tsx`, `src/components/blocks/MandataireNotice/MandataireNotice.tsx`, `content/interface.json`, `src/content/schemas.ts`, `tests/e2e/modes.spec.ts`.
- Contrôles : lint ✔ · typecheck ✔ · format:check ✔ · test ✔ (117/117) · build ✔ sans avertissement · validate ✔ (3/3) · test:e2e ✔ (54/54, 4 ignorés par projet).
- Questions ouvertes : Q-LEGAL-3 (texte exact de la mention), Q-LEGAL-1 (autorisations par mode).
- Suite : P2.6 « Tarifs et aides ».

## 2026-09-20 — P2.6 « Tarifs et aides »
- Fait : `content/pages/tarifs-et-aides.json` (SEO 59/153, H1 et première phrase de `docs/01 §5`, textes des sections, trois volumes d'exemple 5/10/20 h) ; `content/aides.json` (six aides : public, démarche, page détaillée, source officielle ; aucun montant) ; `src/lib/pricing` étendu (`hourlyPriceFor` par paliers, `withSurcharge`, `monthlyEstimates`) + 3 tests ; `AidCard` (montant facultatif, lien vers la page détaillée) ; page `/tarifs-et-aides/` : tableau réel prestations + forfaits dans une zone défilante focusable, date d'application, majorations, dégressivité, mention mandataire si un prix mandataire existe, exemples mensuels par prestation horaire, frais annexes, encart devis gratuit, six cartes d'aides, appel « J'estime mon budget » ; sans tarif : aucun « € » rendu ; 2 tests de page, 1 parcours Playwright.
- Décisions : D-017. Aléa observé une fois sur le parcours FAQ au clavier (`blocks.spec.ts`, bascule par Espace), vert au second passage ; à surveiller, la CI a une reprise.
- Fichiers clés : `src/app/tarifs-et-aides/page.tsx`, `content/pages/tarifs-et-aides.json`, `content/aides.json`, `src/lib/pricing/pricing.ts`, `src/components/blocks/AidCard/AidCard.tsx`, `src/content/schemas.ts`, `tests/e2e/tarifs.spec.ts`.
- Contrôles : lint ✔ · typecheck ✔ · format:check ✔ · test ✔ (122/122) · build ✔ sans avertissement · validate ✔ (3/3) · test:e2e ✔ (56/56, 4 ignorés par projet).
- Questions ouvertes : Q-TARIFS-1 (sans réponse, la page reste sans prix), Q-OFFRE-1 (liste des prestations et modes).
- Suite : P2.7 Pages par aide (1/2) : crédit d'impôt et avance immédiate, APA, PCH.

## 2026-09-20 — P2.7 Pages par aide (1/2)
- Fait : sources officielles lues pendant la tâche (service-public.gouv.fr F12, F10009, F14202 ; l'Urssaf n'a pas répondu, deux tentatives) ; `content/aides/credit-d-impot-et-avance-immediate.json`, `apa.json`, `pch.json` (taux et plafonds du crédit d'impôt, montants APA par GIR et seuils de participation, tarifs horaires PCH par mode et taux de prise en charge, démarches et délais, chacun avec la date « vérifié le » de la source et la date de consultation) ; schéma `aidPageSchema`, registre `src/content/aid-pages.ts`, route `/tarifs-et-aides/[aide]/` (statique, 404 sinon), `SourcesList`, textes `page_aide` (avertissement d'évolution, dates) ; 3 tests de page, 2 tests `SourcesList`, 4 parcours Playwright.
- Décisions : D-018.
- Fichiers clés : `content/aides/*.json`, `src/app/tarifs-et-aides/[aide]/page.tsx`, `src/content/aid-pages.ts`, `src/components/blocks/SourcesList/SourcesList.tsx`, `src/content/schemas.ts`, `tests/e2e/aides.spec.ts`.
- Contrôles : lint ✔ · typecheck ✔ · format:check ✔ · test ✔ (127/127) · build ✔ sans avertissement (3 pages statiques) · validate ✔ (3/3, les trois fichiers d'aide couverts) · test:e2e ✔ (64/64, 4 ignorés par projet).
- Questions ouvertes : aucune nouvelle. À relire par Arcel : les formulations sur l'avance immédiate (sans chiffre).
- Suite : P2.8 Pages par aide (2/2) : AEEH, CESU, aides après hospitalisation.

## 2026-09-20 — P2.8 Pages par aide (2/2)
- Fait : sources lues pendant la tâche (service-public.gouv.fr F14809 AEEH, F13607 Cesu, F1252 aide de l'employeur ; pour-les-personnes-agees.gouv.fr aides des caisses de retraite ; les adresses devinées de l'ARDH et du Cesu ont été remplacées par celles trouvées par recherche ; la page ARDH de l'Assurance retraite ne livre pas son contenu et cesu.urssaf.fr ne répond pas : citées sans date de vérification) ; `content/aides/aeeh.json`, `cesu.json`, `aides-apres-hospitalisation.json` (montants de l'AEEH et de ses six compléments, plafond de l'aide employeur 2 591 €, aide temporaire de 3 mois au plus ; le plafond de l'ARDH cité par un résumé de recherche mais non lu sur une page officielle n'est pas écrit) ; registre `aid-pages` à six entrées, check-content sur les six fichiers, test de cohérence `aides.json` ↔ pages détaillées, parcours Playwright sur les six pages.
- Décisions : aucune nouvelle (D-018 s'applique).
- Fichiers clés : `content/aides/aeeh.json`, `content/aides/cesu.json`, `content/aides/aides-apres-hospitalisation.json`, `src/content/aid-pages.ts`, `scripts/validate/check-content.ts`, `tests/e2e/aides.spec.ts`.
- Contrôles : lint ✔ · typecheck ✔ · format:check ✔ · test ✔ (128/128) · build ✔ sans avertissement (6 pages statiques) · validate ✔ (3/3 ; le schéma a refusé deux descriptions trop longues avant correction) · test:e2e ✔ (70/70, 4 ignorés par projet).
- Questions ouvertes : aucune nouvelle. À relire par Arcel : « Youdom Care accepte les Cesu préfinancés » (repris du label `cesu` du dépliant, `detenu` encore à confirmer, Q-ID-4).
- Suite : P2.9 « À propos », dernière tâche de la phase 2.

## 2026-09-20 — P2.9 « À propos »

- Fait : trois routes statiques `/a-propos/`, `/a-propos/nos-engagements/`, `/a-propos/charte-editoriale/`. Le manifeste de docs/01 §10 est repris mot pour mot (cinq paragraphes + signature de `site.config.json`). Les engagements viennent de `engagements.json` : sur la page « Nos engagements », un engagement sans texte est masqué, un engagement non validé l'est en production (test unitaire avec `VERCEL_ENV=production`). Histoire et équipe sont `null` dans `content/pages/a-propos.json` et les blocs n'existent pas dans le DOM (test e2e). Labels affichés seulement si `detenu === true` (aucun aujourd'hui). Charte éditoriale : huit principes tirés de docs/03 §1 et docs/06 §4 (informer jamais soigner, sources datées, relecture nommée, auteurs et relecteurs nommés et outils d'aide à la rédaction sous leur responsabilité, révision 12 mois / 6 mois aides, rien d'inventé, personne avant la maladie, ce que nous ne faisons pas).
- Décisions : aucune nouvelle.
- Fichiers clés : `content/pages/a-propos.json`, `src/content/schemas.ts` (`aboutSchema`), `src/content/loader.ts` (`getAbout`), `src/app/a-propos/**`, `src/app/a-propos/page.test.tsx`, `tests/e2e/a-propos.spec.ts`, `scripts/validate/check-content.ts` + fixture.
- Contrôles : format:check ✔ · lint ✔ · typecheck ✔ · test ✔ (132/132) · build ✔ · validate ✔ (3/3 ; trois descriptions SEO raccourcies avant passage) · test:e2e ✔ (78/78, 4 ignorés par projet).
- Questions ouvertes : Q-CONTENU-1 reste ouverte (histoire, équipe) ; les blocs apparaîtront dès que le JSON sera renseigné.
- Suite : point de validation 2 (`check-copy.ts`, `pnpm lhci`, fusion locale de `phase/02-accueil` dans `main`, étiquette `phase-02`).

## 2026-09-20 — Point de validation 2 et bilan de la phase 2

- Fait : `check-copy.ts` ajouté au registre de `pnpm validate` (mots interdits de docs/07 §3 et docs/01 §2, phrases de plus de 30 mots dans les chapôs, libellés de bouton bannis ; citations « … » et formulation légale du mandataire exclues) : tout le contenu passe après reformulation de deux principes de la charte éditoriale. `pnpm lhci` installé (`@lhci/cli` 0.15.1, `scripts/lhci.ts`, `lighthouserc.cjs`) et lancé sur l'accueil, trois passes mobiles 4G : performance 0,97–0,98, accessibilité 1, SEO 1, LCP 1,82–1,95 s, CLS 0, TBT 50–138 ms, JavaScript 150 Ko, polices 156 Ko (2 fichiers), poids total 389 Ko. Un budget reste rouge : bonnes pratiques 0,96, parce que l'accueil précharge `/etre-rappele/` et `/demande/` qui n'existent pas avant la phase 3 (404 comptés comme erreurs de console) ; à revérifier au point de validation 3. Marge LCP faible (50–180 ms) : à surveiller, le poste de coût est la police Fraunces (121 Ko, axes `opsz` + `SOFT` exigés par docs/02 §3). `pnpm audit` : cinq vulnérabilités, toutes dans l'outillage (`@lhci/cli`), dette DC.2. Liens d'agence du pied de page : nom accessible contenant le texte visible (audit `label-content-name-mismatch`).
- Décisions : D-019 (Lighthouse CI : reconstruction indexable, Chromium de Playwright, étranglement devtools ; budget JavaScript rebasé à 160 Ko contenu / 220 Ko formulaire ; docs/07 §5 mis à jour). Question Q-TECH-4 posée.
- Fichiers clés : `scripts/validate/check-copy.ts`, `scripts/lhci.ts`, `lighthouserc.cjs`, `docs/DECISIONS.md`, `docs/07_CONFORMITE_ET_QUALITE.md`, `docs/QUESTIONS_ARCEL.md`, `src/components/layout/Footer/Footer.tsx`.
- Contrôles : format:check ✔ · lint ✔ · typecheck ✔ · test ✔ (138/138) · build ✔ · validate ✔ (4/4) · test:e2e ✔ (78/78, 4 ignorés par projet) · lhci : 10 budgets sur 11 (voir ci-dessus).
- Bilan de la phase 2 (`phase/02-accueil`, P2.1 à P2.9) : accueil en douze blocs, « Comment ça marche », « Prestataire ou mandataire », « Tarifs et aides » sans aucun prix tant que `tarifs.json` est vide, six pages d'aide sourcées et datées, « À propos » avec manifeste, engagements et charte éditoriale ; blocs équipe, histoire, labels, magazine et tarifs masqués faute de contenu validé. Ouvert pour Arcel : Q-TECH-3 (dépôt distant), Q-TECH-4 (budget JavaScript), Q-TARIFS-1, Q-ID-1 à 4, Q-LEGAL-1 et 3, engagements E1–E5, Q-CONTENU-1 et 6.
- Suite : fusion locale de `phase/02-accueil` dans `main` (D-014), étiquette `phase-02`, puis phase 3 (`phase/03-formulaires`, P3.1 schéma de demande).

## 2026-09-20 — P3.1 Schéma de demande

- Fait : phase 2 fusionnée dans `main` (`15bf42b`, étiquette `phase-02`), branche `phase/03-formulaires` créée depuis `main`. `src/lib/lead/schema.ts` : `leadPayloadSchema` (docs/05 §7) en objets stricts Zod, partagé client/serveur : commune limitée aux huit départements d'Île-de-France avec INSEE et code postal cohérents, téléphone français validé par `libphonenumber-js/min` (`normalizeFrenchPhone` → E.164, 20 Ko compressés de métadonnées, réservé aux pages de formulaire), `sourcePage` sans paramètres ni domaine, réponses de situation à clés simples et valeurs bornées (500 caractères, 20 éléments), champ libre ≤ 600 caractères (docs/05 §3), planning en créneaux uniques ou plages par pas de 30 minutes qui peuvent passer minuit, dates obligatoires en ponctuel, consentement `sante` obligatoire pour les sept formulaires de santé et dès qu'une `situation` est renseignée. `src/lib/lead/forms.ts` : les onze formulaires et leurs adresses (docs/05 §2), urgences, rythmes, nuits, départements.
- Décisions : aucune nouvelle (docs/05 §6 impose libphonenumber-js ; la variante `min` suffit pour la France).
- Fichiers clés : `src/lib/lead/forms.ts`, `src/lib/lead/schema.ts`, `src/lib/lead/schema.test.ts`, `package.json` (libphonenumber-js 1.13.13).
- Contrôles : format:check ✔ · lint ✔ · typecheck ✔ · test ✔ (149/149) · build ✔ · validate ✔ (4/4). Pas de page touchée : e2e non relancés.
- Questions ouvertes : aucune nouvelle.
- Suite : P3.2 grille de planning (saisie), à partir de `WeekPlanner` et de `src/lib/week/week.ts`.

## 2026-09-20 — P3.2 Grille de planning (saisie)

- Fait : `src/lib/week/grid.ts` (grille `Partial<Record<jour, créneau[]>>` = `planning.grille` de LeadPayload ; normalisation, bascule, sept raccourcis qui s'ajoutent aux créneaux cochés sauf « Tout effacer », estimation heures + nuits d'après les durées de docs/05 §4). Composant client `WeekPlannerInput` : question du rythme (`RadioCards`, quatre libellés de docs/05 §4), puis pour « Régulier » la grille 7 × 6 : tableau réel à partir de 48 rem (case à cocher par cellule nommée « Mardi, après-midi, 14h à 18h », flèches en plus de la tabulation, en-têtes de ligne et de colonne), accordéon `details` par jour en dessous avec pastilles de 48 px et compte de créneaux, raccourcis (les cinq de docs/01 §7 + « Tous les matins » et « Tout effacer »), résumé `aria-live="polite"` : « Environ 13 heures par semaine, dont une nuit. Ce n'est qu'une base : nous l'ajusterons ensemble. » Mode contrôlé ou non. Textes dans `content/interface.json` › `planning` (schéma étendu). Démonstration dans `/styleguide/#planning`. Les rythmes ponctuel, 24h/24 et « je ne sais pas » n'affichent rien de plus pour l'instant : P3.3.
- Décisions : aucune nouvelle.
- Fichiers clés : `src/lib/week/grid.ts`, `src/components/forms/WeekPlannerInput/WeekPlannerInput.tsx`, `content/interface.json`, `src/content/schemas.ts`, `src/app/styleguide/page.tsx`, `tests/e2e/planning.spec.ts`.
- Contrôles : format:check ✔ · lint ✔ · typecheck ✔ · test ✔ (159/159) · build ✔ · validate ✔ (4/4) · test:e2e ✔ (82/82, 6 ignorés par projet : clavier sur ordinateur seulement, accordéon sur mobile seulement). `next start` logue « NoFallbackError » lors du préchargement des routes `/etre-rappele/` et `/demande/` encore absentes : disparaîtra avec P3.5 et suivantes.
- Environnement : à la demande d'Arcel, un serveur de développement tourne sur http://localhost:3111/ (journal `.next-dev-3111.log`, ignoré par git) pour visualiser le site ; aucun déploiement possible sans dépôt distant (Q-TECH-3).
- Questions ouvertes : aucune nouvelle.
- Suite : P3.3 planning avancé (horaires précis, dates ponctuelles, 24h/24, question sur la nuit, estimation de budget si tarifs).

## 2026-09-20 — P3.3a Planning avancé (1/2)

- Fait : P3.3 découpée en deux (trop large pour une itération). `src/lib/week/grid.ts` : plages `{debut, fin}` par pas de 30 minutes (48 demi-heures), durée et nuit d'une plage (passe minuit ou commence à 21 h), plages déduites des créneaux cochés avec fusion des contigus. `src/lib/lead/planning.ts` : état de l'étape (`rythme`, `grille`, `precis`, `plages`, `nuit`, `urgence`), alignement des plages sur les jours cochés, estimation (grille ou plages), `toLeadPlanning` vers `LeadPayload.planning` (testé contre `planningSchema`). `src/lib/pricing/pricing.ts` : `budgetBasis` (première prestation à l'heure au prix TTC connu, null tant que `tarifs.json` est vide) et `monthlyBudget`. Composant : interrupteur « Je préfère indiquer des horaires précis » (`PreciseHours` : deux listes déroulantes natives par plage, groupe nommé « Lundi, plage 1 », ajouter, retirer, « Copier ce jour sur… »), question sur la nuit (calme / active / je ne sais pas, libellés de docs/05 §4) dès qu'une nuit est demandée, date de début (les quatre choix de docs/05 §4 = `urgence`), estimation heures + nuits + budget mensuel TTC avant et après crédit d'impôt avec la mention « Estimation indicative, devis gratuit après évaluation » (masquée sans tarif). Axe a signalé les cases de la grille (22,5 px, voisines trop proches) : passées à 1,5 rem. Deux faux positifs « cible partiellement obscurcie » venaient de l'en-tête collant après défilement à l'ancre : l'analyse axe se fait désormais en haut de page (`tests/e2e/axe.ts`) et `html` reçoit `scroll-padding-top: 5rem` pour que les ancres et le focus ne passent jamais sous l'en-tête.
- Décisions : aucune nouvelle (le budget s'appuie sur la première prestation horaire connue ; à affiner quand Arcel aura rempli `tarifs.json`, Q-TARIFS-1).
- Fichiers clés : `src/lib/week/grid.ts`, `src/lib/lead/planning.ts`, `src/lib/pricing/pricing.ts`, `src/components/forms/WeekPlannerInput/WeekPlannerInput.tsx`, `src/components/forms/WeekPlannerInput/PreciseHours.tsx`, `content/interface.json`, `tests/e2e/axe.ts`, `src/styles/globals.css`.
- Contrôles : format:check ✔ · lint ✔ · typecheck ✔ · test ✔ (169/169) · build ✔ · validate ✔ (4/4) · test:e2e ✔ (82/82, 6 ignorés par projet).
- Questions ouvertes : aucune nouvelle.
- Suite : P3.3b (dates ponctuelles, présence 24h/24).

## 2026-09-20 — P3.3b Planning avancé (2/2)

- Fait : rythme ponctuel → `DatesInput` (champ de date natif + « Ajouter cette date », ou période « du … au … » développée en dates, 60 au plus, pastilles datées avec bouton « Retirer », compteur annoncé) et six pastilles de créneaux communs ; résumé « Environ 12 heures au total sur 3 date(s) ». Rythme 24h/24 → « Tous les jours ? » (7 jours sur 7 ou jours choisis avec sept pastilles), grille remplie d'office (`continuousGrid`) et modifiable, raccourcis et horaires précis toujours disponibles, date de début (champ de date) et durée envisagée (quelques jours · quelques semaines · durablement). « Je ne sais pas encore » ne montre que la date de début souhaitée. `planningSchema` étendu (`creneaux`, `duree`), `toLeadPlanning` couvre les quatre rythmes. Le `CheckboxGroup` de la bibliothèque lit ses valeurs dans le `<form>` parent : hors formulaire il renvoyait une liste vide, d'où des pastilles contrôlées dans ce composant.
- Décisions : D-020 (créneaux communs aux dates ponctuelles et durée du 24h/24 ajoutés au format de docs/05 §7).
- Fichiers clés : `src/lib/lead/planning.ts`, `src/lib/lead/schema.ts`, `src/lib/lead/forms.ts`, `src/components/forms/WeekPlannerInput/DatesInput.tsx`, `src/components/forms/WeekPlannerInput/WeekPlannerInput.tsx`, `content/interface.json`, `docs/DECISIONS.md`.
- Contrôles : format:check ✔ · lint ✔ · typecheck ✔ · test ✔ (173/173) · build ✔ · validate ✔ (4/4) · test:e2e ✔ (84/84, 6 ignorés par projet).
- Questions ouvertes : aucune nouvelle.
- Suite : P3.4 coque multi-étapes (progression, retour, conservation locale, résumé d'erreurs, page `/merci/…`).

## 2026-09-20 — P3.4 Coque multi-étapes

- Fait : `MultiStepForm` (client, générique sur l'état du formulaire) : étapes déclarées `{id, title, hint, render, validate}` ; « Étape 2 sur 5 » avec `role="progressbar"` ; « Retour » toujours présent (désactivé à la première étape) ; une question par écran, focus sur le titre de l'étape après chaque passage ; validation à « Continuer » avec résumé d'erreurs `role="alert"` en tête (liens vers les champs par identifiant stable) et focus sur le premier champ en erreur, les messages sous les champs venant des composants de champ ; réponses conservées dans `sessionStorage` (`yc-demande-{formulaire}`) à chaque changement, reprises au retour, effacées après l'envoi ; panne d'envoi → encart `attention` avec le texte de docs/01 et le téléphone en lien, saisie intacte ; champ piège invisible et horodatage transmis à `onSubmit` pour la route api/lead (P3.9) ; rendu seulement après hydratation (`useSyncExternalStore`) pour lire le stockage sans décalage serveur/client. Page `/merci/[formulaire]/` : onze routes statiques, noindex, H1 et phrase de succès de docs/01 §7 sans délai tant que `contact.delai_rappel` est null ou E5 non validé en production, téléphone, « Ce qui va se passer » (quatre étapes de l'accueil, sans les phrases liées à un engagement), deux lectures, variantes candidature / contact / professionnel (`content/pages/merci.json`). Aucun détail de la demande sur la page.
- Décisions : aucune nouvelle.
- Fichiers clés : `src/components/forms/MultiStepForm/MultiStepForm.tsx`, `src/app/merci/[formulaire]/page.tsx`, `content/pages/merci.json`, `content/interface.json`, `src/content/schemas.ts`, `tests/e2e/merci.spec.ts`.
- Contrôles : format:check ✔ · lint ✔ · typecheck ✔ · test ✔ (181/181) · build ✔ (11 pages merci statiques) · validate ✔ (4/4) · test:e2e ✔ (88/88, 6 ignorés par projet).
- Questions ouvertes : aucune nouvelle (le délai de rappel attend `contact.delai_rappel`, Q-ID-2, et la validation de E5).
- Suite : P3.5 formulaire de rappel et branchement de l'en-tête et de la barre mobile.

## 2026-09-20 — P3.5 Formulaire de rappel

- Fait : page `/etre-rappele/` (`content/pages/etre-rappele.json`, SEO, fil d'Ariane, formulaire, « Vous préférez appeler ? » avec le téléphone) ; `?commune=92062` (code INSEE, jamais de donnée de santé dans l'adresse) présélectionne la commune. `RappelForm` (client) sur la coque `MultiStepForm`, une étape : prénom, nom, téléphone, commune ou code postal, créneau de rappel préféré (facultatif) ; messages de docs/01 §7 (« Il manque {champ}… », « Ce numéro semble incomplet… », hors Île-de-France) ; information sur l'usage des coordonnées avec lien vers la politique de confidentialité (page à venir en phase 8) ; consentement santé enregistré à `false`, urgence « 48h ». `CommuneField` : combobox WAI-ARIA sur la liste compacte d'Île-de-France (chargée au premier focus ou pour la présélection), même motif que `TerritorySearch`, saisie brute remontée pour distinguer « rien saisi » de « commune hors zone ». `src/lib/lead/client.ts` : `buildLead` (assemble et valide le LeadPayload : identifiant, horodatage, commune, agence la plus proche, consentement versionné `2026-09`), `currentSourcePage` (chemin sans paramètre), `sendLead` (POST `/api/lead`, erreur si non 2xx). L'en-tête et la barre mobile pointaient déjà vers `/etre-rappele/` : le lien mène désormais à une page réelle (test e2e). La route `/api/lead` n'existe pas encore : l'envoi échoue proprement (réponses conservées, téléphone proposé), ce que vérifie le parcours e2e ; P3.9 la fournit.
- Décisions : aucune nouvelle.
- Fichiers clés : `src/app/etre-rappele/page.tsx`, `src/components/forms/RappelForm/RappelForm.tsx`, `src/components/forms/CommuneField/CommuneField.tsx`, `src/lib/lead/client.ts`, `content/pages/etre-rappele.json`, `content/interface.json`, `tests/e2e/rappel.spec.ts`.
- Contrôles : format:check ✔ · lint ✔ · typecheck ✔ · test ✔ (192/192) · build ✔ · validate ✔ (4/4) · test:e2e ✔ (94/94, 6 ignorés par projet).
- Questions ouvertes : aucune nouvelle.
- Suite : P3.6 formulaires `neuro` et `personne-agee` (docs/05 §5).

## 2026-09-20 — P3.6 Formulaires neuro et personne âgée

- Fait : fabrique `DetailedForm` (client) pour les formulaires détaillés : cinq étapes de docs/05 §3 — « Pour qui ? » (six choix du cahier, obligatoire), « La situation » (questions du cas, toutes facultatives, chaque choix unique reçoit « Je préfère en parler »), « Les besoins » (cases du cas + « À définir ensemble »), « Le planning » (`WeekPlannerInput`, rythme et date de début obligatoires avec erreurs liées aux groupes), « Vos coordonnées » (prénom, nom, téléphone, e-mail facultatif, commune, créneau de rappel, message ≤ 600 caractères avec le rappel « Inutile de détailler l'état de santé », consentement explicite non précoché, lien confidentialité). À l'envoi : situation nettoyée (vides et « Je préfère en parler » retirés), planning converti, demande validée par `leadPayloadSchema`, page `/merci/{cas}/`. Contenu : `content/formulaires/neuro.json` et `personne-agee.json` (questions et choix de docs/05 §5, schéma `formDefinitionSchema`), registre `src/content/form-definitions.ts` (`slug` de docs/05 §2). Pages `/demande/maladie-neurodegenerative/`, `/demande/personne-agee/` et l'aiguillage `/demande/` (`content/pages/demande.json`) qui ne liste que les cas existants et propose le rappel : le lien « Ma demande » de la barre mobile mène désormais à une page réelle.
- Décisions : aucune nouvelle. À revoir en P3.10 : les pages de formulaire lisent `?commune=` côté serveur (`searchParams`), ce qui les rend dynamiques (`ƒ`) et hors du contrôle `check-placeholders` ; une lecture côté client garderait le rendu statique.
- Fichiers clés : `src/components/forms/DetailedForm/DetailedForm.tsx`, `content/formulaires/neuro.json`, `content/formulaires/personne-agee.json`, `src/content/form-definitions.ts`, `src/app/demande/[cas]/page.tsx`, `src/app/demande/page.tsx`, `content/pages/demande.json`, `content/interface.json`, `tests/e2e/demande.spec.ts`.
- Contrôles : format:check ✔ · lint ✔ · typecheck ✔ · test ✔ (197/197) · build ✔ · validate ✔ (4/4) · test:e2e ✔ (98/98, 6 ignorés par projet).
- Questions ouvertes : aucune nouvelle.
- Suite : P3.7 formulaires `adulte-handicap` et `enfant-handicap`.

## 2026-09-20 — P3.7 Formulaires adulte et enfant en situation de handicap

- Fait : `content/formulaires/adulte-handicap.json` (nature du handicap, aides techniques, heures de PCH aide humaine par tranches — le cahier prévoyait un nombre facultatif, une tranche est plus simple au téléphone et évite une saisie libre —, mode prestataire · mandataire · à comparer ; huit besoins du cahier) et `enfant-handicap.json` (âge, situation, scolarité, mode de communication, AEEH ou PCH ; neuf besoins du cahier). Pages `/demande/adulte-handicap/` et `/demande/enfant-handicap/` par le registre ; l'aiguillage `/demande/` les liste. « Je préfère en parler » ajouté d'office aux choix uniques, « À définir ensemble » aux besoins.
- Décisions : aucune nouvelle.
- Fichiers clés : `content/formulaires/adulte-handicap.json`, `content/formulaires/enfant-handicap.json`, `src/content/form-definitions.ts`, `scripts/validate/check-content.ts`, `tests/e2e/demande.spec.ts`.
- Contrôles : format:check ✔ · lint ✔ · typecheck ✔ · test ✔ (197/197) · build ✔ · validate ✔ (4/4) · test:e2e ✔ (102/102, 6 ignorés par projet).
- Questions ouvertes : aucune nouvelle.
- Suite : P3.8 formulaires `aidant`, `sortie-hospitalisation`, `nuit-24h`, `professionnel`, `contact`.

## 2026-09-20 — P3.8a Formulaires aidant et nuit / 24h/24

- Fait : P3.8 découpée en deux. `content/formulaires/aidant.json` (`/demande/relais-aidant/` : qui aidez-vous, depuis combien de temps, relais souhaité ; sept besoins simplifiés) et `nuit-24h.json` (`/demande/nuit-et-24h/` : nuits calmes ou actives, nombre de nuits, présence 24h/24 temporaire ou durable ; besoins repris des services du dépliant : garde de nuit, présence 24h/24, garde-malade). Nouveau champ de définition `planning_initial: "nuits"` : `DetailedForm` ouvre l'étape planning avec le rythme régulier et la grille préremplie sur les sept nuits (« Environ 63 heures par semaine, dont 7 nuits »), modifiable. Six cas sont désormais servis par la fabrique.
- Décisions : aucune nouvelle.
- Fichiers clés : `content/formulaires/aidant.json`, `content/formulaires/nuit-24h.json`, `src/content/schemas.ts` (`planning_initial`), `src/components/forms/DetailedForm/DetailedForm.tsx` (`initialDetailedValue`), `tests/e2e/demande.spec.ts`.
- Contrôles : format:check ✔ · lint ✔ · typecheck ✔ · test ✔ (197/197) · build ✔ · validate ✔ (4/4) · test:e2e ✔ (108/108, 6 ignorés par projet ; un échec intermittent « element not found » lors d'une passe complète, non reproduit isolément ni à la passe suivante — à surveiller en P3.10).
- Questions ouvertes : aucune nouvelle.
- Suite : P3.8b (`sortie-hospitalisation`, `professionnel`, `contact`).

## 2026-09-20 — P3.8b Formulaires sortie d'hospitalisation, professionnel et contact

- Fait : trois formulaires hors fabrique, sur la coque `MultiStepForm`, avec des briques partagées (`SpecialForms/shared.tsx` : identité, commune, message, consentement, échéance). Sortie d'hospitalisation (`/demande/sortie-d-hospitalisation/`) : quatre écrans de docs/05 §5 — date de sortie prévue (facultative) sous le bandeau « Sortie dans moins de 48 h ? Appelez-nous directement au … », hôpital (facultatif) et commune de retour, besoins des premiers jours, coordonnées avec « Vous êtes… » (proche · personne concernée · professionnel) et consentement ; l'urgence se déduit de la date (D-021). Professionnel (`/demande/professionnel/`) : structure (obligatoire), fonction, téléphone direct, e-mail ; commune de la personne, type de besoin, échéance, précisions ; la mention « Merci de ne saisir ni nom ni information permettant d'identifier la personne » est affichée deux fois (encart et aide du message) ; aucune case de consentement santé. Contact (`/contact/`) : sujet, coordonnées, message obligatoire, sans commune ; la page affiche téléphone et e-mail et renvoie vers `/demande/`. Schéma `LeadPayload` assoupli en conséquence (D-021), `buildLead` accepte une commune absente. L'aiguillage `/demande/` liste les deux formulaires spéciaux après les six cas. `check-copy` a refusé « patient » dans un chapô : reformulé en « personne que vous suivez ».
- Décisions : D-021.
- Fichiers clés : `src/components/forms/SpecialForms/*`, `src/app/demande/sortie-d-hospitalisation/page.tsx`, `src/app/demande/professionnel/page.tsx`, `src/app/contact/page.tsx`, `content/pages/formulaires-speciaux.json`, `src/lib/lead/schema.ts`, `src/lib/lead/client.ts`, `tests/e2e/special.spec.ts`.
- Contrôles : format:check ✔ · lint ✔ · typecheck ✔ · test ✔ (202/202) · build ✔ · validate ✔ (4/4) · test:e2e ✔ (116/116, 6 ignorés par projet).
- Questions ouvertes : aucune nouvelle. Les onze formulaires de docs/05 §2 existent désormais sauf `candidature` (phase recrutement) ; tous échouent proprement à l'envoi tant que `api/lead` n'existe pas.
- Suite : P3.9 route `api/lead`.

## 2026-09-20 — P3.9 Route api/lead

- Fait : `src/lib/lead/server.ts` (traitement pur, testable) : schéma strict `{ lead, meta }` ; champ piège → 202 silencieux sans envoi ; remplissage en moins de 3 s → 400 ; limite de cinq envois par adresse et dix minutes → 429 ; Turnstile vérifié auprès de Cloudflare si `TURNSTILE_SECRET_KEY` est défini → 403 sinon ; sans messagerie → 503 (le formulaire garde la saisie et propose le téléphone) ; e-mail à l'équipe (`LEADS_TO`, `Reply-To` = e-mail du demandeur), accusé de réception si un e-mail est fourni, webhook `LEAD_WEBHOOK_URL` signé `X-Signature: sha256=…` (HMAC du corps avec `LEAD_WEBHOOK_SECRET`) dont l'échec n'empêche rien ; journal limité à « lead {id} {formulaire} {statut} ». `src/lib/mail/render.ts` : objet « Nouvelle demande — {formulaire} — {commune} — {urgence} » (sans commune pour le contact), corps HTML lisible sur téléphone (coordonnées avec lien `tel:`, urgence, pour qui, situation, besoins, planning en tableau 7 × 6 ou plages ou dates avec créneaux communs et durée, estimation, message, page d'origine, agence, consentement et version du texte, date de réception) avec version texte et JSON repliable ; accusé de docs/01 §9 avec `{délai}` seulement si `contact.delai_rappel` est renseigné et E5 validé (sinon « dès que possible »). `src/lib/mail/transport.ts` : nodemailer, TLS implicite en 465 ou STARTTLS exigé. `src/app/api/lead/route.ts` : POST seulement, origine contrôlée (même hôte ou `NEXT_PUBLIC_SITE_URL`), 64 Ko au plus, IP depuis `x-forwarded-for`. Textes des e-mails dans `content/emails.json` (schéma, contrôle de contenu). Tests : serveur SMTP simulé (`smtp-server`) qui reçoit réellement les deux messages, champ piège, délai, limite, webhook signé, Turnstile, origine, taille, JSON invalide, absence de fuite dans le journal.
- Décisions : aucune nouvelle (D-021 s'applique : demande de contact sans commune).
- Fichiers clés : `src/app/api/lead/route.ts`, `src/lib/lead/server.ts`, `src/lib/mail/render.ts`, `src/lib/mail/transport.ts`, `content/emails.json`, `src/lib/lead/server.test.ts`, `src/lib/mail/render.test.ts`, `src/app/api/lead/route.test.ts`.
- Contrôles : format:check ✔ · lint ✔ · typecheck ✔ · test ✔ (214/214) · build ✔ · validate ✔ (4/4) · test:e2e ✔ (116/116, 6 ignorés par projet). Dépendances : nodemailer 10.0.10 ; smtp-server 3.19.13 (dev).
- Questions ouvertes : Q-TECH-1 (identifiants SMTP, adresse de réception) reste nécessaire pour un envoi réel ; SPF, DKIM et DMARC du domaine expéditeur à configurer par Arcel (docs/05 §7), à reporter dans le bilan.
- Suite : P3.10 parcours de bout en bout (Playwright avec serveur SMTP simulé : succès jusqu'à la page merci, hors Île-de-France, panne d'envoi, axe à chaque étape).

## 2026-09-20 — P3.10 Parcours de bout en bout

- Fait : `tests/e2e/smtp.ts` + `global-setup.ts` : serveur SMTP simulé (127.0.0.1:2525) lancé par Playwright, messages analysés (`mailparser`) et déposés dans `tests/e2e/.mails/` (ignoré par git) ; `playwright.config.ts` lance `next start` avec `SMTP_HOST`, `SMTP_PORT`, `SMTP_ALLOW_INSECURE`, `LEADS_FROM`, `LEADS_TO` et `LEAD_RATE_LIMIT=1000`. `tests/e2e/envoi.spec.ts` (en série par projet, lecture des messages reçus après le départ de chaque test) : rappel au clavier jusqu'à `/merci/rappel/` avec l'alerte « Nouvelle demande — Rappel — Puteaux — Dès que possible (sous 48 h) » ; personne âgée en cinq étapes au clavier avec axe à chaque étape, alerte (`Reply-To`, situation, estimation) et accusé de réception adressé au demandeur sans aucun détail (commune, âge, chute, besoins, nom absents) ; panne d'envoi simulée (route en 503) sur le contact : saisie conservée, téléphone proposé ; les cinq autres cas de la fabrique au clavier jusqu'à l'envoi ; sortie d'hospitalisation et professionnel envoyés réellement. Les tests précédents de panne (rappel, neuro) simulent désormais la panne par interception. Corrections trouvées par ces parcours : le client appelait `/api/lead` sans barre finale et subissait une redirection 308 (`trailingSlash`) qui faisait échouer le premier envoi ; il appelle `/api/lead/`. `CommuneField` lit `?commune=` côté client : les pages `/etre-rappele/`, `/demande/{cas}/`, `/demande/sortie-d-hospitalisation/` et `/demande/professionnel/` sont de nouveau statiques et couvertes par `check-placeholders`.
- Décisions : aucune nouvelle.
- Fichiers clés : `tests/e2e/smtp.ts`, `tests/e2e/global-setup.ts`, `tests/e2e/envoi.spec.ts`, `playwright.config.ts`, `src/lib/lead/client.ts`, `src/components/forms/CommuneField/CommuneField.tsx`, `src/app/api/lead/route.ts` (`LEAD_RATE_LIMIT`), `.env.example`.
- Contrôles : format:check ✔ · lint ✔ · typecheck ✔ · test ✔ (215/215) · build ✔ (toutes les pages de formulaire statiques) · validate ✔ (4/4) · test:e2e ✔ (134/134, 6 ignorés par projet). Dépendances : mailparser 3.9.28 (dev).
- Point de validation 3, vérification « aucune donnée de santé dans les URL, l'objet des e-mails, l'accusé de réception et les journaux » : URL — seules `?commune=INSEE` existent (`sourcePage` sans paramètre, schéma) ; objets — formulaire, commune, urgence seulement (test `teamSubject`) ; accusé — aucun détail (tests unitaires et e2e) ; journaux — identifiant, formulaire, statut (tests `server.test.ts` et `route.test.ts`). ✔
- Questions ouvertes : aucune nouvelle.
- Suite : fin de phase 3 (lhci, audit, fusion locale dans `main`, étiquette `phase-03`).

## 2026-09-20 — Fin de phase 3 : Lighthouse, audit, bilan

- Fait : `pnpm lhci` sur l'accueil : bonnes pratiques à 1 (les routes de la phase 3 existent), mais 281 Ko de JavaScript : le préchargement `next/link` des pages de formulaire depuis les boutons d'appel à l'action chargeait leur code (126 Ko) sur chaque page. Page de rappel ajoutée comme page témoin : 281 Ko (budget 220), CLS 0,24 (formulaire rendu après hydratation), rapport de sécurité de contenu (barre de progression stylée en ligne). Corrections (D-022) : `zod/mini` pour le schéma partagé, `libphonenumber-js/core` avec métadonnées France (`pnpm data:phone`, 265 octets), `prefetch={false}` sur les liens de `Button` et de la barre mobile, coque rendue dès le serveur avec reprise de la saisie après le montage, `<progress>` natif, matrice de budgets dans `lighthouserc.cjs`. Résultat (trois passes, médiane) : accueil performance 0,96–0,98, accessibilité 1, bonnes pratiques 1, SEO 1, LCP 1,76–1,96 s, CLS 0, TBT ≤ 134 ms, JavaScript 150 Ko ; rappel performance 0,99, accessibilité 1, bonnes pratiques 1, SEO 1, LCP 1,70–1,72 s, CLS 0, TBT ≤ 70 ms, JavaScript 187 Ko. `pnpm audit` : les cinq vulnérabilités transitives de `@lhci/cli` (DC.2), aucune nouvelle avec nodemailer, smtp-server, mailparser et le générateur de métadonnées.
- Décisions : D-022.
- Fichiers clés : `src/lib/lead/schema.ts`, `data/phone-metadata.fr.json`, `src/components/ui/Button/Button.tsx`, `src/components/layout/MobileActionBar/MobileActionBar.tsx`, `src/components/forms/MultiStepForm/MultiStepForm.tsx`, `lighthouserc.cjs`, `package.json` (`data:phone`).
- Contrôles : format:check ✔ · lint ✔ · typecheck ✔ · test ✔ (215/215) · build ✔ · validate ✔ (4/4) · test:e2e ✔ (134/134, 6 ignorés par projet) · lhci ✔ (deux pages, tous les budgets) · audit : 5 (outillage, DC.2).
- Bilan de la phase 3 (`phase/03-formulaires`, P3.1 à P3.10) : schéma de la demande partagé, grille de planning complète (régulier, horaires précis, ponctuel, 24h/24), coque multi-étapes, onze pages de confirmation, dix formulaires (rappel, six cas détaillés, sortie d'hospitalisation, professionnel, contact ; la candidature attend la phase recrutement), route `api/lead` avec e-mails et webhook signé, parcours de bout en bout sur un serveur SMTP simulé, budgets de performance tenus. Ouvert pour Arcel : Q-TECH-1 (SMTP et adresse de réception, indispensables pour un envoi réel), SPF / DKIM / DMARC du domaine expéditeur, Q-TECH-3 (dépôt distant), Q-TECH-4 (budget JavaScript), Q-ID-2 (délai de rappel), E5, pages légales (phase 8) vers lesquelles les formulaires pointent déjà.
- Suite : fusion locale de `phase/03-formulaires` dans `main` (D-014), étiquette `phase-03`, puis phase 4 (`phase/04-services`, P4.1 gabarit 13 sections).
