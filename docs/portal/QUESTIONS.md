# Mon Youdom — Questions bloquantes (Phase 0)

> Une seule liste, comme demandé. Les questions **1 à 5** bloquent le démarrage de la Phase 1 ; les
> autres peuvent se répondre pendant qu'elle avance, mais chaque jour de retard sur les questions
> 6 à 9 décale la phase correspondante.
>
> Deux questions du prompt d'origine n'ont plus lieu d'être : il n'y a pas de CRM à lire, et le
> périmètre est tranché (tout est à créer).

---

## Soldées le 15/10 (voir `DECISIONS.md`)

| # | Question | Réponse d'Arcel | Ce que j'en fais |
| --- | --- | --- | --- |
| 1 | Hébergement des données de santé | **Vercel** | Vercel sert l'interface ; les données vivent chez un hébergeur certifié HDS, et aucune donnée de santé ne traverse Vercel (`ARCHITECTURE.md` §4.2). **Reste à choisir l'hébergeur de l'API** — un devis, pas une difficulté technique |
| 2 | Mode de pointage | **NFC et QR code** | Aucune géolocalisation : le sujet « surveillance des salariés » disparaît. J'ajoute le pointage manuel avec motif, pour le badge décollé ou illisible |
| 3 | Volumétrie | **Pas de nombre défini** | Je conçois sans hypothèse : index dès le départ, pagination partout, aucune liste chargée entière |
| 4 | Outils actuels | **Word et Ximi** | **Change le calcul du périmètre.** Ximi porte déjà planning, facturation, paie et télétransmission. Voir `ARCHITECTURE.md` §3 et la question A ci-dessous |
| 5 | Astreinte | **La responsable** | Le produit n'annoncera pas « astreinte 24 h/24 » comme un centre d'appels : heures d'ouverture affichées, numéro d'astreinte pour l'urgent, et un seuil de gravité pour ce qui réveille la nuit |

---

## Ce qui bloque maintenant

La question « Ximi expose-t-il une API ? » est **close** : Arcel construit son propre CRM (MY-07).
Restent quatre choses, dont une seule est bloquante.

**A. Un hébergeur certifié HDS pour l'API** — *bloquant pour la mise en service, pas pour commencer
à écrire*. Scalingo, Clever Cloud, OVHcloud, Outscale : deux devis suffisent. Vercel garde
l'interface. MongoDB Atlas, déjà certifié, peut porter la base.

**B. Vos règles de planification** : amplitude maximale d'une journée, temps de trajet entre deux
visites, repos entre deux services, majorations de nuit, de dimanche et de jours fériés. Ce sont
elles qui font qu'un planning est juste ou faux — et elles ne s'inventent pas.

**C. Vos grilles tarifaires** et vos conditions générales (délai de prévenance, règles
d'annulation). Nécessaires à la vague 4, utiles dès la vague 1 pour modéliser correctement.

**D. Un accès en lecture à Ximi, ou quelques exports.** Voir vos données réelles — un planning
d'une semaine, une facture, un dossier salarié — vaut mieux que les imaginer. À demander à Xelya
en même temps que **l'export complet de vos données**, qui vous sera nécessaire au basculement.

---

## Importantes — pendant la Phase 1

**6. Délai de prévenance et règles d'annulation** exacts, tirés de vos conditions générales. Le
portail doit les afficher **avant** qu'une famille valide une demande, pas après.

**7. Délai de réponse aux messages** que vous vous engagez à afficher (« Réponse sous 4 h ouvrées »,
par exemple). N'annoncez que ce que vous tenez : c'est affiché à chaque message.

**8. Photos et formations des intervenants.** Acceptent-ils que leur photo et leurs formations
soient visibles des familles ? Un refus doit rester possible sans conséquence. Affiche-t-on
« prénom + initiale » (ma proposition) ou le nom complet ?

**9. Exigences des départements d'Île-de-France** sur la télétransmission APA. À demander par écrit
à chacun : les formats varient, et ils conditionnent votre paiement.

---

**9 bis. Vos heures d'ouverture exactes.** L'API s'en sert pour une seule chose : savoir si un
accès au dossier a lieu pendant ou en dehors des heures ouvrées, parce qu'un accès hors heures
exige un motif saisi (MY-05). J'ai posé par défaut 8 h 30 – 18 h 30 du lundi au vendredi et
9 h – 12 h 30 le samedi, d'après ce que le site annonce. À confirmer ou à corriger.

---

## Décisions de produit

**10. Le nom.** « Mon Youdom » est une proposition. Autres pistes : « Chez vous », « Le Fil de
{prénom} », « Mon espace Youdom ». À trancher avant la première maquette, parce qu'il sera partout.

**11. Messagerie directe famille ↔ intervenant** : jamais, ou activable foyer par foyer ? Ma
recommandation : **désactivée par défaut**, activable par l'agence. L'intervenant ne donne pas son
numéro personnel, et la coordination garde la trace.

**12. Le proche référent peut-il gérer les droits des autres proches ?** C'est le cas d'usage le
plus courant (la fille qui organise tout) et le plus sensible (le bénéficiaire perd la main). Je l'ai
mis désactivé par défaut dans `PERMISSIONS.md` : à confirmer.

**13. Durée de conservation après un décès ou une fin de contrat.** J'ai proposé 13 mois de lecture
sur les factures et documents, puis archivage. À arrêter avec votre comptable.

**14. DPO.** Qui est le délégué à la protection des données, interne ou externe ? Son contact doit
figurer dans le portail, et il doit relire l'AIPD.

**15. Prestataires.** Signature électronique, prélèvement SEPA, envoi de SMS : avez-vous déjà des
contrats, ou faut-il les choisir ? Et **l'habilitation URSSAF à l'API Tiers de prestation est-elle
demandée ?** Si non, c'est à lancer cette semaine : le délai est administratif, pas technique.
