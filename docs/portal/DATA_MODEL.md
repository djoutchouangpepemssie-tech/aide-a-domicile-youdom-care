# Mon Youdom — Modèle de données (Phase 0)

> État : **proposition**. Il n'y a pas de CRM existant : rien à reprendre, rien à contourner (voir
> `ARCHITECTURE.md` §1 et §3). Ce modèle est donc le modèle de départ, et c'est une chance : la
> séparation des données de santé y est posée dès la première ligne, au lieu d'être rattrapée.

---

## 1. Trois règles de conception

1. **Séparer ce que la loi sépare.** Les collections marquées **(S)** portent des données de santé.
   Elles vivent dans le périmètre certifié HDS, quelle que soit l'option retenue (voir
   `ARCHITECTURE.md` §3). Cette séparation doit exister **dès la première ligne de code**, même si
   tout est hébergé au même endroit : c'est elle qui rend l'option B possible plus tard sans reprise.
2. **Ce qui s'est passé ne se modifie pas.** Les pointages, les événements de visite et les journaux
   d'audit sont en **ajout seul**. Une correction est un nouvel événement qui annule le précédent,
   jamais une réécriture.
3. **Une donnée, un propriétaire.** Chaque document porte son `household_id`. Toute requête du
   portail est filtrée par foyer avant d'être filtrée par module.

---

## 2. Collections

### Identité et droits

| Collection | Champs clés | Notes |
| --- | --- | --- |
| `households` | `code`, `agency_id`, `status` (actif, gelé, archivé), `mode` (prestataire, mandataire, mixte), `address`, `created_at` | Le foyer, pas le client |
| `members` | `email?`, `phone?`, `display_name`, `auth` (méthodes, passkeys), `devices[]`, `prefs` (mode simple/complet, notifications) | `email` **ou** `phone` : beaucoup de bénéficiaires n'ont pas d'adresse |
| `memberships` | `member_id`, `household_id`, `role`, `status`, `invited_by`, `activated_at` | Un membre, un foyer, un rôle |
| `access_grants` | `member_id`, `household_id`, `module`, `actions[]`, `granted_by`, `reason?`, `starts_at`, `ends_at?`, `revoked_at?` | **Le droit effectif.** Index : `(member_id, household_id, module)` |
| `legal_protections` | `household_id`, `type` (tutelle, curatelle, habilitation, autorité parentale), `scope`, `document_id`, `verified_by`, `verified_at` | Validée par un humain avant activation |
| `consents` | `household_id`, `subject` (qui consent), `purpose`, `legal_basis`, `version`, `collected_by`, `collected_at`, `method`, `revoked_at?` | Versionné : on sait à quoi la personne a dit oui, et quand |

### Accompagnement

| Collection | Champs clés | Notes |
| --- | --- | --- |
| `beneficiaries` **(S)** | `household_id`, `civil_name`, `birth_date`, `gir?`, `pathologies[]` | Pathologie = donnée de santé |
| `care_plans` **(S)** | `household_id`, `objectives[]`, `means[]`, `review_date`, `history[]` | Projet personnalisé |
| `life_sheets` **(S)** | `household_id`, `version`, `sections` (histoire, goûts, routines, ce qui apaise, communication, protocoles), `author`, `validated_by?`, `created_at` | **Versionnée** : jamais écrasée |
| `life_sheet_reads` | `life_sheet_id`, `version`, `reader_id`, `read_at` | Le « Lue par Fatima le 12 octobre » |
| `access_instructions` | `household_id`, `payload_encrypted`, `key_id`, `updated_by` | **Chiffré au champ.** Digicode, boîte à clés |
| `funding_plans` | `household_id`, `kind` (APA, PCH, AEEH, caisse), `hours_granted`, `period`, `notified_at` | Alimente l'alerte de dépassement |

### Terrain

| Collection | Champs clés | Notes |
| --- | --- | --- |
| `visits` | `household_id`, `worker_id`, `planned_start`, `planned_end`, `kind` (jour, nuit calme, nuit active, 24 h/24), `status`, `replaces?`, `visit_code` | `visit_code` : les 4 chiffres de « Qui est à ma porte ? », à usage unique |
| `visit_events` | `visit_id`, `type` (en route, arrivée, départ, annulation, remplacement), `at`, `source` (NFC, QR, position ponctuelle, agence), `geo?` | **Ajout seul.** `geo` n'existe que si le pointage l'a produit, jamais en continu |
| `visit_reports` **(S)** | `visit_id`, `tasks[]`, `meal`, `hydration`, `mood`, `night?`, `notes`, `flags[]`, `author`, `submitted_at` | Le compte rendu |
| `instructions` | `household_id`, `visit_id?`, `text`, `author`, `read_by?`, `read_at?` | Consigne pour la prochaine visite |
| `incidents` **(S)** | `household_id`, `visit_id?`, `severity`, `type` (chute, comportement, produit manquant, objet cassé, inquiétude), `description`, `reported_by`, `handled_by?` | Signalement |
| `workers` | `first_name`, `last_initial`, `photo_id?`, `seniority_since`, `qualifications[]`, `languages[]`, `photo_consent` | **Leur donnée.** La photo n'apparaît qu'avec accord écrit |
| `worker_preferences` | `household_id`, `worker_id`, `kind` (souhait, refus), `reason?`, `created_by` | Le motif d'un refus ne sort jamais du foyer et de l'agence |

### Échanges, argent, preuve

| Collection | Champs clés |
| --- | --- |
| `requests` | `household_id`, `kind` (ajout, déplacement, annulation, suspension, ponctuelle), `payload`, `status`, `decided_by?`, `decided_at?` |
| `threads` / `messages` | `household_id`, `participants[]`, `body`, `attachments[]`, `sent_at`, `read_at` |
| `notifications` | `member_id`, `event`, `channels[]`, `sent_at`, `read_at`, `grouped_into?` |
| `documents` | `household_id`, `kind` (contrat, DIPC, livret, charte, règlement, devis, attestation, notification), `file_id`, `visibility`, `signature_id?` |
| `signatures` | `document_id`, `signer_id`, `provider`, `status`, `signed_at`, `proof_id` |
| `invoices` / `payments` | `household_id`, `period`, `lines[]` (avec `visit_id`), `total_ttc`, `aid_deductions[]`, `remaining`, `status` |
| `timesheets` | `household_id`, `period`, `lines[]`, `validated_by?`, `validated_at?` (mode mandataire) |
| `complaints` / `feedback` | `household_id`, `about` (`visit_id`, `invoice_line`…), `body`, `status`, `answered_at?` |
| `audit_logs` | `at`, `actor_id`, `actor_role`, `household_id`, `action`, `target`, `module`, `outcome` (autorisé, refusé), `reason?` | **Ajout seul, jamais supprimé** |

---

## 3. Chiffrement et conservation

| Donnée | Protection | Conservation proposée |
| --- | --- | --- |
| `access_instructions` | Chiffrement **au champ**, clé distincte, rotation possible, déchiffrement journalisé | Jusqu'à la fin du contrat, puis effacement immédiat |
| Notes de santé (`life_sheets`, `visit_reports`, `incidents`) | Chiffrement au champ sur les sections libres ; hébergement HDS | À cadrer (proposition : 2 ans après la fin du contrat) |
| Photos de visite | Stockage objet chiffré, URL signées **courtes**, consentement obligatoire | 6 mois proposés |
| `audit_logs` | Ajout seul, export possible | 3 ans proposés |
| Factures et documents comptables | — | Durée légale (10 ans) |

Ces durées sont des **propositions** : elles appartiennent à votre politique de conservation et à
l'AIPD (voir `AIPD_BROUILLON.md`).

---

## 4. Index et volumétrie

Index à poser dès la Phase 1, parce qu'ils conditionnent la tenue en charge :

- `visits` : `(household_id, planned_start)`, `(worker_id, planned_start)`, `(status, planned_start)`
  — ce dernier sert la tâche de détection des retards, qui tourne **chaque minute**.
- `visit_events` : `(visit_id, at)`.
- `access_grants` : `(member_id, household_id, module)`.
- `audit_logs` : `(household_id, at)`, `(actor_id, at)`.

Ordre de grandeur, à confronter à votre activité réelle : avec 200 foyers et 3 visites par jour,
on écrit environ 220 000 visites et 500 000 événements par an. Ce n'est pas un problème de volume,
c'est un problème d'index.

---

## 5. Ce qui reste ouvert

- **Le volume réel** : combien de foyers, d'intervenants, de visites par semaine aujourd'hui ?
  C'est ce qui décide des index et du dimensionnement, pas une estimation.
- **La frontière santé / non-santé** si l'option B est retenue : elle doit être écrite collection par
  collection, champ par champ, et tenue par un test.
- **La reprise de l'existant** : combien de foyers, de visites, de documents à importer ?
