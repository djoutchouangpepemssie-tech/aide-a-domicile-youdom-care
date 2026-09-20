/*
 * Paramètres de requête posés par les gestes de hero (docs/design/CONCEPT.md §4) sur les liens
 * vers les formulaires. Les formulaires ne les lisent pas encore : ils pourront pré-remplir
 * l'étape correspondante plus tard. Aucune donnée personnelle, aucune donnée conservée : un mot
 * clé dans l'adresse, rien d'autre.
 *
 * | Geste                   | Lien                                   | Paramètre  | Valeurs                              |
 * | ----------------------- | -------------------------------------- | ---------- | ------------------------------------ |
 * | PlanningShortcuts       | formulaire du cas (`formPaths`)        | `planning` | matin-soir · semaine · week-end · 24h |
 * | NightChooser (nuit)     | /demande/nuit-et-24h/                  | `nuit`     | calme · active (`nightKinds`)        |
 * | NightChooser (24h/24)   | /demande/nuit-et-24h/                  | `duree`    | jours · semaines · durable (`durations`) |
 * | DischargeChooser        | /demande/sortie-d-hospitalisation/     | `sortie`   | demain · semaine · a-confirmer       |
 * | CaregiverFirstQuestion  | /aidants/ou-en-etes-vous/              | `q1`       | 0 · 1 · 2 (valeur de la réponse)     |
 * | StageChooser            | ancre de la page                       | —          | `#stade-1`, `#stade-2`, `#stade-3`   |
 */

export const planningShortcutValues = ["matin-soir", "semaine", "week-end", "24h"] as const;
export type PlanningShortcutValue = (typeof planningShortcutValues)[number];

export const nightValues = ["calme", "active"] as const;
export type NightValue = (typeof nightValues)[number];

export const durationValues = ["jours", "semaines", "durable"] as const;
export type DurationValue = (typeof durationValues)[number];

export const dischargeValues = ["demain", "semaine", "a-confirmer"] as const;
export type DischargeValue = (typeof dischargeValues)[number];

export const gestureParams = {
  planning: "planning",
  nuit: "nuit",
  duree: "duree",
  sortie: "sortie",
  questionnaire: "q1",
} as const;

/** Préfixe des ancres des cartes de stade (section 4) : `stade-1`, `stade-2`, `stade-3`. */
export const stageAnchorPrefix = "stade-";

export function stageAnchorId(index: number): string {
  return `${stageAnchorPrefix}${index + 1}`;
}

/** Ajoute un paramètre à une adresse interne (`/demande/x/` → `/demande/x/?nuit=calme`). */
export function withParam(href: string, name: string, value: string | number): string {
  const separator = href.includes("?") ? "&" : "?";
  return `${href}${separator}${encodeURIComponent(name)}=${encodeURIComponent(String(value))}`;
}
