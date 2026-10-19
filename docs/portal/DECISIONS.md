# Mon Youdom — Décisions du commanditaire

> Journal des arbitrages d'Arcel. Une ligne par décision : ce qui est tranché, ce que cela engage,
> et ce qui reste ouvert. Les documents de cadrage découlent de ce journal.

---

## MY-01 — Tout est à créer (15/10/2026)

**Décision** : « on doit tout créer de zéro ». Il n'existe aucun CRM Youdom Care ; aucun dépôt
accessible n'en contient.

**Ce que cela engage** : le projet n'est pas une extension mais un système complet (coordination,
terrain, espace client, puis facturation). L'espace client ne peut pas être la première brique : il
n'affiche que ce que le terrain produit.

**Nuancé le même jour par MY-04** : Ximi existe déjà dans l'entreprise. Voir ci-dessous.

---

## MY-02 — Pointage par NFC et QR code (15/10/2026)

**Décision** : badge NFC posé au domicile **et** QR code imprimé. Pas de géolocalisation.

**Ce que cela engage, et c'est une bonne nouvelle** :

- c'est le mode que la CNIL attend : aucune position collectée, donc aucun suivi de salarié ;
- deux moyens valent mieux qu'un — un badge NFC se décolle, un téléphone d'entrée de gamme ne lit
  pas toujours le NFC, un QR code imprimé est un recours immédiat ;
- il reste un cas à traiter : **le badge illisible ou absent**. L'intervenant doit pouvoir pointer
  « à la main » avec un motif, qui remonte au coordinateur. Sans cette porte de sortie, les
  intervenants trouveront la leur, et elle sera pire.

**Restent à décider** : qui pose les badges chez les familles, et ce qu'on fait des foyers où le
badge disparaît.

---

## MY-03 — Hébergement : Vercel (15/10/2026)

**Décision** : Vercel.

**Ce que cela permet, et ce que cela ne permet pas.** Vérifié le 15/10 : la page conformité de
Vercel annonce SOC 2 type 2 et ISO 27001:2022 ; **aucun certificat HDS n'y figure**. Or héberger
des données de santé pour le compte d'un tiers impose un hébergeur certifié HDS.

**L'architecture retenue tient les deux** (détail dans `ARCHITECTURE.md` §4) :

- **Vercel sert l'interface** — c'est ce qu'il fait le mieux, et c'est l'outillage que vous
  connaissez déjà avec le site ;
- **les données vivent chez un hébergeur certifié HDS** (API et base). MongoDB Atlas, déjà cité dans
  le cadrage, **est** certifié ;
- règle non négociable qui rend l'ensemble conforme : **aucune donnée de santé ne traverse Vercel**.
  Les écrans qui en affichent les demandent depuis le navigateur, directement à l'API certifiée.
  Vercel ne voit, ne journalise et ne met en cache aucune note de santé.

**Reste à décider** : l'hébergeur certifié de l'API (Scalingo, Clever Cloud, OVHcloud, Outscale…).
C'est un devis à demander, pas un choix technique difficile.

**Solution de repli, si vous préférez ne rien ajouter** : un portail **sans donnée de santé** — qui
vient, quand, ce qu'on paie — sans cahier de liaison ni fiche de vie. C'est un produit honnête, mais
amputé de ce qui touche le plus les familles.

---

## MY-04 — L'existant : Word et Ximi (15/10/2026)

**Fait** : les plannings et les factures se font aujourd'hui avec **Word** et **Ximi**.

**C'est l'information la plus importante de la journée**, et elle arrive après MY-01. Ximi est un
logiciel métier de services à la personne : planning, télégestion, facturation, démarche qualité,
lien NOVA. Autrement dit, **une partie de ce que MY-01 propose de recréer existe déjà et vous est
facturée**.

**Ce que je recommande, et je ne le dirai qu'une fois** : ne recréez pas la facturation, la paie et
la télétransmission. Créez ce que Ximi ne fait pas — **l'espace client**, et l'application
intervenant si celle de Ximi ne convient pas. C'est là qu'est votre différence : aucun éditeur du
marché ne donne aux familles ce que décrit votre cahier.

**Ce qu'il faut vérifier avant de trancher, et que je ne peux pas vérifier à votre place** : Ximi
expose-t-il une API ? Sa plaquette cite « API, workflows » ; aucune documentation développeur
publique n'existe, et un annuaire indique même qu'il n'y a pas d'API ouverte, peut-être réservée aux
offres hautes. **À demander par écrit à Xelya**, l'éditeur :

1. une API existe-t-elle, et quelle documentation ?
2. donne-t-elle accès aux **pointages, affectations et comptes rendus en temps réel**, ou seulement
   à un export de facturation ? (Beaucoup d'éditeurs n'exposent que le second ; cela change tout.)
3. à quel coût, et sous quelles conditions contractuelles ?

**Trois voies, selon leur réponse** :

| | Si Ximi a une API riche | Si Ximi n'a qu'un export | Si Ximi n'a rien |
| --- | --- | --- | --- |
| **Ce qu'on construit** | L'espace client seul, branché sur Ximi | Espace client + terrain (planning, pointage) ; Ximi garde la facturation | Tout, comme prévu en MY-01 |
| **Effort** | le plus court | moyen | le plus long |
| **Risque** | dépendance à l'éditeur | double saisie à la frontière | tout le réglementaire à votre charge |

**Décision attendue d'Arcel** une fois Xelya consulté.

---

## MY-05 — Astreinte : la responsable (15/10/2026)

**Décision** : l'astreinte est tenue par la responsable.

**Ce que cela engage, et c'est le point le plus délicat.** Une personne n'est pas un centre d'appels.
Le produit ne doit donc **pas** promettre « astreinte 24 h/24 » comme le ferait un grand réseau :

- on affiche **les heures d'ouverture**, et un **numéro d'astreinte pour les situations urgentes**,
  avec ces mots ;
- **toutes les alertes ne réveillent pas** : seuls un signalement grave ou une visite de nuit non
  effectuée déclenchent un appel. Un retard de 15 minutes à 9 h du matin attend l'ouverture ;
- le produit doit **protéger la personne d'astreinte** autant que la famille : une alerte sans
  gravité qui sonne à 3 h du matin finit par être ignorée, et ce jour-là l'alerte grave l'est aussi.

**Reste à décider** : le seuil exact de ce qui réveille, et ce qu'on affiche aux familles.

---

## MY-06 — Pas de volumétrie annoncée (15/10/2026)

**Décision** : « nous n'allons pas définir de nombre » de foyers, d'intervenants ou de visites.

**Ce que cela engage** : je conçois sans hypothèse de volume — index posés dès le départ, pas de
chargement de liste entière en mémoire, pagination partout. Le système tiendra de dix foyers à
plusieurs centaines. Si un jour l'activité change d'ordre de grandeur, le dimensionnement se révise
avec des mesures, pas avec des estimations.

---

## MY-07 — Un CRM Youdom Care complet, et l'espace client dessus (15/10/2026)

**Décision** : « un CRM à la hauteur de Ximi, plus puissant s'il le faut, connecté à l'espace client
de chaque client ».

J'avais recommandé l'inverse (MY-04 : garder Ximi pour la facturation, ne construire que l'espace
client). Arcel confirme son choix. **C'est tranché : on construit le CRM.** Je ne rouvre pas le
débat ; le périmètre réel est écrit dans `CRM_PERIMETRE.md`, module par module, pour que « à la
hauteur de Ximi » veuille dire quelque chose de vérifiable.

**Ce que cela engage, en clair** :

- six métiers à couvrir : commerce, planification, terrain, facturation, ressources humaines,
  qualité — plus l'espace client, qui est l'avantage que Ximi n'a pas ;
- **175 à 270 jours** de travail, soit 9 à 14 mois pour une personne à temps plein. Les vagues 1 à 3
  (planning, terrain, espace client) en font 85 à 130, et donnent déjà un produit qui tourne ;
- une **charge récurrente** après la livraison : barèmes, conventions, formats départementaux. Un
  logiciel métier ne se termine pas, il s'entretient. C'est le prix de l'indépendance ;
- la sortie de Ximi n'intervient qu'à la **vague 4** : l'abonnement court jusque-là, et une période
  de double saisie d'un à deux mois est à prévoir.

**Deux réserves techniques, maintenues et motivées** (`CRM_PERIMETRE.md` §3) :

1. **La paie** : le CRM produira les variables (heures, majorations, absences, indemnités) et les
   transmettra à un logiciel de paie. Écrire un moteur de paie, c'est porter la convention
   collective, ses avenants et la DSN — un risque de contrôle URSSAF sans contrepartie.
2. **La télétransmission départementale** : écrite département par département, à la demande, en
   commençant par celui qui pèse le plus d'heures. Pas les huit d'un coup.

Si Arcel veut internaliser l'un ou l'autre, c'est faisable et j'estimerai à part.

**Ordre de construction inchangé** : ce qui produit la donnée, puis ce qui la montre, puis ce qui la
facture.

---

## MY-08 — La base : MongoDB, oui (15/10/2026)

**Question d'Arcel** : « on peut le faire sur Mongo ? » **Réponse : oui**, et c'est même le choix
qui fait gagner du temps. Trois raisons vérifiées plutôt que supposées :

1. **MongoDB Atlas est certifié HDS** (référentiel 2024, audit Schellman — vérifié le 15/10,
   `ARCHITECTURE.md` §4.1). C'est un fournisseur de moins à trouver : il ne reste que l'hébergeur de
   l'API (question A).
2. **Le modèle de données s'y prête.** Un foyer, ses membres, ses droits, ses visites, ses comptes
   rendus : des documents qu'on lit par foyer, presque toujours entiers. C'est exactement ce que
   MongoDB fait bien.
3. **L'ajout seul y est naturel** (pointages, événements de visite, journal d'audit), et les index
   dont `DATA_MODEL.md` §4 a besoin sont posés dès maintenant (`db/collections.ts`).

**Trois réserves, et comment elles sont tenues** — elles ne remettent pas le choix en cause, mais
elles ne se découvrent pas en vague 4 :

| Réserve | Ce qui est fait |
| --- | --- |
| La facturation exige qu'une écriture soit entière ou pas du tout | MongoDB sait le faire, mais seulement sur un **jeu de réplicas** : en production, **M10 au minimum**, jamais une offre partagée. L'écriture est déjà confirmée par la majorité des membres (`db/client.ts`) — sans quoi un pointage peut disparaître lors d'une bascule |
| Le moteur n'impose aucune forme aux documents | La forme est tenue par les schémas Zod en `strictObject` (`domaine/schemas.ts`) : un champ inattendu est une erreur, pas un champ ignoré. Des validateurs `$jsonSchema` côté base viendront en doublure à l'étape 2 — la ceinture **et** les bretelles, parce qu'un jour une écriture viendra d'ailleurs que de ce code |
| Factures, aides et reste à charge sont par nature relationnels | Ce sont les seules données que je modéliserai **à plat**, avec des références et non des documents imbriqués. Décision à prendre en vague 4, notée maintenant pour ne pas l'oublier |

**Ce que cela ne résout pas** : Atlas porte la base, pas l'API. L'hébergeur certifié de l'API reste
à choisir (question A) — un devis, pas une difficulté technique.

---

## MY-09 — L'API s'écrit en TypeScript, pas en Python (15/10/2026)

**Décision du développeur, et je l'assume.** Le prompt de cadrage parlait d'une API **FastAPI** —
il décrivait un CRM qui n'existait pas (MY-01). Puisque tout est à écrire, le choix se repose, et
je choisis **TypeScript sur Node**.

**Pourquoi, en trois points mesurables** :

1. **Un seul atelier au lieu de deux.** Le dépôt a déjà un lint, un typecheck, 1 037 tests, un
   format, et une intégration continue verte. L'API y entre comme paquet de l'espace de travail et
   hérite de tout. En Python, il faudrait monter et tenir une seconde chaîne complète (ruff, mypy,
   pytest, un second job de CI) — pour une seule personne qui maintient les deux.
2. **Les schémas ne sont écrits qu'une fois.** L'interface de l'espace client est en Next.js. Les
   schémas Zod du socle sont lisibles des deux côtés : un champ renommé casse la compilation de
   l'interface, au lieu de casser une requête en production.
3. **Une personne, un langage.** Le critère qui compte sur un projet de 175 à 270 jours n'est pas
   l'élégance du framework : c'est le nombre de contextes à tenir en tête à trois heures du matin
   quand une astreinte appelle.

**Ce que cela coûte** : rien aujourd'hui (aucune ligne de Python n'existe). Revenir en arrière
coûterait deux jours maintenant, et des mois dans six mois. Si Arcel préfère Python, c'est le moment
de le dire — pas après l'étape 2.

**Ce que cela ne change pas** : l'architecture de `ARCHITECTURE.md` §5 — trois surfaces d'API
séparées, autorisation au plus près de la donnée, journal en ajout seul, SSE pour les statuts,
hors ligne d'abord pour l'application intervenant. Le langage change, les principes non.

---

## MY-10 — La planification n'impose aucune règle : elle applique les vôtres (19/10/2026)

**Décision** : « la planification n'a pas de règle, il faut l'implémenter de façon correcte,
puissante et profonde. Nous devons pouvoir créer, modifier et gérer tous les plannings que nous
créons. »

**Ce que j'en ai fait, et pourquoi c'est mieux qu'un moteur qui « connaîtrait » le droit du
travail.** Un logiciel qui impose des seuils que personne n'a validés est faux deux fois : faux
parce qu'il invente, faux parce qu'on le contourne. Le moteur n'impose donc **rien** — aucune
valeur par défaut, aucune règle active d'office. Une règle n'existe que si vous l'avez saisie, avec
son seuil et sa sévérité.

**Ce que le moteur apporte quand même** — et c'est là qu'est la profondeur :

| | |
| --- | --- |
| **Dix contrôles écrits et testés**, prêts à activer | chevauchement, durée minimale et maximale, temps de trajet entre deux foyers, amplitude de la journée, repos quotidien, repos hebdomadaire, heures de la semaine, jours consécutifs, visite pendant une absence |
| **Deux sévérités, que vous choisissez** | **bloquant** : l'écriture est refusée, avec le détail. **avertissement** : elle passe, et le coordinateur voit |
| **Un catalogue qui explique** | chaque règle dit ce qu'elle vérifie, dans quelle unité, avec une valeur **suggérée et jamais appliquée** |
| **Un jugement d'ensemble** | les règles portent sur le temps de travail entier d'un intervenant, toutes séries confondues, sur quatre semaines autour du changement — pas sur la visite qu'on vient d'écrire |
| **Des réglages versionnés** | un planning posé hier a été jugé par les règles d'hier, et le journal garde qui les a changées |

**Gérer les plannings, concrètement** : une série porte un foyer, une période, un rythme (toutes
les semaines, une sur deux… jusqu'à une sur huit) et des créneaux (jour, heures, nature,
intervenant — ou **aucun** intervenant : c'est un créneau à pourvoir). Elle se modifie à **trois
portées**, celles de tous les agendas, parce que l'inverse se paie en ressaisies :

1. **cette occurrence** — un horaire déplacé, un remplacement, une annulation, avec motif ;
2. **celle-ci et les suivantes** — la série est coupée en deux : le passé reste décrit par la série
   qui l'a produit, l'avenir suit la nouvelle. C'est le seul moyen honnête de changer l'avenir sans
   réécrire une facture déjà envoyée ;
3. **toute la série** — rythme, horaires, créneaux.

Plus : sauter une journée, suspendre, reprendre, terminer à une date. Les occurrences sont
**calculées**, jamais stockées d'avance : un planning de deux ans ne pèse rien, et un changement
est visible immédiatement, y compris pour les familles.

**Le temps est traité pour de vrai.** Les heures sont saisies à l'heure de Paris et converties en
instants : une garde du samedi 21 h au dimanche 7 h dure dix heures, **neuf** la nuit du passage à
l'heure d'été et **onze** celle du retour à l'heure d'hiver. C'est ce qui est payé, et c'est testé.

**Ce qui reste ouvert** : les compétences requises par foyer (une règle de plus, le jour où vous
voudrez les saisir) et l'optimisation automatique des tournées — que je ne construirai pas sans que
vous l'ayez demandée, parce qu'un planning optimisé contre l'avis du coordinateur ne sert personne.

---

## MY-11 — Les tarifs sont créés par Youdom Care, pas par le logiciel (19/10/2026)

**Décision** : « pour les grilles tarifaires pas besoin, nous devons créer et mettre nous-même nos
tarifs. »

**Ce que cela donne.** Aucun prix, aucun taux de majoration, aucun taux de crédit d'impôt n'est
écrit dans le code. L'agence crée ses **prestations** : code, libellé, **mode prestataire ou
mandataire** (obligatoire, c'est une information due au client), unité (heure, forfait, nuit), prix
TTC, prix HT et TVA si elle les saisit, éligibilité au crédit d'impôt, et ses **majorations**.

Quatre points de conception qui évitent une erreur qui coûte de l'argent :

1. **Tout en centimes entiers.** Un prix en virgule flottante finit par afficher 19,999999 € sur
   une facture.
2. **Les prestations sont versionnées par date d'application**, et deux versions d'un même code ne
   peuvent pas se chevaucher : une facture rééditée six mois plus tard retrouve le prix du jour de
   la visite. Changer un prix ferme la version précédente la veille — explicitement.
3. **Les majorations se calculent à la minute réelle**, sur la part de temps concernée : une garde
   du samedi 21 h au dimanche 7 h compte dix heures de nuit **et** sept heures de dimanche, chacune
   majorée selon votre règle. Les jours fériés sont **calculés** (les onze, Pâques comprise), pas
   recopiés dans une liste qui serait fausse l'an prochain.
4. **Le prix TTC avant avantage fiscal reste l'information principale** (garde-fou permanent du
   projet). Le crédit d'impôt est renvoyé **à part**, comme une estimation, et **seulement si vous
   avez saisi son taux**. Sans taux saisi : aucune estimation. Le logiciel ne devine pas votre
   fiscalité.

---

## MY-12 — L'optimisation propose, le coordinateur décide (19/10/2026)

**Décision** : « oui je veux que tu optimises les plannings ». Elle est donc là — avec la précaution
qui la rend utilisable plutôt que redoutée.

**Deux choses qu'elle sait faire** :

1. **pourvoir un créneau vide** : les intervenants possibles, classés, **avec les raisons en
   clair** — « déjà 6 visites dans ce foyer », « souhait du foyer », « 12 h déjà posées cette
   semaine », « 15 min d'écart avec une autre visite du jour », « introduit 1 avertissement :
   amplitude » ;
2. **réparer un signalement** : proposer une réaffectation qui fait disparaître un avertissement ou
   un blocage, en disant lequel.

**Trois propriétés dont je ne voulais pas me passer** :

| | |
| --- | --- |
| **Rien d'opaque** | chaque proposition porte ses raisons. Un logiciel qui dit « j'ai optimisé » sans dire pourquoi se fait désactiver au bout d'un mois |
| **Les contraintes viennent de vous** | un candidat n'est écarté que par une règle que **vous** avez marquée bloquante, par un refus du foyer, ou par une absence déclarée. Les poids ne font que **classer** |
| **Déterministe** | mêmes données, même ordre ; à score égal, c'est l'identifiant qui tranche. Sans cela, deux coordinateurs voient deux listes différentes et personne n'y croit |

**Rien n'est appliqué sans qu'on le demande.** L'appel sans `appliquer` ne touche à rien : il rend
la liste. Avec `appliquer`, chaque proposition est **réjugée avant écriture** — une suite de
propositions peut, ensemble, créer ce qu'aucune ne créait seule — et chacune est journalisée.

**Les préférences du foyer entrent dans le calcul** : un souhait pèse, un refus exclut. Et le
**motif d'un refus ne sort jamais du foyer et de l'agence** : la réponse dit « le foyer ne souhaite
pas cet intervenant », jamais pourquoi. Un test le vérifie sur le corps de la réponse entière.

**Ce que je ne prétends pas faire** : l'optimum global d'un problème d'ordonnancement. Le
remplissage est glouton et séquentiel — chaque choix entre dans le contexte du suivant. C'est
reproductible et explicable ; un optimum que personne ne peut relire ne se déploie pas dans un
service d'aide à domicile.

**Une mesure a corrigé mon premier réglage** : je normalisais la charge par la plus forte des
candidates. Résultat, une intervenante avec 45 minutes posées passait pour « chargée » face à une
collègue à zéro, et ce faux écart effaçait le bonus d'enchaînement — qui vaut bien plus pour une
tournée réelle. L'échelle est désormais fixe (une semaine de référence), et le test qui l'a révélé
est resté.

---

## MY-13 — Du planning à la visite pointable, et les droits qui vont avec (19/10/2026)

**Étape suivante de la vague 1**, demandée dans la foulée : relier le planning au terrain.

**Pourquoi matérialiser.** Une occurrence est une prévision ; une visite est un fait qui se pointe,
se raconte, se facture et se conteste. Elle a besoin de sa propre identité, stable : le pointage NFC
de mardi ne peut pas reposer sur un calcul qui changera si le planning est modifié mercredi.

**La règle, et c'est la plus importante** :

> **Une visite qui n'a pas commencé suit son planning. Une visite commencée ne le suit plus.**

Tant qu'elle est prévue, un changement de planning la met à jour. Dès qu'elle a bougé — en route, en
cours, faite, annulée — le planning ne la réécrit plus : la divergence est **signalée** au
coordinateur, qui tranche. Réécrire une visite déjà pointée, ce serait réécrire des heures
travaillées.

La matérialisation est **idempotente** : l'identité d'une visite de planning est le triplet (série,
jour de l'occurrence, rang du créneau), unique en base. Elle se relance chaque nuit sans créer un
doublon. Un créneau **sans intervenant** ne devient pas une visite : il n'y a personne à pointer, il
reste à pourvoir et il est compté comme tel.

**Un trou que cela a révélé, et qui est bouché.** Affecter quelqu'un à un foyer ne lui donnait aucun
droit sur ce foyer : l'intervenante voyait sa tournée mais pas la fiche de vie du logement où elle
entre — le contraire de ce que le produit promet. La matérialisation **ouvre donc les droits de la
mission** : ceux de la colonne « intervenant » de la matrice, pas un de plus (planning, présence,
comptes rendus, fiche de vie, accès au logement), **bornés dans le temps** et repoussés à chaque
matérialisation. Un intervenant qui cesse de venir perd l'accès de lui-même, sans qu'un humain ait à
y penser — et l'accès au logement reste limité à la plage de la visite, quoi qu'il arrive.

**Ce qui reste** : la révocation explicite quand un intervenant quitte l'agence (vague 5, RH), et
l'ajustement d'une visite divergente — aujourd'hui signalé, demain modifiable en deux clics.
