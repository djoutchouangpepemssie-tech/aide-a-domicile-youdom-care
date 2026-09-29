# Audit des textes du site

Rapport produit par `pnpm audit:textes` sur les 263 pages rendues par `next build`. Il ne corrige rien : il signale.

**Ce qu'il faut savoir d'abord** : Google n'a pas de liste de mots interdits qui empêcherait d'indexer une page. Aucune page n'est retirée de l'index parce qu'elle contient un mot. Ce qui empêche réellement l'indexation est technique (§1). Ce qui fait reculer une page dans les résultats, ce sont les règles anti-spam (§2). Ce qui expose juridiquement, ce sont les allégations (§3) — elles ne désindexent pas, elles coûtent autrement.

## 1. Ce qui empêche réellement l'indexation

- Pages rendues : **263**
- Pages en `noindex` : **25 (9.5 %)**
- Pages sans canonique : **0 (0.0 %)**

Pages en `noindex` :

- `/magazine/`
- `/magazine/categorie/comprendre/`
- `/magazine/categorie/dans-les-coulisses/`
- `/magazine/categorie/droits-et-aides/`
- `/magazine/categorie/grandir-avec-un-handicap/`
- `/magazine/categorie/tenir-dans-la-duree/`
- `/magazine/categorie/vivre-chez-soi/`
- `/magazine/page/2/`
- `/merci/adulte-handicap/`
- `/merci/aidant/`
- `/merci/candidature/`
- `/merci/contact/`
- `/merci/enfant-handicap/`
- `/merci/neuro/`
- `/merci/nuit-24h/`
- `/merci/personne-agee/`
- `/merci/professionnel/`
- `/merci/rappel/`
- `/merci/sortie-hospitalisation/`
- `/styleguide/`
- `/styleguide/blocs/`
- `/styleguide/icones/`
- `/styleguide/mouvement/`
- `/styleguide/rail/`
- `/styleguide/verre/`

## 2. Règles anti-spam : bourrage de mots-clés et textes répétés

Densité du mot porteur le plus répété, sur les pages d'au moins 200 mots porteurs. Au-delà d'environ 4 %, un texte commence à se lire comme écrit pour un moteur.

| Page | Mot | Occurrences | Densité |
| --- | --- | ---: | ---: |
| `/mentions-legales/` | photo | 94 | 15.21 % |
| `/styleguide/verre/` | verre | 52 | 7.73 % |
| `/styleguide/rail/` | rail | 43 | 7.65 % |
| `/tarifs-et-aides/apa/` | gir | 13 | 5.80 % |
| `/plan-du-site/` | paris | 22 | 5.25 % |
| `/tarifs-et-aides/aeeh/` | complément | 12 | 5.08 % |
| `/services/garde-de-nuit/` | nuit | 63 | 5.07 % |
| `/styleguide/blocs/` | libre | 32 | 4.84 % |
| `/tarifs-et-aides/cesu/` | cesu | 9 | 4.31 % |
| `/magazine/credit-d-impot-et-avance-immediate-ce-que-vous-payez-vraiment/` | crédit | 36 | 4.23 % |
| `/magazine/` | mis | 12 | 4.23 % |
| `/comment-ca-marche/prestataire-ou-mandataire/` | mandataire | 9 | 4.11 % |
| `/tarifs-et-aides/credit-d-impot-et-avance-immediate/` | d'impôt | 11 | 3.99 % |
| `/aide-a-domicile/paris/13e-arrondissement/` | paris | 62 | 3.95 % |
| `/aide-a-domicile/paris/18e-arrondissement/` | paris | 64 | 3.95 % |

**12 page(s) dépassent 4 %** et méritent une relecture.

Une densité élevée n'est pas une faute en soi : une page de lexique qui définit le CESU répète « CESU », et la page des mentions légales aligne autant de liens « photo N » qu'elle crédite de photographies. Le bourrage commence quand le mot est répété **sans que la phrase en ait besoin**. C'est la lecture des extraits, pas le chiffre, qui tranche.

Phrases d'au moins douze mots qui reviennent sur cinq pages ou plus, hors gabarit commun à presque tout le site. Une famille de pages qui partagent leurs phrases est ce que Google appelle une page satellite.

| Pages | Phrase |
| ---: | --- |
| 153 | les personnes en situation de handicap, selon des conditions d'âge et de handicap évaluées par la mdph. |
| 152 | les personnes de 60 ans et plus en perte d'autonomie, qui vivent à domicile. |
| 131 | votre commune ou votre code postal vérifier être rappelé(e) je décris ma situation 01 84 80 17 03 évaluation à domici… |
| 131 | vivre chez soi avec une maladie neurodégénérative rester chez soi, avec l'aide qu'il faut, quand il le faut vous déci… |
| 131 | garde de nuit : quelqu'un est là, et vous dormez présence 24h/24 : une équipe qui se relaie, pour rester chez soi sor… |
| 131 | les jours, les horaires et les gestes dépendent de la personne : nous les ajustons ensemble, puis au fil des mois. |
| 131 | voici ceux dont dépend votre commune, relevés dans les sources officielles, et nos pages qui expliquent chaque aide. |
| 131 | écrit par équipe éditoriale youdom care, rédaction, avec l'aide d'un outil d'écriture sous sa responsabilité · page m… |
| 123 | monparcourshandicap.gouv.fr tarifs et aides en détail communes voisines par distance à vol d'oiseau, la plus proche e… |
| 116 | exemple illustratif, prénom fictif les aides du département l'apa et la pch sont instruites par le conseil départemen… |
| 30 | avant de commencer sélection et présentation de l'intervenant ou de l'auxiliaire de vie. |
| 30 | quand les besoins changent à tout moment, vous pouvez modifier ou arrêter l'accompagnement, dans le respect de la rég… |
| 27 | ce que nous ne faisons pas et avec qui nous travaillons pour cela. |
| 27 | toute personne qui règle des services à la personne à domicile, qu'elle soit imposable ou non. |
| 27 | lors de la déclaration de revenus, ou chaque mois par l'avance immédiate proposée par l'urssaf. |
| 26 | le suivi avant de commencer évaluation gratuite à domicile, avec la personne et ses proches. |
| 24 | appelez-nous : un conseiller vous explique les aides et les démarches qui concernent votre situation, sans jargon. |
| 23 | le texte officiel nous avons lu cette page officielle pour écrire la définition. |
| 21 | exemple illustratif lundi gestes du quotidien 8h–11h lever, toilette, petit-déjeuner, activité mardi gestes du quotid… |
| 21 | aides du conseil départemental conseil départemental - hauts-de-seine source : annuaire de l'administration (dila), b… |

… et 92 autres phrases partagées.

**Comment lire ce tableau.** Les phrases partagées par une centaine de pages viennent du gabarit des pages locales — rail de conversion, cartes d'aides, ligne d'auteur — et non du texte propre à chaque commune. Ce texte-là est mesuré à part par `check-local-uniqueness`, qui compare des suites de mots entre pages voisines : la similarité la plus haute relevée est de 0,141 pour un seuil d'alerte à 0,30. Autrement dit, le corps éditorial est bien propre à chaque ville. Ce qu'il faut surveiller, c'est le **rapport** entre ce gabarit et le texte unique : plus le gabarit pèse, plus la famille de pages ressemble à une série fabriquée.

## 3. Mots et tournures à risque

### Allégation médicale

_Youdom Care accompagne, il ne soigne pas : une formulation de soin expose juridiquement et abîme la crédibilité attendue d'un site de santé._

| Expression | Pages | Exemple | Dans la phrase |
| --- | ---: | --- | --- |
| thérapeutique | 22 | `/aide-a-domicile/paris/13e-arrondissement/` | …ur, et tous trois disposent d'une unité Alzheimer : l'Accueil de jour thérapeutique, le Centre d'accueil de jour - Villa Rubens et COALLIA Accueil de jou… |
| soigner | 10 | `/aidants/` | … prévisible. Une journée, un week-end, une semaine, pour partir, vous soigner, vous reposer. Un relais en urgence si vous tombez malade ou si vous … |
| prescrire | 1 | `/magazine/il-refuse-toute-aide-huit-facons-d-ouvrir-la-porte/` | …avant le rendez-vous : il peut évoquer l'aide à domicile lui-même, et prescrire ce qui relève du soin. 5. Faire entrer l'aide par une petite porte Un… |

### Superlatif invérifiable

_Une supériorité qu'on ne peut pas prouver est une pratique commerciale trompeuse (article L121-2 du code de la consommation)._

| Expression | Pages | Exemple | Dans la phrase |
| --- | ---: | --- | --- |
| le plus grand | 1 | `/aide-a-domicile/essonne/vigneux-sur-seine/` | … propose de l'hébergement temporaire, pour 130 places au total. C'est le plus grand établissement pour personnes âgées recensé dans la commune. L'héberge… |
| la plus grande | 1 | `/aide-a-domicile/hauts-de-seine/rueil-malmaison/` | …3 hectares et comptait 80 842 habitants au recensement de 2022. C'est la plus grande superficie des Hauts-de-Seine, et cela pèse sur toute organisation d'… |

### Mot déjà interdit par le cahier

_Liste de `check-copy`._

| Expression | Pages | Exemple | Dans la phrase |
| --- | ---: | --- | --- |
| traitement | 1 | `/styleguide/blocs/` | …… |
| garantir | 1 | `/styleguide/verre/` | …… |

## 4. Ce qui a été examiné et retenu comme juste

Relevés du 29 septembre 2026. Ces formulations reviennent dans le tableau ci-dessus et ont été lues en contexte : elles sont justes et ne doivent pas être corrigées.

| Formulation | Pourquoi elle reste |
| --- | --- |
| « Accueil de jour thérapeutique », « appartement thérapeutique » | Noms propres d'établissements repris des données ouvertes, pas une activité que Youdom Care revendique. |
| « vous soigner, vous reposer » (/aidants/) | S'adresse au proche aidant qui prend soin de lui-même. Aucune prestation de soin n'est promise. |
| « prescrire ce qui relève du soin » | Décrit ce que fait le médecin, pas Youdom Care. |
| « le plus grand établissement recensé dans la commune » | Fait vérifiable tiré des données ouvertes, sur un tiers, avec le nombre de places à côté. |
| « la plus grande superficie des Hauts-de-Seine » | Fait géographique vérifiable, chiffre à l'appui. |
| « Aucun conseil sur un traitement : parlez-en à votre médecin » | Avertissement de santé exigé par le cahier. Il contient le mot qu'il sert à écarter. |
| Densité forte sur /mentions-legales/, /plan-du-site/ et le lexique | Listes de crédits, d'arrondissements ou définition d'un sigle : la répétition est structurelle, pas rédactionnelle. |

