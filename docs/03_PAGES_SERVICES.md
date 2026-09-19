# 03 — Pages services et pathologies, au cas par cas

Principe : **chaque page traite une situation précise, pour un lecteur précis, avec des exemples, le suivi, et la place des proches.** Aucune page « fourre-tout ». Chaque personne accompagnée est unique : les pages le disent et le montrent (stades, exemples variés, planning modulable).

## 1. Règles de contenu santé (obligatoires)

1. **Informer, jamais soigner.** Pas de conseil de traitement, pas de posologie, pas de promesse d'amélioration. On décrit ce que la maladie change au quotidien et ce que l'accompagnement apporte.
2. **Sources reconnues, citées et datées.** HAS, Inserm, Assurance Maladie (ameli.fr), Santé publique France, CNSA, service-public.fr, pour-les-personnes-agees.gouv.fr, monparcourshandicap.gouv.fr, et les associations nationales de chaque pathologie. Une URL n'est citée que si elle a été ouverte avec succès pendant la rédaction. Les chiffres (prévalence, montants d'aides) sont repris de ces sources avec leur année, jamais de mémoire.
3. **Relecture professionnelle.** Chaque page pathologie porte `statut: a_relire` jusqu'à ce qu'Arcel renseigne `relu_par` (nom, fonction, date). Sans cela, la page n'est pas construite en production.
4. **Frontière claire avec le soin.** Encart obligatoire « Ce que nous ne faisons pas » : les soins infirmiers, les actes médicaux, les décisions de traitement relèvent des professionnels de santé, avec lesquels nous nous coordonnons (infirmiers, SSIAD, HAD, kinésithérapeutes, orthophonistes, médecins). L'aide à la prise de médicaments se limite au cadre légal (à valider par Arcel, question ouverte Q-LEGAL-2).
5. **Dignité.** Pas de photo ni de formulation qui réduit la personne à ses incapacités. Pas de dramatisation.

## 2. Gabarit commun : 13 sections

| N° | Section | Contenu |
| --- | --- | --- |
| 1 | Bannière | H1 orienté situation, deux phrases de promesse, boutons, ligne de réassurance |
| 2 | « Vous vous reconnaissez ? » | 3 à 5 situations vécues, écrites du point de vue du proche ou de la personne |
| 3 | « Ce que nous faisons, concrètement » | Gestes du quotidien · présence et sécurité · lien social et stimulation · coordination. Verbes d'action, exemples précis |
| 4 | « Un accompagnement qui évolue » | Par stade, par âge ou par phase. Ce qui change dans l'aide à chaque étape |
| 5 | « Exemple de semaine » | Composant `WeekPlanner` en lecture + récit de 80 à 120 mots. Prénom fictif, mention « Exemple illustratif » |
| 6 | « Le suivi » | `FollowUpTimeline` : évaluation, présentation de l'intervenant, premier bilan, points réguliers, réévaluation, lien avec les soignants. Engagements `[E2]`, `[E3]` |
| 7 | « Et pour vous, les proches » | Ce que l'accompagnement change pour la famille ; solutions de répit ; lien vers l'espace Aidants |
| 8 | « Qui intervient ? » | Profil, sélection, préparation spécifique à la situation `[E1]` |
| 9 | « Ce que nous ne faisons pas » | Encart de franchise (règle 4) |
| 10 | « Combien ça coûte, quelles aides ? » | `PriceCard` + aides pertinentes pour ce public |
| 11 | Questions fréquentes | 6 à 8 questions réelles, réponses de 40 à 90 mots |
| 12 | Formulaire dédié | Première étape du formulaire du cas, intégrée dans la page (`docs/05`) |
| 13 | Sources et relecture | Liste des sources, auteur, relecteur, date de mise à jour |

Longueur : 1 200 à 1 800 mots pour une page pathologie ou service, 1 500 à 2 200 pour un pilier. Chaque page a un fichier MDX avec un en-tête validé par Zod : `titre`, `description`, `public`, `h1`, `chapo`, `situations[]`, `actions[]`, `stades[]`, `semaine_type`, `aides[]`, `faq[]`, `sources[]`, `formulaire`, `statut`, `relu_par`, `maj`.

Maillage obligatoire : chaque page renvoie vers son pilier, deux pages sœurs, la page tarifs et aides concernée, un à trois articles du magazine, le lexique pour chaque sigle, et la recherche par commune.

## 3. Pilier « Maladies neurodégénératives »

- **Lecteur** : l'enfant adulte ou le conjoint, juste après un diagnostic ou à un tournant de la maladie.
- **Promesse** : un accompagnement qui change avec la maladie, et qui tient compte de la personne avant tout.
- **Structure propre** : définition simple (ce que ces maladies ont en commun : évolution progressive, besoins qui changent, place centrale des proches) · les sept maladies en cartes · les trois temps de l'accompagnement (au début, quand la maladie avance, quand une présence continue devient nécessaire) · le suivi · le relais des proches · les aides (APA après 60 ans, PCH avant, affection de longue durée, crédit d'impôt) · FAQ · formulaire « neuro ».
- **FAQ** : Peut-on rester chez soi jusqu'au bout ? · À quel moment faire appel à une aide ? · Est-ce toujours le même intervenant ? · Intervenez-vous la nuit et le week-end ? · Que se passe-t-il quand les besoins augmentent vite ? · Travaillez-vous avec le neurologue, l'infirmier, l'accueil de jour ? · Quelles aides financent l'accompagnement ?

### 3.1 Alzheimer et maladies apparentées

- **Ce que vivent les familles** : des oublis qui deviennent dangereux (gaz, porte, médicaments), des questions répétées, la désorientation, le refus de la toilette, l'agitation en fin de journée, les nuits inversées, la peur qu'il sorte seul, l'épuisement du conjoint.
- **Ce que fait l'intervenant** : les mêmes visages et les mêmes horaires, parce que la routine rassure · des phrases courtes, une consigne à la fois, ne jamais mettre en échec, accueillir l'émotion plutôt que corriger · des activités qui ont du sens pour cette personne-là (cuisiner, chanter, trier des photos, jardiner), pas des exercices · une toilette au rythme de la personne, dans le respect de sa pudeur · des repas qui restent un plaisir, avec attention à l'hydratation et au poids · des sorties accompagnées · une sécurisation discrète du logement · une présence aux heures difficiles (fin de journée, nuit).
- **Par stade** : *début* : faire avec, pas à la place ; rappels, rendez-vous, relais du conjoint · *stade modéré* : présence quotidienne, aide aux gestes, sécurité, stimulation, articulation avec l'accueil de jour et l'équipe spécialisée Alzheimer · *stade avancé* : présence étendue ou continue, confort, alimentation, coordination étroite avec les soignants, soutien du proche.
- **Semaine type** (Madeleine, 82 ans, vit avec son mari) : tous les matins 8h–11h (lever, toilette, petit-déjeuner, activité) · mardi et jeudi 14h–17h (sortie, courses) · deux nuits par semaine pour que son mari dorme.
- **Ressources à présenter** : consultation mémoire, équipe spécialisée Alzheimer (ESA) sur prescription, accueil de jour, plateforme d'accompagnement et de répit, formation des aidants de France Alzheimer, APA, mesures de protection juridique.
- **Sources** : HAS (parcours de soins), Inserm, pour-les-personnes-agees.gouv.fr, France Alzheimer, Fondation Médéric Alzheimer, Assurance Maladie.
- **Requêtes visées** : aide à domicile Alzheimer, auxiliaire de vie Alzheimer, maintien à domicile Alzheimer, garde de nuit Alzheimer.

### 3.2 Maladie de Parkinson

- **Ce que vivent les familles** : des journées en dents de scie (périodes où tout va, périodes de blocage), la lenteur mal comprise, le pied qui « colle » dans un passage de porte, les chutes, la voix qui faiblit, les fausses routes, la fatigue, l'anxiété, et l'importance capitale des horaires de médicaments.
- **Ce que fait l'intervenant** : organise la toilette, les sorties et les repas sur les bons moments de la journée · veille aux horaires de prise, dans le cadre légal · laisse le temps, encourage à faire soi-même · applique les repères appris avec le kinésithérapeute quand la marche se bloque · prévient les chutes (chaussures, tapis, éclairage, désencombrement) · respecte les textures et positions recommandées par l'orthophoniste au repas · accompagne aux séances de kinésithérapie et d'orthophonie · encourage l'activité physique prescrite.
- **Par stade** : *début* : aide ponctuelle, accompagnement aux rendez-vous, entretien du logement pour préserver l'énergie · *fluctuations* : présence calée sur les périodes difficiles, aide aux gestes · *stade avancé* : présence étendue, transferts, nuits, coordination avec les soignants.
- **Semaine type** (Jacques, 71 ans) : tous les jours 7h30–9h30 (médicaments à l'heure, lever, toilette, petit-déjeuner) · mardi et vendredi, accompagnement chez le kinésithérapeute · mercredi après-midi, marche au parc.
- **Ressources** : centres experts Parkinson, France Parkinson (comités locaux, écoute), éducation thérapeutique, affection de longue durée, APA ou PCH selon l'âge.
- **Sources** : HAS, Inserm, Assurance Maladie, France Parkinson.

### 3.3 Sclérose en plaques

- **Lecteur** : souvent la personne elle-même, adulte jeune, active, parfois parent de jeunes enfants.
- **Ce qu'elle vit** : une fatigue que personne ne voit, des poussées imprévisibles, la chaleur qui aggrave tout, des troubles de l'équilibre, de la vue, de la vessie, et la phrase « tu as l'air en forme ».
- **Ce que fait l'intervenant** : prend en charge ce qui épuise (ménage, linge, courses, repas) pour que l'énergie aille à l'essentiel : travail, enfants, projets · aide à la toilette et aux transferts si besoin · s'occupe des enfants à la sortie de l'école · augmente vite le nombre d'heures pendant une poussée, puis le réduit · respecte les choix de vie et l'organisation de la personne.
- **Par phase** : *vie active avec fatigue* · *pendant et après une poussée* · *handicap installé* (aide humaine financée par la PCH).
- **Semaine type** (Claire, 38 ans, deux enfants) : lundi, mercredi, vendredi 9h–12h (logement, linge, repas de la semaine) · mardi et jeudi 16h30–19h (sortie d'école, devoirs, dîner).
- **Ressources** : MDPH et PCH, reconnaissance de la qualité de travailleur handicapé, centres de ressources et de compétences SEP, réseaux de santé SEP d'Île-de-France, Fondation ARSEP, Ligue française contre la sclérose en plaques, APF France handicap.
- **Sources** : HAS, Inserm, Assurance Maladie, ARSEP.

### 3.4 Maladie à corps de Lewy

- **Spécificités** : vigilance et lucidité qui fluctuent d'une heure à l'autre, hallucinations visuelles, lenteur et raideur proches de Parkinson, sommeil très agité, chutes, sensibilité particulière à certains médicaments (toute question de traitement relève du médecin).
- **Ce que fait l'intervenant** : s'adapte aux fluctuations sans y voir de la mauvaise volonté · ne nie pas les hallucinations, rassure et détourne l'attention · sécurise les déplacements · assure des présences de nuit · note les changements pour les transmettre aux proches et aux soignants.
- **Ressources** : consultation mémoire, association des aidants et malades à corps de Lewy (A2MCL), APA.

### 3.5 Dégénérescence fronto-temporale

- **Spécificités** : débute souvent avant 65 ans · d'abord le comportement (désinhibition, apathie, conduites alimentaires, perte d'empathie) ou le langage, avec une mémoire longtemps préservée · choc conjugal, familial et professionnel · enfants parfois encore à la maison.
- **Ce que fait l'intervenant** : pose un cadre stable et prévisible · prévient les mises en danger (achats compulsifs, sorties, conduite automobile signalée à la famille) · accompagne les repas · propose des sorties et activités physiques · offre du relais au conjoint et aux enfants.
- **Ressources** : PCH avant 60 ans, association France-DFT, centres de référence des démences rares ou précoces, mesures de protection juridique.

### 3.6 Maladie de Charcot (SLA)

- **Spécificités** : évolution rapide, perte de force, puis parole, déglutition et respiration atteintes, avec une pensée le plus souvent intacte : la personne décide de tout, jusqu'au bout.
- **Ce que fait l'intervenant** : transferts et installation avec les aides techniques (lève-personne, fauteuil) · confort et changements de position · communication alternative (tableau de lettres, tablette, commande oculaire) apprise avec l'ergothérapeute · repas adaptés selon l'avis de l'orthophoniste · présence longue, jusqu'à 24h/24, en équipe qui se relaie · une longueur d'avance : chaque adaptation se prépare avant d'être urgente.
- **Frontière avec le soin** : ventilation, alimentation par sonde et aspirations relèvent des soignants et de l'hospitalisation à domicile ; nous nous coordonnons avec eux.
- **Ressources** : centres SLA d'Île-de-France, filière FILSLAN, ARSLA (prêt de matériel, soutien), PCH en procédure d'urgence auprès de la MDPH.

### 3.7 Maladie de Huntington

- **Spécificités** : maladie héréditaire qui débute souvent entre 30 et 50 ans · mouvements involontaires, difficultés d'organisation, irritabilité ou dépression, amaigrissement malgré de gros besoins en calories, fausses routes, chutes · des familles touchées sur plusieurs générations : l'aidant est parfois lui-même concerné.
- **Ce que fait l'intervenant** : repas fréquents et enrichis selon l'avis du diététicien, dans le calme · sécurisation du logement · routines stables · patience face à l'irritabilité, sans la prendre pour soi · présence et sorties · relais du proche.
- **Ressources** : centre national de référence (hôpital Henri-Mondor, Créteil, à vérifier), Association Huntington France, PCH.

## 4. Pilier « Personnes âgées »

- **Lecteur** : l'enfant adulte, à 70 % ; la personne elle-même, à 30 %. Une version « Pour vous-même » du chapô s'affiche par un sélecteur en haut de page.
- **Situations vécues** : « Elle est tombée deux fois ce mois-ci » · « Il ne mange plus que du pain et du fromage » · « Elle ne sort plus » · « Je passe tous les soirs après le travail, je n'y arrive plus » · « Il sort de l'hôpital vendredi ».
- **Sous-pages** : *Aide à l'autonomie* (lever, coucher, toilette, habillage, prise des repas, déplacements dans le logement) · *Vie quotidienne* (courses, cuisine, linge, entretien du logement, démarches simples) · *Compagnie et stimulation* (conversation, jeux, lecture, promenades, sorties culturelles, stimulation cognitive par des activités choisies).
- **Par phase** : *un coup de main* (2 à 6 h par semaine) · *une présence quotidienne* · *une présence étendue, jour et nuit*.
- **Semaine type** (Suzanne, 88 ans, vit seule) : lundi au samedi 8h30–10h (lever, toilette, petit-déjeuner) · lundi et jeudi 11h–13h (courses, cuisine) · mercredi 15h–17h (promenade, jeux).
- **Aides** : APA, aides des caisses de retraite, aide après hospitalisation, crédit d'impôt de 50 %, CESU préfinancés.
- **FAQ** : Quelle différence entre aide à domicile et auxiliaire de vie ? · Combien d'heures faut-il prévoir ? · Intervenez-vous en résidence seniors ? · Que se passe-t-il en cas d'absence de l'intervenant ? · Pouvez-vous commencer en urgence ? · Comment obtenir l'APA ?

## 5. Pilier « Adultes en situation de handicap »

- **Lecteur** : la personne elle-même. Ton d'égal à égal. Titre : « Vous décidez, nous suivons ».
- **Situations** : handicap moteur (paraplégie, tétraplégie, paralysie cérébrale), suites d'AVC ou de traumatisme crânien, maladies invalidantes, handicap sensoriel, handicap cognitif ou psychique stabilisé (si Youdom Care l'accompagne : question Q-OFFRE-3).
- **Ce que nous faisons** : aide aux gestes essentiels, transferts avec aides techniques, repas, entretien du logement, accompagnement aux sorties, au travail, aux loisirs, aide aux démarches simples, soutien à la parentalité, présence de nuit et 24h/24.
- **Spécifique** : le plan d'aide humaine de la PCH, expliqué simplement (heures accordées, choix du mode prestataire ou mandataire, ce que cela change) · la continuité (remplacements) · le respect des horaires de vie de la personne, y compris tardifs.
- **Semaine type** (Karim, 34 ans, tétraplégique, salarié) : tous les jours 6h30–8h30 (lever, toilette, habillage, petit-déjeuner) et 20h30–22h30 (coucher) · samedi après-midi (sortie).
- **Ressources** : MDPH de chaque département, monparcourshandicap.gouv.fr, APF France handicap, services d'accompagnement (SAVS, SAMSAH).

## 6. Pilier « Enfants en situation de handicap »

- **Lecteur** : le parent. Il a déjà tout expliqué dix fois. Première promesse : « Vous ne devriez pas avoir à tout réexpliquer chaque semaine. »
- **Outil central** : la **fiche de vie de l'enfant** (ce qu'il aime, ce qui l'apaise, ce qui le met en difficulté, comment il communique, ses routines, ses protocoles), remplie avec les parents avant de commencer, connue de chaque intervenant `[E2]`.
- **Moments couverts** : sortie d'école, d'IME ou de SESSAD · mercredis · vacances scolaires · soirées · week-ends · nuits · accompagnement aux rééducations · présence à l'hôpital aux côtés des parents.
- **Et la fratrie** : du temps rendu aux parents pour les frères et sœurs. Une section leur est consacrée.
- **Aides** : AEEH et ses compléments, PCH enfant et droit d'option, allocation journalière de présence parentale, crédit d'impôt, CESU. Conditions d'intervention auprès de mineurs : agrément ou autorisation requis (question Q-LEGAL-1).

| Sous-page | Spécificités à traiter |
| --- | --- |
| Autisme (TSA) | Prévisibilité et routines visuelles · communication (pictogrammes, signes, tablette) selon les choix de la famille et des professionnels · particularités sensorielles · intérêts de l'enfant comme leviers · gestion des moments de crise sans contrainte · continuité avec le SESSAD, l'école, les libéraux · ressources : plateformes de coordination et d'orientation, centre de ressources autisme Île-de-France, Autisme France |
| Polyhandicap | Installations et changements de position · transferts avec matériel · communication non verbale : observer, apprendre les signes de confort et d'inconfort · conduite à tenir en cas de crise d'épilepsie selon le protocole fixé par le médecin et les parents · nuits · frontière stricte avec les soins · ressources : Groupe Polyhandicap France, CESAP |
| Handicap moteur | Autonomie maximale : laisser faire, aider juste ce qu'il faut · aides techniques · accompagnement aux séances de kinésithérapie et d'ergothérapie · loisirs et sorties accessibles · ressources : APF France handicap, Fondation Paralysie Cérébrale |
| Déficience intellectuelle | Apprentissages du quotidien (s'habiller, préparer un goûter, trajets) · loisirs inclusifs · passage à l'adolescence et à l'âge adulte · ressources : Unapei, Trisomie 21 France |

- **Semaine type** (Noé, 8 ans, autiste) : lundi, mardi, jeudi, vendredi 16h15–19h (sortie d'école, goûter, temps calme, jeux, bain) · mercredi 13h30–18h (orthophonie, parc) · un samedi sur deux 10h–17h (relais des parents).

## 7. Espace « Aidants »

- **Lecteur** : celui qui aide, et qui ne se reconnaît pas toujours dans le mot « aidant ».
- **Page pilier** : reconnaître la fatigue sans culpabiliser · ce que le relais change, pour les deux · les formes de relais (quelques heures, une journée, une nuit, un week-end, des vacances) · les droits : droit au répit dans le cadre de l'APA, congé de proche aidant, allocation journalière du proche aidant, plateformes d'accompagnement et de répit, formations gratuites des associations · les ressources : Association française des aidants, Ma Boussole Aidants.
- **« Où en êtes-vous ? »** : huit questions originales à réponse simple (sommeil, temps pour soi, isolement, santé négligée, irritabilité, avenir…). Résultat en trois niveaux de conseils pratiques. **Ce n'est pas un test médical** : pas de score clinique, pas de reprise d'une échelle publiée, aucune donnée conservée ni transmise, mention claire en tête. Se termine par « J'ai besoin de relais ».
- **Solutions de répit** : relais à domicile par Youdom Care, accueil de jour, hébergement temporaire, séjours de vacances-répit, avec liens officiels.

## 8. Services transverses

| Page | Ce qu'elle doit expliquer |
| --- | --- |
| Garde de nuit | Nuit calme (l'intervenant dort sur place et se lève au besoin) et nuit active (l'intervenant veille) · pour qui · déroulé d'une nuit · régulier ou ponctuel · cadre du temps de travail selon le mode (à valider) · prix |
| Présence 24h/24 | Une équipe de plusieurs intervenants qui se relaient, jamais une seule personne · organisation type sur une semaine (grille) · coordination par le référent · comparaison honnête avec l'entrée en établissement : avantages, limites, budget |
| Sortie d'hospitalisation | Les 48 heures qui précèdent le retour · ce que nous organisons (présence dès le premier jour, courses, repas, aide aux gestes, vigilance) · lien avec l'assistante sociale de l'hôpital · aides après hospitalisation (caisses de retraite, mutuelles) · formulaire express |
| Garde-malade | Présence de jour ou de nuit auprès d'une personne malade ou en convalescence · ce que c'est, ce que ce n'est pas (pas de soins) |
| Accompagnement en vacances | Partir avec son intervenant ou être accompagné sur place · conditions · exemples |
| Remplacement d'auxiliaire de vie | Votre salarié ou votre service habituel est absent · relais temporaire · délais `[E4]` |

## 9. Pages de fonctionnement et d'entreprise

- **Comment ça marche** : les quatre étapes de `docs/01`, le suivi détaillé, « et si ça ne va pas ? », questions fréquentes.
- **Prestataire ou mandataire** : tableau comparatif (qui est l'employeur, qui recrute, qui remplace, qui gère la paie, prix, pour qui c'est adapté) · la question qui tranche : « voulez-vous être l'employeur ? » · mention légale du mode mandataire (voir `docs/07`).
- **Tarifs et aides** : prix par mode et par type d'intervention (jour, nuit, week-end, 24h/24) depuis `content/tarifs.json` · exemples mensuels · frais annexes · devis gratuit · une carte par aide · pages détaillées par aide avec montants repris des sources officielles et lien vers la démarche.
- **Professionnels** : pour les assistantes sociales, médecins, infirmiers coordinateurs, mandataires judiciaires, dispositifs d'appui à la coordination · zones, modes, délais `[E4]`, ce que nous transmettons en retour · formulaire express sans donnée nominative.
- **Recrutement** : ce que Youdom Care offre à ses intervenants (formation, secteur proche du domicile, écoute, planning) selon `content/` · offres réelles en JSON, balisage `JobPosting` · candidature en deux minutes.
- **À propos** : manifeste de `docs/01`, histoire et équipe (si fournies), engagements validés, labels, charte éditoriale.
