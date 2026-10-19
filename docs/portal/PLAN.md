# Mon Youdom — Plan des phases et estimation (Phase 0)

> **Ce plan ne couvre que l'espace client.** Depuis la décision MY-07 (un CRM complet), le plan
> d'ensemble — six métiers, cinq vagues, 175 à 270 jours — est dans **`CRM_PERIMETRE.md`**. Les
> phases ci-dessous en sont le détail pour la partie « espace client » (vague 3), plus le socle
> commun (vague 1) dont elles dépendent.

---

## 1. Lire ces estimations correctement

Les durées sont en **jours de travail d'une personne**, pour une personne qui connaît la pile. Elles
comprennent les tests, l'accessibilité et la documentation, parce que la définition de « terminé »
du prompt les exige — pas « le code marche sur ma machine ».

Elles ne comprennent pas : vos délais de décision, l'habilitation URSSAF (plusieurs semaines
d'attente administrative), les échanges avec les départements, ni le temps de vos équipes pour
tester et former.

Une fourchette large (×1,5 entre le bas et le haut) n'est pas de la prudence : c'est l'aveu honnête
que six des quinze inconnues de `QUESTIONS.md` déplacent ces chiffres.

---

## 2. Les phases

### Phase 0 — Cadrage · **en cours**

Lecture de l'existant, vérification HDS, modèle de données, matrice des droits, brouillon d'AIPD,
premier jet des libellés, ce plan.

**Reste à faire pour la clore** : vos réponses (`QUESTIONS.md`), la décision d'hébergement, la
décision de pointage. **3 à 5 j** après réception des réponses.

---

### Phase 1 — Le socle et le terrain · **15 à 22 j** · *commencée le 15/10*

> Sans cette phase, l'espace client n'a rien à afficher. C'est elle qui change tout.

**Étape 1 — fait (15/10)** : le paquet `apps/api` (MY-08 MongoDB, MY-09 TypeScript). Modules,
rôles et matrice par défaut ; schémas Zod du socle ; **moteur d'autorisation** avec les cinq règles
de `PERMISSIONS.md` §7, le gel du foyer, l'astreinte et les protocoles ; journal d'audit en ajout
seul, refus compris ; lien magique, code SMS, sessions, second facteur ; collections et index de
`DATA_MODEL.md` §4 ; configuration qui refuse de démarrer en production sans hébergement certifié.
89 tests, dont un qui parcourt les douze modules pour prouver le 404 — jamais 403.

**Étape 2 — faite (19/10)** : l'API et ses **quatre** surfaces séparées (`/auth/v1`, `/portal/v1`,
`/field/v1`, `/admin/v1`), chacune gardée par famille de rôles puis par foyer et module ;
connexion sans énumération de comptes, second facteur, liste des appareils, déconnexion à
distance ; planning et journal des accès côté famille ; tournée du jour, pointage NFC / QR /
manuel avec motif et horodatage du geste, consignes d'accès bornées à la visite côté terrain ;
back-office minimal côté agence (foyer, intervenant, rattachement avec droits par défaut, visite,
retrait de droit). 121 tests. Le premier compte d'agence se crée hors API, par script.

**Étape 3 — faite (19/10)** : le planning, et il n'est plus bloqué — la question B est soldée par
MY-10 (aucune règle imposée, dix contrôles configurables avec seuil et sévérité). Séries
récurrentes (rythme jusqu'à une semaine sur huit, créneaux, créneaux à pourvoir), **trois portées
de modification** (occurrence, celle-ci et les suivantes, toute la série), saut, suspension,
reprise, fin ; absences d'intervenant ; jugement d'ensemble sur quatre semaines ; heure de Paris et
changements d'heure traités en instants ; jours fériés calculés. Et les tarifs (MY-11) : prestations
versionnées créées par l'agence, majorations à la minute réelle, crédit d'impôt estimé seulement si
le taux est saisi. 206 tests.

**Étape 4 — faite (19/10)** : l'optimisation (MY-12) — suggestions classées avec leurs raisons,
réparation des signalements, préférences du foyer, rien d'appliqué sans demande — et la
matérialisation (MY-13) : les occurrences deviennent des visites pointables, idempotentes, qui
suivent le planning tant qu'elles n'ont pas commencé et ne le suivent plus après. Affecter ouvre
désormais les droits de la mission sur le foyer, bornés dans le temps. 243 tests d'API.

**Étape 5 — suivante** : la portée par agence des comptes de l'agence, les validateurs
`$jsonSchema` en doublure des schémas Zod, et l'ajustement d'une visite divergente.

- Projet API (FastAPI), base, migrations, environnements, chaîne de déploiement chez l'hébergeur
  retenu.
- Authentification : lien magique, code SMS, second facteur, appareils, déconnexion à distance.
- Foyers, membres, rattachements, invitations, **droits par module** (`PERMISSIONS.md`).
- **Journal d'audit en ajout seul** + journal des accès visible par le client.
- Back-office minimal : créer un foyer, un intervenant, poser un planning, affecter.
- Gabarit des deux modes d'affichage (simple et complet), repris du design du site.

**Ce qu'on peut montrer** : l'agence crée un foyer et un planning ; une famille se connecte et voit
la semaine à venir.

---

### Phase 2 — Savoir qui vient · **12 à 18 j**

- Application intervenant (PWA) : planning du jour, **pointage hors ligne**, synchronisation.
- Fiches intervenant, équipe habituelle, remplacements.
- **« Qui est à ma porte ? »** : code de visite à usage unique, écran « n'ouvrez pas ».
- Statuts en direct (SSE), détection des retards (tâche à la minute), alertes au coordinateur puis
  au foyer.

**Ce qu'on peut montrer** : le parcours critique n° 1 (retard) et n° 3 (porte), de bout en bout.

---

### Phase 3 — Savoir comment ça s'est passé · **12 à 18 j** — *dépend de l'hébergement HDS*

- Compte rendu de visite en moins de 2 minutes (cases + dictée), signalements, consignes lues.
- Fiche de vie **versionnée**, « Lue par », accès au logement **chiffré et borné à la visite**.
- Résumé hebdomadaire, tendances factuelles.
- Professionnel invité (accès à durée déterminée).

**Bloquée tant que l'hébergement n'est pas décidé.** C'est la seule phase dans ce cas.

---

### Phase 4 — L'argent · **20 à 30 j**

- Devis, factures ligne à ligne adossées aux pointages, avoirs, contestation d'une ligne.
- Plan d'aide : heures notifiées, consommées, alerte avant dépassement.
- Paiement SEPA, avance immédiate URSSAF (après habilitation), attestation fiscale.
- Mode mandataire : contrats, relevés d'heures à valider, bulletins.

**La phase la plus risquée.** Son estimation bougera le plus, et elle dépend d'une habilitation
administrative qu'il faut lancer **dès maintenant**.

---

### Phase 5 — Décider et échanger · **10 à 15 j**

Demandes de planning avec circuit de validation, messagerie avec le coordinateur, réclamations,
événements indésirables, avis, préférences de notification, espace aidant.

---

### Phase 6 — Durcissement et lancement · **10 à 15 j**

Audit RGAA, revue de sécurité (OWASP ASVS niveau 2), tests de charge, parcours de bout en bout,
AIPD finalisée et signée, `RUNBOOK.md`, déploiement progressif sur un foyer pilote par agence.

---

## 3. Total, et ce qu'il faut en penser

| | Bas | Haut |
| --- | --- | --- |
| Phases 1 à 3 (la promesse : savoir qui vient et comment ça s'est passé) | **39 j** | **58 j** |
| Phases 4 à 6 (argent, échanges, lancement) | **40 j** | **60 j** |
| **Ensemble (espace client et son socle)** | **79 j** | **118 j** |

Soit **4 à 6 mois** pour l'espace client et son socle. Le CRM complet, lui, demande 175 à 270 jours
(`CRM_PERIMETRE.md` §5) : ce plan en est un sous-ensemble, pas le total. Les phases 1 à 3 — c'est-à-dire le produit
que vous vendez aux familles — représentent la moitié de ce total.

**Ce que ces chiffres ne disent pas, et que je dois dire** : un logiciel métier de SAAD n'est pas
fini quand il est livré. Il faut l'exploiter (astreinte, sauvegardes, incidents), le tenir à jour
quand un barème change, et répondre aux départements. Prévoyez cette charge récurrente dans votre
décision, pas seulement le coût de construction.

---

## 4. À lancer dès maintenant, en parallèle du code

Ces démarches ont des délais que personne ne peut compresser :

1. **Habilitation URSSAF** (API Tiers de prestation) — plusieurs semaines.
2. **Choix et contrat de l'hébergeur HDS** — devis, puis contrat de sous-traitance RGPD (art. 28).
3. **Information des intervenants et consultation du CSE** sur la télégestion — préalable légal,
   pas une formalité de fin de projet.
4. **Exigences des départements** d'Île-de-France sur la télétransmission APA — à demander par
   écrit, département par département.
5. **Désignation du DPO** et inscription du traitement au registre.
