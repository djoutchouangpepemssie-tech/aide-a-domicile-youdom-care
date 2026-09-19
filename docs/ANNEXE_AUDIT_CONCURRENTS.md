# Annexe — Enseignements de l'audit O2.fr et Petits-fils.com (19/09/2026)

Cette annexe résume l'audit complet réalisé avant ce cahier des charges. Elle sert de repère, jamais de modèle à copier : aucun texte, aucune structure de page et aucun élément graphique de ces sites ne doit être repris. On ne nomme jamais un concurrent sur le site.

## Les deux stratégies observées

| | O2 | Petits-fils |
| --- | --- | --- |
| Métier | Généraliste : six services | Spécialiste : personnes âgées et handicap |
| Modèle | Prestataire surtout | Mandataire uniquement |
| Promesse | Le temps retrouvé, le prix divisé par deux | La confiance : « comme pour nos propres grands-parents » |
| Premier écran | Promesse, trois boutons, six tuiles de services | Promesse et formulaire de besoins (étape 1 sur 2) |
| Action phare | Visite gratuite à domicile | Rappel « dans les 2 heures ouvrables » |
| Prix | « À partir de » sur une page de formules ; page tarifs sans prix sans code postal | Grille complète par agence, PDF téléchargeable |
| Avis | Note Google d'un seul mois | Plus de 12 000 avis vérifiés, critiques visibles |
| Local | Centaines de pages par commune, peu personnalisées | Fiches d'agences riches (responsable, quartiers, prix, avis locaux) |
| Contenu | Magazine tous publics, 16 rubriques | 7 rubriques d'aidants, 30 dossiers de pathologies |
| Forme | Bleu et turquoise, grands titres, vraies personnes en selfie | Bleu et orange d'action, Montserrat 14 px, boutons en capitales |

## Ce que nous reprenons (en le refaisant à notre façon)

1. Une question de besoins dès le premier écran, avec un choix « À définir ».
2. Un délai de rappel chiffré, tenu, affiché partout (engagement E5).
3. Trois niveaux d'engagement sur chaque page : appeler, être rappelé, décrire sa situation.
4. Le prix avant et après crédit d'impôt, avec un exemple mensuel, dans le respect de la hiérarchie légale.
5. Deux cartes côte à côte : « Nos tarifs » et « Les aides ».
6. Des garanties vérifiables plutôt que des adjectifs.
7. Des personnes nommées : intervenants, responsables d'agence.
8. Des avis datés, situés, avec les critiques visibles (uniquement réels).
9. Une colonne ou un bloc de conversion constant sur les pages intérieures.
10. Une FAQ rédigée avec les mots des familles sur chaque page.

## Ce que nous faisons mieux (les angles morts des deux leaders)

1. **Les maladies neurodégénératives sont chez eux du contenu de blog ; chez nous, ce sont des accompagnements** : une page par maladie, par stade, avec le suivi, les limites et le relais des proches.
2. **L'aidant n'a pas de parcours chez eux** ; chez nous, un espace entier, un auto-repérage, des solutions de répit.
3. **Aucun des deux ne montre le quotidien d'une intervention** ; chez nous, la semaine type est partout, et le visiteur compose la sienne.
4. **L'enfant en situation de handicap est presque absent** de leurs sites ; chez nous, un pilier complet et la fiche de vie de l'enfant.
5. **Lisibilité** : l'un écrit en 14 px et déclare son accessibilité « non conforme » ; nous visons le niveau AA, 18 px, une police conçue pour la basse vision et un mode confort.
6. **Le téléphone** : l'un ne l'affiche pas sur son accueil ; chez nous il est visible en permanence.

## Ce que nous évitons

- Les chiffres qui se contredisent d'une page à l'autre : une seule source, `content/site.config.json`.
- Les pages fleuves de 27 modules répétés à l'identique.
- La page « Tarifs » sans aucun prix.
- Les liens vagues (« En savoir + ») et les boutons « Envoyer ».
- Les contenus datés laissés en ligne (montants de 2022, FAQ « en 2024 ») : contrôle de fraîcheur.
- Les pages locales où seul le nom de la ville change.
- Les avis génériques d'autres villes sur une page d'agence.

## Point de vigilance propre à Youdom Care

Le dépliant actuel reprend de très près deux éléments du site de Petits-fils : les quatre étapes et la liste « Quand faire appel à nos services ? ». Le site n'en reprend ni la formulation ni l'ordre : voir les quatre étapes réécrites de `docs/01 §4` et l'entrée par situations.
