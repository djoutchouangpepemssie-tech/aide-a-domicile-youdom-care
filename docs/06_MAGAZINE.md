# 06 — « Le Fil », le magazine qui aide ceux qui aident

## 1. Ligne éditoriale

**Promesse au lecteur** : sortir de chaque article avec une chose qu'il comprend mieux, une chose qu'il peut faire aujourd'hui, et le sentiment de ne pas être seul.

**Trois registres**, à alterner :

1. **Éduquer** : comprendre une maladie, un handicap, un droit, un sigle. Clair, sourcé, sans jargon.
2. **Outiller** : listes de contrôle, modèles, pas-à-pas (« Préparer une sortie d'hospitalisation en 10 points »).
3. **Inspirer** : portraits d'auxiliaires de vie, récits de familles (réels, avec accord écrit), gestes simples qui changent une journée. Jamais de misérabilisme, jamais d'héroïsation.

**Ton** : celui de `docs/01`. On écrit pour une personne fatiguée, qui lit le soir sur son téléphone. Phrases courtes, intertitres qui se suffisent, réponse dès le premier paragraphe.

**Ce que le magazine n'est pas** : un blog de promotion. Un article utile contient au plus un encart vers un service, placé là où il répond à la question.

## 2. Rubriques

| Rubrique | URL | Contenu |
| --- | --- | --- |
| Comprendre | `/magazine/categorie/comprendre/` | Maladies neurodégénératives, handicaps, vieillissement : ce qui se passe, ce que cela change au quotidien |
| Vivre chez soi | `/magazine/categorie/vivre-chez-soi/` | Aménagement, sécurité, repas, sommeil, activités, saisons |
| Grandir avec un handicap | `/magazine/categorie/grandir-avec-un-handicap/` | Enfants et adolescents, école, fratrie, passage à l'âge adulte |
| Tenir dans la durée | `/magazine/categorie/tenir-dans-la-duree/` | Aidants : fatigue, culpabilité, relais, couple, travail |
| Droits et aides | `/magazine/categorie/droits-et-aides/` | APA, PCH, AEEH, crédit d'impôt, protection juridique, démarches pas à pas |
| Dans les coulisses | `/magazine/categorie/dans-les-coulisses/` | Le métier d'auxiliaire de vie, la formation, une journée avec… |

## 3. Gabarit d'article

1. Fil d'Ariane, rubrique, **titre** (promesse claire, 55 à 70 caractères).
2. **Chapô** de 40 à 60 mots qui répond à la question posée.
3. Ligne de confiance : auteur (nom, fonction), relecteur si sujet de santé, date de publication, date de mise à jour, temps de lecture.
4. **« L'essentiel »** : trois à cinq points, en tête.
5. Sommaire ancré (collant sur ordinateur).
6. Corps : intertitres sous forme de questions réelles, paragraphes courts, listes, un encart « À retenir » par grande partie, un encart « Attention » si nécessaire.
7. **« Et concrètement, demain ? »** : trois actions simples.
8. Un seul encart d'appel contextuel (« Besoin de relais quelques heures par semaine ? »).
9. **Sources** numérotées avec liens et dates de consultation.
10. « À lire ensuite » (trois articles), partage, version imprimable.

En-tête MDX validé par Zod : `titre`, `description`, `rubrique`, `auteur`, `relu_par`, `publie_le`, `maj_le`, `essentiel[]`, `sources[]`, `image` (+ `alt`), `piliers_lies[]`, `statut` (`brouillon` · `a_relire` · `publie`).

## 4. Règles de confiance

- **Auteurs réels** : fiches dans `content/auteurs/` fournies par Arcel (nom, fonction, photo facultative, courte biographie). Tant qu'aucun auteur n'existe, les articles restent en `a_relire` et ne partent pas en production.
- **Relecture obligatoire** par un professionnel pour tout sujet de santé (`relu_par`).
- **Transparence** : la page `/a-propos/charte-editoriale/` explique comment les articles sont écrits, relus, sourcés et mis à jour, et précise que des outils d'aide à la rédaction peuvent être utilisés sous la responsabilité d'un auteur et d'un relecteur nommés.
- **Sources** : institutions et associations reconnues (liste de `docs/03`). Une URL non vérifiée n'est jamais citée. Les montants d'aides et les chiffres portent leur année.
- **Mise à jour** : chaque article a une date de révision prévue (12 mois ; 6 mois pour les aides financières). `pnpm validate` signale les articles échus.
- **Récits et portraits** : uniquement réels, avec accord écrit conservé par Arcel. Aucune histoire inventée présentée comme vraie.

## 5. Les 36 premiers sujets

Priorité de rédaction : les 12 marqués ★ pour le lancement.

| N° | Rubrique | Titre de travail | Intention du lecteur | Lien principal |
| --- | --- | --- | --- | --- |
| 1 ★ | Comprendre | Alzheimer : les trois temps de la maladie et ce qu'ils changent à la maison | Anticiper | Page Alzheimer |
| 2 ★ | Comprendre | Parkinson : pourquoi l'heure des médicaments organise toute la journée | Comprendre les fluctuations | Page Parkinson |
| 3 ★ | Comprendre | Sclérose en plaques : la fatigue que personne ne voit | Se sentir compris | Page SEP |
| 4 | Comprendre | Maladie à corps de Lewy : quand tout change d'une heure à l'autre | Comprendre | Page Lewy |
| 5 | Comprendre | Démence fronto-temporale : quand le caractère change avant la mémoire | Comprendre | Page DFT |
| 6 | Comprendre | Maladie de Charcot : organiser le domicile avec un temps d'avance | Anticiper | Page SLA |
| 7 ★ | Comprendre | Il refuse toute aide : huit façons d'ouvrir la porte | Débloquer une situation | Pilier neuro |
| 8 | Comprendre | Agitation en fin de journée : comprendre et apaiser | Gérer | Page Alzheimer |
| 9 ★ | Vivre chez soi | Prévenir les chutes : le tour du logement pièce par pièce | Agir | Pilier personnes âgées |
| 10 | Vivre chez soi | Bien manger quand on n'a plus faim : idées simples contre la dénutrition | Agir | Vie quotidienne |
| 11 | Vivre chez soi | Canicule, grand froid : protéger un proche fragile | Agir | Pilier personnes âgées |
| 12 ★ | Vivre chez soi | Sortie d'hospitalisation : la liste de contrôle des 48 heures | Organiser | Service sortie d'hospitalisation |
| 13 | Vivre chez soi | Nuits difficiles : quand une présence de nuit devient nécessaire | Décider | Garde de nuit |
| 14 ★ | Vivre chez soi | Rester chez soi ou entrer en établissement : les bonnes questions | Décider | Présence 24h/24 |
| 15 | Vivre chez soi | Des activités qui ont du sens : stimuler sans infantiliser | S'inspirer | Compagnie et stimulation |
| 16 ★ | Grandir avec un handicap | Trouver un relais à domicile pour son enfant autiste : ce qu'il faut exiger | Choisir | Page autisme |
| 17 | Grandir avec un handicap | La fiche de vie de votre enfant : le document qui vous évite de tout répéter | S'outiller | Pilier enfants |
| 18 | Grandir avec un handicap | Frères et sœurs : leur faire une vraie place | S'inspirer | Pilier enfants |
| 19 | Grandir avec un handicap | Polyhandicap : lire les signes de confort et d'inconfort | Comprendre | Page polyhandicap |
| 20 | Grandir avec un handicap | 16–25 ans : préparer le passage à l'âge adulte | Anticiper | Pilier adultes |
| 21 ★ | Tenir dans la durée | Aidant : dix signes qu'il est temps de demander du relais | Se reconnaître | Espace Aidants |
| 22 ★ | Tenir dans la durée | La culpabilité de l'aidant : d'où elle vient, comment la poser | Se libérer | Espace Aidants |
| 23 | Tenir dans la durée | Travailler et aider un parent : droits et organisation | S'organiser | Espace Aidants |
| 24 | Tenir dans la durée | Couple et maladie : rester conjoints | S'inspirer | Espace Aidants |
| 25 | Tenir dans la durée | Partir en vacances quand on est aidant : les solutions | Agir | Solutions de répit |
| 26 ★ | Droits et aides | APA : qui y a droit, combien, comment la demander | Obtenir une aide | Page APA |
| 27 ★ | Droits et aides | PCH aide humaine : comprendre son plan d'aide | Obtenir une aide | Page PCH |
| 28 | Droits et aides | AEEH, PCH enfant : comment choisir | Obtenir une aide | Page AEEH |
| 29 ★ | Droits et aides | Crédit d'impôt et avance immédiate : ce que vous payez vraiment | Comprendre le prix | Tarifs et aides |
| 30 | Droits et aides | Prestataire, mandataire, emploi direct : le comparatif honnête | Choisir | Prestataire ou mandataire |
| 31 | Droits et aides | Habilitation familiale, tutelle, curatelle : protéger un proche | Anticiper | Pilier neuro |
| 32 | Droits et aides | Dossier MDPH : le remplir sans s'y perdre | Agir | Pilier adultes |
| 33 | Dans les coulisses | Une journée avec une auxiliaire de vie (portrait réel) | S'inspirer, recruter | Recrutement |
| 34 | Dans les coulisses | Comment nous préparons un intervenant à une nouvelle situation | Faire confiance | À propos |
| 35 | Dans les coulisses | Auxiliaire de vie, aide-soignant, infirmier : qui fait quoi à domicile | Comprendre | Comment ça marche |
| 36 | Dans les coulisses | Le cahier de liaison : à quoi il sert, ce qu'on y écrit | Faire confiance | Comment ça marche |

Les sujets 33 et 34 exigent une matière réelle fournie par Arcel : ils restent bloqués sans elle.

## 6. Le lexique

Une page par terme, 120 à 250 mots : définition en une phrase, explication, « pour qui », lien officiel, pages liées. Premiers termes : AAH · AEEH · AESH · AJPA · AJPP · APA · ARDH · auxiliaire de vie · CAMSP · CCAS · CESU · CLIC · consultation mémoire · crédit d'impôt · DAC · ESA · GIR et grille AGGIR · HAD · IME · MDPH · mode mandataire · mode prestataire · PCH · plateforme de répit · PCO · SAAD · SAMSAH · SAVS · SESSAD · SSIAD · TSA · ULIS.

Chaque sigle rencontré dans le site renvoie à sa page de lexique à sa première occurrence.

## 7. Outils à imprimer (sans formulaire, sans contrepartie)

Liste de contrôle « sortie d'hospitalisation » · modèle de « fiche de vie » de l'enfant · modèle de « fiche de vie » de la personne âgée (histoire, goûts, habitudes) · liste « tour du logement anti-chutes » · mémo « les aides en un coup d'œil ». Mis en page aux couleurs du site, PDF accessibles, feuille d'impression soignée. Offerts sans demander d'e-mail : la confiance vaut plus qu'une adresse.

## 8. Rythme

Lancement avec 12 articles et 20 termes de lexique. Ensuite, deux articles par mois et une révision par mois. La loop tient la file d'attente dans `docs/PLAN.md` (phase 11).
