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
- **Q-LEGAL-5.** Pages légales (P8.3, `/mentions-legales/`, `/politique-de-confidentialite/`, `/cookies/`, `/conditions-generales/`) : elles sont générées depuis `content/site.config.json` et chaque champ inconnu est masqué. Pour la mise en ligne, fournir : l'adresse postale et le contact de l'hébergeur (`legal.hebergeur.adresse`, `legal.hebergeur.contact`, à relever dans le contrat ou les mentions légales de Vercel Inc.), le médiateur de la consommation (nom, adresse, site : obligatoire, article L. 616-1 du code de la consommation), le directeur de la publication, l'immatriculation (RCS ou RNE), la forme juridique, le capital, le siège, la TVA (Q-ID-2), les autorisations départementales (Q-LEGAL-1, affichées sous « Services à la personne »), le prestataire de messagerie qui reçoit les demandes et l'outil de suivi s'il est activé (nommés dans la politique), la durée de conservation des candidatures, et la validation par votre conseil des durées de conservation proposées (docs/05 §8, affichées comme « propositions »), de la formulation du transfert vers l'hébergeur américain, et des quatre textes (docs/07 §8). Les conditions générales en PDF se déclarent dans `content/legal/conditions-generales.json > documents` (fichier sous `public/documents/`).
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

- **Q-CONTENU-15.** Magazine « Le Fil » : treize articles du lancement sont écrits en `statut: a_relire` (noindex, non construits en production) avec l'auteur « Équipe éditoriale Youdom Care », faute de fiche auteur réelle (`content/auteurs/`, docs/06 §4). À fournir : une fiche auteur (nom, fonction, courte biographie) et, pour les neuf sujets de santé, un relecteur professionnel par article (`relu_par`) : neurologue ou gériatre (Alzheimer, Parkinson, SEP, refus d'aide), gériatre ou infirmier coordinateur (chutes, sortie d'hospitalisation), professionnel de l'autisme (relais enfant autiste), médecin généraliste ou psychologue formé aux aidants (dix signes, culpabilité). Les quatre articles « Droits et aides » et « Rester chez soi ou entrer en établissement » gagneraient une relecture par un travailleur social ou un conseiller de CLIC ou de MDPH.
- **Q-CONTENU-16.** Sources : le domaine `ligue-sclerose.fr` (Ligue française contre la sclérose en plaques, cité par docs/03) sert aujourd'hui un site de jeux d'argent ; l'ARSEP est devenue « France Sclérose en Plaques ». Retirer la Ligue des sources de la page SEP et de docs/03 ? Le PDF CNSA « Tarifs PCH 1er juin 2026 » donne 7,39 € pour l'aidant familial majoré là où service-public (vérifié le 1er juillet 2026) et `content/aides/pch.json` donnent 7,40 € : quelle valeur retenir ? L'avance immédiate du crédit d'impôt : Youdom Care est-elle habilitée (l'article 29 ne l'affirme pas) ? `content/tarifs.json` est vide : l'article 29 reste sur un exemple générique tant qu'aucun prix n'est publié.
- **Q-CONTENU-17.** Recrutement (P8.2, `/recrutement/`) : le bloc « Ce que nous vous proposons » ne peut afficher que des faits validés. Aujourd'hui il ne porte que trois points dérivés des engagements E1 à E3 (préparation aux situations, équipe stable, suivi lisible), masqués en production tant que ces engagements ne sont pas validés ; la page dit seulement que contrat, planning, secteur et rémunération « se discutent de vive voix ». À préciser, avec la preuve : la formation proposée (organisme, durée, prise en charge), le secteur d'intervention garanti proche du domicile, le mode d'écoute (référent, réunions d'équipe), la construction du planning (qui décide, quel préavis), la rémunération réelle (grille, convention collective, majorations nuit et dimanche, indemnités de transport), le type de contrat proposé. Chaque réponse validée devient un engagement de `content/engagements.json` (`E6`…) cité par `content/pages/recrutement.json > proposons.items`. Les offres réelles vont dans `content/offres/{slug}.json` sur le modèle de `_exemple.json` (Q-CONTENU-5) ; une offre publiée dont la balise titre composée sort de 50–60 caractères demande un champ `seo`.
- **Q-CONTENU-18.** Professionnels (P8.1, `/professionnels/`) : la page promet un rappel et un retour d'information sans délai chiffré (la phrase « là quand ça se complique » est liée à E4, masquée en production). Existe-t-il une ligne directe ou une adresse dédiée aux prescripteurs (hôpitaux, DAC, mandataires) ? Un délai de rappel professionnel tenu (Q-OFFRE-2, E5) ? Des conventions avec des établissements ou des services (HAD, SSIAD) qui pourraient être citées avec leur accord ?

## Technique

- **Q-TECH-1.** Identifiants SMTP de la boîte d'envoi et adresse de réception des demandes (variables d'environnement, jamais dans le dépôt).
- **Q-TECH-2.** Outil de mesure d'audience souhaité (Plausible, Matomo, aucun). Reformulée le 2026-09-27 en Q-TECH-8 ci-dessous, après la mise en place d'une mesure de première partie sans cookie (D-029) : c'est à Q-TECH-8 qu'il faut répondre.
- **Q-TECH-3.** Dépôt GitHub et projet Vercel reliés ? (pour les prévisualisations par branche) — Répondu le 2026-09-20 : dépôt `https://github.com/djoutchouangpepemssie-tech/Youdom-care` (D-025). Reste à relier le projet Vercel.
  Note de la loop (2026-09-20) : le dépôt est pour l'instant local (aucun remote) et `gh auth status` échoue sur cette machine (jeton `GH_TOKEN` invalide). Tant que ce n'est pas réglé, la loop fusionnera les fins de phase en local (squash sur `main` + tag) et ouvrira les PR a posteriori.
  Réponse :
- **Q-TECH-4.** Budget JavaScript initial : `docs/07 §5` demandait moins de 90 Ko compressés par page de contenu, mais le socle Next 16 + React 19 pèse à lui seul 132 Ko (mesure Lighthouse du 2026-09-20, accueil à 150 Ko au total, LCP 1,9 s, performance 98). La loop a rebasé le budget à 160 Ko (contenu) et 220 Ko (formulaires), voir D-019. Confirmez-vous ce budget, ou souhaitez-vous une pile plus légère pour les pages de contenu (ce qui remettrait en cause D-006) ?

- **Q-TECH-6.** IndexNow : créer une clé (8 à 128 caractères, lettres et chiffres) et la définir dans la variable d'environnement `INDEXNOW_KEY` de la plateforme ; le fichier de clé est écrit au build (`prebuild`) et `pnpm indexnow` envoie les adresses des plans de site. À brancher après le premier déploiement (crochet de déploiement ou étape d'intégration continue : à décider).

- **Q-TECH-7.** Balises de vérification Google Search Console (`GOOGLE_SITE_VERIFICATION`) et Bing Webmaster (`BING_SITE_VERIFICATION`) : à renseigner dans l'environnement de production quand les propriétés seront créées ; absentes tant que vides.
  Réponse :

- **Q-TECH-8.** Collecteur de la mesure d'audience (D-029, `src/lib/mesure/README.md`). Le site compte quatre gestes anonymes (étape de formulaire affichée, demande envoyée avec le département, rappel demandé, clic sur un numéro) sans cookie, sans identifiant, sans adresse IP, et les relaie tels quels vers un collecteur choisi par vous ; sans collecteur, rien n'est conservé. Trois options : **Matomo auto-hébergé** (gratuit, hébergement et mises à jour à votre charge ou chez un infogéreur français, conforme CNIL si configuré en mode exempté), **Plausible** (hébergé dans l'Union européenne, environ 9 € par mois, aucun cookie, mais un tiers reçoit les événements et il faudra une décision pour la dépendance), ou **rien pour l'instant** (la mesure reste inactive : aucune donnée n'est comptée). Deux questions : quel collecteur, et **qui lira les tableaux de bord** (vous, une personne de l'équipe, la loop à chaque fin de phase) ? Sans lecteur désigné, l'option « rien » est la plus honnête.
  Réponse :

- **Q-VISUEL-1.** Photo du couple souriant, à poser sous la zone d'accueil (demande du 27/09/2026). Vous avez envoyé l'image dans la conversation, mais une image collée dans un message ne se retrouve pas sur le disque : je ne peux pas l'enregistrer moi-même dans le dépôt. **Déposez le fichier dans `public/images/heros/` du projet** (format `.jpg` ou `.webp`, au moins 1200 px de large, le fond blanc du détourage convient), dites-moi son nom, et je pose le bloc sous le hero de l'accueil avec son texte de remplacement. Deux choses à préciser en même temps : la **description de l'image** pour les personnes qui ne la voient pas (par exemple « Un couple de personnes âgées souriantes, enlacées »), et si vous avez bien les **droits d'usage** de cette photo (banque d'images sous licence, ou photo prise pour Youdom Care avec l'accord des personnes) — une photo de personnes identifiables ne se publie pas sans leur accord écrit.
  Réponse :

- **Q-VISUEL-2.** Adresses des quatre agences retirées le 27/09/2026 (Saint-Denis, Vitry-sur-Seine, Serris, Versailles, voir D-036). Faut-il les republier quand les baux seront confirmés, ou les pages de ces agences restent-elles au niveau de la commune ? Tant qu'elles n'ont pas d'adresse de voie, leur `PostalAddress` n'a pas de `streetAddress`, ce qui affaiblit leur référencement local.
  Réponse :

- **Q-VOIX-1.** Promesses non validées affirmées sur les pages services. **Partiellement réglée le 27/09/2026** : Arcel a confirmé « quand une famille n'est pas à l'aise avec un intervenant, nous changeons ». L'engagement E2 porte désormais exactement cette phrase, il est validé et le site l'affiche en production. **Reste à confirmer** : la seconde moitié de l'ancien E2, « une petite équipe stable autour de chaque personne, présentée avant de commencer », qui figure encore dans onze fichiers de contenu (accueil, recrutement, à propos, cinq pages services, une page locale) sans être couverte par un engagement validé. Deux questions : garantissez-vous une petite équipe stable par personne, et présentez-vous l'intervenant avant de commencer ? Si oui, je valide ; si non ou si cela dépend des situations, je retire la promesse de ces onze fichiers. Restent aussi non validés E1 (intervenants formés par pathologie), E3 (référent unique, cahier de liaison, points réguliers), E4 (nuits, week-ends, 24h/24) et E5 (délai de rappel).
  Réponse :

- **Q-VOIX-2.** Titres des cinq pages piliers. `docs/01_MARQUE_ET_COPYWRITING.md` §5 prescrit des titres portant le terme recherché (« Aide à domicile pour personnes âgées : rester chez soi, sans rester seul »), alors que les pages affichent des accroches (« Rester chez soi, avec l'aide qu'il faut, quand il le faut »). Les quatorze pages filles suivent, elles, la forme de la charte. Deux grammaires de titres cohabitent donc dans la même arborescence, et le mot-clé manque là où il compte le plus. Quelle version fait foi : la charte, les titres actuels, ou une forme mixte (« Aide à domicile pour personnes âgées : rester chez soi, avec l'aide qu'il faut ») ?
  Réponse :

- **Q-VOIX-3.** Cinq sigles employés sans être développés et sans entrée de lexique : SAVS, SAMSAH, IME, ULIS et AJPP. Le site sait pourtant le faire (AESH est développé au premier emploi). Risque particulier sur AJPP (allocation journalière de présence parentale), que le lexique ne contient pas alors qu'il contient AJPA (congé de proche aidant) : deux sigles à une lettre d'écart, un seul expliqué. Je peux les développer au premier emploi et créer les cinq entrées de lexique, mais chaque entrée doit citer une source officielle datée que j'aurai réellement ouverte : dites-moi si vous voulez que je le fasse à la prochaine phase.
  Réponse :

## Ce qui bloque encore la mise en ligne — mesuré le 27 septembre 2026

Cette liste n'est pas une opinion : c'est la sortie de `pnpm validate --prod`, le contrôle qui
simule la production. Onze contrôles sur treize passent. Les deux qui échouent, `check-content` et
`check-legal`, tiennent tous leurs reproches à des champs que vous êtes seul à pouvoir remplir.
Tant qu'ils sont vides, le site fonctionne et se visite, mais les blocs concernés sont masqués et
la page des mentions légales est incomplète au regard de la loi.

**1. Identité de l'entreprise** (`content/site.config.json` › `legal`). Huit champs sont vides :
raison sociale, forme juridique, capital, siège social, numéro au registre du commerce, numéro de
TVA intracommunautaire, directeur de la publication, médiateur de la consommation. Un site
marchand doit les afficher. Sans eux, le bloc « Éditeur du site » de `/mentions-legales/` ne
s'affiche pas.

**2. Hébergeur** (`legal.hebergeur`). Le nom est renseigné, l'adresse et le contact ne le sont pas.
La loi demande les trois.

**3. Autorisations du mode mandataire** (`legal.autorisations`). Le site propose le mode
mandataire ; la liste des autorisations est vide, et la mention légale correspondante est donc
masquée. Si Youdom Care n'exerce pas en mandataire, dites-le : je retire le mode du site.

**4. Tarifs** (`content/tarifs.json`). Aucune prestation n'est renseignée. Toutes les pages
affichent donc « tarif sur devis » au lieu d'un prix, alors que `docs/00` demande un tarif TTC
avant avantage fiscal en information principale. C'est le point qui pèse le plus lourd sur la
conversion.

**5. Engagements** (`content/engagements.json`). E2 est validé depuis le 27 septembre 2026. E1
(intervenants formés par pathologie), E3 (référent unique, cahier de liaison, points réguliers) et
E4 (nuits, week-ends, présence 24h/24) portent un texte mais restent non validés : le contrôle
refuse une promesse écrite sans validation. E5 (délai de rappel) n'a pas de texte. Pour chacun :
soit vous confirmez ce que Youdom Care fait réellement et je valide, soit je retire la promesse.

**6. Neuf faits à confirmer** (`site.config.json` › `a_confirmer`) : les deux numéros de téléphone,
l'adresse électronique, le SIRET, le numéro d'agrément services à la personne, l'orthographe exacte
des voies et le nom commercial de chaque agence, les codes INSEE des agences, les labels détenus,
et les plages de disponibilité. Ils sont utilisés tels quels par le site : une erreur ici se
propage partout.

**7. Relecture professionnelle.** Les trente-neuf pages de santé et articles ont `relu_par: null`.
Elles sont construites et visibles, en `noindex` (D-033), et n'émettent pas de données structurées
médicales. Elles n'entreront dans les plans de site qu'une fois relues et passées en `publie`.

**8. Documents contractuels.** `/conditions-generales/` annonce des documents au format PDF qui
n'existent pas encore.

Deux sources externes n'ont pas pu être vérifiées depuis ce poste (connexion coupée par le
serveur) : les deux pages de l'Urssaf sur le CESU et l'avance immédiate. À rouvrir à la main.

## Lancement

- **Q-LANCEMENT.** Le site est-il en ligne et indexable ? Répondez « oui » pour débloquer la phase 10 (quartiers de Paris, nouvelles communes, suite du magazine).
  Réponse :
