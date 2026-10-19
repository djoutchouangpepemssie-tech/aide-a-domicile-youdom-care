/*
 * Les douze modules de `docs/portal/PERMISSIONS.md` §3 et les cinq actions. Les clés sont en
 * français parce qu'elles sont des données du domaine : elles s'écrivent dans la base, dans les
 * droits et dans le journal d'audit, et elles doivent se relire dans le document de référence
 * sans traduction mentale.
 */

export const MODULES = [
  "planning",
  "intervenants",
  "presence",
  "comptes_rendus",
  "fiche_de_vie",
  "acces_logement",
  "finances",
  "employeur",
  "documents",
  "messagerie",
  "qualite",
  "journal_acces",
] as const;

export type ModuleKey = (typeof MODULES)[number];

export const ACTIONS = ["voir", "creer", "modifier", "valider", "exporter"] as const;

export type Action = (typeof ACTIONS)[number];

/**
 * Nature de ce que le module expose. Elle décide du traitement, pas du confort : `sante` impose
 * l'hébergement certifié (`ARCHITECTURE.md` §4) et disparaît de la consultation dès le gel du
 * foyer ; `critique` touche la sécurité physique de la personne ; `financier` impose le second
 * facteur.
 */
export type Sensitivity = "sante" | "critique" | "financier" | "personnel" | "courant";

export const MODULE_SENSITIVITY: Record<ModuleKey, Sensitivity> = {
  planning: "courant",
  intervenants: "personnel",
  presence: "courant",
  comptes_rendus: "sante",
  fiche_de_vie: "sante",
  acces_logement: "critique",
  finances: "financier",
  employeur: "financier",
  documents: "courant",
  messagerie: "courant",
  qualite: "courant",
  journal_acces: "courant",
};

/** Modules qui portent des données de santé : ils ne sortent jamais du périmètre certifié HDS. */
export const HEALTH_MODULES: readonly ModuleKey[] = MODULES.filter(
  (module) => MODULE_SENSITIVITY[module] === "sante",
);

/** Modules dont la consultation exige un second facteur (`ARCHITECTURE.md` §5). */
export const SECOND_FACTOR_MODULES: readonly ModuleKey[] = MODULES.filter((module) =>
  ["sante", "financier", "critique"].includes(MODULE_SENSITIVITY[module]),
);

/**
 * Portée des actions d'agence qui ne relèvent d'aucun module : créer un foyer, enregistrer un
 * intervenant. Ce n'est pas un module — on ne peut pas en recevoir un droit — mais le journal
 * d'audit doit pouvoir les nommer, sinon elles n'existent nulle part.
 */
export const ADMIN_SCOPE = "administration" as const;

export type AuditScope = ModuleKey | typeof ADMIN_SCOPE;

export function isModuleKey(value: string): value is ModuleKey {
  return (MODULES as readonly string[]).includes(value);
}

export function isAction(value: string): value is Action {
  return (ACTIONS as readonly string[]).includes(value);
}
