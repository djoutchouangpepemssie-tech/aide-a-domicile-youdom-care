# CLAUDE.md — Mémoire du projet « Site Youdom Care »

## Le projet en trois lignes

Site vitrine et de conversion de Youdom Care, aide et accompagnement à domicile à Paris et en Île-de-France. Créé de zéro. Trois exigences : un design unique et accessible, un référencement (national, local, éditorial) irréprochable, un texte qui convertit sans jamais tromper.

Signature de marque : **« Vous, chez vous. Nous, à vos côtés. »**

## Où trouver quoi

| Besoin | Fichier |
| --- | --- |
| Tâches, ordre, points de validation | `docs/PLAN.md` |
| Vision, publics, arborescence, architecture | `docs/00_CAHIER_DES_CHARGES.md` |
| Voix de marque, textes de l'accueil, boutons, microtextes | `docs/01_MARQUE_ET_COPYWRITING.md` |
| Couleurs, typographies, composants, accessibilité visuelle | `docs/02_DESIGN_SYSTEM.md` |
| Pages services et pathologies, cas par cas | `docs/03_PAGES_SERVICES.md` |
| SEO technique, données structurées, référencement local | `docs/04_SEO_ET_REFERENCEMENT_LOCAL.md` |
| Formulaires dédiés, planning 24h/24, e-mails | `docs/05_FORMULAIRES.md` |
| Magazine « Le Fil », lexique, ligne éditoriale | `docs/06_MAGAZINE.md` |
| Mentions légales, RGPD, accessibilité, performance, contrôles | `docs/07_CONFORMITE_ET_QUALITE.md` |
| Enseignements de l'audit O2 / Petits-fils | `docs/ANNEXE_AUDIT_CONCURRENTS.md` |
| Journal des itérations | `docs/JOURNAL.md` |
| Questions en attente pour Arcel | `docs/QUESTIONS_ARCEL.md` |
| Décisions d'architecture | `docs/DECISIONS.md` |
| Faits d'entreprise (seule source autorisée) | `content/site.config.json`, `content/tarifs.json`, `content/engagements.json` |

## Pile technique

- **Next.js** (dernière version stable, App Router, rendu statique par défaut), **TypeScript strict**, **pnpm**.
- **Tailwind CSS v4** piloté par des variables CSS (jetons de `docs/02`). Pas de bibliothèque de composants lourde : composants maison, primitives accessibles (Radix UI si nécessaire).
- Contenu en **MDX + JSON** dans `content/`, validé par des schémas **Zod** (`src/content/schemas.ts`). Pas de CMS.
- Formulaires : **React Hook Form + Zod**, envoi par **Route Handler** Node (`runtime = "nodejs"`), e-mail par **Nodemailer (SMTP)**. Destination actuelle : **e-mail uniquement**. Le format de la demande (`LeadPayload`) est stable pour brancher un CRM plus tard (`LEAD_WEBHOOK_URL`, optionnel).
- Tests : **Vitest** (unitaires), **Playwright** + **axe** (parcours et accessibilité), **Lighthouse CI** (budgets).
- Qualité : ESLint, Prettier, Husky + commitlint (commits conventionnels), GitHub Actions.
- Hébergement : **Vercel** (prévisualisations par branche). La production et le DNS sont gérés par Arcel, jamais par la loop.

## Commandes

```bash
pnpm dev            # développement
pnpm build          # build de production
pnpm lint           # ESLint
pnpm typecheck      # tsc --noEmit
pnpm test           # Vitest
pnpm test:e2e       # Playwright + axe
pnpm validate       # tous les contrôles de contenu, SEO, local, légal (scripts/validate)
pnpm lhci           # Lighthouse CI sur les pages témoins
pnpm data:local     # pipeline de données ouvertes pour les pages locales
```

## Conventions

- Branches `phase/NN-slug`, PR vers `main`, fusion en squash, tag `phase-NN`.
- Commits conventionnels en français, atomiques, avec périmètre : `seo(local): plan de site par département`.
- Code et identifiants en anglais ; contenu, URL et commentaires métier en français. URL en minuscules, avec tirets, sans accents, barre oblique finale.
- Un composant = un dossier (`Component.tsx`, `Component.test.tsx`), composants serveur par défaut, `"use client"` seulement pour l'interactivité.
- Aucune dépendance ajoutée sans ligne dans `docs/DECISIONS.md` (nom, raison, poids).

## Définition de « terminé » pour toute tâche

1. Critères d'acceptation de la tâche remplis.
2. `pnpm lint && pnpm typecheck && pnpm test && pnpm validate` verts.
3. Clavier, lecteur d'écran et mobile vérifiés pour tout composant interactif.
4. Aucun fait inventé, aucun champ à compléter rendu à l'écran.
5. `docs/PLAN.md` coché, `docs/JOURNAL.md` complété, commits poussés sur la branche de phase.

## Garde-fous permanents (résumé)

- La personne avant la maladie. On écrit « personne atteinte de la maladie d'Alzheimer », « enfant autiste » ou « enfant avec un TSA », « personne en situation de handicap », « personne accompagnée » (jamais « patient » : Youdom Care ne soigne pas, il accompagne).
- Le prix TTC avant avantage fiscal est toujours l'information principale ; le montant après crédit d'impôt s'affiche à part, plus petit.
- Le mode d'intervention (prestataire ou mandataire) est indiqué pour chaque prestation. En mandataire, la mention légale de `docs/07` est obligatoire.
- Aucune donnée de santé hors du corps de l'e-mail de demande destiné à l'équipe.
- Une page locale sans faits sourcés n'est pas publiée.
