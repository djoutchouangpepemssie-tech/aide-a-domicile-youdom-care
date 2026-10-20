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

---

## MY-14 — Trois fermetures : la portée par agence, les validateurs en base, l'ajustement (19/10/2026)

Les trois points que j'avais laissés ouverts dans la vague 1 sont fermés. Aucun ne demandait quoi
que ce soit d'Arcel ; tous les trois étaient des promesses à tenir.

### 1. La portée par agence (un trou de sécurité, et je l'avais signalé)

Jusqu'ici, un compte d'agence authentifié agissait sur **l'agence qu'il nommait dans sa requête**.
Chaque action était journalisée — mais rien ne l'arrêtait. C'est corrigé : la portée vient de ses
**rattachements**, pas de ce qu'il écrit.

- un compte d'agence est rattaché au foyer technique de son agence, et c'est de ce foyer qu'on lit
  l'agence ;
- **rien n'est inscrit dans le jeton** : un jeton ne porte aucun droit (`auth/sessions.ts`), et une
  portée inscrite dans un jeton survivrait à sa révocation ;
- un responsable de deux agences a deux rattachements, et couvre les deux ;
- toute requête hors portée répond **404**, comme tout refus d'autorisation.

Un test le vérifie sur dix routes à la fois — lectures, règles, planning, suggestions, tarifs,
séries, absences, matérialisation — et vérifie **qu'aucune écriture n'a eu lieu**.

### 2. Les validateurs `$jsonSchema` : la doublure des schémas Zod

Zod protège ce qui passe par le code, c'est-à-dire tout, aujourd'hui. Demain, une reprise de
données, un script d'import ou une console ouverte écriront directement dans la base — et ce jour-là
le schéma applicatif ne protégera rien.

Les validateurs sont **dérivés** des schémas Zod, pas recopiés : un test échoue dès qu'un champ
obligatoire apparaît d'un côté sans l'autre. Ils sont volontairement pauvres (champs obligatoires et
type BSON), parce qu'un second schéma complet à tenir à jour est un second schéma qui dérive. Ils
sont posés en `moderate` / `warn` : on refuse l'écriture invalide sans bloquer une base qui
contiendrait de l'ancien. Durcir se fera après une passe de vérification, pas le jour de la mise en
service.

**Ce que je ne peux pas vérifier ici** : il n'y a pas de MongoDB dans l'environnement de
construction. Les tests éprouvent ce qui peut l'être sans base — la dérivation, le typage des dates,
et l'absence des mots-clés que MongoDB refuse (`$schema`, `format`). Le premier `pnpm portal:migrer`
sur un vrai cluster dira le reste, collection par collection, sans s'arrêter à la première.

### 3. L'ajustement d'une visite divergente

MY-13 signalait les divergences ; elles se tranchent maintenant, et il n'y a que deux réponses
honnêtes : **aligner** la visite sur le nouveau planning, ou **conserver** ce qui a eu lieu. Les
deux demandent un motif — une heure travaillée qui change demande une explication, et c'est elle
qu'on lira dans six mois.

La décision retient **l'état du planning qu'elle a vu**. Si le planning rebouge ensuite, la
divergence se repose : une décision ne vaut que pour ce qu'elle a vu.

### Ce que cela veut dire pour la suite

**L'API de la vague 1 est complète.** Ce qui manque maintenant pour que l'agence s'en serve n'est
plus de l'API : ce sont les **écrans**. Le back-office (Next.js, sur Vercel, avec les jetons de
style et les primitives accessibles du site) est le prochain chantier, et c'est lui qui transformera
ce travail en outil quotidien.

---

## MY-15 — Le bureau : des écrans sur le site, des données jamais chez Vercel (19/10/2026)

**Décision.** Le back-office (« le bureau ») vit dans le site Next.js, sous `/bureau/`, avec les
jetons de style et les primitives accessibles déjà construits. Mais **les données ne passent pas par
Vercel** : les écrans appellent l'API directement depuis le navigateur de la coordinatrice, vers
l'hébergeur certifié HDS.

**Pourquoi.** Le contraire aurait été plus simple à écrire : un Route Handler sur Vercel qui relaie
l'API. Il aurait aussi fait transiter des noms de foyers, des horaires de visite et, tôt ou tard,
des données de santé par un hébergement qui n'est pas certifié pour elles. Ce que la loi interdit
n'est pas de les stocker, c'est de les héberger ailleurs que chez un hébergeur agréé — un relais est
un hébergement de passage. La règle du projet tient donc en une phrase : **Vercel sert les fichiers,
l'API sert les données.**

**Ce que cela impose, et qui n'est pas gratuit :**

1. **L'appel est inter-origine.** Il faut donc l'autoriser des deux côtés : la liste fermée
   d'origines dans l'API, et l'origine de l'API dans `connect-src` de la politique de sécurité de
   contenu du site (`next.config.ts`, dérivée de `NEXT_PUBLIC_API_BASE_URL`). J'ai appris la seconde
   à mes frais : dix exécutions rouges avec, à l'écran, « vérifiez votre connexion » — exact,
   et inutile. Un parcours vérifie maintenant l'en-tête lui-même, pour que la prochaine fois le test
   dise la cause.
2. **Le jeton vit dans `sessionStorage`**, pas dans un cookie : aucun envoi automatique, donc aucune
   falsification de requête inter-site à prévoir, et la session s'efface à la fermeture de l'onglet.
   En échange, un script injecté dans la page le lirait — c'est pour cela que la politique de
   sécurité de contenu reste fermée et qu'aucun script tiers n'entre sur le site.
3. **Les écrans se chargent côté navigateur.** Rien du bureau n'est pré-rendu avec des données : les
   pages sont des coquilles statiques qui demandent, affichent, et disent quand elles n'ont pas pu.
4. **`/bureau/` n'est jamais indexé** (`neverIndexedPaths`, `robots.txt`, `noindex`), même quand
   Arcel ouvrira l'indexation du site.

**Le premier écran est « la semaine »**, parce que c'est la question qu'une coordinatrice pose vingt
fois par jour : qui vient, chez qui, et qu'est-ce qui cloche. Il montre les deux choses qu'un
planning cache d'habitude — **les créneaux à pourvoir**, comptés et nommés, et **les signalements des
règles de l'agence**, en français, avec leur sévérité en mots (« bloquant », « à regarder »). Quand
aucune règle n'est saisie, l'écran le dit : un planning sans signalement n'est pas un planning sain,
c'est un planning non jugé.

---

## MY-16 — L'écran d'un foyer montre les droits, pas les rôles (19/10/2026)

**Décision.** L'écran d'un foyer affiche, pour chaque membre, **ses droits effectifs du moment** à
côté de son rôle. Un membre sans droit le dit en mots : « cette personne ne voit rien de ce foyer ».

**Pourquoi.** Dans ce modèle, le rôle n'ouvre rien : c'est le droit qui ouvre
(`PERMISSIONS.md` §7). Un écran qui afficherait « représentant légal » et s'arrêterait là
laisserait croire à un pouvoir que cette personne n'a peut-être pas — et, dans l'autre sens,
cacherait un accès réel derrière un rôle anodin. Le jour où une famille demande « qui a vu quoi »,
c'est cette colonne qui répond. Les droits révoqués et expirés n'y figurent pas : afficher un droit
mort, c'est afficher un faux.

**Trois choix qui vont avec :**

1. **Le foyer technique de l'agence est écarté de la liste**, et l'écran le dit en une ligne. Dans
   le modèle, c'est un foyer comme les autres — c'est le rattachement des salariés qui le
   distingue, pas un champ. L'API le marque donc à partir des rattachements de l'auteur, et jamais
   à partir de son code : un jour quelqu'un nommera un vrai foyer « AGENCE-02 ».
2. **Le mode d'intervention est toujours dit**, et en mandataire la mention légale de `docs/07`
   l'accompagne — la même mention que sur le site public, tirée du même fichier de contenu. Deux
   formulations pour une seule obligation légale, ce serait une de trop.
3. **Un foyer hors de votre portée répond comme un foyer inexistant** (404), et l'écran l'écrit
   ainsi : « ce foyer n'existe pas, ou il n'appartient pas à une agence que vous suivez ». Dire
   lequel des deux serait divulguer l'existence d'un foyer.

**Aucune donnée de santé n'est sur cet écran** : ni compte rendu, ni fiche de vie. Ce qu'on en voit,
c'est **qui a le droit de les lire**.

**Un défaut d'accessibilité trouvé par la mesure, et corrigé dans le design** : les liens du bureau
étaient en teal-700 sur fond sable, mesurés à **4,46** — sous le seuil AA de 4,5. Le bureau prend
donc la variante teal-800, celle que les scènes du site utilisent déjà pour la même raison. Le
seuil n'a pas bougé d'un dixième : c'est la couleur qui a changé.

---

## MY-17 — Les réglages : ce que le logiciel ne décide pas (20/10/2026)

**Décision.** Deux écrans de réglages, et tous deux disent la même chose sous deux formes : **le
logiciel ne décide pas à votre place, et il ne fait pas semblant de le faire.**

### Les règles de planification

Dix règles, aucune active au départ. Le seuil n'est **jamais prérempli** : la valeur courante du
métier est affichée comme une suggestion (« souvent 13 heures — à vous de décider »), à côté d'un
champ vide. Un seuil prérempli est un seuil imposé : personne ne relit un champ déjà rempli, et
l'agence se retrouverait avec les règles de son logiciel au lieu des siennes.

Chaque règle porte sa sévérité, en mots : **avertir** (le planning reste enregistrable) ou
**bloquer** (l'enregistrement est refusé). Deux règles — chevauchement et absence déclarée — ne
prennent pas de seuil : elles constatent un fait, et l'écran le dit au lieu d'afficher un champ
inutile.

Et quand aucune règle n'est saisie, l'écran l'annonce : « aucun planning n'est signalé, ni
amplitude, ni repos, ni chevauchement. Ce n'est pas une faute, c'est un choix — mais il faut le
savoir. » C'est la contrepartie honnête de MY-10 : un logiciel qui n'impose rien ne peut pas laisser
croire qu'il surveille ce qu'on ne lui a pas demandé de surveiller.

### Les tarifs

Aucune grille livrée (MY-11). L'écran affiche **le prix TTC d'abord, en grand**, et l'estimation
après crédit d'impôt **à part, plus petite** — un parcours mesure les deux tailles de police, parce
qu'une règle d'affichage qu'aucun test ne vérifie finit par céder au premier remaniement.

Sans taux de crédit d'impôt saisi, **aucune estimation n'est calculée** : l'écran écrit « éligible
au crédit d'impôt — aucune estimation sans taux saisi » plutôt qu'un chiffre inventé. Le taux se
saisit en pourcentage et part en fraction ; le vider retire les estimations partout.

Le mode d'intervention est indiqué par prestation, et un prix en mandataire ne s'affiche jamais sans
la mention légale de `docs/07` — la même qu'en façade, tirée du même fichier de contenu.

**Un défaut d'accessibilité trouvé par un test, et corrigé dans le composant** : les dix lignes de
règles portaient les mêmes libellés visibles, donc dix cases à cocher nommées « Vérifier cette
règle ». Un lecteur d'écran qui énumère les champs n'aurait rien pu en faire. Chaque champ porte
maintenant le nom de sa règle, en gardant le texte visible dans son nom accessible (WCAG 2.5.3).

---

## MY-18 — L'application de terrain : un pointage ne se perd pas (20/10/2026)

**Décision.** L'application de l'intervenante vit à `/terrain/`, dans le même site, sans habillage
public et hors des moteurs de recherche. Elle tient d'une main : une colonne, de grandes cibles, un
geste par visite.

### Ce qui a été corrigé dans l'API en l'écrivant (un vrai trou)

Un pointage **n'avançait pas le statut de la visite**. Or `commencee()`
(`planning/materialisation.ts`) lit `status !== "prevue"`, et c'est elle qui tient la règle de
MY-13 : « une visite commencée ne suit plus le planning ». Résultat : une visite pointée restait
« prévue », et la matérialisation de la nuit réécrivait sans broncher les horaires d'une visite déjà
faite — des heures travaillées, réécrites par un planning. C'est branché : en route → `en_route`,
arrivée → `en_cours`, départ → `faite`.

L'avancement **ne revient jamais en arrière**. Un pointage « en route » qui arrive après le départ —
tournée hors réseau synchronisée dans le désordre — est enregistré comme événement, mais ne rouvre
pas une visite terminée. L'événement reste la vérité, le statut n'en est que le résumé.

La tournée rend aussi **les pointages déjà enregistrés**. Sans eux, une application rechargée
(batterie, onglet fermé, téléphone changé) laisserait croire que rien n'a été pointé, et
l'intervenante repointerait son arrivée.

### Le pointage hors réseau

Dans un immeuble ancien, un sous-sol, une cage d'escalier, il n'y a pas de réseau.

1. **L'heure du geste est l'heure du téléphone** (`at`), jamais l'heure de l'envoi. L'API l'accepte
   et la borne : deux minutes d'avance, quarante-huit heures de retard.
2. **Un envoi qui échoue attend dans le téléphone** et repart à la reconnexion, au retour sur
   l'onglet, au pointage suivant, ou sur demande.
3. **L'écran dit ce qui n'est pas parti.** Un pointage « en attente d'envoi » est un fait
   enregistré, pas un fait transmis ; le cacher serait mentir à l'intervenante.

**Ce que cette file ne fait pas, et qu'il faut savoir avant la mise en service** : il n'y a **pas de
service worker**. Si l'onglet est fermé avant que le réseau revienne, les pointages restent en
attente jusqu'à la prochaine ouverture — ils ne sont pas perdus, mais ils ne partent pas tout seuls.
Un envoi en arrière-plan et une installation sur l'écran d'accueil demandent une décision
(**Q-PWA**, posée dans `QUESTIONS.md`).

### Le badge, et la porte de sortie

Le pointage par badge n'est proposé **que si le navigateur sait lire le NFC** (Web NFC : Android,
Chrome). Ailleurs, un bouton « badge » qui ne répondrait jamais est pire que son absence. Le
**pointage manuel est toujours là, avec son motif obligatoire** (MY-02) : un badge se décolle, et
sans porte de sortie les intervenants trouveront la leur — elle sera pire. Le lecteur de QR code
demande un décodeur dans le navigateur, donc une dépendance : il attend la même décision Q-PWA.

### Accessibilité

Un bouton `variant="link"` posé sur fond sable est mesuré à **4,46** — sous le seuil AA. La règle
`.sur-sable` ne le rattrape pas : les utilitaires de Tailwind vivent dans une couche postérieure,
qui passe devant quelle que soit la spécificité. Sur sable, un tel bouton prend donc
`variant="outline"`, et le piège est écrit dans `globals.css` pour la prochaine fois. Trouvé par
axe, sur mobile seulement : à 18,06 px le texte gras n'est pas « grand texte », et le seuil passe
de 3 à 4,5.
