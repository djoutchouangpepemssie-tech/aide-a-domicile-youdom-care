# 01 — Plateforme de marque et copywriting

Ce cahier fixe la voix de Youdom Care et fournit les textes moteurs du site. La loop **reprend ces textes tels quels** là où ils sont fournis, et écrit le reste **dans la même voix**. Tout engagement factuel est repéré par un code `[E…]` : il renvoie à `content/engagements.json` et doit être validé par Arcel avant la mise en production.

## 1. Plateforme de marque

**Raison d'être.** Permettre à chacun de continuer à vivre chez soi, même quand la maladie, le handicap ou l'âge compliquent tout. Et permettre à ses proches de redevenir des proches.

**Positionnement.** Youdom Care est le spécialiste francilien de l'accompagnement à domicile des situations complexes : maladies neurodégénératives, handicap de l'enfant et de l'adulte, grand âge. Là où une aide à domicile généraliste atteint ses limites, nous commençons.

**Signature.** « Vous, chez vous. Nous, à vos côtés. » Elle contient le nom (You · dom), la promesse (rester chez soi) et la posture (à côté, pas à la place).

**Quatre piliers, quatre preuves à fournir.**

| Pilier | Ce que l'on dit | Preuve attendue (à valider) |
| --- | --- | --- |
| Spécialisés dans ce qui est difficile | Des intervenants formés à la situation, pas seulement au métier | `[E1]` contenu réel des formations par pathologie et par handicap |
| Une personne, pas un planning | Une petite équipe stable, présentée avant de commencer | `[E2]` règle interne de stabilité, présentation préalable |
| Un suivi que la famille peut lire | Référent unique, cahier de liaison, points réguliers | `[E3]` fréquence réelle des points et outils utilisés |
| Là quand ça se complique | Nuits, week-ends, 24h/24, retour d'hôpital en urgence | `[E4]` astreinte, délais réels de mise en place |

**Personnalité.** Calme, précise, chaleureuse, franche. Le ton de quelqu'un d'expérimenté qui prend le temps d'expliquer et qui dit aussi ce qu'il ne fait pas.

**Ennemis.** Le jargon, les promesses creuses, l'infantilisation, le pathos, les superlatifs.

## 2. Règles de voix

1. **Vouvoiement**, toujours. On s'adresse à une personne, pas à un « segment ».
2. **Phrases courtes** : moins de 20 mots, une idée par phrase. Paragraphes de trois phrases au plus.
3. **Le concret avant l'abstrait.** « Aider à se lever, à se laver, à s'habiller » avant « actes essentiels de la vie quotidienne ».
4. **La personne avant la maladie.** On accompagne Jeanne, qui a la maladie d'Alzheimer. Pas « un Alzheimer ».
5. **Dire ce que l'on ne fait pas.** Nous ne réalisons pas de soins infirmiers ; nous travaillons avec ceux qui les réalisent. Cette franchise est un argument.
6. **Aucun chiffre décoratif.** Un nombre n'apparaît que s'il vient de `content/`.
7. **Aucune promesse de santé.** On ne « ralentit » pas une maladie. On préserve des habitudes, on sécurise, on stimule, on soulage.
8. **Les boutons parlent à la première personne** et disent ce qui va se passer : « Je décris ma situation », pas « Envoyer ».
9. **On répond à la peur avant de vanter l'offre.** Chaque page commence par ce que vit le lecteur.
10. **On termine par une action simple**, jamais par un slogan.

### Mots à préférer

| À éviter | À écrire |
| --- | --- |
| patient, usager | personne accompagnée, votre proche, votre enfant |
| prise en charge | accompagnement |
| personne dépendante | personne qui a besoin d'aide au quotidien |
| un handicapé, un autiste | une personne en situation de handicap, un enfant autiste / avec un TSA |
| souffrant de | atteint de, qui vit avec |
| placement, placer | (à bannir) |
| nos prestations | notre aide, notre accompagnement |
| fardeau de l'aidant | charge, fatigue, épuisement |
| garde (pour un adulte), dans le corps du texte | présence (on garde « garde de nuit » et « garde-malade » dans les titres, car c'est ce que les gens cherchent) |
| leader, n°1, meilleur, unique en France | (à bannir) |

**Référencement et voix.** Les termes recherchés (« aide à domicile », « auxiliaire de vie », « garde de nuit », « maintien à domicile ») vont dans les balises titre, les H1 ou H2 et le premier paragraphe. Le reste du texte parle naturellement.

## 3. Messages par public

| Public | Message clé | Objection majeure | Réponse | Action |
| --- | --- | --- | --- | --- |
| Enfant adulte aidant | Votre parent reste chez lui, bien accompagné, et vous savez ce qui se passe | « Un inconnu chez mes parents » | Présentation avant de commencer, équipe stable `[E2]`, suivi lisible `[E3]` | Être rappelé(e) |
| Conjoint aidant | Tenir dans la durée n'est pas abandonner | « C'est à moi de le faire » | Le relais protège aussi celui qui aide | J'ai besoin de relais |
| Parent d'un enfant en situation de handicap | Un relais formé, qui apprend votre enfant une fois pour toutes | « Je vais devoir tout réexpliquer » | Fiche de vie de l'enfant, intervenants attitrés `[E2]` | Je décris les besoins de mon enfant |
| Adulte en situation de handicap | Vous décidez, nous suivons | « On va m'imposer un planning » | Planning construit avec vous, modifiable | Je décris mon organisation |
| Personne âgée | De l'aide, sans perdre la main | « Je ne veux déranger personne » | Quelques heures pour commencer, à votre rythme | J'appelle un conseiller |
| Prescripteur | Une réponse claire en un appel, un retour à domicile organisé vite `[E4]` | « Ils ne rappellent jamais » | Ligne directe, formulaire express | J'adresse une situation |

### Objections transverses et réponses types

- **« C'est trop cher. »** Le devis est gratuit et détaillé. Les aides (APA, PCH, AEEH, caisses de retraite) et le crédit d'impôt de 50 % réduisent fortement le reste à charge. Montrer un exemple chiffré dès que `content/tarifs.json` est rempli.
- **« Je ne sais pas de quoi j'ai besoin. »** C'est normal. L'évaluation à domicile est gratuite et sert à cela. Tous les formulaires offrent le choix « À définir ensemble ».
- **« Mon proche refuse toute aide. »** Commencer petit, par ce qui lui fait plaisir. Renvoyer vers l'article dédié du magazine.
- **« Et si ça ne se passe pas bien ? »** On change d'intervenant. La prestation se modifie ou s'arrête à tout moment, dans le respect de la réglementation applicable.
- **« Je ne veux pas de paperasse. »** En mode prestataire, Youdom Care est l'employeur : vous ne gérez rien. En mode mandataire, vous êtes l'employeur et nous gérons les formalités pour vous.

## 4. Page d'accueil — textes complets

### Bloc 1 — Bannière

- Sur-titre : **Aide et accompagnement à domicile · Paris et Île-de-France**
- H1 : **Vivre chez soi, bien accompagné. Même quand la maladie ou le handicap compliquent tout.**
- Chapô : Alzheimer, Parkinson, sclérose en plaques, handicap de l'enfant ou de l'adulte, grand âge : chaque situation est unique. Youdom Care construit un accompagnement sur mesure, de quelques heures par semaine à une présence 24h/24. Pour la personne que vous aimez. Et pour vous, qui tenez tout à bout de bras.
- Bouton principal : **Être rappelé(e)** · Bouton secondaire : **Je décris ma situation** · Lien : **Ou appelez le {téléphone}**
- Ligne de réassurance : Évaluation à domicile gratuite · Sans engagement · Crédit d'impôt de 50 %*

### Bloc 2 — Les situations

- H2 : **Que vivez-vous en ce moment ?**
- Texte : Choisissez ce qui vous ressemble le plus. Nous vous emmenons au bon endroit.

| Carte | Titre | Texte | Lien |
| --- | --- | --- | --- |
| 1 | « Un diagnostic vient de tomber » | Alzheimer, Parkinson, sclérose en plaques… Vous cherchez comment organiser la suite. | Voir l'accompagnement par maladie |
| 2 | « Mon parent ne peut plus rester seul » | Chutes, oublis, repas sautés : il est temps d'une présence régulière. | Voir l'aide aux personnes âgées |
| 3 | « Mon enfant a besoin de quelqu'un de formé » | Autisme, polyhandicap, handicap moteur : un relais qui comprend votre enfant. | Voir l'accompagnement des enfants |
| 4 | « Je veux garder la main sur mon quotidien » | Vous vivez avec un handicap et vous décidez de votre vie. Nous suivons. | Voir l'aide aux adultes |
| 5 | « Il sort de l'hôpital dans quelques jours » | Nous organisons le retour à la maison, vite et bien. | Préparer une sortie d'hospitalisation |
| 6 | « Je n'en peux plus, j'ai besoin de relais » | Quelques heures, une nuit, un week-end : vous avez le droit de vous reposer. | Voir les solutions pour les aidants |

### Bloc 3 — Ce qui change avec Youdom Care

- H2 : **Ce qui change avec Youdom Care**

1. **Des intervenants formés à la situation, pas seulement au métier.** Accompagner une personne atteinte de la maladie de Parkinson ne s'improvise pas. Accompagner un enfant autiste non plus. Nos auxiliaires de vie sont préparés à ce qu'ils vont réellement rencontrer chez vous. `[E1]`
2. **Des visages connus, pas un défilé.** Une petite équipe stable autour de chaque personne, présentée avant de commencer. `[E2]`
3. **Un suivi que vous pouvez lire.** Un référent unique, un cahier de liaison, des points réguliers : vous savez ce qui se passe, même à distance. `[E3]`
4. **Là quand ça se complique.** Nuits, week-ends, jours fériés, présence 24h/24, retour d'hôpital à organiser en urgence. `[E4]`

### Bloc 4 — Maladies neurodégénératives

- H2 : **Alzheimer, Parkinson, sclérose en plaques : un accompagnement qui évolue avec la maladie**
- Texte : Une maladie neurodégénérative ne se vit pas de la même façon à l'annonce du diagnostic, trois ans plus tard, ou quand une présence devient nécessaire jour et nuit. Notre accompagnement change avec elle. Et chaque personne reste unique : son histoire, ses goûts et ses habitudes guident tout ce que nous faisons.
- Trois cartes : **Au début : préserver les habitudes** · **Quand la maladie avance : sécuriser et stimuler** · **Quand tout devient difficile : une présence continue**
- Bouton : **Voir l'accompagnement par maladie**

### Bloc 5 — La semaine type

- H2 : **À quoi ressemble une semaine avec nous ?**
- Texte : Trois exemples, parmi des centaines de possibles. Votre semaine, nous la construisons avec vous.
- Onglets : « Madeleine, 82 ans, maladie d'Alzheimer » · « Noé, 8 ans, autisme » · « Bernard, 74 ans, retour d'hospitalisation ». Mention visible sous la grille : *Exemple illustratif.*
- Bouton : **Je compose ma semaine**

### Bloc 6 — Comment ça commence

- H2 : **Comment ça commence**

1. **Nous vous écoutons.** Un appel d'un quart d'heure pour comprendre la situation. Sans jargon, sans engagement.
2. **Nous venons vous voir.** Une évaluation gratuite à domicile, avec la personne et ses proches. Vous recevez un devis détaillé et gratuit.
3. **Nous vous présentons la bonne personne.** Vous rencontrez l'intervenant avant de commencer. Si le courant ne passe pas, nous changeons. `[E2]`
4. **Nous ajustons, ensemble.** Votre référent suit la situation et adapte le planning quand les besoins évoluent. À tout moment, vous pouvez modifier ou arrêter l'accompagnement, dans le respect de la réglementation applicable.

### Bloc 7 — Le prix

- H2 : **Combien ça coûte, vraiment ?**
- Texte : Le prix dépend du nombre d'heures et du type d'accompagnement. Vous recevez un devis gratuit et détaillé après l'évaluation. Plusieurs aides peuvent réduire fortement votre reste à charge.
- Carte « Nos tarifs » : prix horaire TTC, exemple mensuel, mode d'intervention. Bouton : **Je consulte les tarifs**
- Carte « Les aides possibles » : APA, PCH, AEEH, caisses de retraite, CESU, crédit d'impôt de 50 %. Bouton : **Je découvre les aides**

### Bloc 8 — Les proches

- H2 : **Et vous, qui prend soin de vous ?**
- Texte : Aider un proche, c'est souvent s'oublier. S'organiser pour tenir, ce n'est pas abandonner : c'est durer. Nous prenons le relais quelques heures, une nuit, un week-end. Pour que vous redeveniez sa fille, son fils, son conjoint, son parent. Pas seulement son aidant.
- Bouton : **J'ai besoin de relais**

### Bloc 9 — Le territoire

- H2 : **Partout à Paris et en Île-de-France**
- Texte : {nombre d'agences} agences, huit départements. Indiquez votre commune : nous vous répondons tout de suite. (Le nombre est calculé depuis `site.config.json`, jamais écrit en dur.)
- Champ : « Votre commune ou votre code postal » · Bouton : **Vérifier**
- Réponse positive : « Oui, nous intervenons à {commune}. Votre agence la plus proche : {agence}. »

### Bloc 10 — Le magazine

- H2 : **Le Fil, le magazine qui aide ceux qui aident**
- Trois derniers articles. Bouton : **Lire Le Fil**

### Bloc 11 — Appel final

- H2 : **Parlons de votre situation.**
- Texte : Un conseiller vous écoute, vous explique les solutions et les aides, et vous dit franchement si nous sommes la bonne réponse.
- Boutons : **Être rappelé(e)** · **Je décris ma situation** · **J'appelle le {téléphone}**

### Bloc 12 — Recrutement

- Texte : **Vous êtes auxiliaire de vie ?** Rejoignez une équipe qui forme, écoute et respecte ses intervenants. · Lien : **Voir les offres**

### Mention légale du crédit d'impôt (pied de bloc)

\* Crédit d'impôt de 50 % des sommes versées, dans les limites et conditions de l'article 199 sexdecies du Code général des impôts. L'avance immédiate est un service de l'Urssaf, soumis à conditions d'éligibilité.

## 5. Titres moteurs des pages piliers

| Page | H1 | Première phrase |
| --- | --- | --- |
| Maladies neurodégénératives | Maladies neurodégénératives : un accompagnement à domicile qui évolue avec la personne | Aucune maladie ne se vit deux fois de la même façon. Aucun accompagnement ne devrait se ressembler. |
| Alzheimer | Maladie d'Alzheimer : rester chez soi, en sécurité, avec ses repères | La maison est souvent le dernier repère solide. Nous aidons à le garder. |
| Parkinson | Maladie de Parkinson : une aide à domicile réglée sur le rythme de la maladie | Avec Parkinson, tout est question de moment. Nous organisons la journée autour des bons moments. |
| Sclérose en plaques | Sclérose en plaques : de l'aide à domicile pour garder votre énergie pour l'essentiel | La fatigue décide de trop de choses. Reprenons-lui du terrain. |
| Personnes âgées | Aide à domicile pour personnes âgées : rester chez soi, sans rester seul | Vieillir chez soi est un projet. Nous l'organisons avec vous. |
| Adultes en situation de handicap | Aide à domicile et handicap : vous décidez, nous suivons | Votre quotidien, vos choix, vos horaires. Notre rôle : les rendre possibles. |
| Enfants en situation de handicap | Accompagnement à domicile des enfants en situation de handicap : un relais qui connaît votre enfant | Vous ne devriez pas avoir à tout réexpliquer chaque semaine. |
| Aidants | Aidants : vous avez le droit d'être relayé | Tenir dans la durée, ce n'est pas abandonner. C'est la condition pour continuer. |
| Garde de nuit | Garde de nuit à domicile : des nuits sûres pour lui, du sommeil pour vous | La nuit, tout paraît plus grave. Une présence change tout. |
| Présence 24h/24 | Présence à domicile 24h/24 : l'alternative à l'établissement | Rester chez soi, même quand une présence continue devient nécessaire. |
| Sortie d'hospitalisation | Sortie d'hospitalisation : un retour à la maison organisé en 48 heures `[E4]` (si E4 n'est pas validé : « Sortie d'hospitalisation : un retour à la maison bien préparé ») | L'hôpital annonce la sortie pour après-demain. Voici comment nous nous organisons. |
| Tarifs et aides | Tarifs et aides : ce que vous paierez vraiment | Un prix clair, un devis gratuit, et toutes les aides auxquelles vous avez droit. |
| Prestataire ou mandataire | Prestataire ou mandataire : quel mode choisir ? | Deux façons d'être accompagné. Une seule question : voulez-vous être l'employeur ? |

## 6. Bibliothèque de boutons

| Intention | Libellé |
| --- | --- |
| Rappel | Être rappelé(e) |
| Appel | J'appelle un conseiller |
| Demande détaillée | Je décris ma situation |
| Planning | Je compose ma semaine |
| Évaluation | Je demande une évaluation gratuite |
| Budget | J'estime mon budget |
| Sortie d'hôpital | Je prépare un retour à domicile |
| Aidant | J'ai besoin de relais |
| Enfant | Je décris les besoins de mon enfant |
| Prescripteur | J'adresse une situation |
| Candidat | Je postule |
| Lecture | Lire l'article · Voir l'accompagnement · Je découvre les aides |

Règle : jamais « Envoyer », « Valider », « Cliquez ici », « En savoir plus ». Un lien dit où il mène.

## 7. Microtextes des formulaires

| Élément | Texte |
| --- | --- |
| Accroche | Deux à trois minutes. Aucune question n'est obligatoire, sauf vos coordonnées. |
| Étape « Pour qui ? » | Pour qui cherchez-vous de l'aide ? |
| Étape « Situation » | Dites-nous l'essentiel. Vous pourrez tout préciser au téléphone. |
| Étape « Besoins » | De quoi avez-vous besoin ? Plusieurs choix possibles. |
| Choix ouvert | À définir ensemble |
| Étape « Planning » | Quand souhaitez-vous de l'aide ? Touchez les créneaux, ou choisissez un raccourci. |
| Raccourcis | Tous les jours · Du lundi au vendredi · Le week-end · Toutes les nuits · 24h/24, 7j/7 |
| Estimation | Environ {h} heures par semaine. Ce n'est qu'une base : nous l'ajusterons ensemble. |
| Étape « Coordonnées » | Où pouvons-nous vous joindre ? |
| Créneau de rappel | Quand préférez-vous être rappelé(e) ? |
| Consentement | J'accepte que Youdom Care utilise ces informations, y compris celles qui concernent la santé de la personne à accompagner, pour me recontacter et préparer une proposition. |
| Erreur de champ | Il manque {champ}. Nous en avons besoin pour vous rappeler. |
| Téléphone invalide | Ce numéro semble incomplet. Pouvez-vous le vérifier ? |
| Hors Île-de-France | Nous intervenons à Paris et en Île-de-France. Pour cette commune, nous ne pourrons pas vous aider, mais les sites pour-les-personnes-agees.gouv.fr et monparcourshandicap.gouv.fr recensent les services près de chez vous. |
| Envoi impossible | L'envoi n'a pas abouti. Vos réponses sont conservées sur cet écran. Réessayez, ou appelez-nous au {téléphone}. |
| Succès | Merci. Votre demande est arrivée. Un conseiller vous rappelle {délai}. `[E5]` En cas d'urgence, appelez le {téléphone}. |

Si `contact.delai_rappel` est vide, la phrase devient : « Un conseiller vous rappelle dès que possible. »

## 8. Balises titre et descriptions (modèles)

Titres de 50 à 60 caractères, descriptions de 140 à 155 caractères, uniques, contrôlés par `pnpm validate`.

| Page | Titre | Description |
| --- | --- | --- |
| Accueil | Aide à domicile spécialisée à Paris et en Île-de-France | Alzheimer, Parkinson, handicap, grand âge : un accompagnement à domicile sur mesure, jusqu'à 24h/24, à Paris et en Île-de-France. Évaluation gratuite. |
| Alzheimer | Aide à domicile Alzheimer à Paris et en Île-de-France | Des auxiliaires de vie formés à la maladie d'Alzheimer, un accompagnement par stade, du relais pour les proches. Évaluation gratuite à domicile. |
| Garde de nuit | Garde de nuit à domicile à Paris et en Île-de-France | Présence de nuit calme ou active, ponctuelle ou régulière, auprès d'une personne âgée, malade ou en situation de handicap. Devis gratuit et détaillé. |
| Page locale | Aide à domicile à {Commune} ({CP}) — Youdom Care | Rédigée à la main pour chaque page à partir des faits locaux ; jamais de modèle à trous. |

Le nom de marque est ajouté par le gabarit (` | Youdom Care`) quand la longueur le permet.

## 9. E-mails

**Accusé de réception au demandeur** (aucune donnée de santé, aucun détail de la demande).

- Objet : Nous avons bien reçu votre demande — Youdom Care
- Corps : Bonjour {prénom}, votre demande est bien arrivée. Un conseiller vous rappelle {délai} au numéro que vous nous avez indiqué. D'ici là, vous pouvez nous joindre au {téléphone}. À très vite. L'équipe Youdom Care — Vous, chez vous. Nous, à vos côtés.

**Alerte à l'équipe** : structure décrite dans `docs/05`. Objet sans donnée de santé : « Nouvelle demande — {type de formulaire} — {commune} — {urgence} ».

## 10. Manifeste (page À propos)

Nous croyons que personne ne devrait avoir à choisir entre rester chez soi et être bien accompagné.

Nous croyons qu'une maladie ne résume pas une personne. Qu'un enfant n'est pas son diagnostic. Qu'un grand âge n'est pas une fin de choix.

Nous croyons qu'aider quelqu'un chez lui est un métier, qui s'apprend, qui se prépare, et qui mérite d'être respecté.

Nous croyons que les proches ont le droit de rester des proches. D'être une fille, un mari, une mère. Pas un planning.

Alors nous faisons une chose, et nous la faisons avec soin : nous venons chez vous, et nous restons à vos côtés.

Vous, chez vous. Nous, à vos côtés.
