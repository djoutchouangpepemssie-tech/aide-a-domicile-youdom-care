# Photothèque — sélection par page et par bloc

Livrable « Photothèque » du brief D-024 (`docs/design/BRIEF_EXPERIENCE.md` §4). Les fichiers sont dans `public/images/` (dossiers `heros/`, `services/`, `exemples/`, `ambiance/`), les crédits dans `public/images/CREDITS.md`.

## 1. Règles appliquées

- Sources : Pexels et Unsplash uniquement, licences commerciales sans attribution obligatoire ; auteur et adresse notés dans `CREDITS.md`.
- Ce sont des **illustrations**. Aucune légende ne nomme la personne, aucun texte ne la présente comme cliente ou salariée. Les textes alternatifs ci-dessous sont descriptifs et neutres : jamais « notre auxiliaire », jamais de prénom, jamais de diagnostic attribué à la personne photographiée.
- Interdits respectés : pas de blouse, pas d'hôpital, pas de perfusion, pas de fauteuil roulant vide, pas de mains jointes en gros plan, pas de senior devant une tablette, pas de scène sombre, pas de visage d'enfant identifiable (enfants de dos, en plan large, mains, jeux).
- Pages maladies : scènes de vie (un couple à la fenêtre, un repas, une promenade), jamais la maladie.
- Formats : les fichiers sont livrés dans leur ratio d'origine (3:2 ou 2:3 pour la plupart). Le recadrage se fait dans `next/image` avec `object-fit: cover` et le `object-position` indiqué. Rayon 20 px (docs/02 §6). `priority` seulement sur l'image du hero.
- Poids : chaque fichier < 450 Ko, largeur 1 000 à 1 600 px. Total du dossier : environ 13,7 Mo pour 59 fichiers.

Conventions du tableau : **Ratio** = ratio d'affichage recommandé ; **Point d'intérêt** = valeur `object-position` pour le recadrage (x y) et ce qu'il faut garder ; **Alt** = texte alternatif en français.

## 2. Accueil (`content/pages/accueil.json`)

| Bloc | Fichier | Ratio | Point d'intérêt | Alt |
| --- | --- | --- | --- | --- |
| Bannière, option A | `heros/accueil-hero-fenetre.jpg` | 4:5 (mobile) / 3:2 (ordinateur) | `50% 40%` ; garder les deux visages et la fenêtre | Un homme âgé et une jeune femme discutent près d'une grande fenêtre dans un salon clair |
| Bannière, option B | `heros/accueil-hero-promenade.jpg` | 3:2, 16:9 possible | `50% 45%` ; garder les deux personnes bras dessus bras dessous | Une femme âgée et un jeune homme marchent bras dessus bras dessous dans un parc |
| Situations « Que vivez-vous en ce moment ? » | pas de photo : cartes au fil (docs/02 §7). Si besoin d'une image de section : `ambiance/entree-portes-carrelage.jpg` | 16:9 | `50% 60%` | Une entrée d'immeuble avec un sol carrelé et une porte en bois vitrée |
| Neuro (bloc 4) | `heros/neuro-hero-cuisine.jpg` | 4:5 | `50% 35%` ; garder les deux têtes penchées sur l'évier | Un couple âgé lave de la salade dans une cuisine |
| Semaine type (bloc 5) | `exemples/madeleine-couple-cuisine.jpg` | 4:5 | `50% 40%` | Un couple âgé assis à une table de cuisine se tient la main |
| Comment ça commence (bloc 6) | `services/sortie-d-hospitalisation-porte.jpg` | 3:2 | `50% 50%` ; la femme dans l'encadrement de la porte | Une femme âgée ouvre la porte de son appartement sur un palier d'immeuble |
| Prix (bloc 7) | pas de photo (chiffres et fil) | — | — | — |
| Proches (bloc 8) | `heros/aidants-hero-fenetre.jpg` | 4:5 | `50% 30%` ; le visage tourné vers la fenêtre | Une femme d'une soixantaine d'années, assise sur un rebord de fenêtre, regarde dehors |
| Territoire (bloc 9) | `ambiance/facade-immeuble-paris.jpg` | 16:9 ou 3:4 | `50% 55%` ; balcons filants | Une façade d'immeuble haussmannien avec ses balcons en fer forgé |
| Magazine (bloc 10) | `ambiance/salon-fauteuil-fenetre.jpg` | 3:2 | `50% 60%` | Un fauteuil beige près d'une fenêtre, entouré de plantes vertes |
| Appel final (bloc 11) | `heros/personnes-agees-hero-jardin.jpg` | 16:9 | `50% 35%` | Une femme âgée et une femme plus jeune se saluent en riant dans un jardin |
| Recrutement (bloc 12) | `heros/personnes-agees-hero-cuisine.jpg` | 3:2 | `50% 45%` | Un jeune homme prépare des légumes dans une cuisine tandis qu'un homme âgé assis à la table le regarde |

## 3. Piliers (heros personnalisés, deux options chacun)

| Pilier | Option | Fichier | Ratio | Point d'intérêt | Alt |
| --- | --- | --- | --- | --- | --- |
| Maladies neurodégénératives `/maladies-neurodegeneratives/` | A | `heros/neuro-hero-cuisine.jpg` | 4:5 | `50% 35%` | Un couple âgé lave de la salade dans une cuisine |
| | B | `heros/neuro-hero-parc.jpg` | 3:2, 16:9 possible | `50% 45%` ; le couple de dos au centre, laisser l'allée devant | Un couple âgé, vu de dos, marche bras dessus bras dessous dans un parc, l'homme s'appuie sur une canne |
| Personnes âgées `/personnes-agees/` | A | `heros/personnes-agees-hero-cuisine.jpg` | 3:2 | `50% 45%` | Un jeune homme prépare des légumes dans une cuisine tandis qu'un homme âgé assis à la table le regarde |
| | B | `heros/personnes-agees-hero-jardin.jpg` | 3:2 ou 4:5 (`40% 35%`) | `50% 35%` ; les deux visages | Une femme âgée et une femme plus jeune se saluent en riant dans un jardin |
| Adultes en situation de handicap `/adultes-en-situation-de-handicap/` | A | `heros/adultes-handicap-hero-cuisine.jpg` | 3:2 | `50% 50%` ; la planche à découper | Un homme en fauteuil roulant coupe une tomate sur une planche dans une cuisine |
| | B | `heros/adultes-handicap-hero-bureau.jpg` | 16:9 ou 3:2 | `35% 50%` ; la femme à gauche, la fenêtre à droite | Une femme en fauteuil roulant travaille sur un ordinateur portable à une table, près d'une fenêtre, un bouquet de tulipes devant elle |
| Enfants en situation de handicap `/enfants-en-situation-de-handicap/` | A | `heros/enfants-handicap-hero-cubes.jpg` | 3:2 | `50% 55%` ; les cubes et les mains, pas la tête | Un enfant, vu de haut, construit une ville en cubes de bois sur le sol avec un adulte |
| | B | `heros/enfants-handicap-hero-mains.jpg` | 16:9 | `50% 50%` | Deux mains d'enfants dessinent dans du sable sur une table lumineuse |
| Aidants `/aidants/` | A | `heros/aidants-hero-fenetre.jpg` | 4:5 | `50% 30%` | Une femme d'une soixantaine d'années, assise sur un rebord de fenêtre, regarde dehors |
| | B | `heros/aidants-hero-canape.jpg` | 4:5 | `50% 35%` ; la tasse et le regard baissé | Une femme aux cheveux blonds, assise sur un canapé, tient une tasse et regarde vers le bas |

Note casting : les heros mêlent âges, origines et genres (homme âgé noir et jeune femme, jeune homme blanc et homme âgé noir, femme en fauteuil, femme d'âge moyen). Les intérieurs sont plausibles en Île-de-France (appartements aux murs clairs, carreaux, fenêtres hautes, parc urbain).

## 4. Pages services et pathologies

| Page (`chemin`) | Fichier | Ratio | Point d'intérêt | Alt |
| --- | --- | --- | --- | --- |
| `/maladies-neurodegeneratives/alzheimer/` | `services/alzheimer-couple-fenetre.jpg` | 3:2 | `55% 45%` ; les deux visages de profil | Un couple âgé se tient enlacé devant une fenêtre, en pleine lumière |
| `/maladies-neurodegeneratives/parkinson/` | `services/parkinson-couple-cuisine.jpg` | 3:2 | `50% 45%` | Un couple âgé, debout dans une cuisine, boit un verre devant la fenêtre |
| `/maladies-neurodegeneratives/sclerose-en-plaques/` | `services/sclerose-en-plaques-femme-fenetre.jpg` | 4:5 | `50% 40%` | Une femme d'une trentaine d'années, assise à une table près d'une fenêtre, tient une tasse |
| `/maladies-neurodegeneratives/corps-de-lewy/` | `services/corps-de-lewy-couple-fenetre.jpg` | 4:5 | `50% 40%` ; la femme debout qui pose la main sur l'homme assis | Une femme âgée debout pose la main sur l'épaule d'un homme âgé assis à une table, devant une fenêtre |
| `/maladies-neurodegeneratives/degenerescence-fronto-temporale/` | `services/degenerescence-fronto-temporale-couple-canape.jpg` | 3:2 | `60% 45%` ; le couple à droite | Un homme et une femme aux cheveux gris, assis sur un canapé, lisent chacun de leur côté |
| `/maladies-neurodegeneratives/maladie-de-charcot/` | `services/maladie-de-charcot-couple-table.jpg` | 3:2 | `45% 50%` | Une femme âgée debout parle avec un homme âgé assis à une table, dans une pièce baignée de lumière |
| `/maladies-neurodegeneratives/maladie-de-huntington/` | `services/maladie-de-huntington-femme-repas.jpg` | 3:2 | `50% 50%` ; l'assiette et les mains | Une femme d'une quarantaine d'années prend un repas à une table de cuisine, près d'une fenêtre |
| `/personnes-agees/aide-a-l-autonomie/` | `services/aide-a-l-autonomie-palier.jpg` | 3:2 | `60% 50%` ; la femme âgée avec son déambulateur et la porte | Sur un palier d'immeuble, une femme accompagne une femme âgée qui s'appuie sur un déambulateur devant sa porte |
| `/personnes-agees/vie-quotidienne/` | `services/vie-quotidienne-courses.jpg` | 3:2 | `40% 45%` ; les sacs de courses | Une jeune femme tend un fruit à une femme âgée dans un salon, des sacs de courses posés au sol |
| `/personnes-agees/compagnie-et-stimulation/` | `services/compagnie-et-stimulation-mots-croises.jpg` | 3:2 | `50% 50%` ; la grille et les deux têtes | Une femme âgée et une femme plus jeune remplissent une grille de mots croisés à une table de cuisine |
| `/enfants-en-situation-de-handicap/autisme/` | `services/autisme-jeu-sensoriel.jpg` | 3:2 | `50% 55%` ; le bac de pâtes et les mains | Un enfant, dont on ne voit que les mains et les jambes, joue avec des pâtes sèches dans un bac blanc |
| `/enfants-en-situation-de-handicap/deficience-intellectuelle/` | `services/deficience-intellectuelle-mains-pate.jpg` | 4:5 | `50% 45%` ; les mains | Les mains d'une adolescente modèlent de la pâte rose sur un bureau |
| `/enfants-en-situation-de-handicap/handicap-moteur/` | `services/handicap-moteur-main-roue.jpg` | 4:5 | `50% 50%` ; la main sur la roue, le couloir en fond | Une main posée sur la roue d'un fauteuil roulant dans un couloir lumineux |
| `/enfants-en-situation-de-handicap/polyhandicap/` | `services/polyhandicap-mains-guidees.jpg` | 4:5 | `50% 45%` | La main d'un adulte guide la main d'un enfant qui presse de la pâte à modeler rouge |
| `/aidants/solutions-de-repit/` | `services/solutions-de-repit-terrasse.jpg` | 3:2 | `35% 50%` ; la femme sur la terrasse, cadrée par l'embrasure | Vue depuis l'intérieur : une femme aux cheveux blancs se tient sur une terrasse en bois face à un lac, au soleil |
| `/services/garde-de-nuit/` | `services/garde-de-nuit-chambre.jpg` | 3:2 | `55% 55%` ; le visage et la lampe | Une femme âgée dort sur le côté dans une chambre éclairée par une lampe de chevet |
| `/services/presence-24h-24/` | `services/presence-24h-24-salon.jpg` | 3:2 | `50% 45%` | Une jeune femme accroupie près d'un fauteuil parle avec un homme âgé assis, dans un salon clair |
| `/services/accompagnement-en-vacances/` | `services/accompagnement-en-vacances-promenade-mer.jpg` | 16:9 | `60% 55%` ; le couple entre les lampadaires | Un couple âgé marche sur une promenade de bord de mer bordée de lampadaires |
| `/services/remplacement-d-auxiliaire-de-vie/` | `services/remplacement-auxiliaire-papiers.jpg` | 3:2 | `50% 50%` | Un jeune homme et un homme âgé lisent ensemble des documents à une table, devant une fenêtre |
| `/services/garde-malade/` | `services/garde-malade-the-canape.jpg` | 3:2 | `55% 45%` | Un homme âgé assis sur un canapé boit une tasse de thé dans une pièce claire |
| `/services/sortie-d-hospitalisation/` | `services/sortie-d-hospitalisation-porte.jpg` | 3:2 | `50% 50%` | Une femme âgée ouvre la porte de son appartement sur un palier d'immeuble |
| Piliers (`/maladies-neurodegeneratives/`, `/personnes-agees/`, `/adultes-en-situation-de-handicap/`, `/enfants-en-situation-de-handicap/`, `/aidants/`) | voir §3 (heros) | | | |

## 5. Semaines types (`content/semaines-types.json`)

Aucune de ces photos ne représente la personne de l'exemple : elle évoque un âge, un cadre, un moment. Le composant `WeekPlanner` en variante `display` peut l'afficher en vignette 4:5 à côté de la grille ; ne jamais écrire le prénom en légende de la photo.

| Exemple | Fichier | Ratio | Point d'intérêt | Alt |
| --- | --- | --- | --- | --- |
| Madeleine, 82 ans, vit avec son mari | `exemples/madeleine-couple-cuisine.jpg` | 4:5 | `50% 40%` ; les mains jointes sur la table restent en plan large, pas en gros plan | Un couple âgé assis à une table de cuisine se tient la main |
| Jacques, 71 ans | `exemples/jacques-parc-automne.jpg` | 4:5 | `50% 50%` | Un homme âgé, vu de dos, marche avec une canne dans une allée de parc en automne |
| Claire, 38 ans, deux enfants | `exemples/claire-promenade-famille.jpg` | 3:2 | `50% 50%` | Un couple et un jeune enfant, vus de dos, marchent sur un chemin bordé d'arbres |
| Suzanne, 88 ans, vit seule | `exemples/suzanne-fenetre-immeuble.jpg` | 3:2 | `40% 45%` ; la fenêtre ouverte à gauche | Une femme âgée regarde depuis la fenêtre ouverte de son appartement, dans un immeuble |
| Karim, 34 ans, salarié | `exemples/karim-ordinateur-fenetre.jpg` | 3:2 | `45% 50%` | Un homme en fauteuil roulant travaille sur un ordinateur portable près d'une grande fenêtre |
| Noé, 8 ans | `exemples/noe-cubes-sol.jpg` | 3:2 | `50% 60%` ; les cubes alignés | Les mains d'un enfant, vu de haut, alignent des cubes de bois colorés sur un plancher |
| Bernard, 74 ans, retour d'hôpital | `exemples/bernard-fauteuil-salon.jpg` | 3:2 | `60% 50%` | Un homme âgé, assis dans un fauteuil rouge de son salon, regarde vers la fenêtre |
| Henri, 79 ans, vit avec sa femme | `exemples/henri-couple-fenetre-dos.jpg` | 3:2 | `35% 50%` ; le couple de dos à gauche | Un couple âgé, vu de dos, assis côte à côte, regarde par une grande fenêtre |
| Véronique, 58 ans, vit avec son mari et leur fils | `exemples/veronique-couple-canape.jpg` | 4:5 | `50% 40%` | Un homme et une femme d'une soixantaine d'années, assis sur un canapé, dans une pièce ensoleillée |
| Paul, 63 ans, vit avec sa femme | `exemples/paul-couple-balcon.jpg` | 3:2 | `35% 40%` ; le couple à gauche | Un couple d'une soixantaine d'années enlacé sur un balcon, devant des immeubles |
| Sophie, 44 ans, vit seule | `exemples/sophie-cuisine-veranda.jpg` | 4:5 | `50% 55%` ; la femme à table dans la véranda | Une femme assise seule à une table de cuisine, dans une véranda baignée de soleil |
| Lina, 6 ans | `exemples/lina-mains-sable.jpg` | 3:2 | `50% 50%` | Les mains d'un enfant laissent couler du sable au-dessus d'un seau bleu |
| Tom, 10 ans, scolarisé en classe ordinaire | `exemples/tom-couloir-ecole.jpg` | 4:5 | `50% 45%` | Un enfant avec un cartable, vu de dos, dans le couloir d'une école |
| Inès, 12 ans, deux petites sœurs | `exemples/ines-soeurs-rue.jpg` | 4:5 | `50% 55%` | Deux petites filles, vues de dos, marchent main dans la main dans une ruelle pavée |
| Louise, 91 ans, vit seule | `exemples/louise-canape-fenetre.jpg` | 3:2 | `60% 45%` | Une femme âgée assise sur un canapé vert près d'une fenêtre donnant sur la rue |
| Gisèle, 79 ans, une semaine à la mer | `exemples/gisele-plage-bras.jpg` | 3:2 | `40% 45%` | Une femme âgée et une femme plus jeune marchent main dans la main au bord de l'eau, sur une plage |

## 6. Ambiance (intérieurs, extérieurs, sans personne ou presque)

| Usage | Fichier | Ratio | Point d'intérêt | Alt |
| --- | --- | --- | --- | --- |
| Salon | `ambiance/salon-fauteuil-fenetre.jpg` | 3:4 ou 3:2 (`50% 60%`) | `50% 60%` | Un fauteuil beige près d'une fenêtre, entouré de plantes vertes |
| Cuisine (table) | `ambiance/cuisine-table-pain.jpg` | 3:2 | `50% 55%` | Une table de cuisine avec du pain, une cafetière italienne et des coings, sous une lumière douce |
| Cuisine (fenêtre) | `ambiance/cuisine-fenetre-soleil.jpg` | 4:5 | `50% 40%` | Le soleil entre par la fenêtre en bois d'une cuisine et éclaire le plan de travail |
| Promenade (allée de parc, quelques passants) | `ambiance/promenade-allee-parc.jpg` | 16:9 | `50% 55%` | Une allée de parc bordée d'arbres, quelques promeneurs au loin |
| Promenade (allée avec banc, Paris) | `ambiance/promenade-allee-banc.jpg` | 4:5 | `50% 55%` | Une allée bordée d'arbres avec un banc, sous une lumière tamisée par les feuilles |
| Jardin (Jardin du Luxembourg) | `ambiance/jardin-luxembourg-chaises.jpg` | 4:5 | `50% 60%` ; les chaises vertes | Des chaises vertes sur une allée de gravier, à l'ombre des arbres d'un jardin public |
| Balcon | `ambiance/balcon-chaise-soleil.jpg` | 3:2 | `50% 50%` | Un balcon ensoleillé avec une petite table, une chaise et une plante verte |
| Escalier | `ambiance/escalier-immeuble.jpg` | 3:4 | `50% 50%` ; la rampe en bois | Un escalier d'immeuble avec une rampe en bois, éclairé par le soleil |
| Entrée | `ambiance/entree-portes-carrelage.jpg` | 3:4 ou 16:9 (`50% 60%`) | `50% 50%` | Une entrée d'immeuble avec un sol carrelé et une porte en bois vitrée |
| Façade | `ambiance/facade-immeuble-paris.jpg` | 3:4 ou 16:9 | `50% 55%` | Une façade d'immeuble haussmannien avec ses balcons en fer forgé |

## 7. Ce qu'on n'a pas trouvé, et les réserves

- **Enfant en fauteuil roulant, sans visage identifiable, dans un cadre plausible en Île-de-France** : introuvable sur les deux banques. Les seules séries disponibles (enfant en fauteuil à la campagne, en plan large) montrent le visage. Pour `/enfants-en-situation-de-handicap/handicap-moteur/`, on a retenu une main sur une roue de fauteuil dans un couloir (main adulte) ; pour Tom, un enfant de dos avec un cartable dans un couloir d'école, sans fauteuil. À remplacer par une photo produite avec autorisation écrite quand elle existera (`docs/QUESTIONS_ARCEL.md`).
- **Mère avec ses enfants en cuisine sans visage d'enfant** : introuvable ; Claire est illustrée par une promenade en famille de dos.
- **Adolescent avec ses parents** (Véronique, DFT) : les séries disponibles montrent le visage d'un mineur ; on a gardé le couple seul.
- **Garde de nuit** : la seule scène de sommeil qui n'est ni médicalisée ni trop sombre reste éclairée par une lampe de chevet (`garde-de-nuit-chambre.jpg`). Elle est plus sombre que le reste de la sélection : à afficher en petit format (3:2 en carte), pas en hero. Repli possible : `exemples/louise-canape-fenetre.jpg`.
- **Auxiliaire de vie masculine avec une femme âgée** : peu de séries de qualité ; le casting reste correct grâce aux heros (jeune homme et homme âgé, jeune homme et femme âgée en promenade).
- **Hero « enfants » option A** : l'enfant est vu de haut, tête baissée, le visage n'est pas reconnaissable ; vérifier au recadrage que le haut de la tête reste hors cadre ou flou (`object-position: 50% 55%`).
- **Madeleine** : le couple se tient la main sur la table, en plan large ; ne pas recadrer en gros plan sur les mains (interdit docs/02 §6).
- **Cadre géographique** : la plupart des intérieurs sont européens (Portugal, Tchéquie, Ukraine, Turquie) et passent pour franciliens. Deux photos ne sont pas européennes et se voient : `ines-soeurs-rue.jpg` (ruelle pavée, ambiance sud) et `lina-mains-sable.jpg` (neutre). Les photos d'ambiance « Jardin du Luxembourg », « allée avec banc » et « façade » sont bien prises à Paris.
- **Licences** : toutes les photos Pexels ont été trouvées sur les pages de recherche publiques de Pexels ; toutes les photos Unsplash affichent « Free to use under the Unsplash License » (aucune image Unsplash+ retenue, les résultats signés « Getty Images » ou « Curated Lifestyle » ont été écartés). Les noms d'auteur sont ceux affichés par les banques (parfois un pseudonyme).
- **Photos Unsplash** : trois seulement (ambiance), car l'adresse de téléchargement Unsplash impose de récupérer l'identifiant sur chaque page photo ; Pexels a suffi pour les scènes avec des personnes.

## 8. Intégration (rappel pour l'agent Intégration)

- `next/image` avec `sizes` adaptés, `priority` sur l'image du hero uniquement, `object-fit: cover` et le `object-position` du tableau.
- Ratio via `aspect-ratio` CSS : `4 / 5` (portraits et heros mobiles), `3 / 2` (scènes), `16 / 9` (bannières).
- `alt` : reprendre le texte du tableau tel quel. Pas de `title`, pas de légende avec un prénom.
- Une photo par section clé, pas plus : le fil reste la signature.
