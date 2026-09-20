/*
 * Les onze formulaires de docs/05 §2 : identifiant, adresse, et ceux dont les réponses
 * contiennent des données de santé (docs/05 §8 : consentement explicite obligatoire).
 */

export const leadForms = [
  "rappel",
  "neuro",
  "personne-agee",
  "adulte-handicap",
  "enfant-handicap",
  "aidant",
  "sortie-hospitalisation",
  "nuit-24h",
  "professionnel",
  "candidature",
  "contact",
] as const;
export type LeadForm = (typeof leadForms)[number];

export const formPaths: Record<LeadForm, string> = {
  rappel: "/etre-rappele/",
  neuro: "/demande/maladie-neurodegenerative/",
  "personne-agee": "/demande/personne-agee/",
  "adulte-handicap": "/demande/adulte-handicap/",
  "enfant-handicap": "/demande/enfant-handicap/",
  aidant: "/demande/relais-aidant/",
  "sortie-hospitalisation": "/demande/sortie-d-hospitalisation/",
  "nuit-24h": "/demande/nuit-et-24h/",
  professionnel: "/demande/professionnel/",
  candidature: "/recrutement/postuler/",
  contact: "/contact/",
};

/** Formulaires dont les réponses décrivent la santé de la personne à accompagner. */
export const healthForms: readonly LeadForm[] = [
  "neuro",
  "personne-agee",
  "adulte-handicap",
  "enfant-handicap",
  "aidant",
  "sortie-hospitalisation",
  "nuit-24h",
];

export function isHealthForm(form: LeadForm): boolean {
  return healthForms.includes(form);
}

export const urgencies = ["48h", "semaine", "mois", "information"] as const;
export type Urgency = (typeof urgencies)[number];

export const rhythms = ["regulier", "ponctuel", "24h", "inconnu"] as const;
export type Rhythm = (typeof rhythms)[number];

export const nightKinds = ["calme", "active", "inconnu"] as const;
export type NightKind = (typeof nightKinds)[number];

/** Durée envisagée d'une présence 24h/24 (docs/05 §4). */
export const durations = ["jours", "semaines", "durable"] as const;
export type Duration = (typeof durations)[number];

/** Départements d'Île-de-France : seuls codes acceptés (docs/05 §6, hors zone = pas d'envoi). */
export const idfDepartments = ["75", "77", "78", "91", "92", "93", "94", "95"] as const;
export type IdfDepartment = (typeof idfDepartments)[number];
