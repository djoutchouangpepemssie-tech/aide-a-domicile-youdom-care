# Mon Youdom — Plan des phases et estimation (Phase 0)

> Ce plan chiffre le cas le plus lourd : **tout créer** (MY-01). Il se raccourcit nettement si Ximi,
> déjà en service, expose une API exploitable — les phases 1, 2 et 4 fondent alors de moitié ou
> disparaissent (`ARCHITECTURE.md` §3). L'ordre, lui, ne change pas : on construit d'abord ce qui
> **produit** la donnée, ensuite ce qui la **montre**, en dernier ce qui la **facture**.

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

### Phase 1 — Le socle et le terrain · **15 à 22 j**

> Sans cette phase, l'espace client n'a rien à afficher. C'est elle qui change tout.

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
| **Ensemble, si tout est à créer** | **79 j** | **118 j** |
| **Si Ximi expose une API riche** (espace client seul) | **25 j** | **40 j** |

Soit, pour une personne à temps plein, **4 à 6 mois** — ou **5 à 8 semaines** si Ximi fournit les
données et qu'il ne reste que l'espace client à écrire. C'est l'écart que mesure la question A de
`QUESTIONS.md`, et c'est pourquoi elle passe avant tout le reste. Les phases 1 à 3 — c'est-à-dire le produit
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
