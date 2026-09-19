# 00 — Cahier des charges général

## 1. Mission du site

Faire de youdom-care.com la référence francilienne de l'accompagnement à domicile des situations qui se compliquent : maladies neurodégénératives, handicap de l'enfant et de l'adulte, grand âge. Le site a trois métiers.

1. **Convertir** une famille inquiète en un premier échange (appel, rappel, demande détaillée) en moins de trois minutes.
2. **Être trouvé** : sur les requêtes de services, de pathologies, d'aides financières, et sur chaque territoire de Paris et d'Île-de-France.
3. **Éduquer et rassurer** : donner aux proches ce qu'il leur faut pour comprendre, décider et tenir dans la durée.

Le site est créé de zéro. Aucune reprise d'ancien contenu, aucune redirection d'ancien site à gérer.

## 2. Ce que Youdom Care est (faits connus)

Source : `content/site.config.json` (issu du dépliant commercial, à confirmer par Arcel).

- Aide et accompagnement à domicile, **Paris et toute l'Île-de-France** (75, 77, 78, 91, 92, 93, 94, 95).
- Publics : personnes âgées, adultes en situation de handicap, enfants en situation de handicap, personnes atteintes de maladies neurodégénératives (Alzheimer, Parkinson, sclérose en plaques et maladies apparentées), et leurs familles.
- Services **jusqu'à 24h/24 et 7j/7**, de quelques heures par semaine à la présence continue.
- Deux modes d'intervention : **prestataire** et **mandataire**.
- Six points d'accueil : Paris 12e, Puteaux, Saint-Denis, Vitry-sur-Seine, Serris, Versailles.
- Déclaration services à la personne : SAP918366600. Crédit d'impôt de 50 % et avance immédiate selon conditions légales.

Tout ce qui n'est pas dans `content/` est inconnu et ne s'invente pas.

## 3. Publics et intentions

| Public | Ce qu'il vit | Ce qu'il cherche | Ce qui le retient |
| --- | --- | --- | --- |
| **L'enfant adulte aidant** (45–65 ans), décideur n°1 | Un parent diagnostiqué ou fragilisé, de la culpabilité, peu de temps | Une solution fiable, vite ; comprendre les aides et le coût | Peur de « l'inconnu à la maison », peur du défilé d'intervenants, prix |
| **Le conjoint aidant** (65–85 ans) | Épuisement, nuits hachées, isolement | Du relais sans « abandonner » son conjoint | Culpabilité, méfiance, écran peu lisible |
| **Le parent d'un enfant en situation de handicap** (30–50 ans) | Agenda saturé de rééducations, fratrie, travail | Quelqu'un de formé, stable, qui comprend son enfant | Peur de devoir tout réexpliquer, expériences décevantes |
| **L'adulte en situation de handicap** | Veut décider de sa vie | Des aides humaines fiables, respect de ses choix, PCH bien utilisée | Infantilisation, rigidité des plannings |
| **La personne âgée elle-même** | Tient à rester chez elle | De l'aide sans perdre la main | Lisibilité, jargon, crainte de déranger |
| **Le prescripteur** (assistante sociale hospitalière, médecin, infirmier coordinateur, mandataire judiciaire, DAC/CLIC) | Une sortie à organiser en 48 h | Un interlocuteur réactif, des informations nettes | Délais, flou sur les zones et les modes |
| **Le candidat** (auxiliaire de vie) | Cherche un employeur respectueux | Planning, secteur, formation, salaire | Opacité |

Chaque page nomme son public principal dans son brief (`docs/03`) et parle à lui seul.

## 4. Partis pris : ce qui rend ce site unique

Ces choix viennent de l'audit des deux leaders (voir annexe) et de ce qu'ils ne font pas.

1. **L'entrée par les situations.** L'accueil ne demande pas « quel service ? » mais « que vivez-vous ? ». Six cartes de situations mènent aux bonnes pages.
2. **La semaine type.** Un même composant, la grille hebdomadaire, montre des exemples concrets sur les pages de services et sert de sélecteur d'horaires dans les formulaires. Le visiteur voit ce qu'il va obtenir, puis le compose.
3. **Le suivi rendu visible.** Chaque page de service montre ce que la famille reçoit après le démarrage : référent, cahier de liaison, points réguliers, réévaluation.
4. **Les pathologies comme des accompagnements, pas comme des articles.** Une page par maladie, structurée par stade d'évolution, avec ce que l'on fait, ce que l'on ne fait pas, et le relais offert aux proches.
5. **La famille, second bénéficiaire.** Chaque page a sa section « Et pour vous, les proches ». Un espace Aidants complet existe.
6. **Un site lisible par tous.** Texte de base à 18 px, police conçue pour la malvoyance, « mode confort de lecture », téléphone toujours visible, cibles tactiles larges.
7. **La preuve honnête.** Aucun chiffre décoratif, aucun avis inventé. Des engagements vérifiables, des prix clairs, des sources citées, un auteur et un relecteur nommés.
8. **Un référencement local qui apporte quelque chose.** Chaque page locale contient des ressources réelles du territoire (points d'information seniors, MDPH, accueils de jour, hôpitaux, transport adapté), sourcées. Pas de page pour une commune si l'on n'a rien d'utile à y dire.
9. **Une porte pour les professionnels.** Une page et un formulaire express pour les prescripteurs, sans donnée nominative.
10. **Le fil.** Une ligne continue dessinée traverse les pages : le fil de la vie à domicile, le lien entre la personne, ses proches et l'équipe. C'est la signature visuelle (voir `docs/02`).

## 5. Arborescence et URL

Toutes les URL sont en minuscules, sans accent, avec tirets et barre oblique finale.

| Zone | URL | Rôle |
| --- | --- | --- |
| Accueil | `/` | Promesse, situations, preuves, conversion |
| Maladies neurodégénératives | `/maladies-neurodegeneratives/` | Page pilier |
| | `/maladies-neurodegeneratives/alzheimer/` | Alzheimer et maladies apparentées |
| | `/maladies-neurodegeneratives/parkinson/` | |
| | `/maladies-neurodegeneratives/sclerose-en-plaques/` | |
| | `/maladies-neurodegeneratives/maladie-a-corps-de-lewy/` | |
| | `/maladies-neurodegeneratives/degenerescence-fronto-temporale/` | |
| | `/maladies-neurodegeneratives/maladie-de-charcot-sla/` | |
| | `/maladies-neurodegeneratives/maladie-de-huntington/` | |
| Personnes âgées | `/personnes-agees/` | Page pilier |
| | `/personnes-agees/aide-a-l-autonomie/` | Lever, coucher, toilette, habillage, repas |
| | `/personnes-agees/vie-quotidienne/` | Courses, repas, linge, logement |
| | `/personnes-agees/compagnie-et-stimulation/` | Présence, sorties, stimulation cognitive |
| Adultes en situation de handicap | `/adultes-en-situation-de-handicap/` | Page pilier (moteur, sensoriel, cognitif, psychique, maladies invalidantes) |
| Enfants en situation de handicap | `/enfants-en-situation-de-handicap/` | Page pilier |
| | `/enfants-en-situation-de-handicap/autisme-tsa/` | |
| | `/enfants-en-situation-de-handicap/polyhandicap/` | |
| | `/enfants-en-situation-de-handicap/handicap-moteur/` | |
| | `/enfants-en-situation-de-handicap/deficience-intellectuelle/` | |
| Aidants | `/aidants/` | Espace dédié aux proches |
| | `/aidants/solutions-de-repit/` | |
| | `/aidants/ou-en-etes-vous/` | Auto-repérage non médical, 8 questions |
| Services transverses | `/services/garde-de-nuit/` | Nuit calme, nuit active |
| | `/services/presence-24h-24/` | Présence continue, équipes en relais |
| | `/services/sortie-d-hospitalisation/` | Organisation en 48 h |
| | `/services/garde-malade/` | Jour et nuit |
| | `/services/accompagnement-en-vacances/` | |
| | `/services/remplacement-d-auxiliaire-de-vie/` | |
| Fonctionnement | `/comment-ca-marche/` | Les étapes, le suivi |
| | `/comment-ca-marche/prestataire-ou-mandataire/` | Les deux modes expliqués |
| Tarifs et aides | `/tarifs-et-aides/` | Prix, exemples, aides |
| | `/tarifs-et-aides/credit-d-impot-et-avance-immediate/` | |
| | `/tarifs-et-aides/apa/` · `/pch/` · `/aeeh/` · `/cesu/` · `/aides-apres-hospitalisation/` | Une page par aide |
| Territoires | `/aide-a-domicile/` | Carte et recherche par commune |
| | `/aide-a-domicile/paris/` | Pilier Paris |
| | `/aide-a-domicile/paris/15e-arrondissement/` | 20 arrondissements |
| | `/aide-a-domicile/paris/15e-arrondissement/javel/` | Quartiers (vague 2, sous condition de contenu) |
| | `/aide-a-domicile/hauts-de-seine/` | 7 départements hors Paris |
| | `/aide-a-domicile/hauts-de-seine/puteaux/` | Communes par vagues |
| Agences | `/agences/` et `/agences/puteaux/` | Six agences réelles |
| Magazine | `/magazine/`, `/magazine/categorie/…/`, `/magazine/slug/` | « Le Fil » |
| Lexique | `/lexique/` et `/lexique/terme/` | GIR, APA, PCH, AEEH, ESA, SSIAD… |
| À propos | `/a-propos/`, `/a-propos/nos-engagements/`, `/a-propos/charte-editoriale/` | |
| Professionnels | `/professionnels/` | Prescripteurs |
| Recrutement | `/recrutement/` et `/recrutement/offre/` | |
| Conversion | `/contact/`, `/etre-rappele/`, `/demande/cas/`, `/merci/…/` | `merci` en noindex |
| Légal | `/mentions-legales/`, `/politique-de-confidentialite/`, `/cookies/`, `/conditions-generales/`, `/accessibilite/`, `/plan-du-site/` | |

### Navigation

- **En-tête** (collant, compact au défilement) : logo · « Pour qui ? » (méga-menu : maladies neurodégénératives, personnes âgées, adultes en situation de handicap, enfants en situation de handicap, aidants) · « Nos services » (nuit, 24h/24, sortie d'hospitalisation, garde-malade, vacances, remplacement) · « Comment ça marche » · « Tarifs et aides » · « Territoires » · « Le Fil » · téléphone cliquable · bouton principal « Être rappelé(e) ».
- **Barre d'action mobile** (fixe en bas) : « Appeler » · « Être rappelé(e) » · « Ma demande ».
- **Pied de page** : coordonnées et agences, quatre colonnes de liens (pour qui, services, territoires, entreprise), labels, mentions légales, mode confort de lecture, liens « Professionnels » et « Recrutement ».
- **Fil d'Ariane** sur toutes les pages sauf l'accueil.

## 6. Architecture technique

```
src/
  app/                     # routes App Router, generateStaticParams partout
    (site)/…               # pages publiques
    api/lead/route.ts      # réception des demandes (Node)
    sitemap.ts, robots.ts, manifest.ts, opengraph-image.tsx
  components/              # ui/ (primitives), blocks/ (sections), forms/, local/, article/
  content/                 # chargeurs + schémas Zod (loader.ts, schemas.ts)
  lib/                     # seo/, jsonld/, mail/, geo/, pricing/, analytics/
  styles/                  # tokens.css, globals.css
content/                   # MDX et JSON éditoriaux (seule source de vérité)
data/                      # raw/ (brut, ignoré), local/ (transformé, sourcé), territoires.seed.json
scripts/
  data/                    # pipeline des données ouvertes
  validate/                # contrôles : placeholders, seo, local, legal, copy, schema, links
tests/                     # e2e Playwright, accessibilité axe
docs/                      # cahiers, plan, journal
```

Principes :

- **Statique d'abord.** Toutes les pages sont générées au build. Seul `api/lead` s'exécute côté serveur.
- **Le contenu commande.** Une page = un fichier de contenu validé par Zod + un gabarit. Pas de texte en dur dans les composants, sauf microtextes d'interface centralisés dans `content/interface.json`.
- **Les faits d'entreprise viennent de `content/site.config.json`.** Les composants lisent cette source ; si un champ est `null`, le bloc correspondant se masque.
- **Zéro JavaScript inutile.** Les pages de contenu n'embarquent du JavaScript client que pour le menu, le mode confort et les formulaires.
- **Images** : `next/image`, AVIF/WebP, dimensions explicites, texte alternatif obligatoire dans le schéma de contenu.
- **Polices** : `next/font`, auto-hébergées, sous-ensembles latins, `display: swap`.

### Variables d'environnement (`.env.example`)

```
NEXT_PUBLIC_SITE_URL=https://www.youdom-care.com
SMTP_HOST= SMTP_PORT=465 SMTP_USER= SMTP_PASS=
LEADS_TO=contact@youdom-care.com
LEADS_FROM="Youdom Care — site <no-reply@youdom-care.com>"
LEAD_WEBHOOK_URL=            # optionnel, futur CRM
TURNSTILE_SITE_KEY= TURNSTILE_SECRET_KEY=   # optionnel, anti-robots
NEXT_PUBLIC_ANALYTICS=       # "plausible" | "matomo" | vide
```

### Mesure d'audience

Outil respectueux de la vie privée (Plausible ou Matomo en configuration exemptée de consentement). Événements : `appel_clic`, `rappel_envoye`, `demande_etape_vue`, `demande_envoyee`, `recherche_commune`, `mode_confort`. **Aucun paramètre de santé, aucune commune couplée à une pathologie.** Si un outil publicitaire est ajouté plus tard : gestionnaire de consentement conforme CNIL, chargement après accord uniquement.

## 7. Indicateurs de réussite

| Domaine | Cible au lancement |
| --- | --- |
| Performance mobile (Lighthouse) | ≥ 95 sur les pages témoins, LCP < 2,0 s, CLS < 0,05, INP < 200 ms |
| Accessibilité | 100 Lighthouse, 0 violation axe sérieuse ou critique, audit clavier complet |
| SEO technique | 100 Lighthouse, 0 erreur `pnpm validate`, plans de site valides |
| Conversion | Trois voies de contact visibles sans défilement sur mobile ; formulaire détaillé faisable en moins de 3 minutes |
| Contenu | 0 fait non sourcé, 0 champ à compléter affiché, 100 % des pages pathologie avec sources et date |
| Local | 100 % des pages locales au-dessus des seuils de `docs/04` |

## 8. Hors périmètre de la loop

DNS et domaine, mise en production, création des fiches Google Business Profile, achat de photos, validation juridique, relecture professionnelle des contenus de santé, saisie des tarifs. La loop prépare, documente et liste ces actions dans son bilan ; Arcel les réalise.
