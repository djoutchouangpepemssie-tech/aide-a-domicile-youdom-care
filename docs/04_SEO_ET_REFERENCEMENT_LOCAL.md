# 04 — SEO technique et référencement local

## 1. Doctrine

Trois idées guident tout le référencement du site.

1. **Chaque page doit mériter d'exister.** Google sanctionne les « pages satellites » (pages par ville qui canalisent vers la même offre) et le « contenu à grande échelle » produit pour manipuler le classement (règles anti-spam de Google Search, version du 31/08/2026). Une page locale Youdom Care n'existe que si elle apporte des informations locales réelles, utiles et sourcées.
2. **La confiance se prouve.** Le site traite de santé et d'argent : auteurs et relecteurs nommés, sources citées, dates de mise à jour, mentions légales complètes, cohérence parfaite du nom, de l'adresse et du téléphone partout.
3. **La technique ne doit jamais être le problème.** Pages statiques, rapides, accessibles, balisées, reliées entre elles.

Deux faits à connaître en 2026 : les résultats enrichis de type FAQ n'existent plus dans Google depuis le 7 mai 2026 (les FAQ restent utiles aux lecteurs et aux moteurs de réponse, leur balisage est facultatif) ; les étoiles d'avis ne s'affichent pas pour une entreprise qui balise ses propres avis (`LocalBusiness`, `Organization`). Donc : **aucun balisage d'avis**.

## 2. SEO technique — exigences

| Sujet | Exigence |
| --- | --- |
| Rendu | Statique (`generateStaticParams`), HTML complet sans JavaScript, `lang="fr-FR"` |
| URL | Minuscules, tirets, sans accent, barre finale, stables. `trailingSlash: true`. Aucune URL à paramètres indexable |
| Titres | 50 à 60 caractères, uniques, mot-clé principal en tête, marque en fin si la place le permet |
| Descriptions | 140 à 155 caractères, uniques, un bénéfice et une action |
| Structure | Un seul H1, hiérarchie sans saut, sommaire ancré sur les pages longues |
| Canoniques | Auto-référents, absolus. `noindex` : `/merci/…`, `/styleguide/`, pages `statut: a_relire` en prévisualisation, résultats de recherche interne |
| Plans de site | Index + segments : `pages`, `services`, `local-paris`, `local-{departement}` × 7, `magazine`, `lexique`, `agences`. `lastmod` réel (date du contenu). Ping IndexNow au déploiement |
| `robots.txt` | Autorise tout sauf `/api/`, `/merci/`, `/styleguide/` ; déclare l'index des plans de site |
| Images | `next/image`, AVIF/WebP, dimensions fixes, chargement différé sous la ligne de flottaison, `alt` obligatoire (schéma Zod), nom de fichier descriptif |
| Open Graph | Image générée par page (`opengraph-image.tsx`) : fond `paper`, titre en Fraunces, fil décoratif, logo |
| Maillage | Fil d'Ariane partout · blocs « À lire aussi » calculés par thème · chaque page reçoit au moins 3 liens internes contextuels · aucune page orpheline (contrôle automatique) |
| Erreurs | 404 utile (recherche de commune, téléphone, liens piliers) · aucune chaîne de redirections |
| Vitesse | Budgets de `docs/07` · polices auto-hébergées · pas de script tiers bloquant |
| Vérifications | Balises de vérification Google Search Console et Bing via variables d'environnement |
| International | Aucun `hreflang` (site français uniquement) |

### Données structurées (JSON-LD, générées par `src/lib/jsonld/`)

| Type | Où | Champs clés |
| --- | --- | --- |
| `Organization` | Tout le site | `name`, `legalName`, `url`, `logo`, `telephone`, `email`, `identifier` (SIRET), `areaServed` (8 départements), `sameAs`, `contactPoint` |
| `LocalBusiness` | Une par agence réelle (`/agences/…`) | `name`, `address`, `geo`, `telephone`, `openingHoursSpecification`, `parentOrganization`, `areaServed` |
| `Service` | Pages services et pathologies | `serviceType`, `provider`, `areaServed`, `audience`, `description` |
| `BreadcrumbList` | Partout sauf accueil | — |
| `Article` / `BlogPosting` | Magazine | `headline`, `author` (`Person`), `datePublished`, `dateModified`, `image`, `citation` |
| `MedicalWebPage` | Pages pathologie **seulement si `relu_par` est rempli** | `about` (`MedicalCondition`), `lastReviewed`, `reviewedBy`, `audience` (proches aidants) ; sinon `WebPage` |
| `DefinedTerm` | Lexique | `name`, `description`, `inDefinedTermSet` |
| `JobPosting` | Offres réelles | `title`, `datePosted`, `validThrough`, `hiringOrganization`, `jobLocation`, `employmentType`, `baseSalary` si fourni |
| `FAQPage` | Facultatif | Plus d'extrait enrichi ; ne jamais y placer de texte absent de la page |

Interdits : `Review`, `AggregateRating`, toute adresse qui n'est pas un point d'accueil réel, tout champ rempli avec une valeur inventée. Contrôle : `scripts/validate/check-schema.ts` analyse chaque JSON-LD généré.

### Moteurs de réponse (assistants IA)

Les familles posent désormais leurs questions à des assistants. Pour être cité : une réponse directe de 40 à 60 mots sous chaque question, des faits datés et sourcés, des définitions nettes dans le lexique, une cohérence d'entité (même nom, même adresse, même téléphone partout), un fichier `/llms.txt` qui résume le site et liste les pages de référence.

## 3. Carte des intentions de recherche

| Famille d'intention | Exemples de requêtes | Page de destination |
| --- | --- | --- |
| Service + public | aide à domicile personne âgée, auxiliaire de vie handicap, garde enfant handicapé à domicile | Piliers et sous-pages |
| Service + pathologie | aide à domicile Alzheimer, auxiliaire de vie Parkinson, aide à domicile sclérose en plaques | Pages pathologie |
| Moment critique | sortie d'hospitalisation aide à domicile, garde de nuit personne âgée, présence 24h/24 à domicile | Services transverses |
| Prix et aides | tarif auxiliaire de vie, APA aide à domicile, PCH aide humaine, crédit d'impôt aide à domicile, AEEH | Tarifs et aides, pages par aide |
| Local | aide à domicile Puteaux, auxiliaire de vie Paris 15, aide à domicile Alzheimer Val-de-Marne | Pages locales |
| Information | comment réagir refus d'aide Alzheimer, que faire parent chute, épuisement aidant | Magazine, lexique |
| Choix | prestataire ou mandataire, aide à domicile ou EHPAD, combien d'heures d'aide | Pages de fonctionnement, magazine |
| Professionnels | service aide à domicile sortie hôpital Île-de-France | Page Professionnels |
| Emploi | emploi auxiliaire de vie Paris, recrutement aide à domicile 92 | Recrutement |

Pas de volumes inventés : les priorités se règlent après le lancement avec Search Console (requêtes réelles, pages à renforcer).

## 4. Référencement local : l'architecture

```
/aide-a-domicile/                                   carte d'Île-de-France + recherche par commune
/aide-a-domicile/paris/                             pilier Paris
/aide-a-domicile/paris/15e-arrondissement/          20 arrondissements
/aide-a-domicile/paris/15e-arrondissement/javel/    quartiers (si le contenu le justifie)
/aide-a-domicile/hauts-de-seine/                    7 départements
/aide-a-domicile/hauts-de-seine/puteaux/            communes
/agences/puteaux/                                   6 agences réelles
```

### Les vagues

| Vague | Pages | Condition de passage |
| --- | --- | --- |
| 1 (lancement) | Carte régionale · 8 pages de département (dont Paris) · 20 arrondissements · 6 agences · communes des agences (Puteaux, Saint-Denis, Vitry-sur-Seine, Serris, Versailles) · pour chaque département, les 8 communes les plus peuplées et toute commune à moins de 5 km d'une agence (calcul par script) | Contrôles locaux verts sur 100 % des pages |
| 2 | Quartiers de Paris éligibles (80 quartiers administratifs, plus les noms d'usage en synonymes) · communes de plus de 20 000 habitants | Vague 1 indexée, aucune alerte Search Console |
| 3 | Communes de plus de 10 000 habitants · pages « pathologie × département » (exemple : Alzheimer dans le Val-de-Marne) avec les ressources spécialisées du département | Données suffisantes, contrôles verts |
| Hors vagues | Petites communes : **pas de page dédiée**. Elles sont couvertes par la recherche de commune (« Oui, nous intervenons à… ») et par la page de leur intercommunalité si elle est créée | — |

Une page qui n'atteint pas les seuils n'est pas créée. Le quartier ou la commune devient alors une section ancrée de la page parente.

### Anatomie d'une page locale

1. **Bannière locale** : H1 « Aide à domicile à {Commune} ({code postal}) », sous-titre rédigé à la main pour la page, boutons.
2. **Réponse immédiate** : « Oui, nous intervenons à {Commune}. » Agence la plus proche, distance à vol d'oiseau calculée, téléphone.
3. **Vivre à domicile à {Commune}** : la **zone éditoriale unique** (350 mots au minimum), écrite à partir des faits locaux : part des 75 ans et plus, type d'habitat, relief et déplacements, vie de quartier, lieux de promenade accessibles, marchés, ce que cela implique pour l'aide à domicile.
4. **Les ressources près de chez vous** (`LocalFactsGrid`) : point d'information local pour les personnes âgées, CCAS, MDPH du département, service APA du département, accueils de jour, hôpitaux et consultations mémoire, plateforme de répit, transport adapté (PAM), associations locales. Chaque ligne : nom, adresse, lien officiel, source, date.
5. **Nos accompagnements à {Commune}** : liens vers piliers et services, sans paraphrase longue.
6. **Exemple local** : une semaine type choisie selon le profil démographique du territoire, mention « Exemple illustratif ».
7. **Aides du département** : particularités et contacts du conseil départemental (APA, PCH), liens officiels.
8. **Communes voisines** : par distance réelle, pas par ordre alphabétique.
9. **Questions locales** : 3 à 5 questions propres au territoire.
10. **Formulaire** avec la commune préremplie.

### Seuils de qualité (bloquants)

| Contrôle | Commune | Arrondissement | Quartier | Département |
| --- | --- | --- | --- | --- |
| Faits locaux sourcés | ≥ 8 | ≥ 12 | ≥ 6 situés dans le quartier | ≥ 15 |
| Mots dans la zone éditoriale | ≥ 350 | ≥ 450 | ≥ 300 | ≥ 600 |
| Similarité maximale avec toute autre page locale (Jaccard sur séquences de 5 mots, zone éditoriale + questions locales) | < 0,30 | < 0,30 | < 0,30 | < 0,25 |
| Sous-titre, description et questions | Uniques, écrits pour la page | idem | idem | idem |
| Adresse d'agence affichée | Agence réelle la plus proche uniquement | idem | idem | idem |

Scripts : `scripts/validate/check-local-facts.ts`, `check-local-uniqueness.ts`, `check-local-nap.ts`. La loop n'abaisse jamais ces seuils.

**Règle d'or : aucun fait local sans source.** Un fait = une valeur + une URL source + une date de collecte, stockés dans `data/local/{code_insee}.json`. Les descriptions de quartier ne contiennent que des éléments vérifiables (données ouvertes, sites officiels des mairies, de la Ville de Paris, des départements). Rien de mémoire.

## 5. Pipeline de données ouvertes (`pnpm data:local`)

Chaque source est téléchargée dans `data/raw/` avec sa date, puis transformée. Vérifier la disponibilité de chaque adresse ; si une source a déménagé, chercher son remplaçant officiel et consigner le changement dans `docs/DECISIONS.md`.

| Donnée | Source | Usage |
| --- | --- | --- |
| Communes, codes INSEE, codes postaux, population, coordonnées | API Découpage administratif : `https://geo.api.gouv.fr/departements/{code}/communes?fields=nom,code,codesPostaux,population,centre,surface,codeEpci` | Liste des territoires, vagues, distances, communes voisines |
| Arrondissements de Paris | Même API, `type=arrondissement-municipal`, `codeDepartement=75` | Pages d'arrondissement |
| Quartiers administratifs de Paris | `https://opendata.paris.fr/` jeu « quartier_paris » | Pages et sections de quartier |
| Équipements parisiens (marchés, espaces verts, équipements seniors) | Catalogue `opendata.paris.fr` (explorer l'API du catalogue) | Faits de quartier |
| Points d'information locaux pour personnes âgées | data.gouv.fr, jeu « Points d'informations locaux pour les personnes âgées » (CNSA) | Ressources |
| EHPAD, résidences autonomie, accueils de jour | data.gouv.fr, jeu « Etablissements EHPAD, ESLD, résidences autonomie, accueils de jour » (CNSA) | Accueils de jour, répit |
| Mairies, CCAS, MDPH, services départementaux | data.gouv.fr, « Annuaire de l'administration — base de données locales » | Contacts officiels |
| Hôpitaux et établissements sanitaires | data.gouv.fr, extraction FINESS | Hôpitaux de proximité |
| Population par âge | Insee, base communale « Évolution et structure de la population », dernier millésime | Part des 60–74, 75–89, 90 ans et plus |
| Géocodage des agences | Service de géocodage de la Géoplateforme (`data.geopf.fr`) ou Base adresse nationale | Coordonnées des agences |
| Transport adapté | Île-de-France Mobilités (service PAM par département) | Ressources |
| Associations départementales | Sites nationaux des associations (France Alzheimer, France Parkinson, APF France handicap, Unapei…) : pages « près de chez vous » | Ressources, saisies à la main avec source |

Sortie : `data/local/{code_insee}.json` conforme au schéma `LocalData` (identité, démographie, agence la plus proche, `facts[]` avec `type`, `label`, `value`, `address`, `url`, `source_url`, `collected_at`). Licence et attribution des jeux de données rappelées dans `/mentions-legales/`.

## 6. Présence locale hors site (actions d'Arcel, listées dans le bilan)

- Une fiche **Google Business Profile** par agence réelle, catégorie « Service d'aide à domicile », lien vers la page `/agences/…` correspondante avec paramètres de suivi, horaires, photos réelles.
- **Cohérence nom-adresse-téléphone** stricte entre le site, les fiches, les annuaires (Pages Jaunes, annuaires des services à la personne, fédération professionnelle).
- **Avis** : les demander après chaque mise en place réussie ; y répondre. Sur le site, n'afficher que des témoignages réels avec consentement écrit.
- **Search Console et Bing Webmaster Tools** : propriété de domaine, envoi de l'index des plans de site.

## 7. Suivi après lancement

Tableau mensuel : impressions et clics par famille d'intention · pages locales indexées sur pages publiées · requêtes locales gagnées · taux de conversion par gabarit · pages à enrichir (impressions fortes, clics faibles). La loop prépare le gabarit `docs/SUIVI_SEO.md`.
