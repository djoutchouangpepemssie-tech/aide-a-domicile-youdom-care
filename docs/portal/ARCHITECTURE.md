# Mon Youdom — Architecture (Phase 0)

> État : **cadrage, décisions du 15/10 intégrées** (voir `DECISIONS.md`). Rien n'est construit.
> Hébergement : Vercel pour l'interface, hébergeur certifié HDS pour les données (§4). Pointage :
> NFC et QR code. Une question reste ouverte et elle est importante : la place de **Ximi**, déjà en
> service chez vous (§3).

---

## 1. Le fait qui change tout : il n'y a pas de CRM

Le prompt de cadrage décrit un « CRM maison React / FastAPI / MongoDB Atlas, déployé sur Vercel et
Railway, avec devis et factures PDF », et me demande de m'y brancher. **Arcel confirme qu'il
n'existe pas.** J'ai aussi vérifié les dépôts accessibles : aucun ne contient ce CRM.

| dépôt visible | ce que c'est |
| --- | --- |
| `djoutchouangpepemssie-tech/youdom-care` | le site (dépôt de travail) |
| `djoutchouangpepemssie-tech/aide-a-domicile-youdom-care` | le même site, second distant |
| `Youdom-care/Youdom-Care` | dépôt de l'organisation (le site) |
| `djoutchouangpepemssie-tech/crm-global-clean-home` | un CRM, mais d'un **autre** client |

**Ce que cela change, et il faut le dire avant d'écrire une ligne de code :**

1. Le projet n'est plus « un espace client branché sur un CRM ». C'est **le système d'information
   complet d'un service d'aide à domicile** : coordination, planning, affectation, télégestion,
   facturation, paie en mandataire — **et** l'espace client par-dessus.
2. **L'espace client ne peut pas être construit en premier.** Il n'affiche que ce que le terrain
   produit. Sans planning ni pointage, « Fatima arrive à 9 h » n'a aucune source. Le prompt le dit
   lui-même (§7, « dépendance critique : le terrain ») ; sans CRM, cette dépendance devient le
   premier chantier.
3. L'ordre de grandeur n'est plus celui d'une extension. Voir `PLAN.md` : on parle de trois
   applications (back-office, intervenant, famille), d'une API, d'une conformité santé, et
   d'intégrations financières réglementées — **sauf si Ximi, déjà en service, en porte une partie**
   (§3).
4. **Une bonne nouvelle** : aucune dette, aucune migration. L'hébergement certifié HDS peut être
   choisi dès le premier jour, au lieu d'être une reprise douloureuse.

---

## 2. L'existant réel, et ce qui se réutilise

Le seul existant est le **site public** (ce dépôt) : 160 fichiers de tests unitaires (948 tests),
48 fichiers de parcours Playwright, 13 contrôles de contenu, 162 jetons de style.

| Brique | Où | Réutilisation dans le portail |
| --- | --- | --- |
| **Jetons de style** (couleurs, typographie, ombres, scènes) | `src/styles/tokens.css`, `scenes.css`, `glass.css` | **Intégrale.** Le portail doit être reconnaissable comme Youdom Care dès la première seconde. |
| **Primitives accessibles** : `Button`, `TextField`, `Textarea`, `Select`, `CheckboxGroup`, `RadioCards`, `FieldShell`, `FileField`, `Card`, `Callout`, `Badge`, `Heading`, `Lead`, `Tabs`, `Icon` | `src/components/ui/` | **Intégrale.** Déjà éprouvées au clavier, au lecteur d'écran, à 320 px et en zoom 200 %. |
| **Formulaire multi-étapes** : sauvegarde locale, erreurs décrites, focus sur la première erreur | `src/components/forms/MultiStepForm`, `DetailedForm` | Demandes de planning, réclamations, fiche de vie. |
| **Grille de planning** (saisie et lecture d'une semaine) | `forms/WeekPlannerInput`, `blocks/WeekPlanner` | Base du module Planning. |
| **Mode confort de lecture** (texte agrandi, liens soulignés, fonds blanchis, mémorisé) | `src/lib/comfort.ts`, `ui/ComfortToggle` | **Socle du mode simple.** Déjà là, déjà testé. |
| **Envoi d'e-mail** (Nodemailer, gabarits, accusé de réception) | `src/lib/mail/` | Notifications par e-mail. |
| **Contrat de données signé** : schéma Zod strict, webhook **signé HMAC-SHA256**, journaux sans contenu | `src/lib/lead/` | Le patron de discipline à reprendre dans l'API. |
| **Téléphone, communes d'Île-de-France** | `src/lib/phone.ts`, `geo/`, `local/` | Champs d'adresse et de commune. |
| **Règles de voix** | `docs/01_MARQUE_ET_COPYWRITING.md` | `UX_COPY.md` en découle, il ne le contredit jamais. |

**Ce qui n'existe nulle part et qu'il faut construire** : authentification, sessions, base de
données, état serveur, PDF, planning, affectation, pointage, facturation, paie. Le site est statique
par construction.

---

## 3. Le périmètre : tout créer, mais Ximi existe déjà

Deux réponses d'Arcel le 15/10, dans cet ordre : **« on doit tout créer de zéro »** (MY-01), puis,
à la question « comment faites-vous aujourd'hui ? » : **« Word et Ximi »** (MY-04).

La seconde change le calcul de la première, et il faut le dire avant d'écrire du code.

**Ce que « tout » contient vraiment**, dans un service d'aide à domicile :

| Brique | Pourquoi elle est indispensable | Difficulté | Ximi le fait-il ? |
| --- | --- | --- | --- |
| Coordination : foyers, intervenants, planning, affectation | Sans elle, l'espace client n'a **aucune donnée** à afficher | moyenne | **oui** |
| Application intervenant : pointage, compte rendu, hors ligne | C'est elle qui produit la donnée | moyenne ; le hors ligne est le vrai sujet | oui, à éprouver |
| **Espace client « Mon Youdom »** | La promesse vendue aux familles | moyenne | **non** — c'est votre différence |
| Facturation : APA, PCH, CESU, avance immédiate, crédit d'impôt | Obligation, et cœur de la relation financière | **élevée**, réglementaire et mouvante | **oui** |
| Paie et contrats en mandataire | Vous gérez des particuliers employeurs | **élevée** | **oui** |
| Télétransmission aux départements (APA) | Exigée pour être payé | **élevée**, propre à chaque département | **oui** |

Les trois dernières lignes ne sont pas « plus techniques » : elles sont **réglementaires et
changeantes**, une erreur s'y paie en argent et en relation avec un financeur public — et **vous
les payez déjà** dans votre abonnement Ximi.

**Ma recommandation, dite une fois** : ne recréez pas la facturation, la paie et la
télétransmission. Construisez ce que Ximi ne fait pas — l'espace client — et, si son application
terrain ne convient pas, la vôtre. Vous mettez alors votre argent là où se trouve votre différence.

**Ce qu'il faut demander à Xelya (éditeur de Ximi) avant de trancher**, par écrit :

1. existe-t-il une API, et quelle documentation ? (Leur plaquette cite « API, workflows » ; aucune
   documentation développeur publique n'existe, et un annuaire indique qu'il n'y a pas d'API
   ouverte — peut-être réservée aux offres hautes.)
2. donne-t-elle accès aux **pointages, affectations et comptes rendus en temps réel**, ou seulement
   à un export de facturation ? **C'est la question qui décide du projet.**
3. à quel coût et sous quelles conditions ?

**Trois voies selon leur réponse** — détaillées dans `DECISIONS.md` (MY-04) :

- **API riche** → on construit l'espace client seul. Le plus court, et le plus rentable.
- **Export seulement** → espace client + coordination et pointage ; Ximi garde la facturation.
- **Rien d'exploitable** → tout, comme le prévoyait MY-01.

**Dans les trois cas, l'ordre de construction ne change pas** : d'abord ce qui **produit** la donnée,
ensuite ce qui la **montre**, en dernier ce qui la **facture**. Et dans les trois cas, le premier
code écrit est le même — c'est pourquoi la Phase 1 peut commencer avant la réponse de Xelya.

## 4. Le point bloquant suivant : l'hébergement des données de santé

La fiche de vie, les comptes rendus de visite, les signalements et les pathologies sont des
**données de santé**. Les héberger pour le compte d'un tiers impose un **hébergeur certifié HDS**
(code de la santé publique). Le RGPD seul ne suffit pas.

### 4.1 Ce que j'ai vérifié, le 15/10/2026

| Fournisseur cité dans le prompt | Certifié HDS ? | Source |
| --- | --- | --- |
| **MongoDB Atlas** | **Oui**, référentiel 2024 (v2.0), audit Schellman, sur les régions HDS d'AWS, GCP et Azure. Les régions exactes restent à confirmer dans la console. | [page HDS de MongoDB](https://www.mongodb.com/products/platform/trust/hds), [communiqué](https://www.mongodb.com/company/newsroom/press-releases/mongo-db-furthers-commitment-to-security-and-compliance-with-new-industry-certifications) |
| **Vercel** | **Aucune preuve publique.** Sa page conformité annonce SOC 2 type 2 et ISO 27001:2022 ; HDS n'y figure pas. | [conformité Vercel](https://vercel.com/docs/security/compliance) |
| **Railway** | **Aucune preuve publique.** SOC 2, accord HIPAA en offre Enterprise ; rien sur HDS. | [conformité Railway](https://docs.railway.com/maturity/compliance) |

Deux précisions qui comptent :

- le référentiel **HDS v2.0 est pleinement applicable depuis mai 2026**, avec des exigences de
  souveraineté renforcées ([analyse juridique](https://www.privacyworld.blog/2026/05/v2-0-certification-of-french-health-data-hosting-service-providers-hds-now-fully-effective/)) ;
- la liste officielle des hébergeurs certifiés est publiée par l'Agence du numérique en santé
  ([esante.gouv.fr](https://esante.gouv.fr/ens/offre/hds)). **C'est elle qui fait foi**, pas une page
  commerciale.

L'absence de preuve n'est pas une preuve d'absence : avant d'écarter Vercel ou Railway, il faut leur
demander par écrit s'ils détiennent un certificat HDS v2.0 et son périmètre. Mais on ne construit pas
sur une espérance.

### 4.2 L'architecture retenue : Vercel devant, HDS derrière

Arcel a choisi **Vercel** (MY-03). Vercel ne publie aucun certificat HDS. Les deux se concilient, à
une condition stricte :

```
  Navigateur
     │
     ├──────────► Vercel : l'interface (HTML, CSS, JavaScript, images)
     │            aucune donnée de santé ne passe par là
     │
     └──────────► API certifiée HDS : les données
                  (appel direct depuis le navigateur, jeton court)
```

**La règle, et elle ne souffre aucune exception** : les écrans qui affichent une donnée de santé la
demandent **depuis le navigateur**, directement à l'API certifiée. Aucun rendu serveur, aucune route
intermédiaire, aucun cache Vercel ne touche une note de santé. Vercel sert des fichiers ; il ne voit
rien.

Ce que cela donne, concrètement :

| Écran | Rendu | Pourquoi |
| --- | --- | --- |
| Accueil, aide, pages publiques du portail | statique, Vercel | aucune donnée |
| Planning, statuts de visite, factures | rendu **client**, données appelées à l'API | données personnelles, pas de santé — mais la même discipline évite les erreurs |
| Cahier de liaison, fiche de vie, signalements | rendu **client** uniquement | **données de santé** : elles ne doivent exister que chez l'hébergeur certifié |

**Ce qu'il reste à choisir** : l'hébergeur certifié qui porte l'API. MongoDB Atlas, déjà cité dans le
cadrage, **est** certifié et peut porter la base. Pour l'API (FastAPI), il faut un hébergeur de la
[liste de l'ANS](https://esante.gouv.fr/ens/offre/hds) — Scalingo, Clever Cloud, OVHcloud, Outscale
sont les candidats habituels pour une application de cette taille. C'est un devis à demander.

**Si vous préférez ne rien ajouter du tout** : un portail **sans donnée de santé** reste possible —
qui vient, quand, ce qu'on paie. Honnête, mais amputé du cahier de liaison, qui est ce qui touche le
plus les familles. À dire maintenant, pas au moment de la Phase 3.

### 4.3 Le pointage, tranché : NFC et QR code

Décidé (MY-02) : badge NFC posé au domicile **et** QR code imprimé, **aucune géolocalisation**.
C'est le choix que la CNIL attend, et il supprime le sujet « surveillance des salariés ».

Un cas doit être prévu dès la Phase 2, sans quoi les intervenants inventeront leur propre
contournement : **le badge illisible, décollé ou absent**. L'application doit permettre un pointage
manuel, avec un motif, qui remonte au coordinateur et se distingue d'un pointage normal dans les
relevés.

## 5. Architecture cible

```
   Familles, bénéficiaires        Intervenants              Agence
   ┌──────────────────────┐   ┌──────────────────┐   ┌──────────────────┐
   │ Mon Youdom (Next.js) │   │ App intervenant  │   │ Back-office      │
   │ mode simple/complet  │   │ (PWA hors ligne) │   │ (coordination)   │
   └──────────┬───────────┘   └────────┬─────────┘   └────────┬─────────┘
              │ jetons courts, HTTPS   │                      │
         ┌────▼────────────────────────▼──────────────────────▼────┐
         │  API — FastAPI                                          │
         │  /portal/v1 (familles) · /field/v1 (terrain) · /admin   │
         │  trois surfaces séparées, jamais mélangées              │
         └────┬──────────────────────────────┬─────────────────────┘
              │                              │
      ┌───────▼────────┐          ┌──────────▼─────────────┐
      │ MongoDB (HDS)  │          │ Stockage objet chiffré │  URL signées, courtes
      └────────────────┘          └────────────────────────┘
```

**Principes non négociables**

1. **Trois surfaces d'API distinctes.** Ce qu'un intervenant peut appeler, une famille ne le peut
   pas, et réciproquement. Un seul jeu de routes « parce que c'est plus simple » finit toujours par
   exposer ce qu'il ne faut pas.
2. **Autorisation au plus près de la donnée.** Chaque lecture passe par un filtre de foyer et de
   module (`PERMISSIONS.md`). Un identifiant deviné ne donne rien : réponse 404, jamais 403.
3. **Journal en ajout seul.** Toute consultation ou modification d'une donnée sensible écrit un
   événement d'audit, consultable par le bénéficiaire.
4. **Le temps réel n'est pas de la surveillance.** Statuts de visite par SSE ; aucune position
   continue ; aucune carte en direct.
5. **Hors ligne d'abord pour l'application intervenant.** Dans un immeuble haussmannien ou un
   sous-sol, il n'y a pas de réseau. Le pointage se fait localement et se synchronise ensuite,
   horodaté à l'heure du geste, pas à l'heure de l'envoi.

**Temps réel** : SSE plutôt que WebSocket — les statuts de visite ne demandent aucun canal montant,
SSE traverse mieux les proxys et se reconnecte seul.

**Authentification** : lien magique par e-mail **ou** code SMS (beaucoup de bénéficiaires n'ont pas
d'adresse e-mail), second facteur obligatoire pour les modules finances et santé, passkeys en option,
liste des appareils connectés avec déconnexion à distance.

---

## 6. Intégrations externes

| Intégration | Ce qu'il faut savoir | Risque de calendrier |
| --- | --- | --- |
| **Avance immédiate URSSAF** (API Tiers de prestation) | Habilitation via DataPass ; prérequis annoncés par des éditeurs : numéro SAP (portail NOVA), logiciel habilité, RIB, attestation de régularité fiscale. **À confirmer sur urssaf.fr et api.gouv.fr** — mes sources sont des blogs d'éditeurs, pas l'administration | Plusieurs semaines. À lancer **avant** la phase facturation |
| **Télétransmission départementale** (APA) | Les conseils départementaux attendent des flux de télégestion normalisés ; les exigences varient d'un département à l'autre. **À vérifier département par département** | Peut imposer un éditeur agréé — c'est un argument fort pour la voie 2 ou 3 |
| **Signature électronique** (eIDAS) | Prestataire français à choisir | Contrat, coût par signature |
| **Prélèvement SEPA** | Mandat, séquencement, rejets | Réconciliation |
| **SMS** | Indispensable : activation, code de visite, alerte de retard | Coût unitaire |
| **Agenda iCal** | Abonnement en lecture seule, jeton par membre, révocable | Jamais de donnée de santé dans un titre d'événement |

---

## 7. Ce que l'architecture refuse

- Aucune caméra, aucun micro, aucune écoute au domicile.
- Aucun suivi GPS continu des intervenants. Le pointage est **ponctuel**. La CNIL écarte la
  géolocalisation permanente et interdit d'y recourir pour décompter le temps de travail quand un
  autre dispositif existe : un badge NFC ou un QR code posé au domicile répond mieux, et doit être
  proposé à tout salarié qui refuse la localisation.
- Aucun diagnostic, aucune interprétation médicale. Les tendances sont des **faits**, jamais une
  conclusion.
- Aucun traceur tiers, comme sur le site.
