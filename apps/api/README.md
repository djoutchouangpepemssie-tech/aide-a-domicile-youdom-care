# `@youdom/api` — le socle du CRM Youdom Care

Vague 1, étape 1 (`docs/portal/CRM_PERIMETRE.md` §2). Ce paquet porte l'API du CRM et de l'espace
client « Mon Youdom ». Il n'y a **pas encore de serveur HTTP** : cette étape pose ce qui doit être
juste avant que quoi que ce soit soit exposé.

## Ce qui existe

| Fichier                   | Ce qu'il tient                                                                                                    |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `src/domaine/modules.ts`  | les douze modules et les cinq actions de `PERMISSIONS.md` §3                                                      |
| `src/domaine/roles.ts`    | les douze rôles et la matrice par défaut de `PERMISSIONS.md` §4 et §5                                             |
| `src/domaine/schemas.ts`  | les schémas Zod du socle (`DATA_MODEL.md` §2), `strictObject` partout                                             |
| `src/droits/authorize.ts` | **le moteur d'autorisation** : les cinq règles de `PERMISSIONS.md` §7, plus le gel, l'astreinte et les protocoles |
| `src/audit/journal.ts`    | le journal en ajout seul, et la seule porte que les routes doivent appeler                                        |
| `src/auth/`               | lien magique, code SMS, sessions, second facteur                                                                  |
| `src/db/collections.ts`   | les collections et les index de `DATA_MODEL.md` §4                                                                |
| `src/store/`              | la lecture du contexte d'autorisation : en mémoire (tests) et sur MongoDB                                         |
| `src/config/env.ts`       | la configuration, validée au démarrage                                                                            |
| `scripts/migrate.ts`      | pose les collections et les index — idempotent                                                                    |

89 tests unitaires, dont un qui parcourt les douze modules pour prouver qu'un membre sans droit
reçoit **404 et jamais 403** (exigence de `PERMISSIONS.md` §7).

## Ce qui n'existe pas encore, et dans quel ordre

1. le serveur HTTP et ses **trois surfaces séparées** (`/portal/v1`, `/field/v1`, `/admin/v1`) ;
2. le planning : récurrences, affectation, remplacements, règles légales — **en attente des règles
   de planification d'Arcel** (question B de `QUESTIONS.md`) ;
3. les validateurs `$jsonSchema` côté MongoDB, en doublure des schémas Zod ;
4. le déploiement chez l'hébergeur certifié HDS — **en attente du choix** (question A).

Rien de tout cela ne remet en cause ce qui est écrit ici : le socle ne dépend d'aucune des quatre
réponses attendues.

## Faire tourner

Les contrôles passent par l'atelier de la racine — un seul lint, un seul typecheck, une seule suite :

```bash
pnpm lint && pnpm typecheck && pnpm test     # à la racine du dépôt
pnpm vitest run apps/api                     # les seuls tests de l'API
pnpm portal:migrer                           # pose les index (MONGODB_URI et AUTH_PEPPER requis)
```

## Les secrets

`AUTH_PEPPER` et `MONGODB_URI` ne sont **jamais** dans le dépôt : ils vivent dans les variables
d'environnement de l'hébergeur. `.env.example` donne les noms, jamais les valeurs. Le poivre doit
faire au moins 32 caractères, et le changer invalide tous les liens magiques et codes SMS en cours
— ce qui est exactement ce qu'on veut en cas de fuite.
