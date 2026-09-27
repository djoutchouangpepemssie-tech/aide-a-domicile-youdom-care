# Mesure d'audience — ce qui est collecté, ce qui ne l'est pas

Référence pour la page `/cookies/` et la politique de confidentialité (docs/07 §2), la décision
D-029 (`docs/DECISIONS.md`) et docs/05 §9. Ce fichier décrit exactement ce que fait le code de ce
dossier ; toute évolution du code doit être répercutée ici le même jour.

## En une phrase

Le site compte, sans aucun traceur, quatre gestes anonymes (une étape de formulaire affichée, une
demande envoyée, un rappel demandé, un clic sur un numéro de téléphone) pour repérer l'étape où les
visiteurs abandonnent un formulaire. **Aucun cookie, aucun identifiant, aucun script tiers, aucune
adresse IP conservée.** La mesure est exemptée de consentement au sens de la recommandation CNIL
« Cookies : solutions pour les outils de mesure d'audience » (page consultée le 2026-09-27, mise à
jour du 4 juillet 2025) : elle ne dépose rien, ne suit personne d'un site à l'autre et ne sert qu'à
produire des statistiques agrégées pour l'éditeur. Il n'y a donc pas de bandeau.

## Est-ce qu'un cookie ou un identifiant est déposé ?

**Non.** Le code de ce dossier n'écrit rien : ni cookie, ni `localStorage`, ni `sessionStorage`,
ni `IndexedDB`, ni empreinte du navigateur (aucune lecture de la taille d'écran, des polices, du
matériel). Chaque événement est envoyé seul, sans identifiant de visiteur ni de session : deux
événements du même visiteur ne peuvent pas être reliés entre eux.

(Le site utilise par ailleurs `localStorage` pour la préférence « mode confort » et
`sessionStorage` pour conserver les réponses d'un formulaire en cours sur l'appareil : ce sont des
réglages locaux, jamais envoyés, décrits par les composants concernés, pas par la mesure.)

## Ce qui est envoyé

Une requête `POST` de première partie vers `/api/mesure/` (même domaine que le site), par
`navigator.sendBeacon` (repli `fetch` avec `keepalive`), au format JSON, contenant exactement :

| Champ   | Valeurs possibles                                                                                                                    |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `event` | l'un des quatre noms ci-dessous, et rien d'autre                                                                                     |
| `props` | les propriétés autorisées pour cet événement, toutes tirées de listes fermées ou d'un entier borné                                   |
| `page`  | le chemin de la page courante (`/demande/personne-agee/`), **sans paramètres ni ancre**, tronqué à 200 caractères, minuscules seules |

Événements et propriétés (docs/05 §9) :

| Événement           | Propriétés                                                                                                                       | Quand                                                                           |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `demande_etape_vue` | `formulaire` (identifiant de docs/05 §2 : `rappel`, `neuro`, `personne-agee`…), `etape` (entier de 1 à 6)                        | à l'affichage de chaque étape d'un formulaire (le rappel, à une étape, compris) |
| `demande_envoyee`   | `formulaire`, `departement` (code à deux chiffres parmi les huit départements d'Île-de-France de `site.config.zones`, ou absent) | quand la route `api/lead` a accepté une demande                                 |
| `rappel_envoye`     | aucune                                                                                                                           | quand la route `api/lead` a accepté une demande de rappel                       |
| `appel_clic`        | `emplacement` ∈ `en-tete`, `barre-mobile`, `rail`, `reponse-locale`, `pied-de-page`, `agence`, `formulaire`                      | au clic sur un lien `tel:` portant l'attribut `data-mesure`                     |

Le serveur (`src/app/api/mesure/route.ts`) refuse tout ce qui sort de ces listes (schéma zod
strict : nom inconnu, propriété en trop, valeur hors liste, texte libre, corps de plus de 2 Ko) et
ne répond jamais autre chose qu'un statut sans corps.

## Ce qui n'est jamais collecté

- aucune donnée saisie dans les formulaires (nom, téléphone, e-mail, message, situation, planning) ;
- aucune donnée de santé, ni directement ni par déduction : le département est envoyé, **jamais la
  commune** (docs/05 §8) ; le nom du formulaire dit seulement quel parcours a été suivi ;
- aucun paramètre d'URL, aucune ancre, aucun référent, aucune page tierce ;
- aucune adresse IP : le serveur utilise l'adresse de la requête uniquement pour limiter le débit
  (au plus 120 événements par adresse et par dix minutes), sous forme d'empreinte HMAC salée par
  un secret aléatoire propre au processus, effacée dès la fin de la fenêtre de dix minutes ; elle
  n'est ni journalisée ni transmise au collecteur ;
- aucun agent utilisateur, aucune langue, aucune résolution d'écran, aucun horodatage précis
  (le relais ajoute l'heure arrondie à la minute) ;
- aucun identifiant de visiteur, de session ou d'appareil.

Le serveur n'écrit **aucun journal** du contenu des événements, ni en succès ni en échec.

## Signaux de refus respectés

Si le navigateur annonce `Do Not Track` (`navigator.doNotTrack === "1"`) ou `Global Privacy
Control` (`navigator.globalPrivacyControl === true`), le client n'envoie **rien**, même si la
mesure est active. La mesure n'a pas de bouton de refus propre : elle ne collecte aucune donnée
personnelle et ces deux signaux suffisent à la couper.

## Activation

- `NEXT_PUBLIC_MESURE_ACTIVE=true` (lue au build) : le client envoie les événements. Absente ou
  autre valeur : le client ne fait rien, aucune requête ne part.
- `MESURE_WEBHOOK_URL` : adresse du collecteur (Matomo auto-hébergé, Plausible en mode événements,
  ou un simple point d'entrée maison). La route relaie chaque événement validé, signé par
  `MESURE_WEBHOOK_SECRET` (`X-Signature: sha256=<HMAC-SHA256 du corps>`, même mécanisme que le
  webhook des demandes), avec un délai de cinq secondes au-delà duquel l'événement est abandonné
  sans trace. Sans adresse, la route valide et répond 204 : **rien n'est stocké**, le site
  lui-même ne conserve aucune statistique.
- `MESURE_RATE_LIMIT` (facultatif) : événements acceptés par adresse et par dix minutes (120 par
  défaut).

Le choix du collecteur et de la personne qui lit les tableaux de bord est la question Q-TECH-8
(`docs/QUESTIONS_ARCEL.md`). Tant qu'elle n'est pas tranchée, les variables restent vides et la
mesure est inactive.

## Précisions de comptage

- Une étape n'est comptée qu'une fois par affichage. Quand un visiteur revient sur un formulaire
  dont la saisie a été conservée sur son appareil, c'est l'étape reprise qui est comptée, pas
  l'étape 1 affichée le temps du chargement.
- Les événements sont mis en file et envoyés au tour de boucle suivant ou dès que la page est
  masquée ; un événement peut se perdre si le navigateur se ferme avant : la mesure est
  indicative, jamais comptable.

## Ce que la page cookies peut écrire

> Ce site n'utilise aucun cookie ni traceur de mesure d'audience. Il compte, de façon anonyme et
> sans identifiant, quelques gestes (étape de formulaire affichée, demande envoyée, clic sur un
> numéro de téléphone) pour améliorer ses formulaires. Aucune donnée personnelle, aucune adresse
> IP et aucune donnée de santé ne sont collectées à cette fin. Si votre navigateur envoie le signal
> « Do Not Track » ou « Global Privacy Control », rien n'est compté. Deux réglages restent sur
> votre appareil sans jamais être envoyés : le mode confort et les réponses d'un formulaire en
> cours.
