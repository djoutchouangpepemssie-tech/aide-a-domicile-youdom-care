# Recevoir les demandes de devis — configuration Resend

Marche à suivre pour qu'une demande remplie sur le site arrive dans la boîte de l'équipe.
Décision associée : D-050 (04/10/2026). Réglages de référence : `.env.example`.

Tout le circuit est déjà écrit et testé : validation, anti-robots, e-mail à l'équipe, accusé de
réception au demandeur, journal. **Il ne manque que la clé d'envoi.** Resend parle SMTP, donc
aucune ligne de code ne change : le transport de `src/lib/mail/transport.ts` s'y connecte tel quel.

---

## 1. Créer le compte et vérifier le domaine

1. Créer un compte sur `resend.com`.
2. Dans **Domains**, ajouter `youdom-care.com`.
3. Resend affiche des enregistrements DNS à recopier chez le registraire du domaine : un **SPF**
   (`TXT`), un **DKIM** (`TXT`), et un `MX` ou un `CNAME` selon la configuration proposée. Les
   valeurs sont propres à votre compte : elles doivent être recopiées **à l'identique**.
4. Attendre que Resend affiche le domaine comme vérifié. La propagation DNS prend de quelques
   minutes à quelques heures.
5. Une fois le domaine vérifié, ajouter un **DMARC** (`TXT`) : Resend le propose, il n'est pas
   exigé pour envoyer mais il protège le domaine contre l'usurpation.

> **Le DNS est votre main, pas la mienne.** Je ne touche jamais au domaine ni aux enregistrements :
> c'est la règle de périmètre du projet.

**Sans domaine vérifié, rien ne part vers vos visiteurs.** L'adresse de démonstration de Resend ne
sert qu'à s'envoyer un message à soi-même ; elle ne convient pas à un formulaire public.

**Sous-domaine ou domaine racine ?** Resend recommande un sous-domaine d'envoi, par exemple
`envois.youdom-care.com`, pour que la réputation des e-mails du site reste séparée de celle de la
messagerie de l'entreprise. Si vous suivez ce conseil, l'adresse d'expédition devient
`no-reply@envois.youdom-care.com`, et c'est ce sous-domaine qu'il faut vérifier dans Resend.

## 2. Créer la clé d'API

Dans **API Keys**, créer une clé avec la permission d'envoi. Elle commence par `re_`.

**Copiez-la tout de suite : Resend ne la réaffiche jamais.** Elle ne doit figurer ni dans le dépôt,
ni dans un message, ni dans un fichier du projet. Elle ne vit que dans Vercel.

## 3. Renseigner les variables dans Vercel

Projet `youdom-care` → **Settings** → **Environment Variables**, environnement **Production**
(et **Preview** si vous voulez tester une branche avant de publier) :

| Variable | Valeur |
| --- | --- |
| `SMTP_HOST` | `smtp.resend.com` |
| `SMTP_PORT` | `465` |
| `SMTP_USER` | `resend` |
| `SMTP_PASS` | votre clé d'API (`re_…`) |
| `LEADS_TO` | `contact@youdom-care.com` |
| `LEADS_FROM` | `Youdom Care — site <no-reply@youdom-care.com>` |

Trois points qui font échouer l'envoi s'ils sont négligés :

- **`SMTP_USER` vaut littéralement `resend`**, pas une adresse e-mail. C'est la clé d'API qui
  identifie le compte, et elle va dans `SMTP_PASS`.
- **`LEADS_FROM` doit être une adresse du domaine vérifié à l'étape 1.** Une adresse d'un autre
  domaine est refusée par Resend.
- **Le port 465 ouvre une connexion chiffrée d'emblée.** C'est ce que le transport attend. Si vous
  préférez le port `587`, le chiffrement est négocié au début de l'échange : le code gère les deux,
  mais ne mettez aucune autre valeur.

`LEADS_TO` accepte plusieurs adresses séparées par des virgules, si plusieurs personnes doivent
recevoir les demandes.

## 4. Redéployer

Vercel ne lit ces variables qu'au déploiement suivant : un clic sur **Redeploy** sur le dernier
déploiement suffit. Sans cela, le site continue de répondre « envoi indisponible ».

**C'est l'étape la plus facile à oublier, et elle se voit mal** : les variables s'affichent bien
dans les réglages, donc tout semble en place, mais la fonction qui tourne ne les a jamais reçues.
Relevé le 09/10/2026 : les six variables étaient posées depuis deux jours et le dernier
déploiement de production datait du 04/10 — les formulaires répondaient « envoi indisponible »
pour cette seule raison. Le réflexe : après toute modification de variable, **Deployments** →
dernier déploiement **de production** → **Redeploy**.

Attention aussi à l'environnement : un déploiement de prévisualisation (une branche) ne lit que
les variables cochées **Preview**. Des variables posées en **Production** seulement ne servent
qu'à l'adresse de production.

## 4 bis. Sur quelle adresse tester

Le projet Vercel `youdom-care` n'a **aucun domaine personnalisé** rattaché (vérifié le
09/10/2026) : `www.youdom-care.com` sert encore le site précédent et ne permet donc rien de
tester. L'adresse de production est :

```
https://youdom-care-six.vercel.app
```

## 5. Vérifier

Remplir une vraie demande sur le site, en renseignant l'adresse e-mail facultative.

Vous devez recevoir **deux** messages :

1. dans la boîte de `LEADS_TO`, la demande complète. Répondre à ce message écrit directement au
   demandeur quand il a laissé son adresse ;
2. à l'adresse saisie dans le formulaire, un accusé de réception qui **ne contient aucun détail de
   la demande** — c'est voulu : rien sur la santé ne doit transiter vers une boîte dont nous ne
   maîtrisons pas la sécurité.

En cas d'échec, l'onglet **Logs** de Resend dit si le message a été accepté, et les journaux de la
fonction dans Vercel portent une ligne par demande : identifiant, formulaire, résultat — jamais le
contenu.

## 6. Diagnostiquer un échec

Le visiteur ne voit qu'un message : « L'envoi n'a pas abouti. Vos réponses sont conservées sur cet
écran. » Il couvre toutes les causes ci-dessous. Pour trancher, il faut la ligne du journal :
**Vercel → projet `youdom-care` → Deployments → le déploiement servi → Logs**, puis refaire un
envoi pendant que les journaux défilent. Sur l'offre Hobby, les journaux d'exécution ne sont
gardés qu'**une heure** : un test de la veille n'y est plus.

| Ligne du journal | Code | Cause | Correctif |
| --- | --- | --- | --- |
| `non envoyé (messagerie non configurée)` | 503 | Le transport n'a pas pu être construit : `SMTP_HOST`, `LEADS_FROM` ou `LEADS_TO` manque **dans la fonction qui tourne** — le plus souvent parce que le redéploiement du §4 n'a pas eu lieu. | Vérifier les six variables, puis **redéployer**. |
| `échec d'envoi` | 503 | Le transport existe mais Resend a refusé. Trois causes : `SMTP_USER` absent (sans lui, aucune identification n'est transmise et la clé de `SMTP_PASS` ne sert à rien), clé d'API invalide ou révoquée, ou `LEADS_FROM` sur un domaine non vérifié. | Dans cet ordre : `SMTP_USER=resend`, domaine *Verified* chez Resend, clé regénérée. |
| `refusé (limite d'envois)` | 429 | Cinq envois depuis la même adresse en dix minutes. | Attendre dix minutes, ou relever `LEAD_RATE_LIMIT` le temps des tests. |
| `refusé (trop rapide)` | 400 | Formulaire envoyé en moins du délai minimum. | Prendre le temps de remplir ; c'est le garde-fou anti-robot. |
| `refusé (vérification anti-robots)` | 403 | `TURNSTILE_SECRET_KEY` est renseignée alors qu'aucun formulaire ne produit de jeton. | **Vider la variable** (voir les garde-fous ci-dessous). |
| `refusé : corps invalide` | 400 | Le corps reçu ne respecte pas le schéma. | Anomalie de code : à signaler. |
| *aucune ligne* | 403 | L'origine a été refusée avant tout traitement, ou la requête n'atteint pas la fonction. | Vérifier qu'on teste bien l'adresse du §4 bis. |

Si **rien n'apparaît dans les journaux de Resend**, l'échec est en amont de l'envoi : il s'agit de
l'une des deux premières lignes, pas d'un problème de délivrabilité.

---

## Les candidatures passent par la même configuration

`/recrutement/postuler/` utilise les mêmes six variables : rien de plus à régler. La candidature
part à `LEADS_TO` avec le CV en pièce jointe (PDF ou DOCX, **4 Mo au plus** — la limite tient à la
taille de corps de requête qu'accepte une fonction Vercel, 4,5 Mo), et le candidat reçoit un accusé
de réception sans détail. Resend compte la pièce jointe dans la taille du message : au-delà de
40 Mo il refuse, ce qui ne peut pas arriver avec un plafond à 4 Mo.

## Ce qui part, et où

| Message | Destinataire | Contenu |
| --- | --- | --- |
| Demande | `LEADS_TO` | Tout : coordonnées, situation, besoins, planning, message. C'est le seul endroit où une donnée de santé circule. |
| Accusé de réception | le demandeur, s'il a donné son e-mail | Confirmation seule, aucun détail. |
| Webhook | `LEAD_WEBHOOK_URL`, si un jour un CRM est branché | Même demande, en JSON signé. Vide aujourd'hui. |

## Garde-fous déjà en place

- **Champ piège** : un champ invisible qu'un robot remplit et pas un humain. La demande est alors
  acceptée en apparence et jetée, pour ne rien apprendre au robot.
- **Délai minimum de remplissage** : un formulaire envoyé trop vite est refusé.
- **Limite d'envois** : cinq demandes par adresse et par dix minutes (`LEAD_RATE_LIMIT`). À
  connaître avant de s'y fier : le compteur vit en mémoire du processus, donc sur des fonctions
  serveur sans état chaque instance a le sien, et la clé est une adresse transmise par en-tête. Il
  décourage un envoi répété à la main, **il n'arrête pas un robot** (`docs/PLAN.md`, DC.3).
- **Anti-robots renforcé : à ne pas activer en l'état.** `TURNSTILE_SECRET_KEY` déclenche la
  vérification Cloudflare Turnstile côté serveur, mais **aucun formulaire ne produit le jeton
  attendu** : il n'existe pas une ligne de Turnstile côté navigateur. Renseigner cette variable
  refuserait donc **toutes** les demandes, avec un 403 « vérification anti-robots ». Les deux
  variables restent vides jusqu'à ce que le widget soit posé dans les formulaires
  (`docs/PLAN.md`, DC.3).

## Volumes

L'offre gratuite de Resend couvre 100 envois par jour et 3 000 par mois, pour trois domaines.
Chaque demande consomme un envoi, deux quand le demandeur a laissé son e-mail. Au rythme d'une
dizaine de demandes par jour, l'offre gratuite suffit largement. Au-delà, l'offre payante commence
à 20 $ par mois.

## Rappel

Le site n'est pas encore servi par `www.youdom-care.com` : ce domaine renvoie toujours l'ancienne
version. Tant que le domaine n'est pas basculé sur ce déploiement, les formulaires que remplissent
vos visiteurs sont ceux de l'ancien site, et cette configuration ne change rien pour eux.
