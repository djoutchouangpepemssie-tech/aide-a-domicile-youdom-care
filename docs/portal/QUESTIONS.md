# Mon Youdom — Questions bloquantes (Phase 0)

> Une seule liste, comme demandé. Les questions **1 à 5** bloquent le démarrage de la Phase 1 ; les
> autres peuvent se répondre pendant qu'elle avance, mais chaque jour de retard sur les questions
> 6 à 9 décale la phase correspondante.
>
> Deux questions du prompt d'origine n'ont plus lieu d'être : il n'y a pas de CRM à lire, et le
> périmètre est tranché (tout est à créer).

---

## Bloquantes — avant d'écrire la première ligne

**1. Hébergement des données de santé.** Quel hébergeur certifié HDS, ou quel budget pour en
choisir un ? Rappel du fait vérifié : MongoDB Atlas est certifié, Vercel et Railway ne publient
aucun certificat HDS (`ARCHITECTURE.md` §4). Tant que ce choix n'est pas fait, la Phase 3 (fiche de
vie, comptes rendus) ne peut pas commencer — et comme rien n'existe encore, le choisir maintenant ne
coûte **aucune** migration.

**2. Mode de pointage.** Badge NFC posé au domicile, QR code imprimé, ou position ponctuelle au seul
instant du pointage ? Ma recommandation : **NFC ou QR en premier**, la position ponctuelle en
secours, jamais seule — c'est ce que la CNIL attend, et c'est ce qui évite un conflit social.
Question liée : **le CSE a-t-il été informé** du projet de télégestion ?

**3. Votre activité réelle, en chiffres.** Combien de foyers suivis aujourd'hui ? Combien
d'intervenants ? Combien de visites par semaine ? Combien en mandataire ? Ces chiffres décident du
dimensionnement, des index, et de l'ordre des fonctions.

**4. Comment faites-vous aujourd'hui ?** Plannings sur Excel, sur papier, sur un logiciel ? Factures
avec quel outil ? C'est ce qu'il faudra reprendre, et ce qui restera en service pendant que la
Phase 4 se construit.

**5. Qui, à l'agence, valide quoi ?** Qui vérifie un justificatif de tutelle ou de curatelle ? Qui
répond à un signalement de chute à 22 h ? L'astreinte 24 h/24 annoncée aux familles, qui la tient ?
Un produit qui promet une réponse que personne ne peut donner détruit la confiance plus vite que
l'absence de produit.

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
