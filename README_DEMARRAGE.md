# Démarrer la loop Youdom Care

## Ce que contient le kit

```
.claude/loop.md                      le prompt de la loop (lu par la commande /loop)
CLAUDE.md                            la mémoire du projet, chargée à chaque session
docs/00_CAHIER_DES_CHARGES.md        vision, publics, arborescence, architecture
docs/01_MARQUE_ET_COPYWRITING.md     voix de marque, textes de l'accueil, boutons, microtextes
docs/02_DESIGN_SYSTEM.md             concept « Le Fil », couleurs accessibles, typographies, composants
docs/03_PAGES_SERVICES.md            chaque service et chaque maladie, au cas par cas
docs/04_SEO_ET_REFERENCEMENT_LOCAL.md SEO technique, données structurées, Paris et Île-de-France
docs/05_FORMULAIRES.md               formulaires dédiés, planning multi-jours et 24h/24, e-mails
docs/06_MAGAZINE.md                  « Le Fil » : ligne éditoriale, 36 sujets, lexique
docs/07_CONFORMITE_ET_QUALITE.md     obligations, accessibilité, performance, contrôles
docs/PLAN.md                         10 phases, tâches à cocher, points de validation
docs/QUESTIONS_ARCEL.md              ce que vous seul pouvez fournir
docs/JOURNAL.md · docs/DECISIONS.md  l'état et les décisions, tenus par la loop
docs/ANNEXE_AUDIT_CONCURRENTS.md     les enseignements de l'audit O2 / Petits-fils
content/*.json · data/*.json         faits connus (dépliant), tarifs et engagements à remplir, territoires
```

## Mise en route (10 minutes)

1. Créez un dépôt GitHub vide (par exemple `youdom-care-site`) et ouvrez-le dans un Codespace.
2. Décompressez le kit **à la racine du dépôt** (les dossiers `.claude`, `docs`, `content`, `data` doivent être au premier niveau), puis :
   ```bash
   git add -A && git commit -m "docs: kit de la loop Youdom Care" && git push
   ```
3. Vérifiez que `gh auth status` est connecté (la loop ouvre ses PR avec `gh`).
4. Facultatif mais recommandé : reliez le dépôt à un projet Vercel pour obtenir une prévisualisation par branche. Ne reliez pas encore le domaine.
5. Lancez Claude Code dans le Codespace, puis tapez simplement :
   ```
   /loop
   ```
   Sans argument, `/loop` exécute `.claude/loop.md` à son propre rythme : une tâche par itération, puis la suivante une minute plus tard.

## Pendant que la loop travaille

- **Répondez aux questions** de `docs/QUESTIONS_ARCEL.md` dès que possible, en commençant par les tarifs, les engagements E1 à E5 et les mentions légales. Un simple commit de vos réponses suffit : la loop les lit à l'itération suivante et débloque les tâches.
- **Relisez les PR de fin de phase** : chacune résume ce qui a été fait et les résultats des contrôles.
- **Modifiez la loop à chaud** si besoin : un changement de `.claude/loop.md` s'applique à l'itération suivante.

## Arrêter, reprendre

- **Arrêter** : touche `Échap` pendant l'attente entre deux itérations.
- **Reprendre** : relancez `/loop`. Tout l'état est dans le dépôt (`docs/PLAN.md`, `docs/JOURNAL.md`), rien n'est perdu. Une loop à rythme libre n'est pas restaurée automatiquement après `claude --resume` : il faut retaper `/loop`.
- Une loop s'éteint d'elle-même au bout de sept jours, ou quand tout est coché, ou quand tout ce qui reste attend vos réponses.

## Variante « d'une traite » avec /goal

Pour faire avancer une phase sans pause entre les tâches, utilisez `/goal`, qui relance Claude tant que la condition n'est pas remplie :

```
/goal Toutes les tâches de la phase en cours de docs/PLAN.md sont cochées [x], la commande "pnpm lint && pnpm typecheck && pnpm test && pnpm validate" sort en code 0 avec sa sortie affichée, "git status" est propre et docs/JOURNAL.md contient l'entrée de chaque tâche. Suis exactement .claude/loop.md, une tâche à la fois, sans jamais modifier un contrôle pour le faire passer. Arrête-toi après 40 tours, ou si toutes les tâches restantes sont bloquées [~].
```

`/loop` convient aux longues sessions sans surveillance ; `/goal` convient pour boucler une phase pendant que vous êtes là.

## Ce que la loop ne fera jamais

Toucher au DNS ou au domaine, mettre en production, inventer un prix, un avis, un chiffre ou un label, publier une page de santé non relue, écrire un secret dans le dépôt. La liste de mise en production se trouve dans `docs/07_CONFORMITE_ET_QUALITE.md §8` : elle vous appartient.

## Avant la mise en ligne

`pnpm validate --prod` doit passer. Il échoue tant que les tarifs, les mentions légales, les engagements et les relectures professionnelles ne sont pas en place : c'est voulu.
