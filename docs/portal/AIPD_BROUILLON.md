# Mon Youdom — Analyse d'impact relative à la protection des données (brouillon)

> **Brouillon de travail, écrit par le prestataire technique.** Une AIPD est signée par le
> responsable de traitement (Youdom Care) après avis du délégué à la protection des données. Ce
> document prépare ce travail ; il ne le remplace pas.

---

## 1. Pourquoi une AIPD est obligatoire ici

Le traitement réunit **trois** critères qui, à eux seuls, imposent l'analyse :

1. **Données sensibles** : état de santé (pathologies, comportements, repas, sommeil, chutes,
   protocoles médicaux).
2. **Personnes vulnérables** : personnes âgées, personnes en perte d'autonomie, personnes en
   situation de handicap, enfants, majeurs protégés.
3. **Suivi systématique** : horodatage des visites, observations quotidiennes, suivi de présence de
   salariés.

Deux catégories de personnes concernées, et il ne faut pas l'oublier : **les bénéficiaires et leurs
proches**, mais aussi **les intervenants salariés**.

---

## 2. Description du traitement

| | |
| --- | --- |
| **Responsable de traitement** | Youdom Care |
| **Finalités** | Informer la famille du déroulement des interventions ; organiser et coordonner l'aide ; facturer ; tracer les accès aux données ; améliorer la qualité du service |
| **Bases légales** | Exécution du contrat (planning, facturation, comptes rendus liés à la prestation) · Obligation légale (facturation, droits de l'usager, évaluation qualité) · **Consentement explicite** pour les données de santé et pour la photo des intervenants · Intérêt légitime, strictement borné, pour la sécurité (code de visite) |
| **Personnes concernées** | Bénéficiaires, proches, représentants légaux, payeurs, professionnels invités, **intervenants salariés** |
| **Destinataires** | Équipe Youdom Care selon le rôle ; membres du foyer selon leurs droits ; professionnels invités avec consentement et durée ; sous-traitants (hébergeur HDS, SMS, signature, paiement) |
| **Transferts hors UE** | **Aucun** visé. À vérifier pour chaque sous-traitant, y compris les sous-traitants de sous-traitants |
| **Durées** | Voir `DATA_MODEL.md` §3 — à arrêter par Youdom Care |

---

## 3. Risques, et ce qui les réduit

| Risque | Qui en souffre | Gravité | Mesures |
| --- | --- | --- | --- |
| **Fuite du digicode ou de la boîte à clés** | Bénéficiaire (sécurité physique) | **Critique** | Chiffrement au champ ; visible seulement par l'intervenant affecté, seulement pendant sa plage ; chaque consultation journalisée et visible par le foyer |
| **Un proche voit ce qu'il ne devrait pas** (conflit familial, proche éloigné du dossier) | Bénéficiaire (intimité) | Élevée | Droits par module, désactivés par défaut pour un proche invité ; retrait immédiat ; journal des accès consultable |
| **Surveillance des salariés** | Intervenants | Élevée | **Aucune géolocalisation continue** ; pointage ponctuel ; mode alternatif (NFC, QR) pour qui refuse la localisation ; information écrite individuelle ; consultation du CSE ; inscription au registre |
| **Détournement du produit en outil de surveillance de la personne aidée** | Bénéficiaire (dignité) | Élevée | Aucune caméra, aucun micro ; le bénéficiaire peut masquer un module ; les tendances sont des faits, jamais un diagnostic |
| **Interprétation médicale abusive** d'un compte rendu | Bénéficiaire | Moyenne | Libellés qui renvoient au médecin ; pas de score, pas d'alerte « santé » automatique |
| **Usurpation d'identité d'un intervenant** à la porte | Bénéficiaire | Élevée | Code de visite à usage unique ; écran « personne n'est attendu, n'ouvrez pas » |
| **Accès par lien direct** à une ressource d'un autre foyer | Tous | Élevée | Filtrage par foyer **avant** tout chargement ; réponse 404 (ne pas confirmer l'existence) ; tentative journalisée |
| **Compromission d'un compte familial** | Foyer | Élevée | Second facteur obligatoire sur finances et santé ; liste des appareils ; déconnexion à distance ; alerte de nouvelle connexion |
| **Hébergement non conforme des données de santé** | Youdom Care (juridique) | **Critique** | Décision d'hébergement HDS **avant** la Phase 3 (voir `ARCHITECTURE.md` §3) |
| **Photos au domicile** | Bénéficiaire (dignité) | Élevée | Consentement explicite ; jamais de situation intime ; chiffrées ; durée courte |

---

## 4. Droits des personnes

| Droit | Comment il est exercé |
| --- | --- |
| Information | Notice à l'activation, en langage simple, et accessible à tout moment |
| Accès et portabilité | **Export complet du dossier en un clic** (PDF lisible + ZIP de données) |
| Rectification | Fiche de vie modifiable ; correction d'un compte rendu par un événement nouveau, jamais par réécriture |
| Effacement | Selon les durées de conservation et les obligations comptables ; expliqué, jamais refusé sans motif |
| Opposition et retrait du consentement | Retrait d'un droit, immédiat ; retrait du consentement santé : le module se ferme |
| Réclamation | Contact du DPO affiché ; mention du droit de saisir la CNIL |

---

## 5. Questions ouvertes pour Youdom Care

1. **Qui est le DPO** (interne ou externe) ? Son contact doit être affiché dans le portail.
2. Le **CSE** a-t-il été informé du projet de télégestion ? C'est un préalable, pas une formalité.
3. Quelles **durées de conservation** retenez-vous ?
4. Quel **hébergeur HDS** ? Le contrat de sous-traitance (article 28 du RGPD) doit être signé avant
   la première donnée de santé.
5. Les **intervenants** acceptent-ils l'affichage de leur photo et de leurs formations auprès des
   familles ? Un refus doit rester possible sans conséquence sur leur travail.
6. Le **registre des traitements** existe-t-il ? Ce traitement doit y être inscrit.
