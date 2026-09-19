# Décisions d'architecture et de conception

Une décision = contexte, choix, conséquences, date. Toute dépendance ajoutée, tout écart par rapport aux cahiers et tout changement de source de données passent par ici.

## D-001 — Pile technique (2026-09-19, Arcel)
- **Contexte** : site de contenu à fort enjeu SEO, des centaines de pages locales, formulaires riches, équipe habituée à React.
- **Choix** : Next.js (App Router, statique), TypeScript strict, Tailwind CSS v4, contenu MDX/JSON validé par Zod, hébergement Vercel.
- **Conséquences** : pas de CMS ; le contenu vit dans le dépôt ; les prévisualisations par branche servent de recette.

## D-002 — Destination des demandes (2026-09-19, Arcel)
- **Choix** : e-mail uniquement (SMTP). Format `LeadPayload` stable et webhook optionnel pour un futur branchement au CRM.
- **Conséquences** : le site ne stocke aucune demande ; la boîte de réception est le seul lieu de conservation (voir `docs/05 §8`).

## D-003 — Modes d'intervention (2026-09-19, Arcel)
- **Choix** : le site présente les deux modes, prestataire et mandataire, avec une page de comparaison et la mention légale du mode mandataire.

## D-004 — Site créé de zéro (2026-09-19, Arcel)
- **Choix** : aucune reprise de contenu ni de structure d'un site antérieur ; aucune redirection à prévoir.

## D-005 — Identité visuelle (2026-09-19)
- **Choix** : palette issue du dépliant (bleu canard #0699B0, vert #58BE81, framboise #EF3F6B) complétée de variantes accessibles ; polices Fraunces et Atkinson Hyperlegible Next ; concept « Le Fil ».
- **Conséquences** : le framboise #D42A5B est la seule couleur d'action ; le vert ne porte jamais de texte blanc.

(Versions exactes des dépendances : à consigner par la tâche P0.1.)
