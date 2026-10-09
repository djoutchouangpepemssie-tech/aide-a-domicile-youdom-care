# Youdom Care — site d'aide et d'accompagnement à domicile

> **Vous, chez vous. Nous, à vos côtés.**

Site vitrine et de conversion de Youdom Care : aide et accompagnement à domicile à Paris et en
Île-de-France, pour les personnes âgées, les adultes et les enfants en situation de handicap, et
les personnes atteintes de maladies neurodégénératives.

Trois exigences tiennent tout le projet : un design unique et accessible, un référencement
irréprochable, et un texte qui convertit **sans jamais tromper**.

---

## État du projet

Neuf phases livrées. Le site est construit, testé et déployable, mais **il n'est pas encore
ouvert au public** :

- `www.youdom-care.com` sert toujours la version précédente ; le basculement du domaine n'a pas
  été fait ;
- les **formulaires n'envoient rien** tant que six variables d'environnement ne sont pas
  renseignées chez l'hébergeur **et que la production n'est pas redéployée** — Vercel ne transmet
  les variables qu'au déploiement suivant, et c'est l'étape la plus facile à manquer puisque les
  réglages, eux, s'affichent correctement (voir `docs/MESSAGERIE_RESEND.md`, §4 et §6) ;
- la production sert encore l'état **antérieur** à l'audit global, et aucune adresse publique ne
  la dessert : pas de domaine personnalisé, et la protection par authentification Vercel est
  active sur toutes les adresses du projet (`docs/PLAN.md`, DC.4) ;
- les **26 pages services** et les **13 articles** du magazine attendent une relecture
  professionnelle : ils sont construits, mais en `noindex` jusque-là ;
- plusieurs champs obligatoires des mentions légales sont encore vides, dont le médiateur de la
  consommation.

Ce qui reste à trancher avant toute ouverture est listé dans `docs/PLAN.md` (section « Dette et
corrections ») et dans `docs/QUESTIONS_ARCEL.md`.

### Volumétrie

|                                 |                                           |
| ------------------------------- | ----------------------------------------- |
| Gabarits de page                | 47                                        |
| Pages construites               | 263 au dernier relevé (`docs/JOURNAL.md`) |
| Pages locales                   | 133 territoires                           |
| Pages services et pathologies   | 26                                        |
| Articles du magazine « Le Fil » | 13                                        |
| Départements couverts · agences | 8 · 2                                     |
| Composants                      | 118                                       |
| Lignes de TypeScript            | ~64 000                                   |

---

## Mise en route

Prérequis : **Node 24** et **pnpm 11.0.8** (la version est fixée par le champ `packageManager`).

```bash
pnpm install
pnpm dev            # http://localhost:3000
```

Pour travailler sur les formulaires en local, copiez `.env.example` en `.env.local`. Sans
configuration de messagerie, les routes d'envoi répondent « envoi indisponible » et le formulaire
conserve la saisie — c'est le comportement voulu.

## Commandes

| Commande            | Ce qu'elle fait                                                               |
| ------------------- | ----------------------------------------------------------------------------- |
| `pnpm dev`          | développement                                                                 |
| `pnpm build`        | build de production                                                           |
| `pnpm lint`         | ESLint                                                                        |
| `pnpm typecheck`    | `tsc --noEmit` (lance `next typegen` au préalable)                            |
| `pnpm test`         | tests unitaires (Vitest)                                                      |
| `pnpm test:e2e`     | parcours Playwright + axe                                                     |
| `pnpm validate`     | contrôles de contenu, SEO, local, légal — **exige un `pnpm build` préalable** |
| `pnpm lhci`         | Lighthouse CI sur les pages témoins                                           |
| `pnpm audit:textes` | audit des textes rendus (indexation, anti-spam, allégations)                  |
| `pnpm data:local`   | pipeline de données ouvertes des pages locales                                |

## État des contrôles

| Contrôle                            | État                                                                          |
| ----------------------------------- | ----------------------------------------------------------------------------- |
| `lint`, `typecheck`, `format:check` | verts                                                                         |
| `test`                              | **938 tests** verts, 176 fichiers                                             |
| `validate`                          | **13/13** contrôles verts                                                     |
| `audit` des dépendances             | 4 avis, tous dans l'outillage de développement, sans version corrigée publiée |
| `test:e2e`                          | 653 verts, **18 en échec connus et documentés** (DP.3, DP.4, DP.5)            |

Les 18 parcours rouges ne sont pas des tests périmés : ce sont trois écarts réels, chiffrés dans
`docs/PLAN.md`, qui attendent un arbitrage de design. Ils restent rouges volontairement — **on ne
relève pas un seuil pour faire passer un contrôle.**

---

## Pile technique

**Next.js 16** (App Router, rendu statique par défaut), **React 19**, **TypeScript strict**,
**pnpm**. **Tailwind CSS v4** piloté par des variables CSS ; composants maison, aucune
bibliothèque de composants.

Contenu en **MDX + JSON** sous `content/`, validé par des schémas **Zod** — pas de CMS. Formulaires
validés par le même schéma côté navigateur et côté serveur, envoi par **Route Handler** Node et
**SMTP** (Resend). Destination actuelle : e-mail seulement ; le format de la demande est stable
pour brancher un CRM plus tard.

Tests : **Vitest**, **Playwright + axe**, **Lighthouse CI** avec budgets bloquants. Hébergement
**Vercel**, prévisualisation par branche.

## Où trouver quoi

| Besoin                                    | Fichier                                 |
| ----------------------------------------- | --------------------------------------- |
| Tâches, ordre, points de validation       | `docs/PLAN.md`                          |
| Vision, publics, arborescence             | `docs/00_CAHIER_DES_CHARGES.md`         |
| Voix de marque, textes, microtextes       | `docs/01_MARQUE_ET_COPYWRITING.md`      |
| Couleurs, typographies, composants        | `docs/02_DESIGN_SYSTEM.md`              |
| Pages services et pathologies             | `docs/03_PAGES_SERVICES.md`             |
| SEO technique et référencement local      | `docs/04_SEO_ET_REFERENCEMENT_LOCAL.md` |
| Formulaires, planning, e-mails            | `docs/05_FORMULAIRES.md`                |
| Magazine « Le Fil », lexique              | `docs/06_MAGAZINE.md`                   |
| RGPD, accessibilité, performance          | `docs/07_CONFORMITE_ET_QUALITE.md`      |
| **Configurer l'envoi des demandes**       | `docs/MESSAGERIE_RESEND.md`             |
| Audit global (sécurité, données, qualité) | `docs/AUDIT_GLOBAL.md`                  |
| Décisions d'architecture                  | `docs/DECISIONS.md`                     |
| Journal des itérations                    | `docs/JOURNAL.md`                       |
| Questions en attente                      | `docs/QUESTIONS_ARCEL.md`               |

**Faits d'entreprise** : `content/site.config.json`, `content/tarifs.json`,
`content/engagements.json` en sont la **seule** source autorisée. Rien ne s'invente ailleurs.

---

## Garde-fous permanents

Ces règles ne se négocient pas, et les contrôles de `pnpm validate` en vérifient plusieurs
automatiquement.

- **La personne avant la maladie.** On écrit « personne atteinte de la maladie d'Alzheimer »,
  « enfant autiste », « personne en situation de handicap », « personne accompagnée » — jamais
  « patient » : Youdom Care n'est pas un service de soins, il accompagne.
- **Le prix TTC avant avantage fiscal est l'information principale.** Le montant après crédit
  d'impôt s'affiche à part, plus petit, jamais à sa place.
- **Le mode d'intervention est indiqué pour chaque prestation** (prestataire ou mandataire). En
  mandataire, la mention légale est obligatoire.
- **Aucune donnée de santé ne sort du corps de l'e-mail** destiné à l'équipe. L'accusé de
  réception envoyé au demandeur ne contient aucun détail de sa demande.
- **Une page locale sans faits sourcés n'est pas publiée.** Chaque fait porte sa source et sa date.
- **Aucun fait inventé, aucun champ à compléter rendu à l'écran.** Un champ inconnu est masqué,
  jamais affiché comme « à compléter ».

## Contribuer

Branches `phase/NN-slug`, demande de fusion vers `main`, fusion en squash, tag `phase-NN`.
Commits conventionnels en français, atomiques, avec périmètre : `seo(local): plan de site par
département`.

Code et identifiants en anglais ; contenu, URL et commentaires métier en français. URL en
minuscules, avec tirets, sans accents, barre oblique finale.

Une tâche est terminée quand :

1. ses critères d'acceptation sont remplis ;
2. `pnpm lint && pnpm typecheck && pnpm test && pnpm validate` sont verts ;
3. clavier, lecteur d'écran et mobile sont vérifiés pour tout composant interactif ;
4. aucun fait n'a été inventé et aucun champ à compléter n'est rendu à l'écran ;
5. `docs/PLAN.md` est coché et `docs/JOURNAL.md` complété.

Toute dépendance ajoutée s'accompagne d'une ligne dans `docs/DECISIONS.md` : nom, raison, poids.

---

## Secrets

Aucun secret n'est versionné. `.env.example` ne contient que des valeurs publiques et documente ce
qui est attendu ; les valeurs réelles vivent chez l'hébergeur. La clé d'API de messagerie est le
seul secret du projet.
