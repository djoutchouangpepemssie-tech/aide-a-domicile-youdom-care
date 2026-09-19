# 02 — Design system « Le Fil »

## 1. Le concept : un fil continu

Tout l'univers visuel part d'une idée : **un fil**. Le fil de la vie qui continue à la maison. Le lien entre la personne, ses proches et l'équipe. Le fil que l'on ne lâche pas.

Concrètement, **une ligne continue, tracée d'un seul geste**, traverse chaque page. Elle relie les sections, s'enroule pour dessiner une maison, deux mains, une tasse, une silhouette, puis repart. Elle remplace les illustrations de banque d'images et les pictogrammes génériques. Elle est la signature : on reconnaît le site à cette ligne, même sans logo.

Règles du fil :

- Tracé SVG d'épaisseur constante (2 px sur ordinateur, 1,75 px sur mobile), extrémités arrondies, jamais fermé, jamais rempli.
- Couleur `teal-700` sur fond clair, `white` sur fond sombre, touches `raspberry-500` sur un seul segment par illustration (le « nœud » : le point d'attention).
- Il se dessine au défilement (`stroke-dashoffset`), en 600 à 900 ms, une seule fois. Avec `prefers-reduced-motion`, il est affiché d'emblée.
- Les illustrations au fil sont décoratives : `aria-hidden="true"`, jamais porteuses d'une information absente du texte.
- Bibliothèque minimale à dessiner : maison, mains jointes, tasse, fauteuil, lune (nuit), soleil (jour), cartable (enfant), arbre, cœur, téléphone, carnet, itinéraire.

Le reste du design est calme pour laisser vivre le fil : fonds chauds, beaucoup d'air, typographie généreuse, photographies vraies.

## 2. Couleurs

Base : les couleurs mesurées sur le dépliant Youdom Care, complétées de variantes accessibles. Les rapports de contraste ci-dessous sont calculés (WCAG 2.2) ; la loop les revérifie dans `scripts/validate/check-contrast.ts`.

| Jeton | Code | Rôle | Contraste |
| --- | --- | --- | --- |
| `ink` | #0F2F38 | Texte principal | 14,15 sur blanc · 13,36 sur papier |
| `ink-soft` | #47626B | Texte secondaire, légendes | 6,51 sur blanc · 6,14 sur papier |
| `teal-500` | #0699B0 | Couleur de marque : aplats, grands titres décoratifs, illustrations | 3,39 sur blanc : jamais pour du texte courant |
| `teal-600` | #008AA2 | Marque foncée : éléments graphiques, grands textes | 4,07 sur blanc |
| `teal-700` | #00788D | Liens, boutons secondaires, fil | 5,16 sur blanc · 4,87 sur papier · 4,47 sur sable (donc `teal-800` sur sable) |
| `teal-800` | #00606F | Liens sur fond sable, anneau de focus | 7,23 sur blanc · 6,83 sur papier |
| `teal-900` | #0B4753 | Titres, pied de page sombre | 10,29 sur blanc |
| `teal-50` | #E6F5F8 | Fond de section | encre dessus : 12,66 |
| `green-500` | #58BE81 | Marque : pastilles, pictogrammes, aplats avec texte `ink` | encre dessus : 6,13 · blanc dessus : 2,31 (interdit) |
| `green-700` | #23804A | Texte de succès | 4,93 sur blanc |
| `green-50` | #EAF7EF | Fond de section, encarts « Bon à savoir » | encre dessus : 12,84 |
| `raspberry-500` | #EF3F6B | Accent décoratif, nœud du fil | 3,75 sur blanc : jamais pour du texte courant |
| `raspberry-600` | #D42A5B | **Bouton principal** (texte blanc) | blanc dessus : 4,90 |
| `raspberry-700` | #B81F4C | Survol du bouton principal, texte d'accent | 6,29 sur blanc · 5,51 sur rose pâle |
| `raspberry-50` | #FDECEE | Fond d'encart d'urgence douce | encre dessus : 12,41 |
| `azure-600` | #177DB2 | Accent froid, liens dans le magazine | 4,55 sur blanc |
| `azure-700` | #14699A | Variante foncée | 5,97 sur blanc |
| `azure-50` | #E8F2FA | Fond | encre dessus : 12,47 |
| `paper` | #FBF8F3 | **Fond général du site** (blanc cassé chaud, moins éblouissant) | — |
| `sand` | #F4EEE4 | Fond de section alternée | encre dessus : 12,26 |
| `white` | #FFFFFF | Cartes, champs | — |
| `line` | #D9E3E6 | Filets décoratifs uniquement | 1,31 : jamais porteur d'information |
| `field-border` | #6F8A92 | Bordure des champs et des cases | 3,67 sur blanc · 3,46 sur papier |
| `danger` | #B42318 sur #FEF3F2 | Erreurs | 6,05 |
| `warning` | #7A4F00 sur #FFF4D6 | Encarts « Attention » | 6,51 |

Règles d'usage :

- **Une seule couleur d'action : framboise.** Un seul bouton framboise par écran visible. Tout le reste des actions est en `teal-700` (bouton plein secondaire) ou en contour.
- Le vert ne porte jamais de texte blanc. Il sert d'aplat doux avec texte `ink`, de pastille, de repère « fait ».
- Alternance des fonds de section : `paper` → `white` → `teal-50` → `paper` → `sand`. Jamais deux fonds teintés à la suite.
- Le pied de page est en `teal-900`, texte blanc (10,29).
- **Mode confort de lecture** (bouton dans l'en-tête et le pied de page, mémorisé sur l'appareil) : texte à 112,5 %, interlignage 1,75, `ink` remplacé par #06222A (16,54), liens #004A57 (9,92) soulignés en permanence, animations coupées, fonds teintés remplacés par du blanc.

## 3. Typographie

| Usage | Police | Pourquoi |
| --- | --- | --- |
| Titres | **Fraunces** (variable, axes `opsz`, `wght`, `SOFT`) | Un serif doux, humain, un peu d'encre et de papier : l'inverse des sans-serif géométriques des concurrents |
| Texte, interface | **Atkinson Hyperlegible Next** (repli : Atkinson Hyperlegible) | Dessinée par le Braille Institute pour la basse vision : lettres très différenciées. Un choix qui a du sens pour notre public |
| Chiffres des prix et grilles | Atkinson Hyperlegible Next, `font-variant-numeric: tabular-nums` | Alignement des colonnes |

Chargement par `next/font`, sous-ensemble latin, `display: swap`, deux fichiers variables au plus.

| Niveau | Taille (mobile → ordinateur) | Graisse | Interligne |
| --- | --- | --- | --- |
| H1 | `clamp(2.125rem, 5.2vw, 3.75rem)` | 560, `SOFT` 50 | 1,08 |
| H2 | `clamp(1.75rem, 3.6vw, 2.625rem)` | 560 | 1,15 |
| H3 | `clamp(1.375rem, 2.2vw, 1.75rem)` | 600 | 1,25 |
| H4 | 1,25 rem | 700 (Atkinson) | 1,3 |
| Chapô | `clamp(1.1875rem, 1.6vw, 1.375rem)` | 400 | 1,55 |
| **Texte courant** | **1,0625 rem (17 px) mobile · 1,125 rem (18 px) ordinateur** | 400 | 1,65 |
| Petit texte, légendes | 0,9375 rem (15 px) au minimum | 400 | 1,5 |
| Bouton | 1,0625 rem | 700 | 1 |

Règles : longueur de ligne de 60 à 72 caractères ; jamais de texte justifié ; jamais de capitales sur plus de trois mots ; italique réservé aux citations ; chiffres importants en Fraunces 560.

## 4. Espaces, formes, profondeur

- Grille : conteneur 1 200 px, gouttières 24 px (mobile 20 px), 12 colonnes. Sections : `padding-block: clamp(3.5rem, 8vw, 7rem)`.
- Échelle d'espacement : 4, 8, 12, 16, 24, 32, 48, 64, 96, 128 px.
- Rayons : 10 px (champs), 14 px (boutons), 20 px (cartes), 28 px (grands blocs), cercle (pastilles). Les formes sont douces, jamais en pilule complète sur les grands boutons.
- Ombres : deux niveaux seulement. `shadow-1` : `0 1px 2px rgba(15,47,56,.06), 0 4px 12px rgba(15,47,56,.06)`. `shadow-2` (survol, en-tête collant) : `0 2px 4px rgba(15,47,56,.06), 0 12px 32px rgba(15,47,56,.10)`.
- Cartes : fond blanc, bordure `1px solid line`, rayon 20 px, `shadow-1`. Au survol : `shadow-2`, translation de −2 px, 200 ms.
- Cibles tactiles : 48 × 48 px au minimum, 56 px de haut pour les boutons principaux.
- Focus visible partout : anneau de 3 px `teal-800`, décalage 2 px, jamais supprimé.

## 5. Mouvement

Doux, utile, rare. Durées de 150 à 300 ms, courbe `cubic-bezier(.2,.7,.2,1)`. Trois animations seulement : le tracé du fil, l'apparition en fondu-montée (12 px) des blocs au défilement, les transitions d'état des composants. Aucun carrousel automatique, aucune vidéo en lecture automatique avec son, aucun parallaxe. Tout s'éteint avec `prefers-reduced-motion` et en mode confort.

## 6. Images

- **De vraies personnes, de vrais intérieurs.** Lumière naturelle, regards, gestes du quotidien (préparer un repas, marcher au bras, lire ensemble, jouer par terre avec un enfant). Des auxiliaires de vie en tenue normale, pas en blouse.
- Interdits : mains jointes en gros plan, seniors hilares devant une tablette, fauteuil roulant vide, photos sombres ou médicalisées, visages d'enfants sans autorisation écrite.
- Tant qu'aucune photo réelle n'est fournie, le site utilise **les illustrations au fil** et des aplats de couleur, jamais de banque d'images. La liste des photos à produire est tenue dans `docs/QUESTIONS_ARCEL.md`.
- Formats : ratio 4:5 (portraits), 3:2 (scènes), 16:9 (bannières). Rayon 20 px. Texte alternatif descriptif obligatoire (« Une auxiliaire de vie aide un homme âgé à enfiler son manteau dans une entrée »).

## 7. Composants

Chaque composant a : variantes, états (repos, survol, focus, actif, désactivé, erreur), comportement mobile, test d'accessibilité. Une page `/styleguide/` (noindex, exclue du plan de site) les montre tous.

| Composant | Description | Points de vigilance |
| --- | --- | --- |
| `Header` | Collant, 80 px puis 64 px au défilement, logo, 6 entrées, téléphone cliquable, bouton framboise | Méga-menu accessible au clavier, fermeture par Échap, lien d'évitement « Aller au contenu » |
| `MobileActionBar` | Barre fixe basse : Appeler · Être rappelé(e) · Ma demande | Ne masque jamais un champ actif ; respecte `safe-area-inset-bottom` |
| `Hero` | Sur-titre, H1, chapô, deux boutons, lien téléphone, ligne de réassurance, illustration au fil ou photo 4:5 | Le H1 tient sur quatre lignes au plus sur mobile |
| `SituationCard` | Citation en Fraunces entre guillemets, une phrase, lien fléché ; pastille au fil en haut à gauche | Toute la carte est cliquable, un seul lien pour le lecteur d'écran |
| `StageCards` | Trois cartes reliées par le fil (début · évolution · stade avancé) | Ordre de lecture linéaire sur mobile |
| `WeekPlanner` | **Composant signature.** Grille 7 jours × 6 créneaux. Variante `display` (exemples, lecture seule, légende par couleur d'activité) et variante `input` (formulaires) | Voir `docs/05` ; tableau HTML réel en lecture, cases à cocher groupées en saisie |
| `StepsTimeline` | Étapes numérotées reliées par le fil vertical | Liste ordonnée sémantique |
| `FollowUpTimeline` | « Le suivi » : jalons J0, J+7, chaque mois, chaque trimestre | Masque un jalon si l'engagement correspondant est vide |
| `PriceCard` | Prix horaire TTC en grand ; mode d'intervention ; en dessous, plus petit : montant après crédit d'impôt ; exemple mensuel | Hiérarchie imposée par la réglementation (voir `docs/07`) ; se masque si tarif `null` |
| `AidCard` | Une aide financière : pour qui, combien, comment la demander, lien officiel | Lien externe signalé |
| `Callout` | « À retenir », « Bon à savoir », « Attention », « Ce que nous ne faisons pas » | Rôle `note`, icône au fil |
| `FAQ` | `details/summary` natifs, une question par bloc | Pas de JavaScript |
| `TestimonialCard` | Citation, prénom, lien avec la personne accompagnée, commune, date | N'existe que si `content/temoignages/` contient des entrées réelles avec consentement |
| `AgencyCard` | Nom, adresse, téléphone, horaires, itinéraire | Données de `site.config.json` uniquement |
| `TerritorySearch` | Champ avec autocomplétion sur les communes d'Île-de-France | Fonctionne au clavier, annonce les résultats (`aria-live`) |
| `LocalFactsGrid` | Ressources locales sourcées (point d'information seniors, MDPH, accueils de jour, hôpitaux, transport adapté) | Chaque fait affiche sa source et sa date |
| `ArticleCard`, `AuthorBox`, `SourcesList`, `ReviewedBy` | Magazine et pages pathologie | Auteur et relecteur nommés, date de mise à jour |
| `Breadcrumb` | Fil d'Ariane | Balisage `BreadcrumbList` |
| `ComfortToggle` | Active le mode confort | État annoncé, mémorisé |
| `ConsentBanner` | Seulement si un outil soumis à consentement est activé | Refuser aussi facile qu'accepter |
| `Footer` | Coordonnées, agences, liens, labels, mentions | Téléphone cliquable, signature de marque |

## 8. Gabarits de page

1. **Accueil** : 12 blocs de `docs/01`.
2. **Pilier de public** (neuro, personnes âgées, adultes, enfants, aidants) : bannière, situations vécues, ce que nous faisons, sous-pages en cartes, semaine type, suivi, proches, tarifs et aides, FAQ, formulaire.
3. **Page de service ou de pathologie** : 13 sections de `docs/03`.
4. **Page locale** : bannière locale, réponse immédiate (« Oui, nous intervenons à… »), agence la plus proche, ressources locales sourcées, services, zone éditoriale unique, communes voisines, FAQ locale, formulaire.
5. **Article** : titre, chapô, auteur et relecteur, sommaire collant, corps, encarts, sources, articles liés, appel contextuel.
6. **Page utilitaire** : légales, plan du site, erreur 404 (avec recherche de commune et téléphone).

## 9. Accessibilité visuelle (résumé, détail dans `docs/07`)

Contrastes AA partout, AAA pour le texte courant. Jamais d'information portée par la couleur seule. Zoom 200 % sans perte. Redistribution à 320 px de large. Feuille d'impression pour les pages tarifs, aides et articles : les familles impriment.
