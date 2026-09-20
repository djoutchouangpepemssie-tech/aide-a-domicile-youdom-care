# Brief — Rédaction des pages locales (phase 6, P6.7 à P6.19)

Ce brief s'adresse aux agents rédacteurs des pages locales. Il complète `docs/01` (voix), `docs/04 §4` (anatomie et seuils), `src/content/local-schema.ts` (contrat `LocalEditorial`) et `docs/design/BRIEF_EXPERIENCE.md`. Dépôt : `C:\Users\pepem\youdom-care-site`, branche `phase/06-local`. Aucun commit par les agents.

## 1. Ce que vous produisez

Pour chaque territoire de votre lot, un fichier `content/local/{code}.json` conforme à `localEditorialSchema` :

```json
{
  "_lisezmoi": "Partie éditoriale de la page locale, écrite à partir des faits de data/local/{code}.json uniquement (docs/04 §4). À relire par Arcel avant publication.",
  "code": "92062",
  "seo": { "titre": "50 à 60 caractères", "description": "140 à 155 caractères" },
  "sous_titre": "Une phrase propre à ce territoire, sous le H1.",
  "zone_editoriale": "Markdown : paragraphes, éventuellement deux ou trois sous-titres `###`, une liste au plus. Pas de liens, pas d'images, pas de H1/H2.",
  "questions": [{ "question": "…", "reponse": "40 à 90 mots" }],
  "semaine_type": "suzanne",
  "faits_utilises": [0, 1, 3, 7],
  "auteur": { "nom": "Équipe éditoriale Youdom Care", "fonction": "rédaction, avec l'aide d'un outil d'écriture sous sa responsabilité" },
  "statut": "a_relire",
  "maj": "2026-09-20"
}
```

Le H1 (« Aide à domicile à {Nom} ({code postal}) »), la réponse immédiate avec l'agence et la distance, la grille des ressources, les liens vers les services, l'exemple, les communes voisines et le formulaire sont rendus par le gabarit : **ne les réécrivez pas** dans la zone éditoriale.

## 2. Règles non négociables

1. **Aucun fait local sans source.** Tout ce que vous affirmez sur le territoire vient de `data/local/{code}.json` : `demographie`, `population`, `superficie_ha`, `epci`, `agence_proche.distance_km`, `communes_voisines[].distance_km`, et `facts[]` (label, value, address, source). Rien d'autre : pas de relief, pas d'ambiance, pas d'histoire, pas de « quartier animé », pas de « ville résidentielle », pas de ligne de métro, pas de commerce, sauf si un fait le dit. Les faits `hopital`, `marche`, `espace-vert`, `equipement-seniors`, `accueil-jour`, `residence-autonomie`, `point-information`, `association`, `transport-adapte` se citent par leur `label` exact.
2. **Aucun nombre inventé ni calculé.** `check-local-facts` refuse tout nombre de la zone éditoriale ou des réponses qui n'apparaît pas dans les faits, la démographie, la population, la superficie ou les distances (à l'arrondi du dernier chiffre écrit : « 44 000 habitants » couvre 44 198 ; « 6,6 % » ou « 7 % » couvrent 6,6 ; « près d'un habitant sur quinze » est interdit car 15 n'est pas un fait). Pas de densité, pas de somme, pas de « deux fois plus ». Les âges (« 75 ans et plus »), les horaires et les ordinaux (« 15e ») sont tolérés. Vous pouvez écrire « trois accueils de jour » seulement s'il y a exactement trois faits `accueil-jour` (le contrôle compte par type).
3. **Aucun fait Youdom Care inventé** : pas de délai, pas de nombre d'intervenants, pas d'ancienneté, pas de label, pas de témoignage, pas de nom d'employé, pas de prix. Ce que vous pouvez dire de Youdom Care : les services existent (`content/services/`), la première visite d'évaluation et le devis sont gratuits, la demande se fait par téléphone ou par le formulaire, l'agence la plus proche est celle de `agence_proche.id` (nom et commune dans `content/site.config.json`, jamais de téléphone ni d'horaires dans votre texte).
4. **Santé** : informer, jamais soigner ; pas de conseil médical ; les pathologies se nomment mais ne se décrivent pas (les piliers le font).
5. **Voix** (`docs/01 §2`) : vouvoiement, phrases de 20 mots au plus, concret, sans superlatif ni promesse. Mots interdits (`check-copy`) : guérir, guérison, ralentir la maladie, traitement(s), garanti, n°1, leader, meilleur(e)(s), unique en France, patient(e)(s), placement, placer, placé(e)(s). Pas de « Cliquez ici », pas d'émoji, pas de point d'exclamation.
6. **Exemples** : aucun prénom, aucune scène vécue dans votre texte (l'exemple illustratif est la semaine type choisie par `semaine_type`).
7. **Unicité** (`check-local-uniqueness`) : similarité de Jaccard sur séquences de 5 mots < 0,30 entre deux pages (< 0,25 avec un département). Aucune phrase gabarit : n'écrivez jamais deux fois la même tournure d'ouverture, de transition ou de clôture, même d'une page à l'autre de votre lot. Bannis : « Youdom Care intervient à … », « Nos auxiliaires de vie … », « Vivre à domicile à … demande … », « Que vous soyez … ou … », « N'hésitez pas ». Sous-titre, titre moteur, description et chaque question doivent contenir le nom du territoire et être uniques sur tout le site.
8. **Longueurs** (bloquantes) : zone éditoriale ≥ 400 mots pour une commune (seuil 350), ≥ 500 pour un arrondissement (seuil 450), ≥ 650 pour un département (seuil 600), sans dépasser 800 ; titre moteur 50 à 60 caractères ; description 140 à 155 caractères ; 3 à 5 questions, réponses de 40 à 90 mots. Comptez avant de valider.

## 3. Comment construire la zone éditoriale (« Vivre à domicile à {Nom} »)

Elle répond à une seule question : **qu'est-ce que ce territoire change pour une aide à domicile ?** Partez des faits et tirez-en des conséquences pratiques, sans jamais généraliser au-delà de ce que le fait dit.

- La démographie : part des 60-74, des 75-89, des 90 et plus, population. Que signifie une part élevée ou faible de 75 ans et plus pour les besoins (présence, gestes du quotidien, relais des proches) ?
- Les ressources sur place (`in_territory: true`) : point d'information, CCAS, accueils de jour, résidences autonomie, hôpitaux, marchés, espaces verts, structures seniors. Nommez-les et dites comment une auxiliaire de vie s'en sert (accompagner au marché tel jour, promenade dans tel parc, coordination avec tel accueil de jour, sortie d'hospitalisation depuis tel hôpital).
- Les ressources du département (`in_territory: false`) : MDPH, conseil départemental (APA, PCH), plateforme de répit, Pam, associations. Une phrase chacune, en disant qu'elles sont départementales.
- L'agence et les voisins : distance à l'agence, communes voisines couvertes (`communes_voisines`), intercommunalité (`epci`).
- Terminez sur l'invitation à la première visite gratuite (formulée différemment sur chaque page).

Angles pour varier la structure (choisissez-en un différent par page) : partir de la démographie ; partir d'un lieu (hôpital, marché, parc) ; partir de la proximité de l'agence ; partir des proches aidants et du répit ; partir du handicap et de la MDPH ; partir des sorties d'hospitalisation ; partir d'une semaine ordinaire sans prénom (« le mardi, jour de marché à … »).

## 4. Questions locales

Trois à cinq, propres au territoire, avec son nom dans chaque question. Exemples de sujets : « Quel est le point d'information pour les personnes âgées à {Nom} ? », « Où demander l'APA quand on habite {Nom} ? », « Y a-t-il un accueil de jour à {Nom} ? », « Comment se déplacer avec le Pam depuis {Nom} ? », « Quelle est l'agence la plus proche de {Nom} ? », « Existe-t-il un marché accessible à pied à {Nom} ? ». Les réponses citent les faits (label, adresse) et renvoient au gabarit pour le reste.

## 5. Semaine type

Choisissez un `id` de `content/semaines-types.json` selon le profil : forte part de 75 ans et plus → `suzanne`, `louise`, `madeleine`, `henri` ; hôpital sur place → `bernard` ; population plus jeune ou MDPH mise en avant → `claire`, `karim`, `jacques` ; enfants → `noe`, `lina`, `tom`, `ines` ; aidants et répit → `gisele`, `veronique`. Variez dans votre lot.

## 6. Vérification avant de rendre

```bash
pnpm exec prettier --write "content/local/{préfixe}*.json"
pnpm exec tsx scripts/validate/check-local-uniqueness.ts --report
pnpm validate
```

`pnpm validate` doit être vert sur `check-local-facts`, `check-local-uniqueness` et `check-local-nap` (ce dernier signale « rendu absent » : normal). Ne lancez ni `pnpm build`, ni `pnpm start`, ni Playwright : le coordinateur construit le site après tous les lots. Si un fichier de données vous manque un fait pour atteindre 350 mots honnêtes, écrivez-le dans votre rapport plutôt que d'inventer.

## 7. Rapport attendu

Par territoire : mots, faits utilisés, semaine type, similarité maximale (rapport `--report`). Puis : faits manquants ou douteux dans les données, questions à Arcel, phrases que vous n'avez pas pu sourcer et avez retirées.
