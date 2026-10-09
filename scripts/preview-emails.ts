/*
 * Aperçu des e-mails sortants : `pnpm mail:preview`.
 *
 * Écrit dans `.previews/` un fichier HTML par e-mail, tel qu'il part réellement — même code de
 * rendu que la route, mêmes textes de `content/emails.json`. Sert à juger la maquette sans
 * déclencher d'envoi, et à la faire valider par Arcel.
 *
 * `.previews/` n'est pas versionné (.gitignore) : ce sont des fichiers jetables.
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import emails from "../content/emails.json" with { type: "json" };
import interfaceTexts from "../content/interface.json" with { type: "json" };
import siteConfig from "../content/site.config.json" with { type: "json" };
import { situationQuestionLabels } from "../src/content/form-definitions";
import type { InterfaceTexts } from "../src/content/schemas";
import {
  renderCandidatureAcknowledgement,
  renderCandidatureTeamEmail,
} from "../src/lib/candidature/render";
import type { CandidaturePayload } from "../src/lib/candidature/schema";
import type { LeadPayload } from "../src/lib/lead/schema";
import { renderAcknowledgement, renderTeamEmail } from "../src/lib/mail/render";

const OUT = ".previews";

const leadCtx = {
  emails,
  interfaceTexts: interfaceTexts as unknown as InterfaceTexts,
  phone: siteConfig.contact.telephone_principal,
  callbackDelay: null,
  agencies: Object.fromEntries(siteConfig.agences.map((a) => [a.id, a.nom])),
  questionLabels: situationQuestionLabels,
};

const candidatureCtx = {
  emails,
  interfaceTexts: interfaceTexts as unknown as InterfaceTexts,
  phone: siteConfig.contact.telephone_principal,
  departements: Object.fromEntries(siteConfig.zones.map((z) => [z.code, z.nom])),
  offres: { "auxiliaire-de-vie-paris": "Auxiliaire de vie — Paris" },
};

/* Demande de rappel : exactement la demande reçue le 09/10/2026, pour comparer. */
const rappel: LeadPayload = {
  id: "569e2572-6bd1-4adf-9711-098321ca8b76",
  createdAt: "2026-10-09T13:06:44.255Z",
  form: "rappel",
  sourcePage: "/etre-rappele/",
  commune: {
    insee: "75107",
    nom: "Paris 7e Arrondissement",
    codePostal: "75007",
    departement: "75",
  },
  agenceProche: "paris-12",
  urgence: "48h",
  contact: {
    prenom: "Pepemssie",
    nom: "Djoutchouang",
    telephone: "0781964527",
    rappel: "Le matin",
  },
  consentement: { sante: false, date: "2026-10-09T13:06:44.255Z", version: "2026-09" },
};

/* Demande détaillée : le cas le plus chargé, pour voir la maquette sous contrainte. */
const detaillee: LeadPayload = {
  id: "c1a2b3d4-5e6f-4a7b-8c9d-0e1f2a3b4c5d",
  createdAt: "2026-10-09T08:12:00.000Z",
  form: "neuro",
  sourcePage: "/maladies-neurodegeneratives/alzheimer/",
  commune: { insee: "92062", nom: "Puteaux", codePostal: "92800", departement: "92" },
  agenceProche: "puteaux",
  urgence: "semaine",
  pourQui: "Mon père ou ma mère",
  situation: {
    maladie: "Alzheimer ou apparentée",
    autonomie: "Besoin d'aide pour plusieurs gestes du quotidien",
    ce_qui_pese: ["Les nuits difficiles", "La toilette", "Les repas"],
    vit: "Seule à son domicile",
    professionnels: "Une infirmière passe le matin",
  },
  besoins: ["Aide à la toilette", "Préparation des repas", "Présence la nuit", "Compagnie"],
  planning: {
    rythme: "regulier",
    grille: {
      lun: ["morning", "night"],
      mar: ["morning"],
      mer: ["morning", "afternoon"],
      jeu: ["morning"],
      ven: ["morning", "night"],
      sam: ["afternoon"],
    },
    heuresParSemaine: 24,
    nuit: "calme",
  },
  contact: {
    prenom: "Claire",
    nom: "Martin",
    telephone: "0612345678",
    email: "claire.martin@example.org",
    rappel: "En fin de journée",
  },
  message:
    "Ma mère vit seule depuis le décès de mon père.\nElle se lève la nuit et nous craignons une chute.\nJe travaille en journée, je suis joignable après 18 h.",
  consentement: { sante: true, date: "2026-10-09T08:12:00.000Z", version: "2026-09" },
};

const candidature: CandidaturePayload = {
  id: "a7b8c9d0-1e2f-4a3b-8c4d-5e6f7a8b9c0d",
  createdAt: "2026-10-09T09:30:00.000Z",
  sourcePage: "/recrutement/postuler/",
  departement: "75",
  commune: {
    insee: "75112",
    nom: "Paris 12e Arrondissement",
    codePostal: "75012",
    departement: "75",
  },
  disponibilite: "Temps plein, dès novembre",
  offre: "auxiliaire-de-vie-paris",
  contact: {
    prenom: "Awa",
    nom: "Diallo",
    telephone: "0698765432",
    email: "awa.diallo@example.org",
  },
  message:
    "Auxiliaire de vie depuis six ans, dont trois auprès de personnes atteintes de la maladie d'Alzheimer. Permis B.",
  consentement: { accepte: true, date: "2026-10-09T09:30:00.000Z", version: "2026-09" },
};

const files: [string, { subject: string; html: string; text: string }][] = [
  ["01-equipe-rappel", renderTeamEmail(rappel, leadCtx)],
  ["02-equipe-demande-detaillee", renderTeamEmail(detaillee, leadCtx)],
  ["03-accuse-demandeur", renderAcknowledgement(detaillee, leadCtx)],
  [
    "04-equipe-candidature",
    renderCandidatureTeamEmail(
      candidature,
      { filename: "CV-Awa-Diallo.pdf", size: 412_000 },
      candidatureCtx,
    ),
  ],
  ["05-accuse-candidat", renderCandidatureAcknowledgement(candidature, candidatureCtx)],
];

mkdirSync(OUT, { recursive: true });
for (const [name, mail] of files) {
  writeFileSync(join(OUT, `${name}.html`), mail.html, "utf8");
  writeFileSync(join(OUT, `${name}.txt`), `Objet : ${mail.subject}\n\n${mail.text}`, "utf8");
  console.log(`${OUT}/${name}.html  —  ${mail.subject}`);
}
console.log(`\n${files.length} e-mails écrits dans ${OUT}/ (HTML et version texte).`);
