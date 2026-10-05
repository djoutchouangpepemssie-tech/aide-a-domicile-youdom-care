# 05 — Formulaires dédiés, planning 24h/24 et e-mails

## 1. Principes

1. **Un formulaire par cas**, parce que l'on ne pose pas les mêmes questions à la fille d'une personne atteinte de la maladie d'Alzheimer et au père d'un enfant autiste.
2. **Trois niveaux d'engagement partout** : appeler · être rappelé(e) (30 secondes) · décrire sa situation (2 à 3 minutes).
3. **Rien d'obligatoire sauf l'essentiel** : pour qui, un moyen de joindre la personne, la commune, le consentement. Tout le reste aide à préparer l'appel, et chaque question offre « À définir ensemble » ou « Je préfère en parler ».
4. **Le planning est le cœur** : choisir plusieurs jours, plusieurs créneaux, des nuits, du 24h/24, en quelques gestes.
5. **Données de santé = prudence maximale** (voir section 8).
6. **Destination : e-mail uniquement**, avec un format de demande stable pour brancher le CRM plus tard.

## 2. Les formulaires

| Identifiant | URL | Public | Intégré dans |
| --- | --- | --- | --- |
| `rappel` | `/etre-rappele/` | Tous | En-tête, barre mobile, fin de chaque page |
| `neuro` | `/demande/maladie-neurodegenerative/` | Proches, personnes concernées | Pilier neuro et 7 pages pathologie (pathologie préremplie) |
| `personne-agee` | `/demande/personne-agee/` | Proches, personnes âgées | Pilier et sous-pages |
| `adulte-handicap` | `/demande/adulte-handicap/` | Personne concernée, proches | Pilier adultes |
| `enfant-handicap` | `/demande/enfant-handicap/` | Parents | Pilier et sous-pages enfants |
| `aidant` | `/demande/relais-aidant/` | Aidants | Espace Aidants |
| `sortie-hospitalisation` | `/demande/sortie-d-hospitalisation/` | Proches, soignants | Page du service (parcours express, 4 questions) |
| `nuit-24h` | `/demande/nuit-et-24h/` | Tous | Garde de nuit, présence 24h/24, garde-malade |
| `professionnel` | `/demande/professionnel/` | Prescripteurs | Page Professionnels. **Aucune donnée nominative de la personne à accompagner** |
| `candidature` | `/recrutement/postuler/` | Candidats | Recrutement (CV en pièce jointe, 4 Mo au plus, PDF ou DOCX) |
| `contact` | `/contact/` | Autres demandes | Pied de page |

Toutes les pages locales ouvrent le formulaire adapté avec la commune préremplie (`?commune=92062`, code INSEE : jamais de donnée de santé dans l'URL).

## 3. Parcours commun (formulaires détaillés)

Barre de progression « Étape 2 sur 5 », bouton « Retour » toujours présent, réponses conservées sur l'appareil jusqu'à l'envoi (`sessionStorage`, effacé après envoi), une question principale par écran sur mobile.

| Étape | Contenu |
| --- | --- |
| 1. Pour qui ? | Moi-même · Mon père ou ma mère · Mon conjoint · Mon enfant · Un autre proche · Une personne que j'accompagne professionnellement |
| 2. La situation | Questions propres au cas (section 5). Toutes facultatives |
| 3. Les besoins | Cases à cocher propres au cas + « À définir ensemble » |
| 4. Le planning | Composant `WeekPlanner` en saisie (section 4) + date de début souhaitée |
| 5. Vos coordonnées | Prénom, nom, téléphone, e-mail (facultatif), commune ou code postal (autocomplétion Île-de-France), créneau de rappel préféré, message libre (facultatif, 600 caractères, avec le rappel « Inutile de détailler l'état de santé : nous en parlerons de vive voix »), consentement |
| Confirmation | Page `/merci/{formulaire}/` (noindex) : ce qui va se passer, le téléphone, deux lectures utiles |

## 4. Le composant `WeekPlanner` (variante saisie)

### Première question : le rythme

`Régulier, chaque semaine` · `Ponctuel, à des dates précises` · `Présence continue 24h/24` · `Je ne sais pas encore`

- **Régulier** → grille hebdomadaire.
- **Ponctuel** → sélecteur de dates (plusieurs dates ou une période) + créneaux par date.
- **24h/24** → question « Tous les jours ? » (7j/7 ou jours choisis), date de début, durée envisagée (quelques jours · quelques semaines · durablement). La grille se remplit d'office et reste modifiable.
- **Je ne sais pas encore** → l'étape se réduit à la date de début souhaitée.

### La grille hebdomadaire

Sept jours × six créneaux, tout est sélectionnable, plusieurs choix par jour.

| Créneau | Heures | Libellé affiché |
| --- | --- | --- |
| `early` | 6h–8h | Tôt le matin |
| `morning` | 8h–12h | Matin |
| `noon` | 12h–14h | Midi |
| `afternoon` | 14h–18h | Après-midi |
| `evening` | 18h–21h | Soirée |
| `night` | 21h–6h | Nuit |

- **Raccourcis** : Tous les jours · Du lundi au vendredi · Le week-end · Tous les matins · Toutes les nuits · 24h/24, 7j/7 · Tout effacer.
- **Horaires précis** (interrupteur « Je préfère indiquer des horaires précis ») : pour chaque jour coché, une ou plusieurs plages « de … à … » par pas de 30 minutes, y compris des plages qui passent minuit. Bouton « Copier ce jour sur… ».
- **Nuit** : si un créneau de nuit est coché, question supplémentaire : *nuit calme* (la personne dort le plus souvent, l'intervenant se lève au besoin) · *nuit active* (besoin d'une présence éveillée) · *je ne sais pas*.
- **Estimation en direct** : « Environ 23 heures par semaine, dont 2 nuits. » Calculée à partir des créneaux ou des plages. Si `content/tarifs.json` est rempli : estimation du budget mensuel TTC, puis en plus petit le montant après crédit d'impôt, mention « estimation indicative, devis gratuit après évaluation ».
- **Date de début** : Dès que possible (sous 48 h) · Dans la semaine · Dans le mois · Je me renseigne pour plus tard.

### Accessibilité de la grille (bloquant)

- Sur ordinateur : tableau dont chaque cellule est une case à cocher avec un nom accessible complet (« Mardi, après-midi, 14h à 18h »), navigation aux flèches en plus de la tabulation, en-têtes de ligne et de colonne associés.
- Sur mobile : un accordéon par jour, des pastilles de créneaux de 48 px de haut.
- Chaque changement met à jour un résumé lisible annoncé par `aria-live="polite"`.
- État jamais porté par la couleur seule : coche visible + fond.
- Tests Playwright : saisie complète au clavier, lecture du résumé, raccourcis, plages passant minuit, 24h/24.

La même grille, en lecture seule, sert aux « semaines types » des pages de services : légende par activité (gestes du quotidien, repas, sorties, présence, nuit).

## 5. Questions propres à chaque cas (étapes 2 et 3)

**`neuro`** — Étape 2 : maladie (Alzheimer ou apparentée · Parkinson · Sclérose en plaques · Corps de Lewy · Dégénérescence fronto-temporale · Charcot/SLA · Huntington · Diagnostic en cours · Autre) · où en est la personne, en mots simples (Autonome avec quelques rappels · A besoin d'aide pour plusieurs gestes · A besoin d'une présence presque continue) · ce qui pèse le plus (désorientation · sorties sans prévenir · chutes · nuits difficiles · refus d'aide · repas · fatigue du proche) · vit seul(e), en couple, avec un enfant · professionnels déjà présents (infirmier, kinésithérapeute, orthophoniste, accueil de jour, équipe Alzheimer) · APA ou PCH (obtenue · en cours · pas encore · je ne sais pas). Étape 3 : aide au lever et au coucher · toilette et habillage · repas · présence et sécurité · stimulation et sorties · entretien du logement · nuits · relais du proche.

**`personne-agee`** — Étape 2 : âge (tranches) · vit seul(e) ou non · événement récent (chute · hospitalisation · veuvage · aucun) · aide déjà en place. Étape 3 : lever et coucher · toilette · repas · courses · linge et logement · compagnie et sorties · accompagnement aux rendez-vous · nuits.

**`adulte-handicap`** — Étape 2 : nature du handicap (moteur · sensoriel · cognitif · psychique · maladie invalidante · polyhandicap · je préfère en parler) · aides techniques utilisées (fauteuil, lève-personne…) · PCH aide humaine (heures accordées par mois, facultatif) · mode souhaité (prestataire · mandataire · à comparer). Étape 3 : gestes essentiels · transferts · repas · logement · sorties, travail, loisirs · démarches · aide à la parentalité · nuits.

**`enfant-handicap`** — Étape 2 : âge de l'enfant (tranches) · situation (autisme/TSA · polyhandicap · handicap moteur · déficience intellectuelle · handicap sensoriel · maladie rare · autre · je préfère en parler) · scolarité (école avec AESH · ULIS · IME · SESSAD · à domicile) · mode de communication (parole · pictogrammes · signes · tablette · non verbal) · AEEH ou PCH (obtenue · en cours · pas encore). Étape 3 : sortie d'école ou d'établissement · mercredis · vacances · soirées · week-ends · nuits · accompagnement aux rééducations · temps pour la fratrie · relais pour souffler.

**`aidant`** — Étape 2 : qui aidez-vous · depuis combien de temps · ce dont vous avez besoin (quelques heures par semaine · une journée · des nuits · un week-end · des vacances). Étape 3 : identique au cas de la personne aidée, simplifiée.

**`sortie-hospitalisation`** — Quatre écrans : date de sortie prévue · hôpital et commune de retour · besoins des premiers jours · coordonnées (proche ou professionnel). Bandeau : « Sortie dans moins de 48 h ? Appelez-nous directement. »

**`nuit-24h`** — Pour qui · nuits calmes ou actives · combien de nuits · 24h/24 temporaire ou durable · grille préréglée sur les nuits.

**`professionnel`** — Structure, fonction, téléphone direct · commune de la personne · type de besoin · échéance · « Merci de ne saisir ni nom ni information permettant d'identifier la personne. »

## 6. Validation et protection

- Schémas **Zod partagés** client/serveur (`src/lib/lead/schema.ts`). Téléphone français validé (`libphonenumber-js`). Code postal ou code INSEE contrôlé sur la liste d'Île-de-France ; hors zone : message de `docs/01`, pas d'envoi.
- Anti-robots sans friction : champ piège invisible, délai minimal de remplissage, limite d'envois par adresse IP sur la route, Cloudflare Turnstile si les clés sont fournies. Jamais de CAPTCHA visuel.
- Erreurs : message sous le champ, lié par `aria-describedby`, focus sur la première erreur, résumé en tête de formulaire.
- Panne d'envoi : les réponses restent à l'écran, message de `docs/01`, téléphone proposé.

## 7. Format de la demande et e-mails

```ts
type LeadPayload = {
  id: string;                 // uuid
  createdAt: string;          // ISO
  form: "rappel" | "neuro" | "personne-agee" | "adulte-handicap" | "enfant-handicap"
      | "aidant" | "sortie-hospitalisation" | "nuit-24h" | "professionnel" | "candidature" | "contact";
  sourcePage: string;         // chemin de la page d'origine
  commune: { insee: string; nom: string; codePostal: string; departement: string };
  agenceProche: string;       // identifiant d'agence calculé
  urgence: "48h" | "semaine" | "mois" | "information";
  pourQui?: string;
  situation?: Record<string, string | string[]>;   // réponses du cas
  besoins?: string[];
  planning?: {
    rythme: "regulier" | "ponctuel" | "24h" | "inconnu";
    grille?: Record<Jour, Creneau[]>;
    plages?: Record<Jour, { debut: string; fin: string }[]>;
    dates?: string[];
    nuit?: "calme" | "active" | "inconnu";
    heuresParSemaine?: number;
  };
  contact: { prenom: string; nom: string; telephone: string; email?: string; rappel?: string };
  message?: string;
  consentement: { sante: boolean; date: string; version: string };
};
```

- **E-mail à l'équipe** (`LEADS_TO`) : objet `Nouvelle demande — {formulaire} — {commune} — {urgence}` (aucune donnée de santé dans l'objet). Corps HTML lisible sur téléphone : bloc coordonnées avec lien `tel:`, bloc urgence, bloc situation et besoins, planning rendu en tableau, estimation d'heures, page d'origine, agence la plus proche. En fin de message, le `LeadPayload` en JSON dans un bloc repliable, pour une future reprise automatique.
- **Accusé de réception** au demandeur si un e-mail est fourni : texte de `docs/01`, sans aucun détail de la demande.
- Envoi par SMTP chiffré (`SMTP_*`), expéditeur du domaine (SPF, DKIM et DMARC à configurer par Arcel : noté dans le bilan).
- Si `LEAD_WEBHOOK_URL` est défini : envoi du même `LeadPayload` en `POST` signé (`X-Signature` HMAC). Échec du webhook sans effet sur l'e-mail.
- **Aucune journalisation** du contenu des demandes côté serveur : seuls l'identifiant, le type de formulaire et le statut d'envoi sont consignés.

## 8. Données personnelles et de santé (à faire valider par un juriste)

- Les réponses sur la maladie ou le handicap sont des **données de santé** (article 9 du RGPD) : base légale = **consentement explicite**, case dédiée non précochée, texte de `docs/01`, version du texte enregistrée dans la demande.
- **Minimisation** : questions de santé facultatives et formulées simplement, champ libre limité avec rappel de ne pas détailler l'état de santé.
- **Pas de fuite** : aucune donnée de santé dans les URL, les objets d'e-mail, l'accusé de réception, l'analytique, les journaux ni les outils tiers.
- **Conservation** : le site ne stocke rien. La boîte de réception est le seul lieu de conservation : accès restreint, durée de conservation et procédure de suppression à définir par Arcel (proposition : suppression des demandes sans suite après 12 mois ; 3 ans au plus pour les prospects).
- **Information** : lien vers la politique de confidentialité sous chaque formulaire, droits d'accès et de suppression, contact dédié.
- **Point d'attention** : l'hébergement de données de santé collectées dans le cadre d'un suivi médico-social peut relever de la certification HDS. Le site ne conserve rien, mais la question se pose pour la messagerie et le futur CRM : à soumettre à un juriste ou au délégué à la protection des données (question Q-LEGAL-4).

## 9. Mesure

Événements sans donnée personnelle : `demande_etape_vue` (formulaire, numéro d'étape), `demande_envoyee` (formulaire, département), `rappel_envoye`, `appel_clic` (emplacement). Objectif : repérer l'étape où les visiteurs abandonnent et la simplifier.
