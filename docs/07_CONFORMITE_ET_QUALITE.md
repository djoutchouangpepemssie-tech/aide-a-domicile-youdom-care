# 07 — Conformité, accessibilité, performance et contrôles

> Ce cahier résume des obligations pour guider la construction. Il ne remplace pas un avis juridique : les points marqués **(à valider)** sont repris dans `docs/QUESTIONS_ARCEL.md`.

## 1. Information du consommateur — services à la personne (à valider)

Référence : arrêté du 17 mars 2015 relatif à l'information préalable du consommateur sur les prestations de services à la personne.

| Obligation | Traduction dans le site |
| --- | --- |
| Afficher, sur le lieu d'accueil **et sur le site**, la liste des prestations et l'activité dont chacune relève | Page `/tarifs-et-aides/` : tableau des prestations, généré depuis `content/tarifs.json` |
| Indiquer pour chaque prestation le **mode d'intervention** (prestataire, mandataire, mise à disposition) | Colonne « mode » obligatoire dans le tableau et dans chaque `PriceCard` |
| Mode mandataire : mention visible sur les prix et devis : « Attention, dans le cadre d'un contrat de placement de travailleurs, le consommateur est l'employeur » (formulation exacte à vérifier sur Légifrance) | Composant `MandataireNotice`, affiché partout où un prix ou une offre en mode mandataire apparaît |
| Prix **TTC et HT**, à l'heure ou au forfait, **frais annexes détaillés** (dossier, déplacement…) | Schéma `tarifs.json` : `prix_ttc`, `prix_ht`, `unite`, `frais[]` ; aucun prix affiché sans ces champs |
| Avantage fiscal ou social : mention **distincte et moins visible** que le prix | `PriceCard` : prix TTC en grand, montant après crédit d'impôt en dessous, plus petit |
| Devis gratuit pour toute prestation d'au moins 100 € TTC par mois, ou sur demande | Mention sur la page tarifs et dans les formulaires : « Devis personnalisé gratuit » |

Tant que `content/tarifs.json` est vide, les blocs de prix sont masqués et le contrôle de production échoue (section 7).

## 2. Mentions légales et pages obligatoires

- **Mentions légales** : raison sociale, forme, capital, siège, RCS, SIRET, numéro de TVA, directeur de la publication, hébergeur (nom, adresse, téléphone), numéro de déclaration ou d'agrément des services à la personne, autorisations départementales le cas échéant, médiateur de la consommation (nom et coordonnées), crédits et licences des données ouvertes.
- **Politique de confidentialité** : responsable du traitement, finalités, bases légales (dont consentement explicite pour les données de santé), destinataires, durées, droits, contact, réclamation auprès de la CNIL.
- **Cookies** : liste réelle des traceurs. Avec une mesure d'audience exemptée de consentement et aucun outil publicitaire, pas de bandeau ; sinon, bandeau conforme (refuser aussi simple qu'accepter, pas de dépôt avant accord).
- **Conditions générales** : documents fournis par Arcel (prestataire et mandataire), en PDF accessibles.
- **Accessibilité** : déclaration, état de conformité, moyens de contact, voie de recours.
- **Plan du site**.

Contrôle `check-legal.ts` : ces pages existent, et aucun champ légal obligatoire n'est `null` en mode production.

## 3. Règles de contenu sensible

- **Santé** : règles de `docs/03`. Liste de mots et tournures interdits contrôlée par `check-copy.ts` : « guérir », « guérison », « ralentir la maladie », « traitement » (hors citation de source), « garanti », « n°1 », « leader », « le meilleur », « patient(s) » hors citations, « placement ».
- **Preuves** : aucun témoignage, avis, chiffre ou label qui ne vienne de `content/`. Aucun logo de label sans entrée correspondante dans `site.config.json > labels`.
- **Enfants** : aucune photo d'enfant identifiable sans autorisation écrite des parents, consignée par Arcel.
- **Comparaisons** : jamais de concurrent nommé sur le site.
- **Loyauté** : pas de compte à rebours, pas de fausse rareté, pas de case précochée, pas de relance culpabilisante.

## 4. Accessibilité (objectif : RGAA 4.1, niveau AA)

| Exigence | Contrôle |
| --- | --- |
| Contrastes : AA partout, AAA pour le texte courant | `check-contrast.ts` sur les jetons + axe |
| Navigation complète au clavier, focus visible, ordre logique, lien d'évitement | Tests Playwright |
| Noms accessibles sur tous les contrôles, erreurs liées aux champs, `aria-live` sur les résultats | axe + tests |
| Structure : un H1, repères `header`, `nav`, `main`, `footer`, listes et tableaux réels | `check-seo.ts` + axe |
| Zoom 200 %, redistribution à 320 px, espacement de texte modifiable | Test visuel Playwright à 320 px |
| Mouvement : `prefers-reduced-motion`, aucun contenu clignotant, aucune lecture automatique | Revue |
| Cibles tactiles ≥ 48 px | Test |
| Documents PDF balisés | Revue |
| Langue déclarée, abréviations expliquées (lexique) | Revue |
| Mode confort de lecture | Test |

Seuil bloquant : 0 violation axe « critique » ou « sérieuse » sur les pages témoins (accueil, un pilier, une page pathologie, un formulaire à chaque étape, une page locale, un article, la page tarifs).

## 5. Performance (budgets bloquants, mobile, réseau 4G simulé)

| Indicateur | Budget |
| --- | --- |
| LCP | < 2,0 s |
| CLS | < 0,05 |
| INP | < 200 ms |
| Temps de blocage total | < 150 ms |
| JavaScript initial, page de contenu | < 160 Ko compressés (D-019 : socle Next + React mesuré à 132 Ko) |
| JavaScript initial, page avec formulaire | < 220 Ko compressés (D-019) |
| Poids total d'une page de contenu | < 900 Ko |
| Polices | 2 fichiers variables, < 180 Ko au total |
| Scores Lighthouse | Performance ≥ 95 · Accessibilité 100 · Bonnes pratiques 100 · SEO 100 |

`pnpm lhci` s'exécute sur les pages témoins à chaque fin de phase.

## 6. Sécurité

**En-têtes** (`next.config.ts`) : `Content-Security-Policy`, `Strict-Transport-Security` (deux ans, sous-domaines, `preload`), `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY` doublé par `frame-ancestors 'none'`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` minimale, `Cross-Origin-Opener-Policy: same-origin`, et `poweredByHeader: false`.

La CSP ferme tout sauf l'origine du site — aucun script, aucune feuille, aucune police, aucune image, aucune connexion de tiers — mais **autorise les scripts et les styles en ligne** (`script-src 'self' 'unsafe-inline'`). Ce n'est pas un oubli : le site est rendu statiquement, un *nonce* imposerait un rendu dynamique sur toutes les pages, et les scripts en ligne que Next produit varient d'une page à l'autre, ce qui exclut aussi une politique par empreintes (D-013). Le risque résiduel est tenu par ailleurs : aucun script tiers n'est chargé, aucun HTML fourni par un visiteur n'est rendu, et les trois seuls `dangerouslySetInnerHTML` du dépôt reçoivent soit une constante (`ComfortScript`, `MotionScript`), soit du JSON-LD passé par `serializeJsonLd`, qui échappe `<`, `>` et `&`.

**Routes de première partie** (`api/lead`, `api/candidature`, `api/mesure`) : méthode POST seulement (les autres reçoivent 405 de Next), validation Zod stricte en objets fermés, corps **borné à la lecture** (`readBodyLimited` : la lecture s'arrête au plafond, sans dépendre de l'en-tête `content-length`, qu'une requête découpée en morceaux peut omettre), limitation de débit par adresse, aucune journalisation du contenu. Le CV d'une candidature est contrôlé par extension, type MIME **et** signature, et sa taille reste sous la limite de corps de requête de l'hébergeur (4 Mo pour le fichier, 4,5 Mo chez Vercel).

Le **contrôle d'origine** de ces routes (`originAllowed`) relève de l'hygiène, pas de la sécurité : un navigateur ne peut pas falsifier `Origin`, donc il écarte un CSRF naïf — qui n'a de toute façon aucune cible ici, faute de session, de cookie et d'action authentifiée —, mais un client non-navigateur choisit librement ses en-têtes et le franchit sans effort. Il ne doit donc jamais servir d'argument pour alléger la limitation de débit ou l'anti-robots.

**Limitation de débit** : cinq envois par adresse et par dix minutes. Le compteur actuel vit en mémoire du processus : sur des fonctions serveur sans état, il ne tient que par instance, et la clé provient d'un en-tête transmis par l'hébergeur. Il décourage un envoi répété à la main, pas un robot. Un compteur partagé ou une limitation au bord, et l'activation de Cloudflare Turnstile (`TURNSTILE_SECRET_KEY`), sont exigés avant l'ouverture des formulaires au public (`docs/PLAN.md`, DC.3).

**Dépendances** auditées (`pnpm audit`) à chaque fin de phase et à chaque exécution de la CI. **Secrets** uniquement en variables d'environnement, jamais dans le dépôt.

## 7. Les contrôles (`pnpm validate`)

| Script | Échoue si… |
| --- | --- |
| `check-content.ts` | Un fichier de contenu ne respecte pas son schéma Zod |
| `check-placeholders.ts` | Le rendu contient `TODO`, `Lorem`, `{{`, `[E` non résolu, `null`, `undefined`, ou un champ à compléter |
| `check-copy.ts` | Un mot interdit apparaît ; une phrase dépasse 30 mots dans un chapô ; un bouton porte un libellé banni (« Envoyer », « En savoir plus », « Cliquez ici ») |
| `check-seo.ts` | Titre ou description hors longueur ou en double ; H1 absent ou multiple ; page orpheline ; image sans `alt` ; canonique manquant |
| `check-links.ts` | Un lien interne est cassé ; un lien externe cité comme source ne répond pas |
| `check-schema.ts` | Un JSON-LD est invalide, contient un type interdit ou une valeur vide |
| `check-local-facts.ts` | Une page locale est sous les seuils de faits sourcés |
| `check-local-uniqueness.ts` | Deux pages locales dépassent le seuil de similarité |
| `check-local-nap.ts` | Une adresse ou un téléphone diffère de `site.config.json` |
| `check-legal.ts` | Une page légale manque ; la mention mandataire manque près d'un prix mandataire |
| `check-contrast.ts` | Un couple de jetons utilisé ensemble passe sous son seuil |
| `check-freshness.ts` | (Avertissement) un article ou une page d'aide a dépassé sa date de révision |

**Mécanisme des statuts** : en environnement de production (`VERCEL_ENV=production`), tout contenu dont le `statut` n'est pas `publie` est exclu du build, des plans de site et du maillage. En prévisualisation, il est construit avec `noindex` et un bandeau « En attente de relecture ».

**Mode production** (`pnpm validate --prod`), exigé avant toute mise en ligne : en plus, échec si un engagement affiché a `valide: false`, si une page pathologie ou un article de santé n'a pas de `relu_par`, si `tarifs.json` est vide, si un champ légal obligatoire est `null`, si `a_confirmer` n'est pas vide dans `site.config.json`.

## 8. Liste de mise en production (actions d'Arcel)

1. Répondre aux questions de `docs/QUESTIONS_ARCEL.md`, remplir `content/site.config.json`, `tarifs.json`, `engagements.json`, `auteurs/`.
2. Faire relire les pages pathologie et les articles de santé par un professionnel ; renseigner `relu_par`.
3. Faire valider les mentions légales, la politique de confidentialité et les conditions générales par un juriste.
4. Fournir les photos réelles et les autorisations.
5. Configurer l'envoi d'e-mails (SMTP, SPF, DKIM, DMARC) et tester chaque formulaire de bout en bout.
6. Lancer `pnpm validate --prod`, puis `pnpm lhci`.
7. Relier le domaine à Vercel (enregistrements DNS chez LWS, en conservant les enregistrements MX de la messagerie), activer HTTPS, vérifier la redirection vers `www`.
8. Déclarer le site dans Search Console et Bing, envoyer l'index des plans de site.
9. Créer ou mettre à jour les fiches Google Business Profile des six agences.
