# Mon Youdom — Rôles, droits et consentements (Phase 0)

> État : **brouillon à valider**. C'est le document qui demande le plus d'attention : une erreur ici
> n'est pas un défaut d'affichage, c'est une violation de l'intimité de quelqu'un.

---

## 1. Le principe

**Transparence totale pour la famille, contrôle par la personne aidée.**

Trois règles en découlent, et elles priment sur toute commodité :

1. **Le bénéficiaire est propriétaire de ses données.** Tout accès d'un proche est une **délégation**
   qu'il accorde et peut retirer.
2. **Une mesure de protection prime sur la délégation.** Tutelle, curatelle, habilitation familiale,
   autorité parentale : le représentant légal exerce les droits que sa mesure lui donne, ni plus.
3. **Rien n'est implicite.** Chaque droit a une origine (qui l'a donné), une portée (quel module),
   une durée, et une trace.

---

## 2. Les objets

- **Foyer** (`household`) : un dossier bénéficiaire — une personne aidée, ou un couple aidé au même
  domicile — et ses membres.
- **Membre** (`member`) : une personne physique, avec un compte.
- **Rattachement** (`membership`) : un membre **dans** un foyer, avec un rôle.
- **Droit** (`access_grant`) : un module, une action, une période, une origine. C'est lui qui
  autorise, pas le rôle seul.

Un même membre peut appartenir à plusieurs foyers (une fille qui suit son père **et** sa mère) avec
des rôles différents. L'autorisation se calcule toujours pour un couple (membre, foyer).

---

## 3. Les modules

| Clé | Module | Contenu sensible |
| --- | --- | --- |
| `planning` | Planning, visites prévues | non |
| `intervenants` | Fiches intervenant, équipe habituelle, remplacements | données personnelles de salariés |
| `presence` | Statuts en direct, pointages, ponctualité | non |
| `comptes_rendus` | Cahier de liaison, consignes, signalements | **santé** |
| `fiche_de_vie` | Fiche de vie, projet d'accompagnement, protocoles | **santé** |
| `acces_logement` | Digicode, boîte à clés, consignes d'entrée | **critique** (sécurité physique) |
| `finances` | Devis, factures, paiements, plan d'aide, attestations | **financier** |
| `employeur` | Contrats, relevés d'heures, bulletins (mode mandataire) | **financier + social** |
| `documents` | Coffre-fort, signatures | variable |
| `messagerie` | Fil avec le coordinateur | variable |
| `qualite` | Avis, réclamations, événements indésirables | variable |
| `journal_acces` | Qui a consulté quoi | — |

Les actions : **voir**, **créer**, **modifier**, **valider**, **exporter**.

---

## 4. Matrice par défaut — côté client

« ✓ » = autorisé par défaut · « ○ » = possible, désactivé par défaut (le bénéficiaire ou le
représentant l'active) · « — » = jamais.

| Module / action | Bénéficiaire | Représentant légal | Proche référent | Proche invité | Payeur | Particulier employeur | Professionnel invité |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `planning` voir | ✓ | ✓ | ✓ | ○ | ○ | ✓ | ○ |
| `planning` créer (demande) | ✓ | ✓ | ✓ | — | — | ✓ | — |
| `intervenants` voir | ✓ | ✓ | ✓ | ○ | — | ✓ | — |
| `intervenants` créer (préférence, refus) | ✓ | ✓ | ✓ | — | — | ✓ | — |
| `presence` voir | ✓ | ✓ | ✓ | ○ | — | ✓ | — |
| `comptes_rendus` voir | ✓ | ✓ | ✓ | ○ | — | ○ | ○ (durée limitée) |
| `comptes_rendus` créer (consigne, réaction) | ✓ | ✓ | ✓ | — | — | ○ | ○ |
| `fiche_de_vie` voir | ✓ | ✓ | ✓ | — | — | ○ | ○ (durée limitée) |
| `fiche_de_vie` modifier | ✓ | ✓ | ✓ | — | — | ○ | — |
| `fiche_de_vie` modifier **un protocole** | ✓ puis validation agence | ✓ puis validation agence | demande | — | — | — | — |
| `acces_logement` voir | ✓ | ✓ | ○ | — | — | ○ | — |
| `finances` voir | ✓ | ✓ | ○ | — | ✓ | ✓ | — |
| `finances` créer (contestation) | ✓ | ✓ | ○ | — | ✓ | ✓ | — |
| `employeur` voir / valider | — | ○ | — | — | — | ✓ | — |
| `documents` voir | ✓ | ✓ | ✓ | ○ | ○ (ses factures) | ✓ | ○ |
| `documents` signer | ✓ | ✓ | — | — | ○ | ✓ | — |
| `messagerie` voir / écrire | ✓ | ✓ | ✓ | ○ | ○ | ✓ | ○ |
| `qualite` créer (réclamation, avis) | ✓ | ✓ | ✓ | ○ | ✓ | ✓ | — |
| `journal_acces` voir | ✓ | ✓ | ✓ | — | — | ✓ | — |
| **Gérer les droits des autres** | ✓ | ✓ | ○ (délégué, révocable) | — | — | — | — |
| **Exporter le dossier** | ✓ | ✓ | ○ | — | — | ○ | — |

**Lectures importantes de ce tableau**

- Un **proche invité** ne voit rien par défaut : on lui ouvre un module à la fois. C'est l'inverse de
  l'habitude du secteur, et c'est voulu.
- Le **payeur** voit l'argent, pas la santé. Payer ne donne aucun droit sur l'intimité.
- Le **professionnel invité** (infirmier, SESSAD, assistante sociale) a un accès **à durée
  déterminée**, consenti par le bénéficiaire, limité au cahier de liaison. Il expire tout seul.
- L'**accès au logement** n'est pas un droit de famille : il se donne nommément. Un digicode qui
  circule, c'est la sécurité de la personne.

---

## 5. Côté Youdom Care

| Rôle | Portée | Particularités |
| --- | --- | --- |
| **Coordinateur référent** | Ses foyers | Valide les demandes, affecte, traite les signalements, voit tout sur ses foyers |
| **Intervenant** | **Ses visites seulement** | Fiche de vie du foyer où il intervient ; `acces_logement` **uniquement pendant sa plage de visite** ; chaque consultation journalisée |
| **Responsable d'agence** | Son agence | Lecture étendue, validation des mesures de protection |
| **Astreinte** | Tous, en dehors des heures | Accès justifié par un motif saisi, surveillé, borné dans le temps |
| **Administrateur** | Technique | Aucun accès en clair aux notes de santé ; toute action journalisée |

**Règle de l'astreinte** : un accès hors heures ouvrées sans motif saisi est refusé. Le confort de
l'équipe ne prime pas sur l'intimité d'un foyer.

---

## 6. Les cas difficiles (traités explicitement)

| Situation | Règle |
| --- | --- |
| **Enfant mineur** | Les deux parents titulaires sont représentants légaux. Séparation : chacun a son compte, aucun ne voit l'activité de l'autre dans le journal, sauf décision de justice contraire. |
| **Troubles cognitifs, sans mesure de protection** | Consentement recueilli **lors de l'évaluation à domicile**, en présence d'un proche, tracé (date, qui, comment). Si le discernement est manifestement altéré, l'agence ne fait pas semblant : elle oriente vers une mesure de protection et limite l'ouverture au strict nécessaire. |
| **Mesure de protection** | Justificatif téléversé, **validé par un humain à l'agence** avant toute activation. La mesure décrit l'étendue (assistance ou représentation, biens ou personne) : le droit suit la mesure, pas le lien de parenté. |
| **Conflit familial** | Le bénéficiaire (ou le représentant) peut masquer un module à un proche. Le proche voit « Ce module n'est pas partagé avec vous », jamais « on vous l'a retiré le 12 ». |
| **Décès ou fin de contrat** | Gel du foyer : plus d'écriture. Lecture des factures et documents pendant une durée paramétrable (proposition : 13 mois, à cadrer avec vos obligations comptables), puis archivage. Les notes de santé sortent de la consultation dès le gel. |
| **Retrait d'un droit** | Immédiat : les jetons de session du membre sont invalidés pour ce foyer. Pas d'effet « à la prochaine connexion ». |

---

## 7. Modèle technique

**RBAC + ABAC.** Le rôle donne un gabarit de droits ; le droit effectif est un document
`access_grant` : `{ member, household, module, actions[], granted_by, reason, starts_at, ends_at }`.

Une requête est autorisée si, et seulement si :

1. le membre a un rattachement actif au foyer ;
2. un droit couvre le module **et** l'action ;
3. la date du jour est dans la fenêtre du droit ;
4. pour `acces_logement` : l'heure est dans la plage d'une visite affectée au demandeur ;
5. le foyer n'est pas gelé (sauf lecture autorisée après gel).

Toute évaluation négative est **journalisée** : une tentative d'accès par lien direct est une
information utile au bénéficiaire (parcours critique n° 4).

**Tests exigés dès la Phase 1** (définition de « terminé ») : pour chaque module, un test prouve
qu'un membre sans droit reçoit 404 — pas 403, qui confirmerait l'existence de la ressource.

---

## 8. Ce que je n'ai pas tranché

- La durée de conservation après décès (13 mois proposés) dépend de vos obligations comptables et de
  votre politique : à valider.
- Le droit du **proche référent** de gérer les droits des autres est une délégation puissante. Je
  l'ai mis en ○ (désactivé par défaut) : à confirmer, car c'est le cas d'usage le plus courant
  (fille qui organise tout) et le plus sensible.
- La visibilité des **noms de famille** des intervenants : la fiche affiche « prénom + initiale ».
  À valider avec eux, c'est leur donnée personnelle.
