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

## Technique

- **Q-TECH-1.** Identifiants SMTP de la boîte d'envoi et adresse de réception des demandes (variables d'environnement, jamais dans le dépôt).
- **Q-TECH-2.** Outil de mesure d'audience souhaité (Plausible, Matomo, aucun).
- **Q-TECH-3.** Dépôt GitHub et projet Vercel reliés ? (pour les prévisualisations par branche)
  Note de la loop (2026-09-20) : le dépôt est pour l'instant local (aucun remote) et `gh auth status` échoue sur cette machine (jeton `GH_TOKEN` invalide). Tant que ce n'est pas réglé, la loop fusionnera les fins de phase en local (squash sur `main` + tag) et ouvrira les PR a posteriori.
  Réponse :

## Lancement

- **Q-LANCEMENT.** Le site est-il en ligne et indexable ? Répondez « oui » pour débloquer la phase 10 (quartiers de Paris, nouvelles communes, suite du magazine).
  Réponse :
