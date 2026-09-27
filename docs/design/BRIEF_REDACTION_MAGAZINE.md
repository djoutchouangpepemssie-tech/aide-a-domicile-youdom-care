# Brief — Rédaction des articles du Fil (phase 7, P7.3 à P7.6)

Ce brief s'adresse aux agents rédacteurs des articles du magazine « Le Fil ». Il complète `docs/06_MAGAZINE.md` (ligne éditoriale, rubriques, gabarit, règles de confiance, liste des 36 sujets), `docs/01_MARQUE_ET_COPYWRITING.md` §2 (voix) et `src/content/article-schema.ts` (contrat de l'en-tête). Dépôt : `C:\Users\pepem\youdom-care-site`, branche `phase/07-magazine`. Aucun commit par les agents.

## 1. Ce que vous produisez

Pour chaque sujet de votre lot, un fichier `content/magazine/{slug}.mdx` : un en-tête YAML conforme à `articleFrontmatterSchema`, puis le corps en MDX.

```mdx
---
titre: "Alzheimer : les trois temps de la maladie et ce qu'ils changent à la maison"
seo:
  titre: "Alzheimer : trois temps de la maladie, la vie à la maison | Le Fil"
  description: "Ce que change chaque étape de la maladie d'Alzheimer au domicile, ce qui aide les proches, et les relais qui existent. Repères sourcés, sans jargon."
rubrique: comprendre
sujet: 1
chapo: "…40 à 60 mots qui répondent à la question posée…"
auteur:
  nom: "Équipe éditoriale Youdom Care"
  fonction: "rédaction, avec l'aide d'un outil d'écriture sous sa responsabilité"
relu_par: null
sante: true
publie_le: "2026-09-27"
maj_le: "2026-09-27"
essentiel:
  - "…"
  - "…"
  - "…"
demain:
  - "…"
  - "…"
  - "…"
encart:
  titre: "Besoin de relais quelques heures par semaine ?"
  texte: "…une ou deux phrases qui répondent à la question du lecteur, sans promesse…"
  libelle: "Être rappelé(e)"
  href: /etre-rappele/
sources:
  - libelle: "Haute Autorité de santé, « … »"
    href: https://www.has-sante.fr/…
    consulte_le: "2026-09-27"
image:
  src: /images/…
  alt: "…"
  focal: "50% 40%"
piliers_lies:
  - /maladies-neurodegeneratives/alzheimer/
statut: a_relire
---

## Première question réelle, comme la pose un proche ?

Paragraphes courts…

<ARetenir>
- Point 1
- Point 2
</ARetenir>

## Deuxième question ?

…

<Attention>
Une phrase de prudence quand le sujet l'exige (médicaments, chutes, urgences).
</Attention>
```

Le gabarit rend lui-même le fil d'Ariane, la rubrique, le titre, le chapô, la ligne de confiance, « L'essentiel », le sommaire, « Et concrètement, demain ? », l'encart d'appel, les sources numérotées et « À lire ensuite » : **le corps ne les répète pas**. Le corps n'utilise que les titres `##` (et `###` au besoin), les paragraphes, les listes, les tableaux simples, les liens, et les deux composants `<ARetenir>` et `<Attention>`.

## 2. Règles non négociables

1. **Vérité** : aucun fait Youdom Care inventé (délais, effectifs, ancienneté, labels, témoignages, chiffres d'activité). Ce que vous pouvez dire de Youdom Care : les services existent (`content/services/*.mdx`, champ `chemin`), la première visite d'évaluation et le devis sont gratuits, la demande se fait par téléphone ou par le formulaire de rappel. Un article utile contient **un seul** encart vers un service : celui de l'en-tête.
2. **Santé** : informer, jamais soigner. Pas de conseil médical individuel, pas de posologie, pas de promesse d'évolution (« ralentir la maladie » est interdit). Les gestes du quotidien, l'organisation, les droits et les relais sont votre terrain ; la médecine reste celui des soignants et vous renvoyez vers eux.
3. **Sources réelles** : chaque fait chiffré ou juridique vient d'une page que vous avez réellement ouverte (WebFetch) le jour même, d'une institution ou d'une association reconnue (HAS, Inserm, Assurance maladie, service-public.fr, CNSA, ministères, Fondation Vaincre Alzheimer, France Alzheimer, France Parkinson, ARSEP, Ligue française contre la SEP, APF France handicap, Unapei, Autisme France, Association française des aidants, Ma Boussole Aidants, Santé publique France, ANSES, légifrance). Les montants d'aides portent leur année. Une adresse non ouverte n'est jamais citée. Au moins deux sources par article, quatre à six de préférence, toutes réutilisées dans le corps par un renvoi discret (« selon la HAS », « d'après service-public.fr »).
4. **Récits** : aucune histoire vraie inventée. Les exemples sont explicitement illustratifs, sans prénom (« une fille qui aide sa mère »), ou renvoient aux semaines types du site (`content/semaines-types.json`, prénoms fictifs déclarés). Aucun portrait, aucun témoignage, aucun avis.
5. **Voix** (`docs/01 §2`) : vouvoiement, phrases de 20 mots au plus, réponse dès le premier paragraphe, intertitres sous forme de questions réelles, une personne fatiguée qui lit le soir sur son téléphone. « Personne accompagnée », « personne atteinte de la maladie d'Alzheimer », « enfant autiste », jamais « patient », jamais « placement ». Mots interdits (`check-copy`) : guérir, guérison, ralentir la maladie, traitement(s), garanti, n°1, leader, meilleur(e)(s), unique en France, patient(e)(s), placement, placer, placé(e)(s). Pas de « Cliquez ici », pas d'émoji, pas de point d'exclamation, pas de superlatif, pas de culpabilisation.
6. **Structure** (`docs/06 §3`) : titre de 55 à 70 caractères qui promet quelque chose de précis ; chapô de 40 à 60 mots ; « L'essentiel » 3 à 5 points d'une phrase ; corps de 900 à 1 400 mots avec quatre à sept intertitres-questions, un `<ARetenir>` par grande partie, un `<Attention>` si nécessaire ; « Et concrètement, demain ? » : trois actions qu'on peut faire dans la journée sans rien acheter ; sources numérotées par le gabarit dans l'ordre de l'en-tête.
7. **Liens** : `piliers_lies`, `encart.href` et tout lien interne du corps pointent vers des pages construites (`content/services/*.mdx` → `chemin` ; `/aidants/`, `/personnes-agees/`, `/maladies-neurodegeneratives/`, `/enfants-en-situation-de-handicap/`, `/adultes-en-situation-de-handicap/`, `/tarifs-et-aides/`, `/etre-rappele/`, `/comment-ca-marche/`, `/aide-a-domicile/`, `/lexique/{slug}/` pour les sigles : slugs dans `src/content/lexique-schema.ts` mis en minuscules avec des tirets, ex. `/lexique/apa/`). Les sigles se développent à leur première occurrence (« l'allocation personnalisée d'autonomie (APA) »).
8. **Image** : une photo de la photothèque (`public/images/**`, textes alternatifs dans `docs/design/PHOTOS.md`), jamais médicalisée, aucun visage d'enfant identifiable, `alt` descriptif et neutre.

## 3. Vérification avant de rendre

Écrivez dans votre dossier temporaire un script `.mts` qui lit vos fichiers avec `gray-matter`, valide l'en-tête avec `articleFrontmatterSchema`, compte les mots du chapô et du corps, vérifie les longueurs SEO (titre 50 à 60, description 140 à 155), cherche les mots interdits (`findForbiddenWords` de `scripts/validate/check-copy.ts`), et exécutez-le avec `pnpm exec tsx`. Vérifiez aussi que chaque `href` interne existe (`content/services`, `src/app`) et que chaque source répond (WebFetch). Ne lancez ni `pnpm build`, ni `pnpm dev`, ni Playwright : le gabarit est construit par un autre agent en parallèle.

## 4. Rapport attendu

Par article : slug, mots du corps, nombre de sources et d'intertitres, encart choisi, image, statut. Puis : sources que vous n'avez pas pu ouvrir (et ce que vous avez fait), affirmations retirées faute de source, questions pour Arcel (relecteur professionnel à désigner, données réelles manquantes).
