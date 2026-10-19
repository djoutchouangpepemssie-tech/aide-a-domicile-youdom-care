# `@youdom/api` — le socle du CRM Youdom Care

Vague 1, étapes 1 et 2 (`docs/portal/CRM_PERIMETRE.md` §2). Ce paquet porte l'API du CRM et de
l'espace client « Mon Youdom » : le socle (droits, audit, authentification) et les quatre surfaces
HTTP qui s'appuient dessus.

## Ce qui existe

**Étape 1 — le socle** (ce qui doit être juste avant que quoi que ce soit soit exposé) :

| Fichier                   | Ce qu'il tient                                                                                                    |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `src/domaine/modules.ts`  | les douze modules et les cinq actions de `PERMISSIONS.md` §3                                                      |
| `src/domaine/roles.ts`    | les douze rôles et la matrice par défaut de `PERMISSIONS.md` §4 et §5                                             |
| `src/domaine/schemas.ts`  | les schémas Zod du socle (`DATA_MODEL.md` §2), `strictObject` partout                                             |
| `src/droits/authorize.ts` | **le moteur d'autorisation** : les cinq règles de `PERMISSIONS.md` §7, plus le gel, l'astreinte et les protocoles |
| `src/audit/journal.ts`    | le journal en ajout seul, et la seule porte que les routes doivent appeler                                        |
| `src/auth/`               | lien magique, code SMS, sessions, second facteur                                                                  |
| `src/db/collections.ts`   | les collections et les index de `DATA_MODEL.md` §4                                                                |
| `src/config/env.ts`       | la configuration, validée au démarrage                                                                            |

**Étape 2 — l'API** (quatre surfaces séparées, `ARCHITECTURE.md` §5 principe 1) :

| Surface      | Pour qui                         | Routes                                                                                                                         |
| ------------ | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `/auth/v1`   | tout le monde, sans jeton        | demander un lien ou un code, ouvrir une session, second facteur, liste des appareils, déconnexion à distance                   |
| `/portal/v1` | familles, bénéficiaires, payeurs | `me`, planning d'un foyer, **journal des accès**                                                                               |
| `/field/v1`  | intervenants                     | tournée du jour, pointage NFC / QR / manuel, consignes d'accès bornées à la visite                                             |
| `/admin/v1`  | agence                           | créer un foyer, enregistrer un intervenant, rattacher un membre avec ses droits par défaut, poser une visite, retirer un droit |

Chaque surface vérifie la famille de rôles à son entrée ; chaque route vérifie ensuite le foyer et
le module. Les deux, pas l'un ou l'autre.

Autour : `src/store/` (dépôts en mémoire pour les tests, sur MongoDB en service),
`src/services/` (limite de débit, heures d'ouverture, envoi du lien et du code),
`scripts/migrate.ts` (index, idempotent), `scripts/create-admin.ts` (le premier compte d'agence,
**volontairement hors API**).

243 tests, dont un qui parcourt les douze modules pour prouver qu'un membre sans droit reçoit
**404 et jamais 403** (exigence de `PERMISSIONS.md` §7).

## Ce qui n'est pas couvert par un test, et il faut le savoir

Les dépôts MongoDB (`src/store/mongo.ts`) sont vérifiés par le typage et par la lecture, **pas par
un test d'intégration** : il n'y a pas de MongoDB dans l'environnement de construction. C'est pour
cela qu'ils sont volontairement minces — aucune logique métier n'y vit, elle est toute dans le
domaine, qui est testé. Un test d'intégration viendra avec le premier cluster réel, et
`pnpm portal:migrer` est le premier geste à faire dessus.

**Étape 3 — le planning et les tarifs** (MY-10, MY-11) :

| Fichier                         | Ce qu'il tient                                                                                                                |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `src/temps/paris.ts`            | l'heure de Paris et les changements d'heure, en instants : une garde de nuit dure neuf heures au printemps et onze en automne |
| `src/temps/jours-feries.ts`     | les onze jours fériés **calculés** (Pâques comprise), jamais recopiés                                                         |
| `src/domaine/regles.ts`         | **dix contrôles, aucun imposé** : l'agence saisit seuil et sévérité (bloquant ou avertissement)                               |
| `src/planning/serie.ts`         | les séries récurrentes, les exceptions, et les **trois portées** de modification                                              |
| `src/planning/validation.ts`    | le jugement d'ensemble : tout le temps de travail d'un intervenant, sur quatre semaines                                       |
| `src/domaine/tarifs.ts`         | prestations versionnées, majorations à la minute réelle, crédit d'impôt **estimé seulement si le taux est saisi**             |
| `src/domaine/absences.ts`       | congé, maladie, formation, indisponibilité                                                                                    |
| `src/http/surfaces/planning.ts` | les routes : règles, séries, occurrences, planning d'ensemble, absences, prestations, prévisualisation de prix                |

**Étape 4 — l'optimisation et la matérialisation** (MY-12, MY-13) :

| Fichier                           | Ce qu'il tient                                                                                                                                                |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/planning/optimisation.ts`    | suggestions classées **avec leurs raisons**, réparation des signalements, exclusions tirées de vos règles — déterministe, et rien n'est appliqué sans demande |
| `src/planning/materialisation.ts` | les occurrences deviennent des visites pointables ; une visite prévue suit son planning, une visite commencée ne le suit plus                                 |
| `src/domaine/preferences.ts`      | souhaits et refus du foyer ; le motif d'un refus ne sort jamais du foyer et de l'agence                                                                       |

Affecter un intervenant à un foyer lui ouvre **les droits de sa mission** sur ce foyer (ceux de la
colonne « intervenant » de la matrice, pas un de plus), **bornés dans le temps** et repoussés à
chaque matérialisation.

## Ce qui n'existe pas encore, et dans quel ordre

1. la portée par agence des comptes de l'agence : aujourd'hui, un coordinateur authentifié agit sur
   l'agence qu'il nomme, et chaque action est journalisée ;
2. les validateurs `$jsonSchema` côté MongoDB, en doublure des schémas Zod ;
3. le contenu des consignes d'accès (chiffrement au champ) : la route et son autorisation existent,
   le contenu arrive avec le chiffrement ;
4. le déploiement chez l'hébergeur certifié HDS — **en attente du choix** (question A).

## Faire tourner

Les contrôles passent par l'atelier de la racine — un seul lint, un seul typecheck, une seule suite :

```bash
pnpm lint && pnpm typecheck && pnpm test     # à la racine du dépôt
pnpm vitest run apps/api                     # les seuls tests de l'API
pnpm portal:migrer                           # pose les index (MONGODB_URI et AUTH_PEPPER requis)
pnpm --filter @youdom/api start              # démarre l'API (port 8787 par défaut)
```

## Les secrets

`AUTH_PEPPER` et `MONGODB_URI` ne sont **jamais** dans le dépôt : ils vivent dans les variables
d'environnement de l'hébergeur. `.env.example` donne les noms, jamais les valeurs. Le poivre doit
faire au moins 32 caractères, et le changer invalide tous les liens magiques et codes SMS en cours
— ce qui est exactement ce qu'on veut en cas de fuite.
