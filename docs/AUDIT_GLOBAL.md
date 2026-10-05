# Audit global du site Youdom Care — 5 octobre 2026

Audit complet du dépôt : sécurité, vie privée et RGPD, conformité légale, qualité technique,
accessibilité, performance. Réalisé sur la branche `claude/wonderful-ramanujan-miqdb0`
(état du commit `5ff8714`), dépendances installées depuis `pnpm-lock.yaml`.

**Ce qui a réellement été exécuté** : `pnpm install --frozen-lockfile`, `pnpm lint`,
`pnpm exec next typegen`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm validate`,
`pnpm audit`, plus une lecture ligne à ligne des trois routes d'API, des trois modules de
traitement serveur, des schémas Zod, du rendu des e-mails, du transport SMTP, de la
configuration Next, de la CI et des scripts d'outillage.

**Ce qui n'a pas pu être exécuté** : `pnpm test:e2e` et `pnpm lhci` (le réseau sortant est
coupé dans l'environnement d'audit : `curl` vers `service-public.gouv.fr` renvoie `000`).
Les constats de performance reprennent donc les mesures déjà consignées dans `docs/PLAN.md`
(DP.2) et ne sont pas des mesures neuves.

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
