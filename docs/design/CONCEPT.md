# Concept d'expérience — « Le Fil qui vous emmène »

Livrable de la direction artistique et UX conversion (brief `docs/design/BRIEF_EXPERIENCE.md`, décision D-024). Il s'appuie sur `docs/01` (voix), `docs/02` (design system), `docs/03` (pages services) et sur le site tel qu'il tourne aujourd'hui (accueil, `/personnes-agees/`, `/aidants/`, `/services/garde-de-nuit/`, ordinateur 1 280 px et mobile 375 px). Il ne modifie aucun texte validé : il dit où le placer, comment l'habiller, ce qui bouge et pourquoi cela convertit. Les agents Iconographie, Photothèque, Mouvement et Intégration y trouvent leurs commandes précises (§8).

Conventions : les tailles sont en pixels CSS ; « mobile » désigne 375 px, « ordinateur » 1 280 px et plus ; « reduced-motion » couvre à la fois `prefers-reduced-motion: reduce` et le mode confort (`:root[data-comfort="on"]`), qui mettent déjà toutes les durées à 0 ms dans `tokens.css`.

---

## 1. Diagnostic honnête du site actuel

1. **Ce qui est bon.** La voix est juste, les situations vécues (« Elle est tombée deux fois ce mois-ci ») font ce qu'aucun concurrent ne fait. Fraunces sur Atkinson, le papier chaud, l'air entre les blocs : la base est saine et lisible à 18 px. La semaine type est un vrai tableau, la barre mobile tient ses trois voies de contact, le budget JavaScript est tenu (accueil 150 Ko), l'accessibilité est prise au sérieux dès le code.
2. **Le même hero partout.** Accueil, personnes âgées, aidants, garde de nuit : quatre pages, la même maison au fil, à droite, à la même taille. Aucune page ne « sent » son public. C'est le premier facteur de « générique ».
3. **Aucune photo, nulle part** : le dossier `public/` n'existe pas. Le Fil seul, en 2 px sur un fond papier, ne porte pas la charge émotionnelle d'un site où l'on cherche de l'aide pour sa mère.
4. **Sur mobile, la bannière est un mur de texte** : sur-titre en capitales sur deux lignes, H1 sur six lignes (le cahier en impose quatre), chapô de cinq lignes, boutons, téléphone, réassurance, mention légale de quatre lignes… et la maison arrive seule, en dessous, hors écran. Deux écrans et demi avant le premier visuel.
5. **Toutes les sections ont le même rythme** : H2, chapô, grille de cartes blanches à bord `line`. Treize fois sur une page service. L'œil ne trouve ni relief ni moment.
6. **Le Fil est timide** : des pastilles de 48 px dans les cartes, un connecteur de 2 px entre les stades qui n'est pas le fil, un tracé de 800 ms qu'on remarque à peine. La « signature » ne signe rien.
7. **Rien ne répond au pointeur** hormis l'ombre des cartes ; rien ne récompense le défilement.
8. **Deux vides prévisibles en production** : le bloc « Ce qui change avec Youdom Care » garde son H2 au-dessus d'une bande teal vide tant qu'aucun engagement E1–E4 n'est validé (le composant rend `null`, la section reste) ; le bloc prix n'affiche qu'une carte « Les aides » quand `tarifs.json` est vide, la grille est bancale.
9. **Détails qui font amateur** : l'en-tête replie ses entrées sur deux ou trois lignes à 1 280 px (« Pour qui ? » sur trois lignes), le libellé « Être rappelé(e) » déborde sur deux lignes dans la barre mobile.
10. **La conversion est plate** : les appels à l'action ont tous le même poids d'un bout à l'autre ; il n'y a pas de moment de décision, pas de rail de contact sur les pages intérieures, et le visiteur qui ne sait pas « pour qui » il cherche n'a pas de porte d'entrée guidée.

---

## 2. Concept d'ensemble

### La promesse d'expérience

**En trois secondes, vous savez que cette page parle de vous. En trente, vous savez quoi faire.** Chaque page ouvre sur une photo vraie de la situation, un titre qui la nomme, et un geste simple (choisir, basculer, toucher) qui mène à la bonne page ou au bon formulaire. Le Fil accompagne tout le chemin et s'arrête sur l'action.

### Les trois couches

Chaque écran superpose, dans cet ordre, **le vrai** (la photo, lumière naturelle, gestes du quotidien), **la signature** (le Fil, tracé par-dessus le vrai, jamais à la place) et **la parole** (le texte, à côté, jamais sur la photo). Cette règle règle tout : pas de texte sur image (contraste), pas de photo « habillée » d'effets, pas de fil décoratif qui flotte sans rien relier.

### Comment le Fil devient spectaculaire sans casser la sobriété

1. **Il devient conducteur.** Aujourd'hui il fait des vignettes ; demain il traverse la page. À partir de 64 rem, une colonne de 48 px à gauche du contenu porte un trait vertical continu (`teal-700`, 2 px) qui **grandit avec le défilement** (animation CSS liée au défilement, `animation-timeline: scroll()`, zéro JavaScript). À chaque H2, un nœud : un cercle de 12 px `raspberry-500` qui se « noue » (tracé 400 ms) quand le titre entre à l'écran. Sur mobile, pas de trait : un « tick » au fil de 16 px devant chaque H2. Composant : `PageThread`.
2. **Il signe le hero.** Le Fil part du H1 (il souligne d'un trait ouvert le dernier mot : « compliquent tout. »), file vers la photo, l'entoure à demi (un seul côté, jamais fermé), noue son nœud sur un détail de la photo (une main, une tasse, un cartable), puis sort vers le bouton principal. Un seul tracé SVG, 1 200 ms, une fois. Composant : `HeroThread`, dont la géométrie est propre à chaque hero (§4).
3. **Il relie pour de vrai.** Les connecteurs de `StageCards`, `StepsTimeline`, `FollowUpTimeline` deviennent des `<path>` du fil (mêmes règles : 2 px, bouts ronds, nœud sur le dernier jalon) et se tracent au défilement au lieu d'être des `<span>` de 2 px.
4. **Il reste rare et calme.** Une seule illustration au fil par section au plus. Il ne bouge jamais en boucle. Il ne porte aucune information.

### Le rôle des photos

Les photos disent « c'est chez vous, c'est aujourd'hui ». Règles (en plus du brief) : lumière naturelle de jour, intérieurs habités, deux personnes au plus, une action (marcher au bras, préparer, lire, construire un circuit de train), jamais de regard caméra sur les pages enfants, jamais de blouse ni de matériel médical, jamais de texte incrusté, jamais de légende qui nomme. Grammaire des formats : **4:5** pour tous les heros ordinateur, **16:9** pour la bande mobile du hero (recadrage de la même photo, point focal noté dans le contenu), **3:2** pour les photos de section, rayon 20 px partout (28 px sur le hero). Une photo de hero par page, deux photos de section au plus par page service, trois sur un pilier. Chaque photo a un texte alternatif descriptif neutre et une entrée dans `public/images/CREDITS.md`.

### Le rôle des icônes

Un jeu complet au fil (trait 2 px, bouts ronds, tracé ouvert, un nœud framboise facultatif), trois tailles : 24 px (interface, listes), 32 px (rubriques, cartes), 48 px (situations, publics). Une icône par public, par service, par rubrique d'action, par étape, par aide, par action de contact. Les icônes remplacent les pastilles génériques et donnent un visage à chaque service dans les menus, les cartes sœurs et le sélecteur « Pour qui ? ». Elles sont décoratives (`aria-hidden`), toujours à côté d'un libellé.

### Le rôle du mouvement

Peu, mais visible. Cinq gestes seulement (liste fermée au §6) : le fil qui se trace, les blocs qui se révèlent (12 px, 300 ms, décalage de 60 ms), les chiffres sourcés qui se comptent, les cartes qui s'inclinent sous le pointeur, deux couches qui glissent à des vitesses différentes. Tout est CSS d'abord, un seul `IntersectionObserver` partagé pour le reste. Rien ne boucle, rien ne clignote, tout s'éteint en reduced-motion et le contenu est toujours là sans mouvement.

### Le rôle de la 3D légère

Uniquement du **CSS 3D** (`perspective`, `rotateX/Y`, `translateZ`) : aucune bibliothèque, aucun WebGL, aucun canvas. Trois usages : l'objet du hero en trois couches (photo, fil, nœud) qui pivote de 4° au plus vers le pointeur ; les cartes inclinables de 3° ; la carte « fiche de vie » qui se retourne. Repli statique partout, et rien de tout cela en dessous de 64 rem ni sans pointeur fin.

### Ce qu'on prend et ce qu'on refuse des concurrents

| On prend (en le refaisant) | On refuse |
| --- | --- |
| La question de besoins dès le premier écran, avec « À définir » (le parcours « Pour qui ? », §3) | Le mur de cookies à l'arrivée ; ici aucun outil soumis à consentement au lancement |
| Une liste courte de garanties vérifiables sous le hero | Les boutons en capitales, les « EN SAVOIR + », les badges « −50 % » en médaillon |
| Une carte de contact constante sur les pages intérieures (`ConversionRail`) | La note étoilée dans le hero, les avis génériques, les compteurs de communes |
| Le prix avant et après crédit d'impôt avec un exemple mensuel | Les selfies de banque d'images, les seniors hilares, la photo « équipe » qui n'est pas l'équipe |
| Le téléphone visible en permanence | Le bleu partout, les cercles décoratifs vides, les pages où seul le nom de la ville change |

---

## 3. Page d'accueil, bloc par bloc

Fonds de section, dans l'ordre : paper (1) → white (2) → teal-50 (3) → paper (4) → sand (5) → white (6) → teal-50 (7) → paper (8) → white (9) → sand (10) → teal-900 (11) → paper (12). Jamais deux teintés à la suite. Un seul bouton framboise par écran : dans le hero (ordinateur), dans l'appel final, et dans la barre mobile ; tout le reste est teal ou contour.

### Le parcours « Pour qui cherchez-vous de l'aide ? » — où il se place

**Dans la bannière, entre le chapô et les boutons.** C'est le geste d'entrée de l'accueil. Il remplace le duo « Être rappelé(e) / Je décris ma situation » comme premier point de contact visuel ; les deux boutons restent, juste en dessous, pour qui sait déjà ce qu'il veut. Il se joue en deux temps, sans quitter la page :

- **Temps 1, dans le hero** (`HeroPicker`) : la question `formulaires.pour_qui` (« Pour qui cherchez-vous de l'aide ? ») et six choix, chacun avec son icône 32 px et un libellé court :
  « Pour un parent âgé » · « Pour une personne qui a Alzheimer, Parkinson… » · « Pour mon enfant » · « Pour moi : je vis avec un handicap » · « Pour moi : j'aide un proche » · « Je ne sais pas encore ».
  Ordinateur : deux rangées de trois boutons de 56 px de haut, largeur égale. Mobile : une colonne de six rangées de 56 px, icône à gauche, chevron à droite.
- **Temps 2, dans le bloc 2** (`SituationPanel`) : le choix fait défiler doucement jusqu'au bloc 2, dont le titre devient « Vous cherchez de l'aide pour votre parent. Que vivez-vous ? » et qui montre d'abord les trois à cinq situations de ce public (les `situations[]` du pilier concerné, déjà écrites dans les MDX), puis « Autre chose » → `Je décris ma situation`. Chaque situation est un lien vers la page ou le formulaire adéquat (sortie d'hôpital → formulaire express ; aidant → `/aidants/` ; enfant → formulaire enfant…). Les six cartes d'origine restent en dessous, repliées sous « Toutes les situations ».
- « Je ne sais pas encore » mène directement à `/etre-rappele/` avec la phrase « C'est normal. L'évaluation à domicile sert à cela. » affichée au-dessus du formulaire.
- **Sans JavaScript** : les six choix sont des liens vers les cinq piliers et vers `/etre-rappele/`. Avec JavaScript : boutons `aria-pressed`, panneau annoncé en `aria-live="polite"`, focus déplacé sur le titre du panneau. Aucune donnée conservée.

### Bloc 1 — Bannière

- **Composition ordinateur** : grille `3fr / 2fr`. Gauche : sur-titre (une ligne, 15 px, capitales espacées), H1, chapô, `HeroPicker`, rangée de boutons (framboise « Être rappelé(e) », contour « Je décris ma situation »), lien téléphone en chiffres tabulaires, réassurance en trois coches, note légale en 15 px `ink-soft`. Droite : photo 4:5 (456 × 570 px dans la colonne), rayon 28 px, `HeroThread` par-dessus, `HeroDepth` (trois couches).
- **Composition mobile** : sur-titre sur une ligne (on retire « Aide et accompagnement à domicile · » sur mobile au profit de « Paris et Île-de-France », la mention complète reste dans le `title`) ; H1 ; **la photo tout de suite après le H1**, bande 16:9 de 335 × 188 px avec le fil qui l'entoure ; chapô ; `HeroPicker` en colonne ; « Ou appelez le 01 … » ; réassurance ; la note légale passe en `details` replié « Conditions du crédit d'impôt ». Pas de bouton framboise dans le hero mobile : la barre basse le porte déjà. Objectif : premier écran = sur-titre, H1, photo, début du chapô.
- **Le H1 sur quatre lignes** : le texte de `docs/01` ne change pas, mais on propose à Arcel une coupe typographique : « Vivre chez soi, bien accompagné. » en H1, « Même quand la maladie ou le handicap compliquent tout. » en sur-chapô Fraunces 1,375 rem juste en dessous. Même balise `<h1>` (deux `<span>`), aucun mot changé, quatre lignes tenues à 375 px.
- **Visuel** : photo « une femme d'environ 80 ans et une femme d'environ 40 ans marchent bras dessus bras dessous dans une rue calme, lumière de matin, vues de trois quarts » (alt : « Une femme âgée et une femme plus jeune marchent bras dessus bras dessous dans une rue »). Le nœud du fil se pose sur les bras liés.
- **Micro-interaction** : `HeroDepth` (4° vers le pointeur), survol des choix du picker (fond `teal-50`, icône qui trace son nœud).
- **Entrée** : rien ne bouge sur le texte (LCP). Le fil se trace 1 200 ms après le chargement de la photo (`onLoad`), une fois. Le picker apparaît en `reveal-rise` avec le reste.
- **Levier de conversion** : un chemin pour ceux qui ne savent pas nommer leur besoin ; le téléphone et le rappel visibles sans défiler sur ordinateur ; sur mobile, la barre basse.

### Bloc 2 — Les situations (« Que vivez-vous en ce moment ? »)

- **Composition** : `SituationPanel` en tête quand un public a été choisi (voir plus haut), sinon les six `SituationCard` en grille 3 × 2 (ordinateur) et colonne (mobile).
- **Visuel** : icône 48 px par carte (`carnet`, `maison`, `cartable`, `mains`, `porte-hopital`, `tasse`), plus de pastille générique.
- **Micro-interaction** : `tilt` 3° au survol, l'icône trace son nœud (400 ms), le lien fléché avance de 4 px.
- **Entrée** : `reveal-rise` décalé de 60 ms par carte, six cartes au plus.
- **Levier** : chaque carte va à une page qui commence par la même phrase que la carte (continuité), et la carte 5 (sortie d'hôpital) va droit au formulaire express.

### Bloc 3 — Ce qui change avec Youdom Care

- **Règle d'abord** : si aucun engagement n'est validé, **toute la section disparaît** (H2 compris) ; l'alternance des fonds se recalcule (le bloc 4 prend teal-50). À corriger dans `page.tsx`.
- **Composition** : les quatre engagements sur un fil horizontal (ordinateur) : un `<path>` continu avec quatre nœuds, un par engagement, le dernier framboise ; cartes de 264 px de large, icône 32 px, titre H4, texte. Mobile : fil vertical à gauche, cartes empilées.
- **Visuel** : icônes `formation`, `visages`, `carnet-liaison`, `nuit-et-jour`.
- **Entrée** : le fil se trace de gauche à droite (900 ms) et chaque carte se révèle quand le tracé l'atteint (décalage 200 ms).
- **Levier** : ce sont les preuves ; aucun chiffre, aucun adjectif. On termine par une ligne « Ces engagements sont écrits noir sur blanc : `Comment ça marche` ».

### Bloc 4 — Maladies neurodégénératives

- **Composition ordinateur** : grille `5fr / 7fr`. Gauche : photo 3:2 (« un homme âgé et une femme adulte regardent un album de photos à une table, lumière de côté ») avec le fil `carnet`. Droite : H2, texte, `StageCards` en colonne verticale reliées par le fil (trois nœuds). Mobile : H2, texte, photo 16:9, cartes empilées.
- **Micro-interaction** : survol d'une carte de stade → son nœud se colore en framboise (les deux autres restent teal) : « vous êtes ici ».
- **Entrée** : fil tracé de haut en bas, cartes révélées au passage.
- **Levier** : bouton teal « Voir l'accompagnement par maladie » plus, sous les cartes, sept liens texte avec icône 24 px vers les sept maladies (Alzheimer, Parkinson, SEP, Lewy, DFT, SLA, Huntington) : la personne qui a un nom de maladie en tête ne cherche pas.

### Bloc 5 — La semaine type

- **Composition** : le composant signature prend toute la largeur. Ordinateur : bloc blanc 28 px de rayon, en tête un sélecteur segmenté (les trois exemples, icône 24 px chacun : `maison`, `cartable`, `porte-hopital`), à gauche la grille `WeekPlanner`, à droite (colonne de 320 px) une photo 4:5 propre à l'exemple et le récit de 80 à 120 mots. Mobile : sélecteur segmenté défilable, photo 16:9, liste par jour avec l'en-tête du jour collant, récit.
- **Compteur** : le résumé « Environ 32 heures par semaine, dont 2 nuits » se compte (`count-up`, 600 ms) ; ce nombre vient de `semaines-types.json`, jamais d'ailleurs.
- **Micro-interaction** : `week-fill` : à l'entrée et à chaque changement d'exemple, les cases se remplissent ligne par ligne (15 ms de décalage par case). Survol d'une case : l'activité correspondante s'éclaire dans la légende.
- **Levier** : bouton teal « Je compose ma semaine » qui ouvre le formulaire détaillé directement à l'étape « Planning », avec l'exemple choisi préchargé comme point de départ (« Vous pouvez partir de cet exemple et le modifier »).

### Bloc 6 — Comment ça commence

- **Composition ordinateur** : `StepsTimeline` à gauche (max 640 px) avec le fil vertical réel et quatre icônes 32 px (`telephone`, `maison`, `deux-personnes`, `carnet-liaison`) ; à droite, une photo 3:2 (« une femme d'une quarantaine d'années ouvre la porte de son appartement à une autre femme, palier lumineux »). Mobile : photo 16:9, puis la liste.
- **Entrée** : le fil se trace avec le défilement (scroll-driven) et chaque étape se révèle quand le trait l'atteint ; le nœud framboise ferme la dernière étape.
- **Levier** : sous l'étape 1, un lien discret « Un quart d'heure au téléphone, c'est maintenant si vous voulez : 01 … » (chiffres tabulaires). C'est le moment où le lecteur a compris que ça ne l'engage pas.

### Bloc 7 — Le prix

- **Composition** : deux cartes de même hauteur. Si `tarifs.json` est vide, la carte « Nos tarifs » devient « Un devis gratuit et détaillé » (texte : « Le prix dépend du nombre d'heures et du type d'aide. Après l'évaluation, vous recevez un devis détaillé, gratuit, sans engagement. ») avec le bouton « J'estime mon budget » seulement si l'estimateur existe, sinon « Je demande une évaluation gratuite ». La grille ne doit jamais être orpheline.
- **Visuel** : le « 50 % » du crédit d'impôt en Fraunces 560, 64 px, avec le nœud du fil sous le « % » ; les aides en pastilles `green-50` avec icône 24 px.
- **Compteur** : « 50 % » se compte de 0 à 50 (600 ms). C'est le seul chiffre constant et légal de la page.
- **Micro-interaction** : `tilt` sur les deux cartes.
- **Levier** : la question qui bloque (« C'est trop cher ») reçoit une réponse avant la fin de page ; les deux boutons sont en contour, pour ne pas concurrencer l'appel final.

### Bloc 8 — Les proches

- **Composition** : section pleine largeur sur fond paper, à l'intérieur un bloc sand de 28 px de rayon. Ordinateur : photo 3:2 à gauche (« une femme d'une cinquantaine d'années, seule à une table de cuisine, une tasse devant elle, regarde par la fenêtre, lumière du matin »), fil `tasse` qui déborde du cadre de la photo vers le texte ; texte à droite. Mobile : photo 16:9, texte.
- **Micro-interaction** : `parallax-2` : la photo glisse de 8 px, le fil de 16 px, sur le défilement (ordinateur seulement).
- **Levier** : bouton teal « J'ai besoin de relais » ; en dessous, lien « Où en êtes-vous ? Huit questions, sans score ni donnée conservée ».

### Bloc 9 — Le territoire

- **Composition** : H2, texte (nombre d'agences calculé), champ `TerritorySearch` de 56 px de haut avec bouton teal « Vérifier » collé ; à droite sur ordinateur, une illustration au fil de l'Île-de-France : un seul tracé ouvert qui suggère la Seine et les huit départements, avec un nœud par agence (positions depuis `site.config.json`). Décorative ; les agences restent listées en texte dans le pied de page.
- **Micro-interaction** : la réponse « Oui, nous intervenons à {commune}. Votre agence la plus proche : {agence}. » arrive en `reveal-rise`, en Fraunces 1,375 rem, et le nœud de l'agence concernée passe en framboise (redondant avec le texte, donc permis).
- **Levier** : sous la réponse positive, deux boutons : contour « Être rappelé(e) par cette agence », lien « Voir la page de {commune} ».

### Bloc 10 — Le magazine

- Trois `ArticleCard` avec photo 3:2, rubrique en pastille, titre H3, temps de lecture. Masqué tant que `content/magazine` est vide (déjà le cas). `tilt` au survol, `reveal-rise` décalé.

### Bloc 11 — Appel final

- **Composition** : section `dark` (teal-900, texte blanc, contraste 10,29). H2 « Parlons de votre situation. » en blanc ; le numéro de téléphone en Fraunces 560, 40 px, chiffres tabulaires, lien `tel:` ; puis les trois boutons (framboise « Être rappelé(e) », contour blanc « Je décris ma situation », lien « J'appelle le … »). Le `PageThread` se termine ici : son dernier nœud, framboise, est posé juste avant le bouton. C'est le seul endroit où le fil s'arrête.
- **Entrée** : le fil blanc se trace jusqu'au bouton (600 ms) quand la section entre.
- **Levier** : c'est le moment de décision ; on ne met rien d'autre dans l'écran (pas de photo, pas de liste).

### Bloc 12 — Recrutement

- Une ligne, comme aujourd'hui, avec l'icône `deux-personnes` 24 px et le lien « Voir les offres ». Aucun mouvement.

---

## 4. Un hero par public

Principe commun : le `Hero` actuel gagne trois emplacements : `media` (photo + `HeroThread`), `gesture` (le geste d'entrée, un composant client léger) et `tone` (`light` ou `dark`). Le H1, le chapô et la réassurance viennent toujours du MDX. Sur mobile, la photo passe **juste sous le H1** en bande 16:9 (335 × 188 px), le geste juste sous le chapô, et le bouton framboise disparaît du hero (la barre basse le porte). Sur ordinateur, `3fr / 2fr`, photo 4:5, `HeroDepth` actif.

| Pilier | Photo (sujet, cadrage, lumière, ratio) | H1 (existant) | Geste d'entrée | Effet de profondeur | Ce qui change pour ce public |
| --- | --- | --- | --- | --- | --- |
| **Neuro** `/maladies-neurodegeneratives/` | Un homme d'environ 75 ans et une femme adulte assis à une table, un album de photos ouvert, mains sur les pages ; plan moyen à hauteur de table, lumière de fenêtre latérale, tons chauds ; 4:5. Nœud du fil sur l'album. | « Maladies neurodégénératives : un accompagnement à domicile qui évolue avec la personne » | **« Où en est la maladie ? »** trois choix de 56 px : « Le diagnostic vient d'être posé » · « Elle avance, il faut sécuriser » · « Une présence continue devient nécessaire ». Le choix fait défiler jusqu'à la carte de stade correspondante (section 4) et la marque du nœud framboise. Sans JS : ancres. | Les trois cartes de stade sont à trois profondeurs (`translateZ` 0 / 12 / 24 px) et s'alignent quand elles entrent à l'écran. | Le lecteur est un enfant adulte ou un conjoint sous le choc : on lui donne un repère temporel avant tout. Sous le hero, sept icônes-liens vers les sept maladies. |
| **Personnes âgées** `/personnes-agees/` | Version « pour un proche » : une femme d'environ 85 ans et une femme d'environ 50 ans préparent un repas dans une cuisine, la plus âgée tient la cuillère ; plan moyen, lumière de jour ; 4:5. Version « pour vous-même » : une femme âgée arrose ses plantes sur un balcon, seule, de trois quarts, lumière douce ; 4:5. Nœud sur la main qui fait. | « Rester chez soi, avec l'aide qu'il faut, quand il le faut » | **Le sélecteur de lecteur existant, agrandi** (`ReaderSwitch`) : deux boutons de 56 px « Pour un proche » / « Pour moi ». Il bascule le chapô **et la photo** (fondu croisé 300 ms). | `HeroDepth` standard. | Trente pour cent des lecteurs sont la personne elle-même : quand elle choisit « Pour moi », la photo la montre active et seule, le texte passe au « vous » direct, et le lien téléphone remonte au-dessus des boutons (elle appelle plus qu'elle ne remplit). |
| **Adultes en situation de handicap** `/adultes-en-situation-de-handicap/` | Un homme d'une trentaine d'années en fauteuil roulant à sa table de travail, ordinateur ouvert, tasse à côté, chez lui ; plan à hauteur des yeux (jamais en plongée), lumière de bureau naturelle ; **3:2 sur ordinateur** (la photo prend la largeur, le texte passe dessous : une mise en page plus « éditoriale », d'égal à égal). Nœud sur la tasse. | « Aide à domicile et handicap : vous décidez, nous suivons » | **« Quand voulez-vous de l'aide ? »** quatre raccourcis du planning (« Matin et soir, tous les jours » · « En semaine » · « Le week-end » · « 24h/24 ») qui ouvrent le formulaire à l'étape Planning, pré-rempli. Sans JS : liens vers `/demande/`. | Aucune inclinaison ; la photo est posée, stable. Seul le fil se trace. | Ton d'égal à égal : pas de « votre proche », le geste parle d'organisation, pas de besoin. On explique la PCH et le mode mandataire dès la première section. |
| **Enfants en situation de handicap** `/enfants-en-situation-de-handicap/` | **Aucun visage** : des mains d'enfant et des mains d'adulte assemblent un circuit de train en bois sur un tapis, vues de haut en plan serré, lumière de salon ; 4:5. Variante : un enfant de dos sur un banc devant une école, sac au dos, un adulte à côté, flou. Nœud sur une pièce du circuit. | « Accompagnement à domicile des enfants en situation de handicap : un relais qui connaît votre enfant » | **La fiche de vie** : une carte de 320 × 200 px qui montre au recto « La fiche de vie de votre enfant » et au verso, quand on la retourne (bouton « Voir ce qu'elle contient »), six lignes avec icônes : ce qu'il aime · ce qui l'apaise · ce qui le met en difficulté · comment il communique · ses routines · ses protocoles. Bouton sous la carte : « Je décris les besoins de mon enfant ». | `flip-card` (rotation Y 500 ms). En reduced-motion : les deux faces sont affichées l'une sous l'autre. | Le parent a déjà tout expliqué dix fois : la promesse « vous n'aurez pas à tout réexpliquer » devient un objet qu'il peut toucher. Quatre icônes-liens vers autisme, polyhandicap, moteur, déficience intellectuelle. |
| **Aidants** `/aidants/` | Une femme d'une cinquantaine d'années assise à une table de cuisine, tasse entre les mains, regard vers la fenêtre, calme (pas triste) ; plan moyen, lumière de matin ; 4:5. Nœud sur la tasse, la vapeur est le fil. | « Vous aidez quelqu'un. Qui vous aide, vous ? » | **La première question de « Où en êtes-vous ? »** posée dans le hero (« Dormez-vous d'une traite, la plupart des nuits ? » avec les trois réponses). Répondre ouvre la page questionnaire avec cette réponse reprise. Mention visible : « Pas un test médical. Rien n'est conservé. » | `HeroDepth` très réduit (2°). | Le mot « aidant » est évité dans le geste ; on parle de sommeil, de temps, de rendez-vous. Le bouton principal est « J'ai besoin de relais ». |

### Pages services (transverses et sous-pages)

- **Garde de nuit, présence 24h/24** : `tone="dark"` (teal-900, fil blanc, texte blanc), photo 4:5 « un couloir d'appartement la nuit, une lampe allumée sur une commode, une porte entrouverte » (aucune personne endormie photographiée). Geste : **« Nuit calme ou nuit active ? »** deux cartes de 56 px qui affichent une phrase chacune (« L'intervenant dort sur place et se lève au besoin » / « L'intervenant veille, éveillé ») et pré-sélectionnent le formulaire. Sur 24h/24 : « Combien de temps ? » (quelques jours · quelques semaines · sans limite prévue).
- **Sortie d'hospitalisation** : photo 3:2 « une valise ouverte sur un lit, une main qui plie un vêtement, chambre claire » ; geste : **« Quand est la sortie ? »** trois choix (« Demain ou après-demain » · « Cette semaine » · « Date à confirmer ») qui ouvrent le formulaire express avec le choix reporté. Aucun compte à rebours, aucune mention de délai tant que E4 n'est pas validé.
- **Garde-malade, remplacement, vacances** : photo 3:2 de situation (une table de petit-déjeuner préparée ; un sac de voyage et un plaid ; une porte d'entrée avec un manteau), geste : les deux boutons standard.
- **Sous-pages maladie (Alzheimer, Parkinson…)** : photo 4:5 propre à la maladie (Alzheimer : trier des photos ensemble ; Parkinson : marcher au bras dans un parc, chaussures visibles ; SEP : une femme de 40 ans et deux enfants à une table de devoirs, elle assise), même geste que le pilier neuro, pré-positionné sur la maladie.
- **Sous-pages enfants** : jamais de visage ; mains, jeux, objets, dos.
- **Mobile, toutes pages** : bande 16:9 sous le H1, geste sous le chapô, geste toujours utilisable au clavier et au doigt (rangées de 56 px, une par ligne).

---

## 5. Gabarit service : les 13 sections

| N° | Section | Visuel | Mouvement | Composant / note |
| --- | --- | --- | --- | --- |
| 1 | Bannière | Photo 4:5 + `HeroThread` + geste (§4) | `fil-draw` 1 200 ms, `HeroDepth` | `Hero` enrichi |
| 2 | Vous vous reconnaissez ? | Une **icône 48 px par situation** (nouveau champ `situations[].icone`) ; les guillemets en Fraunces `teal-900` ; carte blanche, bord `line` | `reveal-rise` décalé 60 ms, `tilt` 3° | `SituationCard` variante `plain` (sans lien) |
| 3 | Ce que nous faisons, concrètement | Quatre rubriques avec icône 32 px (`gestes`, `presence`, `lien`, `coordination`) ; **une photo 3:2** à droite de la grille sur ordinateur (`photos.actions`), 16:9 au-dessus sur mobile | `reveal-rise` par rubrique | `ActionGrid` (nouveau, extrait du gabarit) |
| 4 | Un accompagnement qui évolue | `StageCards` reliées par le **fil réel** (path SVG horizontal, nœud final framboise) ; numéros en Fraunces 560 | Le fil se trace, les cartes se révèlent au passage (200 ms) | `StageCards` + `ThreadConnector` |
| 5 | Exemple de semaine | Bloc blanc 28 px ; grille à gauche, **photo 4:5 de l'exemple** + récit à droite (`semaine_type.photo`) ; mention « Exemple illustratif » conservée en framboise-700 | `week-fill` (15 ms/case), `count-up` sur le résumé d'heures | `WeekPlanner` + `WeekStory` |
| 6 | Le suivi | `FollowUpTimeline` avec fil vertical réel, icônes 24 px par jalon (`maison`, `deux-personnes`, `carnet-liaison`, `calendrier`, `stethoscope-barre` pour « lien avec les soignants ») | Fil tracé au défilement | `FollowUpTimeline` |
| 7 | Et pour vous, les proches | Bloc sand arrondi avec **photo 3:2** (`photos.proches`) et fil `tasse` qui déborde | `parallax-2` (ordinateur) | `RelativesBlock` |
| 8 | Qui intervient ? | Pas de photo « équipe » (Vérité) : un encart blanc avec trois icônes-lignes : « préparés à la situation », « présentés avant de commencer », « les mêmes visages » ; le texte MDX en dessous | `reveal-rise` | `WhoComes` |
| 9 | Ce que nous ne faisons pas | Voir ci-dessous | Aucun | `Callout` variante `frontiere` |
| 10 | Combien ça coûte, quelles aides ? | `PriceCard` (tilt), `AidCard` avec icône 24 px par aide ; le « 50 % » en Fraunces 64 px | `count-up` sur les montants venant des sources (ex. 583,52 €), `tilt` | existants |
| 11 | Questions fréquentes | `details/summary` natifs ; le marqueur est un fil qui se « déplie » (chevron au fil, rotation 200 ms) | Transition d'état seulement | `FAQ` |
| 12 | Formulaire dédié | En-tête du formulaire avec l'icône du service et la phrase d'accroche ; `ConversionRail` masqué ici | Aucun | existants |
| 13 | Sources et relecture | Voir ci-dessous | Aucun | `SourcesList` |

### Illustrer la semaine type

- La photo de l'exemple (4:5, ordinateur) montre **un moment de la grille**, pas un portrait : pour Suzanne, un petit-déjeuner posé sur une table de cuisine avec deux tasses ; pour Noé, des rails de train en bois et un casque anti-bruit sur un tapis ; pour Karim, une salle de bain adaptée, lumière du matin ; pour Madeleine, une veilleuse allumée dans un couloir. La photo change avec l'exemple (fondu 300 ms).
- Le récit est posé sous la photo, en 17/18 px, avec la mention « Exemple illustratif, prénom fictif » en 15 px `raspberry-700`.
- Sur mobile, la liste par jour garde l'en-tête du jour collant (`position: sticky; top: 64px`) pour ne jamais perdre le repère.
- Le bouton sous le bloc est toujours « Je compose ma semaine » (teal) et ouvre le formulaire à l'étape Planning avec l'exemple pré-rempli.

### Illustrer les situations vécues

Pas de photo par situation (ce serait cinq photos de plus, et le risque de « mettre en scène » une détresse). Une icône 48 px, choisie pour l'objet de la phrase, jamais pour l'émotion : « Elle est tombée » → `tapis-couloir` ; « Il ne mange plus » → `assiette` ; « Elle ne sort plus » → `porte` ; « Je n'y arrive plus » → `tasse` ; « Il sort de l'hôpital » → `porte-hopital`. La citation reste en Fraunces entre guillemets ; le texte répond en Atkinson.

### Rendre « Ce que nous ne faisons pas » élégant

C'est un argument de franchise (docs/01 §2, règle 5) : il doit avoir l'air d'une **décision**, pas d'un avertissement. Proposition `Callout` variante `frontiere` :

- Un bloc blanc de 28 px de rayon avec, à gauche, un **trait du fil vertical de 3 px `teal-700`** (la « frontière »), et non un fond coloré d'alerte.
- Titre en Fraunces H3 « Ce que nous ne faisons pas », sous-titre 15 px « Et avec qui nous travaillons pour cela ».
- Chaque item avec une icône 24 px `croix-ouverte` (deux traits qui ne se touchent pas, au fil) ; sur la même ligne, à droite sur ordinateur, le relais en teal : « → les infirmiers, le SSIAD, l'HAD » (texte existant, découpé : la partie « avec lesquels nous nous coordonnons » devient un lien vers la section Coordination).
- Ligne de fin en 15 px : « Cette frontière protège la personne. Elle protège aussi votre confiance. »
- Aucun mouvement, aucun rouge.

### Rendre les sources élégantes

- Titre H2 « Sources et relecture » conservé ; liste en deux colonnes à partir de 48 rem.
- Chaque source : icône 24 px `source` (un carnet au fil), le libellé en lien souligné, le domaine en pastille `teal-50` 15 px (« service-public.gouv.fr »), les dates en chiffres tabulaires `ink-soft` (« vérifié le 1er juin 2026 · consulté le 20 septembre 2026 »).
- Le bloc auteur/relecteur devient une **carte de relecture** : icône `deux-personnes`, « Écrit par … », « Relu par … » (ou, tant que `relu_par` est vide, « En attente de relecture par un professionnel » en `warning`), « Mise à jour le … ». Rien d'autre.
- Les pages proches (`soeurs`) passent en cartes compactes avec l'icône de la page (56 px de haut, icône 24 px, titre, chevron).

---

## 6. Spécification du mouvement

Toutes les durées viennent des jetons (`--duration-*`, `--thread-duration`, `--ease-out`), ce qui garantit l'extinction en reduced-motion et en mode confort. Nouveaux jetons à ajouter dans `tokens.css` : `--duration-reveal: 300ms`, `--duration-count: 600ms`, `--duration-flip: 500ms`, `--thread-hero-duration: 1200ms`, `--tilt-max: 3deg`, `--depth-max: 4deg`, `--parallax-max: 16px` ; tous à 0 dans les deux blocs d'extinction existants.

### Liste fermée des animations

| Nom | Déclencheur | Durée · courbe | Ce qui bouge | Reduced-motion |
| --- | --- | --- | --- | --- |
| `fil-draw` (existant) | 20 % de l'illustration visible, une fois | 800 ms · `ease-out` | `stroke-dashoffset` 1 → 0, nœud à 60 % | Affiché d'emblée |
| `fil-hero` | `onLoad` de la photo du hero, une fois | 1 200 ms · `ease-out` | Le tracé `HeroThread` : souligné du H1 → contour de la photo → nœud → sortie vers le bouton | Affiché d'emblée |
| `fil-conducteur` | Défilement (CSS `animation-timeline: scroll(root)`) | Liée au défilement · linéaire | Le trait vertical de `PageThread` grandit (`scaleY` 0 → 1, origine en haut) ; chaque nœud se trace en 400 ms quand son H2 entre (`view()`) | Trait et nœuds complets ; sans support navigateur : idem |
| `reveal-rise` | Élément à 15 % visible, une fois (observateur partagé) | 300 ms · `ease-out` | `opacity` 0 → 1, `translateY` 12 px → 0 ; décalage de 60 ms entre frères, six au plus, puis tout ensemble | Visible d'emblée (`--motion-rise: 0`, durée 0) |
| `count-up` | Élément visible, une fois | 600 ms · `ease-out` | Le nombre de 0 à sa valeur, chiffres tabulaires, format `Intl.NumberFormat('fr-FR')` ; texte final rendu côté serveur, JS ne fait que remplacer | Valeur finale d'emblée (le texte serveur ne bouge pas) |
| `week-fill` | Grille visible ou changement d'exemple | 15 ms de décalage par case (42 cases → 630 ms au plus) · `ease-out` | `opacity` + `scale` 0,96 → 1 par case | Grille pleine d'emblée |
| `tilt` | `pointermove` sur la carte, `@media (hover:hover) and (pointer:fine)` | 150 ms de retour · `ease-out` | `rotateX/Y` ±3° selon la position du pointeur, `translateY` −2 px, ombre `shadow-2` | Pas de transformation ; seule l'ombre change |
| `hero-depth` | `pointermove` sur le hero, ordinateur seulement | Suivi en `requestAnimationFrame`, retour 300 ms | Groupe en `perspective: 1200px`, rotation ±4° ; couches : photo `translateZ(0)`, fil `translateZ(24px)`, nœud/icône `translateZ(48px)` | Aucune rotation, couches à plat |
| `parallax-2` | Défilement (CSS `animation-timeline: view()`), ≥ 64 rem | Liée au défilement · linéaire | Photo `translateY` −8 px → 8 px, fil −16 px → 16 px sur la traversée de l'écran | Immobile |
| `flip-card` | Clic ou Entrée sur le bouton « Voir ce qu'elle contient » | 500 ms · `ease-out` | `rotateY` 0 → 180°, `backface-visibility: hidden`, focus déplacé sur la face visible | Les deux faces sont empilées, le bouton fait défiler |
| `photo-swap` | Changement du sélecteur de lecteur ou d'exemple | 300 ms · `ease-out` | Fondu croisé de deux `next/image` empilées (la seconde `loading="lazy"`) | Remplacement immédiat |
| `state` (existant) | Survol, focus, actif | 150–200 ms | Couleurs, ombre, `translateY` −2 px | Immédiat |
| `header-compact` (existant) | Défilement > 24 px | 200 ms | Hauteur 80 → 64 px | Immédiat |

Interdits explicites : boucles, `autoplay`, vidéo, défilement horizontal automatique, effet machine à écrire, particules, flou animé, tout mouvement qui dépasse 16 px hors `flip-card`, tout mouvement sur le texte du H1 et du chapô (LCP et lisibilité).

### Effets 3D : techniques et repli

| Effet | Technique | Où | Repli |
| --- | --- | --- | --- |
| Objet de hero en couches (`HeroDepth`) | CSS 3D : `perspective` sur le conteneur, `transform-style: preserve-3d`, trois enfants en `translateZ` ; rotation pilotée par deux variables CSS (`--rx`, `--ry`) mises à jour en JS | Heros, ordinateur | Variables à 0 : image plate |
| Cartes inclinables (`TiltCard`) | Même mécanique, ±3°, variables CSS `--tx/--ty` | Situations, prix, articles | Aucune transformation |
| Fiche de vie (`FlipCard`) | `rotateY` CSS sur bouton, sans JS de calcul (classe basculée) | Hero enfants | Faces empilées |
| Profondeur des stades | `translateZ` statique 0/12/24 px + `reveal-rise` | Pilier neuro | Cartes à plat |
| Fil au-dessus de la photo | SVG positionné en absolu, `overflow: visible`, `vector-effect: non-scaling-stroke` | Heros | Statique |

Refusés, et pourquoi : Three.js ou Babylon (≥ 150 Ko compressés, à eux seuls le budget), Lottie (runtime 60 Ko + JSON), WebGL maison (temps de développement, batterie, repli complexe), tout canvas en boucle. Si un jour Arcel veut un objet 3D « vrai » (maison qui tourne), ce sera un composant chargé à la demande **après un clic explicite** (« Voir la maison en 3D »), hors budget initial, avec image statique par défaut ; il n'est pas dans ce concept.

### Coût JavaScript estimé (compressé)

| Module | Estimation | Chargement |
| --- | --- | --- |
| `src/lib/motion/observer.ts` (un `IntersectionObserver` partagé, `data-reveal`, décalages) | 0,9 Ko | Initial, toutes pages |
| `src/lib/motion/prefers.ts` (`motionAllowed()` : reduced-motion + confort + `hover/pointer`) | 0,3 Ko | Initial |
| `CountUp` | 0,8 Ko | Initial sur les pages qui en ont |
| `TiltCard` + `HeroDepth` (même hook `usePointerTilt`) | 1,4 Ko | Initial, mais inactif sans pointeur fin |
| `HeroPicker` + `SituationPanel` | 1,8 Ko | Accueil |
| Gestes de hero (`ReaderSwitch` agrandi, `StageChooser`, `FlipCard`, `NightChooser`, premier item du questionnaire) | 0,6 à 1,2 Ko chacun, un seul par page | Page concernée |
| `fil-conducteur`, `parallax-2`, `week-fill`, `fil-draw`, `fil-hero` | 0 Ko (CSS ; `fil-draw` réutilise l'observateur partagé) | — |
| **Total par page** | **≈ 5 à 6 Ko** | Accueil : 150 → ≈ 156 Ko ; pages de contenu : ≈ 136 → ≈ 141 Ko |

Marge conservée : ≥ 4 Ko sous 160 Ko sur l'accueil, ≥ 19 Ko sur les pages de contenu. Les photos ne comptent pas dans le budget JavaScript mais dans le LCP : hero en AVIF/WebP ≤ 90 Ko à 960 px de large, `priority` sur elle seule, `sizes="(min-width: 64rem) 40vw, 100vw"`, dimensions déclarées (CLS 0). Chaque lot (§8) se termine par `pnpm lhci`.

---

## 7. Conversion

### Hiérarchie des appels à l'action par page

| Page | Framboise (un par écran) | Teal plein | Contour / lien | Rail |
| --- | --- | --- | --- | --- |
| Accueil | « Être rappelé(e) » (hero ordinateur, appel final, barre mobile, en-tête) | « Je compose ma semaine », « J'ai besoin de relais », « Voir l'accompagnement par maladie », « Vérifier » | « Je décris ma situation », tarifs, aides, téléphone | Aucun (le picker et la barre suffisent) |
| Piliers | « Je décris ma situation » (hero), « Être rappelé(e) » (rail et barre) | Bouton du geste d'entrée, « Je compose ma semaine » | Liens vers sous-pages, aides, aidants | `ConversionRail` de la section 2 à la section 11 |
| Aidants | « J'ai besoin de relais » | « Où en êtes-vous ? » | Solutions de répit, droits | Rail |
| Enfants | « Je décris les besoins de mon enfant » | « Voir ce qu'elle contient » (fiche de vie) | Sous-pages | Rail |
| Services | « Je décris ma situation » ou « Je prépare un retour à domicile » (sortie d'hôpital) | Geste (nuit calme/active, date de sortie) | Téléphone, tarifs | Rail |
| Formulaires | Le bouton d'étape | — | « Ou appelez le … » | Aucun rail, barre mobile retirée quand un champ est actif (existant) |

### Le rail de conversion (`ConversionRail`)

Ordinateur, ≥ 64 rem, sur toutes les pages piliers et services : une carte de 300 px collante (`top: 88px`) dans une colonne droite qui apparaît à partir de la section 2 et disparaît avant la section 12 (le formulaire). Contenu, dans l'ordre : le téléphone en Fraunces 560, 28 px, chiffres tabulaires ; bouton framboise « Être rappelé(e) » ; lien « Je décris ma situation » ; la phrase de délai `[E5]` **seulement si validée**, sinon « Un conseiller vous rappelle dès que possible. » ; trois coches de réassurance de la page. Aucun mouvement hormis `reveal-rise` à l'apparition. Sur mobile, le rail n'existe pas : la barre basse fait le travail.

### La barre mobile

- Libellés courts pour tenir sur une ligne à 375 px : « Appeler » · « Rappel » · « Ma demande » (texte 15 px, icônes 22 px) ; le libellé complet « Être rappelé(e) » reste dans `aria-label`.
- L'élément du milieu reste le seul framboise. Hauteur 56 px + `safe-area-inset-bottom`.
- Elle se retire quand un champ est actif (existant) et **aussi quand le formulaire de la section 12 est à l'écran** (il porte ses propres boutons).
- Sur la page aidants, le libellé du milieu devient « Relais » (même destination : `/etre-rappele/`).

### Les moments où l'on propose le rappel

1. Dans le hero, après le geste d'entrée (accueil : le choix « Je ne sais pas encore » mène au rappel avec la phrase « C'est normal. L'évaluation à domicile sert à cela. »).
2. Après la semaine type (« Je compose ma semaine » → formulaire ; en dessous, lien « Ou décrivez-la nous par téléphone »).
3. Après le prix (« Je demande une évaluation gratuite », contour).
4. Après « Ce que nous ne faisons pas » sur les pages services : une ligne « Vous avez une question sur ce que nous pouvons faire dans votre cas ? Un conseiller vous répond franchement : 01 … ». C'est le moment de confiance.
5. Après la FAQ : le formulaire dédié suit immédiatement ; rien entre les deux.
6. L'appel final de l'accueil, section sombre, sans autre contenu.

Jamais : de fenêtre surgissante, de bandeau qui descend après N secondes, de rappel « avant de partir », de chat automatique.

### Ce qu'on refuse

- Tout compteur qui n'est pas calculé depuis `content/` (nombre de familles, d'intervenants, d'années, de communes) ; tout « depuis 19xx » tant que ce n'est pas dans `site.config.json`.
- Toute urgence fabriquée : compte à rebours, « il reste X créneaux », « réponse en 2 h » tant que E5 n'est pas validé.
- Tout avis, note, étoile, témoignage, logo de label non fourni et vérifié ; le composant `TestimonialCard` reste dormant.
- Toute photo présentée comme l'équipe, une agence, un client ; tout prénom sur une photo.
- Tout bouton « Envoyer », « En savoir plus », « Cliquez ici » ; tout second bouton framboise dans un même écran.
- Toute animation qui retarde le contenu (le texte est toujours rendu et lisible avant que le mouvement commence), toute animation qui porte seule un sens.

---

## 8. Contenus à produire, composants, ordre de mise en œuvre

### Nouveaux champs de contenu

**`content/pages/accueil.json`**

```json
"banniere": {
  "photo": { "src": "/images/accueil/hero.jpg", "alt": "Une femme âgée et une femme plus jeune marchent bras dessus bras dessous dans une rue", "focal": "50% 40%" },
  "fil": "bras-lies",
  "parcours": {
    "question": "Pour qui cherchez-vous de l'aide ?",
    "choix": [
      { "id": "personne-agee", "libelle": "Pour un parent âgé", "icone": "maison", "href": "/personnes-agees/" },
      { "id": "neuro", "libelle": "Pour une personne qui a Alzheimer, Parkinson…", "icone": "carnet", "href": "/maladies-neurodegeneratives/" },
      { "id": "enfant-handicap", "libelle": "Pour mon enfant", "icone": "cartable", "href": "/enfants-en-situation-de-handicap/" },
      { "id": "adulte-handicap", "libelle": "Pour moi : je vis avec un handicap", "icone": "cle", "href": "/adultes-en-situation-de-handicap/" },
      { "id": "aidant", "libelle": "Pour moi : j'aide un proche", "icone": "tasse", "href": "/aidants/" },
      { "id": "inconnu", "libelle": "Je ne sais pas encore", "icone": "question", "href": "/etre-rappele/", "message": "C'est normal. L'évaluation à domicile sert à cela." }
    ],
    "titre_panneau": "Vous cherchez de l'aide {pour}. Que vivez-vous ?",
    "autre": "Autre chose : je décris ma situation",
    "toutes": "Toutes les situations"
  }
}
```

Chaque bloc de l'accueil qui reçoit une photo gagne `"photo": { "src", "alt", "focal" }` : `neuro`, `semaine.onglets[].photo`, `etapes`, `proches`. Le bloc `territoire` gagne `"illustration": "ile-de-france"`.

**En-tête MDX des pages services (schéma Zod `service-schema.ts`)**

```yaml
icone: maison                       # icône de la page, utilisée dans les menus, les cartes sœurs, le formulaire
hero:
  photo: { src: /images/piliers/personnes-agees/hero.jpg, alt: "…", focal: "50% 35%" }
  photo_pour_soi: { src: …, alt: "…" }      # optionnel, pilier personnes âgées seulement
  fil: main-qui-fait                  # géométrie du HeroThread (registre typé)
  geste: lecteur | stades | planning | fiche-de-vie | questionnaire | nuit | sortie | null
  ton: clair | sombre
situations:
  - titre: "« Elle est tombée deux fois ce mois-ci. »"
    icone: tapis-couloir
    texte: "…"
semaine_type:
  exemple: suzanne
  photo: { src: …, alt: "Un petit-déjeuner servi sur une table de cuisine, deux tasses" }
  recit: "…"
photos:
  actions: { src: …, alt: "…" }
  proches: { src: …, alt: "…" }
ne_faisons_pas:
  - texte: "Les soins infirmiers et les actes médicaux…"
    relais: "les infirmiers, le SSIAD, l'HAD"   # optionnel
```

`content/semaines-types.json` : chaque exemple gagne `photo`. `content/interface.json` : libellés courts de la barre mobile (`barre_mobile.court`), textes du picker, de la carte de relecture, de la variante `frontiere`, du rail (`rail.titre`, `rail.delai_defaut`).

**Textes courts à écrire (dans la voix, à valider par Arcel)** : les six libellés du picker et le message « inconnu » ; le titre du panneau ; les trois choix du geste neuro ; les quatre raccourcis du geste adultes ; les six lignes de la fiche de vie ; la question 1 du questionnaire reprise dans le hero aidants ; les deux phrases nuit calme/active ; les trois choix de date de sortie ; la ligne de fin de « Ce que nous ne faisons pas » ; les libellés courts de la barre mobile ; le texte de la carte « Un devis gratuit et détaillé » ; la phrase de relais après la section 9.

**Photos à sélectionner (agent Photothèque)** : 1 hero accueil (+ recadrage mobile), 5 heros piliers (+ 1 variante « pour soi »), 7 heros maladies, 4 heros enfants (sans visage), 6 heros services, 4 photos de section accueil, 4 photos de semaines types, 2 photos de section par page service (≈ 50 pages → priorité aux 5 piliers et 6 services au lot 1). Toutes en 4:5 et 3:2 sources ≥ 1 600 px, exportées en 480/768/960/1 440 px, AVIF + WebP, crédits dans `public/images/CREDITS.md`.

**Icônes à dessiner (agent Iconographie, registre typé `IconName`)** : publics `maison`, `carnet`, `cartable`, `cle`, `tasse`, `question` ; services `lune`, `soleil-lune` (24h/24), `porte-hopital`, `lit`, `valise`, `relais` ; rubriques `gestes` (main), `presence` (porte entrouverte), `lien` (deux tasses), `coordination` (carnet-liaison) ; étapes et suivi `telephone`, `deux-personnes`, `carnet-liaison`, `calendrier`, `stethoscope-barre` ; situations `tapis-couloir`, `assiette`, `porte`, `lit-nuit`, `train-bois`, `casque`, `pictogrammes`, `ecole` ; aides `euro`, `feuille-aide` ; contact `appel`, `rappel`, `demande`, `planning`, `evaluation`, `budget` ; interface `check`, `croix-ouverte`, `fleche`, `chevron`, `lien-externe`, `source`, `confort`, `fermer`. Quarante-deux icônes, 24/32/48 px, trait 2 px, nœud optionnel.

### Composants à créer ou à modifier

| Composant | Action | Emplacement |
| --- | --- | --- |
| `Icon` | Créer (registre typé, `aria-hidden`, tailles 24/32/48, nœud optionnel) | `src/components/ui/Icon/` |
| `PhotoFigure` | Créer (`next/image`, ratios 4:5 / 3:2 / 16:9, rayon, `focal`, alt obligatoire) | `src/components/ui/PhotoFigure/` |
| `HeroThread` | Créer (registre de géométries par `fil`, tracé `fil-hero`) | `src/components/ui/Thread/` |
| `Hero` | Modifier : emplacements `media`, `gesture`, `tone`, ordre mobile (photo sous le H1), H1 en deux `span` | `src/components/blocks/Hero/` |
| `HeroDepth`, `TiltCard`, `FlipCard`, `Reveal`, `CountUp`, `PageThread`, `ThreadConnector` | Créer | `src/components/motion/` |
| `usePointerTilt`, `motionAllowed`, observateur partagé | Créer | `src/lib/motion/` |
| `HeroPicker`, `SituationPanel` | Créer | `src/components/blocks/Parcours/` |
| `StageChooser`, `NightChooser`, `DischargeChooser`, `PlanningShortcuts`, `LifeSheetCard`, `CaregiverFirstQuestion` | Créer (gestes de hero, un par page) | `src/components/blocks/HeroGestures/` |
| `ReaderSwitch` | Modifier : 56 px, bascule aussi la photo (`photo-swap`) | existant |
| `SituationCard` | Modifier : icône au lieu de la pastille, `tilt`, variante `plain` | existant |
| `StageCards`, `StepsTimeline`, `FollowUpTimeline`, `Commitments` | Modifier : connecteurs remplacés par `ThreadConnector`, icônes | existants |
| `WeekPlanner` | Modifier : `week-fill`, `count-up` du résumé ; créer `WeekStory` (photo + récit) et le sélecteur segmenté | existant |
| `Callout` | Modifier : variante `frontiere` | existant |
| `SourcesList` | Modifier : domaine en pastille, dates tabulaires, carte de relecture | existant |
| `ConversionRail` | Créer | `src/components/blocks/ConversionRail/` |
| `MobileActionBar` | Modifier : libellés courts, retrait devant le formulaire de section 12 | existant |
| `Header` | Corriger le repli des entrées à 1 280 px (`white-space: nowrap`, entrées raccourcies : « Pour qui ? » → « Publics ») | existant |
| `page.tsx` (accueil) | Retirer la section « Ce qui change » si vide ; carte prix de repli ; photos ; picker | existant |
| `ServiceTemplate` | Insérer photos, icônes, rail, gestes ; extraire `ActionGrid`, `RelativesBlock`, `WhoComes` | existant |
| `/styleguide/` | Montrer icônes, photos, chaque animation avec son interrupteur reduced-motion | existant |

### Ordre de mise en œuvre en trois lots

**Lot 1 — L'impact fort et rapide (le site cesse d'être générique).**
`Icon` et les 42 icônes · `PhotoFigure` et `next/image` · photos de hero pour l'accueil, les cinq piliers et les six services (+ bande mobile) · `Hero` réordonné sur mobile avec le H1 en deux lignes typographiques · `HeroThread` (géométrie générique d'abord, une par page ensuite) · `Reveal` avec l'observateur partagé sur toutes les grilles · `SituationCard` avec icônes · correction de la section « Ce qui change » vide et de la carte prix de repli · libellés courts de la barre mobile · repli de l'en-tête · `ConversionRail` · `PageThread` en version statique (trait et nœuds sans animation liée au défilement). Mesure `pnpm lhci` : objectif accueil ≤ 154 Ko.

**Lot 2 — L'interaction utile (le site guide et convertit).**
`HeroPicker` + `SituationPanel` sur l'accueil · les six gestes de hero (`ReaderSwitch` avec photo, `StageChooser`, `PlanningShortcuts`, `LifeSheetCard` + `FlipCard`, `CaregiverFirstQuestion`, `NightChooser`/`DischargeChooser`) · `WeekStory`, sélecteur segmenté, `week-fill`, `CountUp` · `ThreadConnector` dans `StageCards`, `StepsTimeline`, `FollowUpTimeline`, `Commitments` · `TiltCard` sur situations, prix, articles · photos de section (accueil, piliers) · `Callout` `frontiere` et `SourcesList` refaits · liens-icônes vers les maladies et les sous-pages enfants. Mesure `pnpm lhci` : accueil ≤ 158 Ko.

**Lot 3 — La profondeur (le « waouh » discret).**
`HeroDepth` · `parallax-2` · `fil-conducteur` lié au défilement · `fil-hero` propre à chaque page (géométries) · illustration au fil de l'Île-de-France avec nœuds d'agences · `ArticleCard` et bloc magazine (quand le contenu existe) · photos de section des pages maladies et sous-pages · page styleguide complète avec démonstration de chaque animation et de son extinction · tests e2e (axe, clavier, reduced-motion, mode confort) et Lighthouse sur les deux pages témoins.

Chaque lot passe `pnpm lint && pnpm typecheck && pnpm test && pnpm validate`, l'audit axe sur les quatre pages de référence (accueil, `/personnes-agees/`, `/aidants/`, `/services/garde-de-nuit/`), et une relecture des textes par `check-copy`. Une page enrichie n'est livrée que si ses photos ont leur entrée dans `CREDITS.md` et si elle reste lisible, en entier, animations coupées.
