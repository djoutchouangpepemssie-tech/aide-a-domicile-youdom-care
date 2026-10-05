# Audit global du site Youdom Care — 5 octobre 2026

Audit complet du dépôt : sécurité, vie privée et RGPD, conformité légale, qualité technique,
accessibilité, performance. Réalisé sur la branche `claude/wonderful-ramanujan-miqdb0`
(état du commit `5ff8714`), dépendances installées depuis `pnpm-lock.yaml`.

**Ce qui a réellement été exécuté** : `pnpm install --frozen-lockfile`, `pnpm lint`,
`pnpm exec next typegen`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm validate`,
`pnpm audit`, plus une lecture ligne à ligne des trois routes d'API, des trois modules de
traitement serveur, des schémas Zod, du rendu des e-mails, du transport SMTP, de la
configuration Next, de la CI et des scripts d'outillage.

**Ce qui n'a pas pu être exécuté** : `pnpm lhci`, qui demande un réseau sortant ouvert. Les
constats de performance reprennent donc les mesures déjà consignées dans `docs/PLAN.md` (DP.2) et
ne sont pas des mesures neuves. Les parcours Playwright, d'abord jugés inexécutables, l'étaient en
pointant le chromium présent dans l'environnement : ils ont tourné en entier (§9).

> **Suites données.** Ce document reste le relevé daté du 5 octobre. Les correctifs appliqués le
> même jour sont consignés au §9, qui dit pour chaque constat s'il est corrigé, encore ouvert, ou
> hors de portée du code. Les décisions prises au passage sont D-050bis à D-053.

---

## 1. Verdict en une page

Le projet est **nettement au-dessus de la moyenne d'un site vitrine** : 52 625 lignes de
TypeScript sur 463 fichiers, 200 fichiers de tests, **926 tests unitaires verts**, 13 contrôles
de contenu maison, schémas Zod partagés entre le navigateur et le serveur, aucune journalisation
du contenu des demandes, mesure d'audience conçue pour ne collecter aucune donnée personnelle.
La séparation entre les routes Next et les fonctions `handleLead` / `handleCandidature` /
`handleMesure` rend le cœur sensible testable hors de Next, et il l'est.

Trois choses doivent néanmoins être réglées **avant toute ouverture au public** :

| # | Sujet | Gravité |
| --- | --- | --- |
| 1 | `next@16.3.5` porte une faille critique d'exécution de code à distance dans `next/og` | Critique |
| 2 | Les données de santé partent par e-mail chez un prestataire américain, sans avis du conseil ni hébergement HDS (Q-LEGAL-4, sans réponse) | Critique (juridique) |
| 3 | La limitation de débit des formulaires est inopérante en production | Élevée |

Et deux points de conformité bloquants : neuf champs obligatoires des mentions légales sont
vides (dont le médiateur de la consommation, obligatoire dès la mise en ligne), et 47 questions
restent ouvertes dans `docs/QUESTIONS_ARCEL.md`, la plupart marquées « bloquant production ».

---

## 2. Sécurité

### S-1. Critique — `next@16.3.5` : exécution de code à distance dans `next/og`

`pnpm audit` remonte l'avis [GHSA-vcvr-r3jv-pc5j](https://github.com/advisories/GHSA-vcvr-r3jv-pc5j) :
versions touchées `>=16.2.0 <16.3.6`, corrigé en **16.3.6**. Le site utilise bien
`ImageResponse` (`src/lib/og/render.tsx:1`), appelé par tous les `opengraph-image.tsx` et par
`src/app/og/[...chemin]/route.tsx`.

**Atténuation réelle** : cette route est déclarée `dynamic = "force-static"` avec
`dynamicParams = false` et une liste fermée de paramètres (`generateStaticParams`). Les images
sont donc rendues **au build**, depuis des titres qui viennent de `content/`, et aucune entrée
de visiteur n'atteint satori en production. L'exposition est faible, mais la version doit être
corrigée : un `ImageResponse` dynamique ajouté plus tard transformerait cette dette en faille
exploitable, et une faille critique dans le cadriciel ne se garde pas.

**Correctif** : `pnpm up next@^16.3.6 eslint-config-next@^16.3.6`, puis `pnpm build` et
`pnpm test` pour vérifier le rendu des 179 images OG.

### S-2. Élevée — la limitation de débit ne limite rien en production

`createRateLimiter` (`src/lib/lead/server.ts:37`) tient ses compteurs dans une `Map`
**propre au processus**. Sur Vercel, chaque instance de fonction a la sienne et les instances
se multiplient avec la charge : la limite annoncée de cinq envois par adresse et par dix minutes
se contourne par la simple concurrence. Deux faiblesses s'ajoutent :

- la clé est le premier élément de `x-forwarded-for` (`src/lib/http/request.ts:31`), en-tête
  que le client fournit ; selon le proxy placé devant, il suffit de le faire varier pour repartir
  de zéro ;
- `TURNSTILE_SECRET_KEY` est vide dans `.env.example` et le contrôle anti-robots Cloudflare est
  donc entièrement désactivé (`src/lib/lead/server.ts:147`) ; il ne reste que le champ piège et
  le délai minimal de trois secondes, que n'importe quel script franchit.

**Conséquence concrète** : un robot peut inonder `contact@youdom-care.com`, et sur
`/api/candidature/` chaque requête acceptée pousse jusqu'à 5 Mo de pièce jointe dans la boîte de
l'équipe. Pour un service dont la boîte de réception est le **seul** lieu de conservation des
demandes (docs/05 §8), c'est un risque d'indisponibilité de la fonction commerciale, pas
seulement une nuisance.

**Pistes** : un compteur partagé (Vercel KV / Upstash Redis, ou Edge Config) ; ou la limitation
au bord par le pare-feu de l'hébergeur ; ou l'activation de Turnstile sur les formulaires avant
l'ouverture. Les trois peuvent se combiner. À inscrire dans `docs/DECISIONS.md`.

### S-3. Moyenne — le contrôle d'origine n'est pas une protection contre l'abus

`originAllowed` (`src/lib/http/request.ts:7`) compare l'`Origin` (ou le `Referer`) à
l'`x-forwarded-host` de la requête elle-même, ou à `NEXT_PUBLIC_SITE_URL`. Un navigateur ne peut
pas falsifier `Origin` : le contrôle arrête donc un CSRF naïf — qui n'a de toute façon pas de
cible ici, puisqu'il n'y a ni session, ni cookie, ni action authentifiée. En revanche un client
non-navigateur (`curl`, script) choisit librement ses en-têtes : le contrôle n'oppose **aucune**
résistance à un robot.

Ce n'est pas un défaut de code, c'est un défaut de qualification : `docs/07 §6` le compte parmi
les protections de la route `api/lead`. Il faut l'y décrire pour ce qu'il est (hygiène, pas
sécurité) et ne pas s'y appuyer pour arbitrer S-2.

### S-4. Moyenne — les corps de requête sont lus en mémoire avant d'être bornés

- `/api/lead` : `await request.text()` (`route.ts:44`) **puis** contrôle de longueur. Le
  garde-fou `content-length` qui précède est sauté quand l'en-tête est absent (requête
  *chunked*) : `Number(null ?? "0")` vaut `0`, donc passe.
- `/api/candidature` : `await request.formData()` (`route.ts:66`) analyse tout le corps avant le
  moindre contrôle de champ.
- `/api/mesure` : même schéma, mais le plafond de 2 Ko limite les dégâts.

En pratique la plateforme borne le corps (4,5 Mo pour une fonction Vercel) : le risque est
contenu **par l'hébergeur, pas par le code**. Si le site est un jour servi ailleurs, la
protection disparaît sans qu'aucun test ne le signale. Un contrôle par lecture en flux, ou au
minimum un refus explicite des requêtes sans `content-length` sur `/api/candidature`, lèverait
la dépendance.

### S-5. Moyenne — la taille du CV dépasse la limite de la plateforme (défaut fonctionnel aussi)

`CV_MAX_BYTES` vaut 5 Mo et `CANDIDATURE_MAX_BODY_BYTES` 6 Mo
(`src/lib/candidature/schema.ts:13`), alors que la limite de corps de requête d'une fonction
Vercel est de **4,5 Mo**. Un CV légitime de 4,5 à 5 Mo sera donc refusé par la plateforme
*avant* d'atteindre la route : le formulaire recevra une erreur qu'il ne sait pas interpréter,
et le candidat perdra sa saisie — alors que `docs/05 §2` et l'interface promettent 5 Mo.

Rien dans `docs/05` ni dans `docs/DECISIONS.md` ne mentionne cette limite : elle n'a pas été
prise en compte. À trancher : abaisser le plafond à ~4 Mo et le dire dans l'interface, ou passer
par un téléversement direct vers un stockage. Dans les deux cas, un parcours Playwright avec un
fichier à la limite éviterait la régression.

### S-6. Faible — la CSP réelle contredit la documentation

La politique appliquée est `script-src 'self' 'unsafe-inline'` (`next.config.ts`), compromis
assumé et expliqué par D-013 (site statique, pas de *nonce* possible sans rendu dynamique).
Mais `docs/07 §6` affirme toujours « `Content-Security-Policy` stricte (aucun script en ligne
non signé) ». La documentation de conformité annonce mieux que la réalité.

Le risque résiduel est faible et c'est important de le dire : aucun script tiers n'est chargé,
aucun HTML fourni par un visiteur n'est rendu, les trois `dangerouslySetInnerHTML` du dépôt sont
alimentés par des constantes (`ComfortScript`, `MotionScript`) ou par `serializeJsonLd`, qui
échappe `<`, `>` et `&` en séquences `\u00xx` (`src/lib/jsonld/serialize.ts`). Il n'y a ni
`eval`, ni `new Function`, ni affectation d'`innerHTML` hors fichiers de test.

**Correctif** : corriger la phrase de `docs/07 §6` et y renvoyer à D-013. À terme, une CSP par
empreintes n'est pas praticable (les scripts en ligne de Next varient par page) ; un en-tête
posé par *middleware* pour les seules routes dynamiques serait possible mais apporterait peu.

### S-7. Faible — la clé IndexNow n'est pas ignorée par git

`.env.example` promet que `public/<clé>.txt`, écrit par le script `prebuild`, n'est « jamais
commité ». Rien ne l'empêche : `git check-ignore public/abcdef123456.txt` répond que le fichier
**n'est pas ignoré**. Sur Vercel le build est jetable, donc le cas ne se produit pas ; un
développeur qui lance `pnpm build` en local avec `INDEXNOW_KEY` renseignée se retrouve en
revanche avec le fichier dans son arbre de travail, prêt à partir dans un `git add .`.

La clé IndexNow n'est pas un secret fort (elle n'autorise que la soumission d'adresses du
domaine), d'où la gravité faible. **Correctif** : ajouter `/public/*.txt` à `.gitignore`.

Le reste du script est propre : la clé est validée par motif (`/^[A-Za-z0-9-]{8,128}$/`) **avant**
tout `path.join` — donc pas de traversée de répertoire — et masquée dans les journaux
(`maskKey`).

### S-8. Faible — pas d'audit de dépendances dans la CI

`docs/07 §6` prévoit des « dépendances auditées (`pnpm audit`) à chaque fin de phase ». Le
*workflow* `.github/workflows/ci.yml` n'en contient aucune étape : l'avis critique S-1 est passé
inaperçu. État actuel : **8 vulnérabilités** (1 critique, 5 élevées, 1 modérée, 1 faible). Les
sept autres que Next sont toutes sous `@lhci/cli` (`tmp`, `extract-zip`, `uuid`, `basic-ftp`,
`braces`) : outillage de développement, jamais exécuté par le site — l'analyse de DC.2 dans
`docs/PLAN.md` reste juste sur ce point.

Petite dérive à corriger au passage : DC.2 affirme que des `overrides` ont été posés dans
`pnpm-workspace.yaml` par `pnpm audit --fix=override`. Le fichier ne contient aucune section
`overrides` — seulement `allowBuilds`.

### S-9. Ce qui est solide et doit être préservé

- **En-têtes** complets et bien choisis : HSTS avec `preload`, `nosniff`, `X-Frame-Options: DENY`
  doublé par `frame-ancestors 'none'`, `Referrer-Policy: strict-origin-when-cross-origin`,
  `Permissions-Policy` minimale (avec la correction `browsing-topics` de D-029),
  `Cross-Origin-Opener-Policy: same-origin`, `poweredByHeader: false`.
- **Validation d'entrée** exemplaire : `strictObject` partout (tout champ en trop est refusé),
  téléphone validé par `libphonenumber-js`, `sourcePage` contraint à un chemin interne sans
  paramètres, clés de `situation` contraintes par expression régulière, cohérence
  INSEE/code postal/département vérifiée, consentement santé exigé dès qu'une réponse touche à la
  santé, schéma de mesure en union discriminée sur des listes fermées.
- **E-mails** : tout le contenu variable passe par `escapeHtml` (`src/lib/mail/render.ts:32`), y
  compris dans les attributs `href`.
- **Contrôle du CV** en trois temps — extension, type MIME annoncé, signature des quatre premiers
  octets — qui refuse un exécutable renommé ; nom de pièce jointe reconstruit par `safeCvFilename`
  (lettres, chiffres, tirets, 60 caractères) donc sans traversée ni en-tête `Content-Disposition`
  malformé ; fichier trop lourd refusé **sans être lu** en mémoire.
- **Webhooks** signés en HMAC-SHA256, avec délai d'abandon de 5 s côté mesure.
- **Aucun secret dans le dépôt** : vérifié par recherche de motifs (`re_`, `sk_`, `AKIA`, `ghp_`,
  affectations de clés) sur l'ensemble des fichiers suivis ; seul `.env.example` est versionné et
  il ne contient que des valeurs publiques.
- **XML des plans de site** échappé (`escapeXml`), chemins de segments validés.

Un point méritait vérification et s'avère couvert : `commune.nom` est un champ libre de
80 caractères sans restriction de caractères, et il entre dans l'**objet** de l'e-mail d'équipe
(`teamSubject`, `src/lib/mail/render.ts:148`) — de quoi tenter une injection d'en-tête SMTP par
retour chariot. Lecture du code de `nodemailer@10.0.10` : `_encodeHeaderValue` remplace tout
`\r`/`\n` par une espace pour les en-têtes non structurés, l'objet compris
(`dist/cjs/mime-node/index.js:1287`). L'injection est donc **neutralisée**. Un filtrage côté site
resterait une bonne défense en profondeur (il ne dépendrait plus du comportement d'une
dépendance), mais ce n'est pas une faille aujourd'hui.

---

## 3. Vie privée et RGPD

### Ce qui est remarquablement bien fait

- **Mesure d'audience** (`src/lib/mesure/`) : quatre événements seulement, propriétés typées sur
  des listes fermées revalidées côté serveur, chemin de page normalisé sans paramètres ni ancre,
  inactive si `NEXT_PUBLIC_MESURE_ACTIVE` n'est pas exactement `"true"`, **et** silencieuse si le
  navigateur annonce Do Not Track ou Global Privacy Control. L'adresse IP n'est jamais conservée :
  seule son empreinte HMAC, salée par 16 octets aléatoires tirés au démarrage du processus et
  jamais persistés, sert de clé ; les entrées expirées sont effacées à chaque appel. Sans
  collecteur configuré, la route répond 204 et ne garde rien.
- **Aucune journalisation du contenu** : les trois modules serveur ne tracent que l'identifiant,
  le formulaire et le statut. Vérifié ligne à ligne.
- **Consentement versionné** (`CONSENT_VERSION`, `CANDIDATURE_CONSENT_VERSION`), horodaté, et
  exigé par le schéma dès qu'une réponse touche à la santé.
- Aucun stockage : ni base, ni fichier, ni cookie de suivi. Le seul `localStorage` utilisé est une
  préférence d'affichage (`yc-confort`).

### Le risque ouvert, et il est majeur

Les demandes qui contiennent des **données de santé** (article 9 du RGPD : pathologie, degré
d'autonomie, besoins d'aide à la personne) sont transmises par e-mail via **Resend**, prestataire
américain (D-050), et résident ensuite dans une boîte de réception ordinaire qui est, selon
`docs/05 §8`, leur **seul** lieu de conservation. Il n'y a ni hébergement certifié HDS, ni durée
de conservation appliquée techniquement, ni avis du conseil ou du délégué à la protection des
données.

C'est exactement la question **Q-LEGAL-4** de `docs/QUESTIONS_ARCEL.md` — posée, toujours sans
réponse. Le dépôt est honnête sur ce point et ne prétend pas le contraire ; il reste que c'est la
décision la plus lourde du projet et qu'elle n'appartient pas au code. Elle doit être tranchée
avant l'ouverture, pas après.

---

## 4. Conformité légale

`pnpm validate` passe `check-legal` au vert, mais avec **neuf avertissements** : `raison_sociale`,
`forme_juridique`, `siege_social`, `rcs`, `directeur_publication`, `mediateur_consommation`,
`hebergeur.adresse`, `hebergeur.contact` sont `null`, et `autorisations` est vide dans
`content/site.config.json`.

Le mécanisme est bien conçu — un champ inconnu est **masqué** à l'écran plutôt que rendu comme
« à compléter », conformément au garde-fou du projet. Mais masquer n'est pas renseigner :

- l'absence de **médiateur de la consommation** est une non-conformité à l'article L. 616-1 du
  code de la consommation dès la mise en ligne ;
- l'absence de directeur de la publication, de forme juridique, de siège et d'immatriculation est
  une non-conformité aux mentions légales obligatoires d'un site professionnel ;
- l'absence d'**autorisations départementales** est particulièrement sensible pour un service à la
  personne intervenant auprès de publics vulnérables.

Par ailleurs `legal.siret` et `contact.telephone_principal` figurent toujours dans la liste
`a_confirmer` : ils sont affichés alors qu'ils n'ont pas été vérifiés par Arcel.

**47 questions** restent ouvertes dans `docs/QUESTIONS_ARCEL.md`, dont les sections « Identité et
mentions légales » et « Cadre légal » entièrement, toutes deux marquées « bloquant production ».
C'est le vrai chemin critique du projet — davantage que n'importe quelle tâche technique
restante.

---

## 5. Qualité technique

### Résultats des contrôles

| Contrôle | Résultat |
| --- | --- |
| `pnpm lint` | ✔ vert, sans avertissement |
| `pnpm typecheck` | ✔ vert **après** `pnpm exec next typegen` (voir Q-1) |
| `pnpm test` | ✔ **926 tests verts**, 1 ignoré, 175 fichiers, 102 s |
| `pnpm build` | ✔ vert, 179 images OG et plus de 170 pages prérendues |
| `pnpm validate` | **12/13** — seul `check-links` échoue (voir Q-2) |
| `pnpm audit` | ✖ 8 vulnérabilités (voir S-1, S-8) |
| `pnpm test:e2e`, `pnpm lhci` | non exécutables ici (réseau sortant coupé) |

### Q-1. `pnpm typecheck` échoue sur un clone neuf

Sur un dépôt fraîchement installé, `pnpm typecheck` seul échoue :
`src/app/layout.tsx(49,50): error TS2304: Cannot find name 'LayoutProps'`. Le type est généré par
`next typegen`, que la CI lance dans une étape dédiée mais qu'aucun script npm n'enchaîne. Un
contributeur qui suit `CLAUDE.md` (« `pnpm lint && pnpm typecheck && pnpm test && pnpm validate`
verts ») se heurte à une erreur qui n'en est pas une.

**Correctif, une ligne** : `"pretypecheck": "next typegen"` dans `package.json`.

### Q-2. `check-links` traite un blocage comme un lien mort

L'unique échec de `pnpm validate` porte sur **18 adresses externes** de
`service-public.gouv.fr`, `santepubliquefrance.fr` et `pour-les-personnes-agees.gouv.fr`, toutes
en **HTTP 403**. Aucun lien interne n'est cassé.

`checkExternal` (`scripts/validate/check-links.ts:117`) classe tout code ≥ 400 en erreur
bloquante, et n'envoie qu'un agent utilisateur maison
(`Mozilla/5.0 (compatible; YoudomCare-check-links/1.0)`). Or ces trois sites gouvernementaux
filtrent les agents non-navigateurs : un 403 veut dire « filtré », pas « disparu ». Un domaine
entier qui répond 403 d'un coup est le signe d'un filtrage, pas d'une refonte simultanée de
douze pages.

Je ne peux pas confirmer l'état réel de ces pages depuis cet environnement (réseau sortant
coupé), et je ne l'affirme donc pas. Mais le défaut de conception du contrôle est certain : il
rendra la CI rouge de façon aléatoire, selon l'adresse IP du *runner* GitHub et l'humeur du
pare-feu des sites visés — exactement ce qui pousse une équipe à ignorer un contrôle.

**Correctif** : classer 403, 429 et 5xx en **avertissement** (comme les erreurs réseau le sont
déjà) et ne garder bloquants que 404 et 410.

### Q-3. Avertissements de contenu à traiter

- **25 fiches locales** portent un téléphone non normalisé que `check-local-nap` signale :
  « 3994 » (numéro court, vingt occurrences dans le Val-de-Marne), et quatre valeurs qui sont des
  phrases plutôt que des numéros (« 01 45 54 04 80 Tél selon le tableau CASVP 01 45 54 85 93 »,
  « 01 42 03 53 70 selon tableau 01 42 03 53 71 », « 01 41 23 86 30 (ou 86 31) », « 0 39 75 »).
  Le contrôle a raison de prévenir ; les données doivent être nettoyées (ou le schéma doit
  admettre explicitement les numéros courts à quatre chiffres, qui sont de vrais numéros).
- **13 articles du Fil** et l'ensemble des pages services/pathologies/locales restent en
  `statut: a_relire` : conformément à D-037 ils sont construits, mais en `noindex`. L'ouverture du
  référencement dépend donc d'une relecture professionnelle encore absente (Q-CONTENU-7,
  Q-CONTENU-15).
- Deux pages sous le minimum de trois liens entrants contextuels (`/magazine/page/2/`,
  `/plan-du-site/`) : avertissement mineur.

### Q-4. Architecture : les bons choix sont déjà faits

À signaler parce que c'est rare et que ça doit être conservé : la frontière route ↔ fonction
pure (`handleLead`, `handleCandidature`, `handleMesure` ne connaissent pas Next et reçoivent
`mailer`, `env`, `limiter`, `ip`, `now`, `fetchImpl` par injection) permet de tester les chemins
sensibles — anti-robots, limites, panne d'envoi, signature de webhook — sans serveur. Le choix de
`zod/mini` sur les schémas partagés avec le navigateur (D-022) montre que le poids du *bundle* a
été pensé au bon endroit. Le contenu typé et validé par Zod au chargement évite la classe
d'erreurs la plus courante d'un site de contenu.

---

## 6. Accessibilité

La démarche est sérieuse et documentée (`docs/AUDIT_ACCESSIBILITE.md`, RGAA 4.1 / WCAG 2.2 AA) :
tabulation complète page par page, `axe-core` 4.13 sur **tous** les gabarits en mobile (320 px) et
ordinateur (1 280 px), fenêtre à 320 et 640 px, espacement de texte WCAG 1.4.12 injecté,
`prefers-reduced-motion`, mode confort propre au site, revue de code pour les critères non
observables. Trois non-conformités (NC-1 à NC-3) et cinq réserves (R-1 à R-4) sont corrigées, avec
tests unitaires et parcours à l'appui.

Deux réserves restent ouvertes, et elles comptent :

- **R-6** : aucun lecteur d'écran réel n'a été utilisé. Les critères qui en dépendent (annonces
  `aria-live`, lecture des cartes radio et du tableau de semaine) sont honnêtement notés
  « à confirmer avec NVDA/VoiceOver » et non comptés conformes — c'est la bonne pratique, et la
  déclaration d'accessibilité ne doit surtout pas annoncer mieux.
- **R-5** : le balisage des PDF de `/outils/` n'est pas vérifié.

Enfin, l'audit des 106 critères par un tiers, prévu avant l'ouverture, reste à faire. Pour un
site dont le public est précisément composé de personnes âgées, de personnes en situation de
handicap et de leurs aidants, c'est un jalon et pas une formalité.

---

## 7. Performance

Dette ouverte et déjà instruite dans `docs/PLAN.md` (DP.2), que je ne peux pas re-mesurer ici :
après la refonte visuelle D-032 et le correctif `content-visibility: auto`, **deux à trois pages
témoins** restent hors budget, avec un temps de blocage total de 166 à 326 ms pour une tolérance
de 200 ms, et le budget de script de l'accueil à 167 Ko pour 165 Ko tolérés. Le poste dominant est
le calcul des styles et de la mise en page (603 ms de fil principal sur une page locale), pas le
JavaScript.

Les trois pistes identifiées sont les bonnes, dans cet ordre : réduire les surfaces à
`backdrop-filter` (**41** sur une seule page locale, dont 39 posées sur un fond uni où le flou
n'apporte rien de visible), alléger les sélecteurs arbitraires de compaction, vérifier le coût du
grain des scènes au premier rendu. La consigne « ne pas relever les seuils pour faire passer le
contrôle » est la bonne et doit tenir.

---

## 8. Priorités

**Avant l'ouverture au public**

1. **`next` ≥ 16.3.6** (S-1). Une commande, une faille critique de moins.
2. **Trancher Q-LEGAL-4** : données de santé par e-mail, prestataire américain, pas d'HDS. Avis du
   conseil et du délégué à la protection des données (§3).
3. **Renseigner les mentions légales** : les neuf champs nuls, le médiateur de la consommation en
   premier (§4).
4. **Rendre la limitation de débit réelle** : compteur partagé, pare-feu au bord, ou Turnstile
   activé (S-2).
5. **Aligner la taille du CV** sur la limite de la plateforme, et le dire dans l'interface (S-5).
6. **Audit d'accessibilité par un tiers** et passe NVDA/VoiceOver (§6, R-5 et R-6).

**Chantiers techniques, sans urgence mais sans attendre**

7. `check-links` : 403/429/5xx en avertissement, 404/410 seuls bloquants (Q-2).
8. `"pretypecheck": "next typegen"` dans `package.json` (Q-1).
9. Étape `pnpm audit` dans la CI (S-8).
10. `/public/*.txt` dans `.gitignore` (S-7).
11. Corriger la phrase CSP de `docs/07 §6` et y renvoyer à D-013 (S-6) ; requalifier le contrôle
    d'origine (S-3) ; retirer de DC.2 la mention d'`overrides` inexistants (S-8).
12. Refus explicite des requêtes sans `content-length` sur `/api/candidature` (S-4).
13. Nettoyer les 25 téléphones non normalisés des fiches locales (Q-3).
14. Reprendre DP.2 : les 39 `backdrop-filter` inutiles d'abord (§7).

---

## 9. Suites données le 5 octobre 2026

Relevé de ce qui a été corrigé le jour même, de ce qui reste ouvert, et de ce qui n'appartient pas
au code. Chaîne complète après correctifs : `lint` ✔, `typecheck` ✔, **936 tests unitaires** verts
(dix de plus), `build` ✔, `validate` **13/13** ✔, `pnpm audit` de huit avis à **quatre**, et la
suite Playwright exécutée en entier.

### Corrigé

| Constat | Correctif |
| --- | --- |
| **S-1** `next@16.3.5`, RCE dans `next/og` | `next` et `eslint-config-next` en **16.3.8**. L'avis critique disparaît de `pnpm audit`. |
| **S-4** corps lus en mémoire avant d'être bornés | `readBodyLimited` / `readTextLimited` (`src/lib/http/request.ts`) : lecture du flux morceau par morceau, arrêt et annulation au plafond, comptage en **octets** et non en caractères. Les trois routes y passent, `api/candidature` comprise (le multipart est analysé depuis le corps déjà borné). Le plafond ne dépend plus de l'en-tête `content-length`, qu'une requête découpée peut omettre. D-051. |
| **S-5** CV de 5 Mo au-delà de la limite de 4,5 Mo de l'hébergeur | `CV_MAX_BYTES` à **4 Mo**, corps multipart à 4,375 Mo. Texte d'aide, message d'erreur, politique de confidentialité, `docs/05 §2` et le parcours Playwright alignés. D-051. |
| **S-6** la CSP réelle contredisait `docs/07 §6` | `docs/07 §6` réécrit : la CSP est décrite telle qu'elle est, `'unsafe-inline'` compris, avec la raison (D-013) et ce qui tient le risque résiduel. |
| **S-3** le contrôle d'origine était compté comme une protection | `docs/07 §6` le requalifie explicitement : hygiène, pas sécurité, et interdiction de s'en servir pour alléger la limitation de débit. |
| **S-7** clé IndexNow non ignorée par git | `/public/*.txt` dans `.gitignore`. Vérifié par `git check-ignore`. |
| **S-8** pas d'audit de dépendances en CI | Étape `pnpm audit --audit-level high` ajoutée au *workflow*, en `continue-on-error` — les trois avis qui restent n'ont aucune version corrigée publiée, une étape bloquante rendrait la CI définitivement rouge. Le commentaire du *workflow* dit à quelle condition elle redevient bloquante. |
| **S-8** `overrides` absents de `pnpm-workspace.yaml` | Le diagnostic de DC.2 était faux : l'emplacement était bon, c'est `pnpm install` qui court-circuite (« Already up to date ») sans écrire la section `overrides` dans le fichier de verrouillage. `pnpm install --no-frozen-lockfile` l'applique. `tmp` (`^0.2.7`) et `basic-ftp` (`^6.2.2`) sont donc corrigés : **huit avis → quatre**. D-050bis. |
| **S-9** injection d'en-tête SMTP (déjà neutralisée par nodemailer) | `sanitizeSubject` ajouté aux deux objets d'e-mail : la garantie ne dépend plus du comportement d'une dépendance. Test dédié. |
| **Q-1** `pnpm typecheck` échouait sur un clone neuf | `"pretypecheck": "next typegen"` dans `package.json`. La chaîne de `CLAUDE.md` passe désormais sur un dépôt fraîchement installé. |
| **Q-2** `check-links` rendait bloquant un 403 de filtrage | Seuls **404 et 410** restent des erreurs ; 401, 403, 429 et 5xx rejoignent les avertissements « à vérifier à la main ». `pnpm validate` passe de 12/13 à **13/13**, et les 138 sources filtrées restent visibles en avertissement. D-052. |
| **Q-3** 25 fiches locales au téléphone non normalisé | Deux causes séparées. Les numéros **courts** français (3975, 3994, 115, 116 117) sont reconnus par `normalizePhone` et `formatPhone` : ce sont de vrais numéros, les vingt avertissements « 3994 » disparaissent sans assouplir le contrôle. La **prose** reprise des données ouvertes (« 01 45 54 04 80 Tél selon le tableau CASVP… ») est réduite au premier numéro reconnu, et vidée si rien n'est exploitable — un champ téléphone contient un téléphone ou rien. Corrigé dans le pipeline **et** dans les cinq champs déjà publiés. D-053. |

### Encore ouvert, et pourquoi

- **S-2 limitation de débit (élevée)** : non corrigeable ici. Rendre le compteur réel suppose un
  magasin partagé (Vercel KV, Upstash, Edge Config), une limitation au bord, ou une clé Turnstile —
  trois leviers qui engagent l'hébergeur et le budget, donc Arcel. Le code dit maintenant
  franchement ce que le compteur vaut (`createRateLimiter`), `docs/07 §6` ne le présente plus comme
  une protection suffisante, et la tâche est ouverte en **DC.3**, avant l'ouverture au public.
- **§3 données de santé par e-mail (critique, juridique)** : Q-LEGAL-4, décision d'Arcel et de son
  conseil. Rien dans le code ne peut la trancher.
- **§4 mentions légales** : neuf champs à fournir (Q-ID-2, Q-LEGAL-1, Q-LEGAL-5). Le mécanisme de
  masquage fonctionne, il manque les faits.
- **§6 accessibilité** : R-5 (balisage des PDF) et R-6 (passe NVDA/VoiceOver), plus l'audit tiers
  des 106 critères. Demande un lecteur d'écran réel et un auditeur, pas un correctif.
- **§7 performance (DP.2)** : chantier à part entière — 39 surfaces `backdrop-filter` inutiles,
  sélecteurs de compaction, grain des scènes. Le mêler aux correctifs de sécurité aurait brouillé
  les deux ; `pnpm lhci` ne tourne pas ici pour mesurer l'effet.
- **Avertissements de maillage** : `/magazine/page/2/` et `/plan-du-site/` à un lien entrant
  contextuel pour trois conseillés. Laissés tels quels : ajouter des liens pour satisfaire un
  compteur, c'est exactement le remplissage que le projet s'interdit. Le minimum est « conseillé »,
  pas exigé, et le contrôle le signale sans échouer.
- **`a_relire`** : pages services et articles du Fil, en attente de relecture professionnelle
  (Q-CONTENU-7, Q-CONTENU-15). Construits et en `noindex`, conformément à D-037.

### Parcours Playwright : exécutés, et une régression attrapée

L'environnement d'audit ne fournit que `chromium-1194` là où Playwright 1.63 réclame
`chrome-headless-shell-1243` ; en pointant l'exécutable présent, toute la suite tourne. Elle a
immédiatement attrapé ce que les tests unitaires avaient laissé passer : le parcours de candidature
attendait encore « Ce fichier dépasse 5 Mo » après l'abaissement du plafond. Corrigé, puis
vérifié — la candidature complète, CV joint compris, passe par le nouveau chemin de lecture bornée
et arrive dans la boîte simulée.

À retenir pour la CI : les parcours sont la seule couche qui ait vu cette régression. Ils ne sont
pas un supplément.

---

## 10. Seconde passe : la suite Playwright, et ce qu'elle a révélé

L'environnement d'audit ne fournit que `chromium-1194` là où Playwright 1.63 réclame
`chrome-headless-shell-1243` ; en pointant l'exécutable présent, toute la suite tourne. Premier
verdict, sur un build fait comme celui de la CI (`SITE_INDEXABLE=false`) : **97 échecs sur 672**.
Aucun ne venait des correctifs du §9 — un seul y était lié, l'attente « dépasse 5 Mo » du parcours
de candidature, corrigée aussitôt.

### Le défaut qui masquait tous les autres

Deux groupes de parcours s'excluaient mutuellement : `config.spec.ts` exigeait le `noindex`
global, donc un build `SITE_INDEXABLE=false` — celui de la CI ; `services.spec.ts` et
`local.spec.ts` exigeaient l'absence de balise `robots`, donc l'inverse. Depuis **D-035**, qui a
ouvert l'indexation par défaut, la suite ne pouvait être verte **dans aucune des deux
configurations**. Un échec permanent n'alerte plus personne : c'est ainsi que le reste a pu
s'accumuler derrière, phase après phase. Corrigé par un module partagé
(`tests/e2e/indexable.ts`) qui exprime l'intention — « cette page n'est pas fermée pour
elle-même » — et la vérifie dans les deux réglages. D-055.

### Le constat le plus sérieux : 1120 communes annonçaient une agence inexistante

En remontant la piste d'un parcours qui attendait « Youdom Care Val-de-Marne » : le 27/09/2026, le
réseau est passé de **six agences à deux**. `content/site.config.json` et `data/agences.geo.json`
ont suivi ; `data/idf-communes.json` non. **1120 des 1285 communes** d'Île-de-France pointaient
encore vers `serris`, `versailles`, `vitry-sur-seine` ou `saint-denis`.

Ce champ n'est pas décoratif : il nomme au visiteur « votre agence la plus proche » sur l'accueil
et les pages locales, et il part dans la demande (`agenceProche`), où l'e-mail de l'équipe le
reprend — avec un repli qui imprime l'identifiant brut, donc « serris » en clair. Pendant huit
jours, le site a annoncé à 87 % des communes une agence qui n'existe pas. C'est exactement ce que
le garde-fou « aucun fait inventé » interdit, et rien ne le voyait : le schéma de la demande ne
valide que la **forme** du slug.

Corrigé en recalculant le champ avec la fonction du pipeline lui-même (`nearest`, distance à vol
d'oiseau) depuis les coordonnées déjà versionnées — 797 communes sur Paris 12, 488 sur Puteaux,
rien d'inventé, `pnpm data:communes` donne le même résultat. Et verrouillé : `auditCommuneAgencies`
fait désormais échouer `pnpm validate` en comptant les communes concernées. D-054.

### Les autres dérives corrigées

Toutes de la même famille — un parcours qui a figé une valeur que le site a depuis changée :

| Parcours | Valeur figée | Corrigé en |
| --- | --- | --- |
| `local.spec.ts`, `professionnels.spec.ts`, `home.spec.ts` | six agences, et « Youdom Care Val-de-Marne » nommée en dur | lisant `content/site.config.json` et `data/idf-communes.json` |
| `lexique.spec.ts`, `blocks.spec.ts` | liens sortants vers `service-public.gouv.fr` et `impots.gouv.fr`, retirés le 27/09 à la demande d'Arcel | vérifiant que la source est **nommée** et **n'est plus** un lien |
| `seo.spec.ts` | segment de plan de site du magazine attendu *absent*, alors que « Le Fil » a des articles depuis la phase 7 | vérifiant qu'il est présent |
| `recrutement.spec.ts` | « dépasse 5 Mo » | alignant sur les 4 Mo de D-051 |
| `services.spec.ts` | « En attente de relecture par un professionnel. » sur les 25 pages services, que **D-034 a retirée** — le parcours contredisait la décision *et* le test unitaire de `ServiceTemplate`, qui vérifie déjà son absence | vérifiant que la carte nomme l'auteur et la date, et **pas** l'attente |
| `services.spec.ts` | en-tête des deux colonnes de l'encart frontière exigé sur `/personnes-agees/`, alors que la règle du 27/09 ne l'affiche que si **chaque** ligne nomme son relais | exposant la règle sur le composant (`data-colonnes`) et en la lisant au lieu de la supposer |

**Règle qui en sort** : un parcours ne code plus en dur un fait qui vit dans `content/` ou
`data/`, il le lit. Les trois corrections de nombre d'agences venaient de la même cause et
auraient toutes été évitées.

Deux cibles tactiles sous les 44 px de WCAG 2.5.8 ont été corrigées au passage, sur le modèle de
ce que R-3 avait fait pour le pied de page : le lien d'une commune au nom court sur une page
d'agence (29 px de large → `min-w-11`) et les liens du résumé d'erreurs d'un formulaire (22 px de
haut → `min-h-11`) — ce dernier étant précisément l'endroit où une personne qui vient d'échouer à
remplir le formulaire doit viser juste du premier coup.

### Ce qui reste ouvert, et pourquoi je n'y touche pas

- **DP.3 — l'action du hero passe sous la ligne de flottaison** sur cinq gabarits, à 320×568 et à
  390×844 (551 px pour 508 disponibles sur l'accueil ; jusqu'à 988 px pour 784). Le hero était
  conçu pour montrer le titre **et** l'action sans défiler ; la refonte D-032 l'a épaissi. C'est le
  même poste de coût que DP.2, et le design reste à réviser par Arcel (`docs/02 §2`, §4, §5).
- **DP.4 — le tracé du hero** (`.hero-thread` n'atteint pas l'état « drawn », une animation remonte
  `sur path.[object SVGAnimatedString]`). À confirmer sur la CI avant d'y toucher : l'écart peut
  venir de la version de navigateur disponible ici.

Dans les deux cas, la consigne du projet s'applique telle quelle : **on ne relève pas un seuil
pour faire passer un contrôle**. Ces échecs restent rouges, nommés et chiffrés dans `docs/PLAN.md`,
plutôt que neutralisés.

### Ce que cette passe dit de la CI

Les parcours sont la seule couche qui ait vu tout cela : 938 tests unitaires et 13 contrôles de
contenu passaient pendant que le site annonçait de fausses agences à 87 % de son territoire. Un
`pnpm test:e2e` rouge en permanence, pour une raison de configuration que personne ne relisait,
a coûté plusieurs semaines de dérive silencieuse. La leçon n'est pas « ajouter des tests » : c'est
qu'un contrôle qui échoue toujours ne contrôle plus rien, et qu'il faut le réparer le jour où il
rougit.
