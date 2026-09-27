# Questions pour Arcel

Mode d'emploi : répondez sous chaque question (ligne `Réponse :`) ou remplissez directement le fichier indiqué. À l'itération suivante, la loop débloque les tâches liées. Les questions marquées **bloquant production** n'empêchent pas la construction, mais empêchent `pnpm validate --prod` de passer.

## Identité et mentions légales — bloquant production

- **Q-ID-1.** Confirmez les coordonnées reprises du dépliant (téléphones, e-mail, six adresses). Fichier : `content/site.config.json` (videz `a_confirmer` une fois vérifié).
  Réponse :
- **Q-ID-2.** Raison sociale, forme juridique, capital, RCS, numéro de TVA, siège, directeur de la publication, médiateur de la consommation. Fichier : `content/site.config.json > legal`.
  Réponse :
- **Q-ID-3.** Horaires d'accueil téléphonique, existence d'une astreinte 24h/24, horaires d'ouverture de chaque agence (ou « sur rendez-vous »).
  Réponse :
- **Q-ID-4.** Labels et adhésions réellement détenus (fédération, certification qualité, charte nationale qualité…), avec les fichiers de logos autorisés.
  Réponse :

## Cadre légal — bloquant production

- **Q-LEGAL-1.** Déclaration, agrément et autorisations détenus, par département et par public (personnes âgées, personnes en situation de handicap, enfants de moins de 18 ans en situation de handicap, enfants de moins de 3 ans), pour chaque mode (prestataire, mandataire).
  Réponse :
- **Q-LEGAL-2.** Cadre retenu pour l'aide à la prise de médicaments et pour les gestes à la frontière du soin. La formulation du site sera alignée sur votre réponse.
  Réponse :
- **Q-LEGAL-3.** Conditions générales (prestataire et mandataire) en PDF, et texte exact de la mention légale du mode mandataire validé par votre conseil.
  Réponse :
  Note de la loop (2026-09-20) : en attendant, le site affiche la formulation de docs/07 §1 (« Attention, dans le cadre d’un contrat de placement de travailleurs, le consommateur est l’employeur ») via content/interface.json > mandataire_notice ; remplacez ce texte par celui validé par votre conseil.
- **Q-LEGAL-4.** Avis de votre juriste ou délégué à la protection des données sur la réception par e-mail de demandes contenant des données de santé (durée de conservation, accès à la boîte, question de l'hébergement certifié HDS pour la messagerie et le futur CRM).
  Réponse :

## Offre

- **Q-OFFRE-1.** Liste exacte des prestations proposées, et pour chacune le ou les modes (prestataire, mandataire). Fichier : `content/tarifs.json`.
  Réponse :
- **Q-OFFRE-2.** Durée minimale d'une intervention, délais habituels de mise en place, possibilité réelle de démarrage en 48 h.
  Réponse :
- **Q-OFFRE-3.** Accompagnez-vous le handicap psychique ? Les enfants de moins de 3 ans ? Des limites à connaître (poids des transferts, matériel requis, soins techniques) ?
  Réponse :
- **Q-OFFRE-4.** Présence 24h/24 : organisation réelle (nombre d'intervenants en relais, mode prestataire ou mandataire, nuits calmes et nuits actives).

- **Q-OFFRE-5.** Intervenez-vous en résidence autonomie et en résidence services seniors ? La FAQ du pilier « Personnes âgées » (docs/03 §4) répond « nous vous le confirmons dès le premier appel » tant que la règle n’est pas connue.

- **Q-OFFRE-6.** Nuits : cadre du temps de travail d’une nuit calme (présence responsable) et d’une nuit active selon le mode (prestataire, mandataire), conditions matérielles demandées (chambre, lit), tarif de chaque type de nuit. Les pages « Garde de nuit » et « Présence 24h/24 » (docs/03 §8) renvoient à « précisé avant tout engagement » tant que la règle n’est pas connue.
  Réponse :

## Tarifs — bloquant production

- **Q-TARIFS-1.** Prix horaires TTC et HT par prestation et par mode, majorations (nuit, dimanche, jours fériés, 1er mai), forfaits nuit et 24h/24, frais annexes (dossier, déplacement), dégressivité. Fichier : `content/tarifs.json`.
  Réponse :

## Engagements à valider (`content/engagements.json`) — bloquant production

- **E1.** Formation des intervenants par situation : quels modules, quelle durée, quel organisme, pour quelles pathologies et quels handicaps ?
- **E2.** Stabilité : règle sur le nombre d'intervenants par personne, présentation avant le démarrage, remplacement.
- **E3.** Suivi : référent unique ? cahier de liaison ? fréquence des points avec la famille ? réévaluation ?
- **E4.** Réactivité : astreinte, délais réels (sortie d'hospitalisation, remplacement).
- **E5.** Délai de rappel promis après une demande en ligne (exemple : « dans les 2 heures ouvrées »).
  Pour chacun : passez `valide` à `true` et ajustez le texte, ou laissez `false` pour que le site n'en parle pas en production.

## Contenus

- **Q-CONTENU-1.** Histoire de Youdom Care, fondateur, équipe (noms, fonctions, photos) pour la page À propos.
- **Q-CONTENU-2.** Auteurs et relecteurs des contenus de santé (nom, fonction, diplôme) : `content/auteurs/`.
- **Q-CONTENU-3.** Témoignages réels avec accord écrit : `content/temoignages/`.
- **Q-CONTENU-4.** Photos réelles (équipe, interventions, agences) et autorisations de droit à l'image.
- **Q-CONTENU-5.** Offres d'emploi en cours : `content/offres/`.
- **Q-CONTENU-6.** Fichiers du logo (SVG) et déclinaisons.

- **Q-CONTENU-7.** Relectures professionnelles attendues (point de validation 4, phase 4). Chaque page ci-dessous reste `statut: a_relire` (non construite en production, `noindex` en prévisualisation) tant que `relu_par` n'est pas renseigné avec le nom, la fonction et la date du relecteur. Profil suggéré :

  | Pages | Relecteur attendu |
  | --- | --- |
  | `/maladies-neurodegeneratives/` et `/alzheimer/`, `/corps-de-lewy/`, `/degenerescence-fronto-temporale/` | Médecin de consultation mémoire, neurologue ou gériatre ; à défaut, infirmier(ère) coordinateur(rice) d'un service spécialisé |
  | `/maladies-neurodegeneratives/parkinson/`, `/sclerose-en-plaques/` | Neurologue ou infirmier(ère) d'un centre expert Parkinson / d'un réseau SEP |
  | `/maladies-neurodegeneratives/maladie-de-charcot/`, `/maladie-de-huntington/` | Médecin ou infirmier(ère) coordinateur(rice) d'un centre SLA / du centre de référence Huntington |
  | `/personnes-agees/` et ses trois sous-pages | Gériatre, infirmier(ère) coordinateur(rice) de SSIAD ou ergothérapeute |
  | `/adultes-en-situation-de-handicap/` | Ergothérapeute et travailleur social (MDPH, SAVS/SAMSAH) ; relecture par une personne concernée souhaitable |
  | `/enfants-en-situation-de-handicap/` et ses quatre sous-pages | Pédiatre ou médecin de rééducation, éducateur spécialisé, ergothérapeute ; relecture par une association de parents (CRAIF, GPF, APF, Unapei) souhaitable |
  | `/aidants/`, `/aidants/solutions-de-repit/`, questionnaire « Où en êtes-vous ? » | Psychologue ou professionnel d'une plateforme d'accompagnement et de répit |
  | `/services/garde-de-nuit/`, `/presence-24h-24/`, `/garde-malade/`, `/sortie-d-hospitalisation/` | Infirmier(ère) coordinateur(rice) (HAD ou SSIAD) ; pour les nuits et le 24h/24, relecture juridique du cadre du temps de travail (Q-OFFRE-4, Q-OFFRE-6) |
  | `/services/accompagnement-en-vacances/`, `/services/remplacement-d-auxiliaire-de-vie/` | Responsable de secteur Youdom Care et relecture juridique (droit du travail, mode mandataire) |

  Toutes les pages : relecture finale par Arcel pour les faits Youdom Care (Q-OFFRE-1 à Q-OFFRE-6, Q-LEGAL-1, Q-TARIFS-1).

- **Q-CONTENU-8.** Règle des phrases courtes (`docs/01 §2`, moins de 20 mots) : la relecture croisée du point de validation 4 compte des dizaines de phrases plus longues dans les pages services, presque toutes des énumérations après deux-points (« Ce qui aide : … »). Faut-il scinder systématiquement, ou préciser dans `docs/01` que les énumérations font exception ? Le contrôle `check-copy` n'impose aujourd'hui que 30 mots, dans les chapôs.

- **Q-CONTENU-9.** Pages locales (phase 6) : les 131 pages (8 départements, 20 arrondissements, 103 communes) sont en `statut: a_relire`, donc `noindex`, jusqu'à ta relecture. Le rapport `pnpm exec tsx scripts/validate/check-local-uniqueness.ts --report` liste chaque page avec ses mots, ses faits et sa similarité. Passer une page en `publie` dans `content/local/{code}.json` l'indexe.
- **Q-CONTENU-10.** Rattachement des territoires aux agences : le pipeline retient l'agence la plus proche à vol d'oiseau (Paris 8e, 16e, 17e → Puteaux ; Paris 18e, Val-d'Oise nord → Saint-Denis ; Melun, Savigny-le-Temple, Essonne → Vitry-sur-Seine ; Palaiseau, Chaville, Vaucresson, Ville-d'Avray, Marnes-la-Coquette → Versailles ; Bagnolet, Montreuil, Le Pré-Saint-Gervais, Saint-Mandé, Fontenay → Paris 12e). Les pages l'écrivent tel quel et disent qu'aucune agence n'est dans le Val-d'Oise. Est-ce l'organisation réelle ? Sinon, indiquer les rattachements voulus : c'est une règle du pipeline à changer (`scripts/data/local`), pas les textes.
- **Q-CONTENU-11.** Libellés officiels des établissements : FINESS publie en capitales sans accents (« CENTRE HOSPITALIER DE VERSAILLES HOPITAL RICHAUD »). La grille les affiche en capitales initiales, mots inchangés ; les textes les citent en casse normale avec traits d'union. Les coquilles de source sont conservées (« GROUPE HOSTIPALIER », « 56 rue rue Ordener », « Foyer-Logement de Saint-Quen », « Point automonie »). Valider ce parti pris ou demander une table de libellés courts à la main (`label_court`), à ajouter au contrat des données.
- **Q-CONTENU-12.** Adresses des agences dans les textes locaux : le contrôle des nombres refuse « 61 rue de Lyon » ou « 49-51 quai de Dion-Bouton » dans une zone éditoriale, l'adresse n'étant pas un fait du fichier de données ; les pages écrivent « rue de Lyon », « quai de Dion-Bouton » et le gabarit affiche l'adresse complète. Suffisant ?
- **Q-CONTENU-13.** Faits absents des bases ouvertes : aucun point d'information recensé à Chaville, Marnes-la-Coquette, Vaucresson, La Garenne-Colombes, Levallois-Perret, et dans quatorze communes du Val-de-Marne (les Espaces autonomie couvrent des secteurs) ; aucun CCAS pour Champs-sur-Marne, Créteil, Villejuif ; aucune consultation mémoire nulle part (pas de jeu ouvert). Les pages le disent (« ne figure pas dans les bases consultées »). Connais-tu les structures réelles à ajouter à la main, avec leur source ?

- **Q-CONTENU-14.** Relecture des pages locales : la source DILA place l'hôtel de ville de Puteaux au 131 rue de la République et la coordination gérontologique au 133 ; la CNSA écrit « Richard-Walace » pour le foyer-logement du boulevard Richard-Wallace. Quelle graphie retenir ? Les communes lointaines (Cergy à 22,6 km de Puteaux, Mantes-la-Jolie à 39,5 km de Versailles, Melun à 33,9 km de Vitry) affichent « Oui, nous intervenons » : confirmer la couverture réelle avant publication, ou retirer ces communes de la vague 1.

## Technique

- **Q-TECH-1.** Identifiants SMTP de la boîte d'envoi et adresse de réception des demandes (variables d'environnement, jamais dans le dépôt).
- **Q-TECH-2.** Outil de mesure d'audience souhaité (Plausible, Matomo, aucun).
- **Q-TECH-3.** Dépôt GitHub et projet Vercel reliés ? (pour les prévisualisations par branche) — Répondu le 2026-09-20 : dépôt `https://github.com/djoutchouangpepemssie-tech/Youdom-care` (D-025). Reste à relier le projet Vercel.
  Note de la loop (2026-09-20) : le dépôt est pour l'instant local (aucun remote) et `gh auth status` échoue sur cette machine (jeton `GH_TOKEN` invalide). Tant que ce n'est pas réglé, la loop fusionnera les fins de phase en local (squash sur `main` + tag) et ouvrira les PR a posteriori.
  Réponse :
- **Q-TECH-4.** Budget JavaScript initial : `docs/07 §5` demandait moins de 90 Ko compressés par page de contenu, mais le socle Next 16 + React 19 pèse à lui seul 132 Ko (mesure Lighthouse du 2026-09-20, accueil à 150 Ko au total, LCP 1,9 s, performance 98). La loop a rebasé le budget à 160 Ko (contenu) et 220 Ko (formulaires), voir D-019. Confirmez-vous ce budget, ou souhaitez-vous une pile plus légère pour les pages de contenu (ce qui remettrait en cause D-006) ?

- **Q-TECH-6.** IndexNow : créer une clé (8 à 128 caractères, lettres et chiffres) et la définir dans la variable d'environnement `INDEXNOW_KEY` de la plateforme ; le fichier de clé est écrit au build (`prebuild`) et `pnpm indexnow` envoie les adresses des plans de site. À brancher après le premier déploiement (crochet de déploiement ou étape d'intégration continue : à décider).

- **Q-TECH-7.** Balises de vérification Google Search Console (`GOOGLE_SITE_VERIFICATION`) et Bing Webmaster (`BING_SITE_VERIFICATION`) : à renseigner dans l'environnement de production quand les propriétés seront créées ; absentes tant que vides.
  Réponse :

## Lancement

- **Q-LANCEMENT.** Le site est-il en ligne et indexable ? Répondez « oui » pour débloquer la phase 10 (quartiers de Paris, nouvelles communes, suite du magazine).
  Réponse :
