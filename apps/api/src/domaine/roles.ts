import { ACTIONS, MODULES, type Action, type ModuleKey } from "./modules";

/*
 * Les rôles de `docs/portal/PERMISSIONS.md` §4 (côté client) et §5 (côté Youdom Care), et la
 * matrice par défaut.
 *
 * La matrice n'autorise rien à elle seule : le droit effectif est un `access_grant`
 * (`PERMISSIONS.md` §7). Elle sert à deux choses, et c'est pour cela qu'elle est du code et non
 * un commentaire :
 *
 * 1. **proposer** les droits à l'ouverture d'un compte (« ✓ » posés d'office, « ○ » laissés à
 *    activer par le bénéficiaire) ;
 * 2. **interdire** : un droit qui accorde une case « — » est refusé quand même. Un document mal
 *    écrit, importé ou forgé ne doit pas suffire à ouvrir ce que le rôle n'ouvre jamais.
 */

export const CLIENT_ROLES = [
  "beneficiaire",
  "representant_legal",
  "proche_referent",
  "proche_invite",
  "payeur",
  "particulier_employeur",
  "professionnel_invite",
] as const;

export type ClientRole = (typeof CLIENT_ROLES)[number];

export const STAFF_ROLES = [
  "coordinateur",
  "intervenant",
  "responsable_agence",
  "astreinte",
  "administrateur",
] as const;

export type StaffRole = (typeof STAFF_ROLES)[number];

export type Role = ClientRole | StaffRole;

export function isStaffRole(role: Role): role is StaffRole {
  return (STAFF_ROLES as readonly string[]).includes(role);
}

/**
 * Position d'une case de la matrice.
 * - `accorde` (« ✓ ») : posé à l'ouverture du compte ;
 * - `possible` (« ○ ») : le bénéficiaire ou le représentant l'active, jamais l'agence seule ;
 * - `jamais` (« — ») : refusé, même si un droit existe en base.
 */
export type Stance = "accorde" | "possible" | "jamais";

const CODES: Record<string, Stance> = { o: "accorde", p: "possible", n: "jamais" };

/*
 * Une ligne = un couple (module, action), sept lettres dans l'ordre des colonnes de
 * `PERMISSIONS.md` §4 :
 *
 *   bénéficiaire · représentant légal · proche référent · proche invité · payeur ·
 *   particulier employeur · professionnel invité
 *
 * o = ✓   p = ○   n = —
 */
const CLIENT_MATRIX: ReadonlyArray<readonly [ModuleKey, Action, string]> = [
  ["planning", "voir", "oooppop"],
  ["planning", "creer", "ooonnon"],
  ["intervenants", "voir", "ooopnon"],
  ["intervenants", "creer", "ooonnon"],
  ["presence", "voir", "ooopnon"],
  ["comptes_rendus", "voir", "ooopnpp"],
  ["comptes_rendus", "creer", "ooonnpp"],
  ["fiche_de_vie", "voir", "ooonnpp"],
  ["fiche_de_vie", "modifier", "ooonnpn"],
  ["acces_logement", "voir", "oopnnpn"],
  ["finances", "voir", "oopnoon"],
  ["finances", "creer", "oopnoon"],
  ["employeur", "voir", "npnnnon"],
  ["employeur", "valider", "npnnnon"],
  ["documents", "voir", "oooppop"],
  // « documents signer » du tableau : signer, c'est valider un document.
  ["documents", "valider", "oonnpon"],
  ["documents", "exporter", "oopnnpn"],
  ["messagerie", "voir", "oooppop"],
  ["messagerie", "creer", "oooppop"],
  ["qualite", "creer", "ooopoon"],
  ["journal_acces", "voir", "ooonnon"],
];

/*
 * Deux lignes du tableau §4 ne sont pas des modules : ce sont des pouvoirs sur le dossier
 * lui-même. Elles sont traitées à part pour qu'aucune ne se perde dans un module voisin.
 * « Exporter le dossier » est porté par `documents/exporter` ci-dessus.
 */
const MANAGE_RIGHTS: Record<ClientRole, Stance> = {
  beneficiaire: "accorde",
  representant_legal: "accorde",
  // Délégation puissante et révocable, désactivée par défaut (`PERMISSIONS.md` §8).
  proche_referent: "possible",
  proche_invite: "jamais",
  payeur: "jamais",
  particulier_employeur: "jamais",
  professionnel_invite: "jamais",
};

/** Qui peut donner ou retirer les droits des autres membres du foyer. */
export function manageRightsStance(role: Role): Stance {
  if (isStaffRole(role)) {
    // L'agence n'ouvre pas un module à la place du bénéficiaire : elle enregistre sa décision.
    return role === "responsable_agence" || role === "coordinateur" ? "possible" : "jamais";
  }
  return MANAGE_RIGHTS[role];
}

/*
 * « fiche_de_vie modifier **un protocole** » : ✓ puis validation de l'agence pour le bénéficiaire
 * et le représentant légal, « demande » pour le proche référent — c'est-à-dire pas une
 * modification. Un protocole est un geste de soin écrit : il ne change pas sans relecture.
 */
export type ProtocolStance = "valide_par_agence" | "demande_seulement" | "jamais";

export function protocolStance(role: Role): ProtocolStance {
  if (role === "beneficiaire" || role === "representant_legal") return "valide_par_agence";
  if (role === "proche_referent") return "demande_seulement";
  if (role === "coordinateur" || role === "responsable_agence") return "valide_par_agence";
  return "jamais";
}

function buildMatrix(): Record<ClientRole, Record<ModuleKey, Record<Action, Stance>>> {
  const empty = () =>
    Object.fromEntries(
      MODULES.map((module) => [
        module,
        Object.fromEntries(ACTIONS.map((action) => [action, "jamais" as Stance])),
      ]),
    ) as Record<ModuleKey, Record<Action, Stance>>;

  const matrix = Object.fromEntries(CLIENT_ROLES.map((role) => [role, empty()])) as Record<
    ClientRole,
    Record<ModuleKey, Record<Action, Stance>>
  >;

  for (const [module, action, codes] of CLIENT_MATRIX) {
    if (codes.length !== CLIENT_ROLES.length) {
      throw new Error(`matrice: la ligne ${module}/${action} n'a pas sept colonnes`);
    }
    for (const [index, role] of CLIENT_ROLES.entries()) {
      const stance = CODES[codes[index]];
      if (!stance)
        throw new Error(`matrice: code inconnu « ${codes[index]} » (${module}/${action})`);
      matrix[role][module][action] = stance;
    }
  }
  return matrix;
}

const CLIENT_STANCES = buildMatrix();

/*
 * Côté Youdom Care, le rôle ne décrit pas une délégation mais une mission (§5). La portée — quels
 * foyers — est portée par les rattachements, pas par ce tableau.
 */
const STAFF_STANCES: Record<StaffRole, (module: ModuleKey, action: Action) => Stance> = {
  // Voit tout sur ses foyers, valide les demandes, traite les signalements.
  coordinateur: (module) => (module === "employeur" ? "possible" : "accorde"),
  // Ses visites seulement. `acces_logement` est en plus borné à la plage de visite (rule R4).
  intervenant: (module, action) => {
    if (module === "fiche_de_vie") return action === "voir" ? "accorde" : "possible";
    if (module === "comptes_rendus") return action === "exporter" ? "jamais" : "accorde";
    if (module === "acces_logement") return action === "voir" ? "accorde" : "jamais";
    if (module === "planning" || module === "presence")
      return action === "voir" ? "accorde" : "possible";
    return "jamais";
  },
  responsable_agence: (module, action) => (action === "exporter" ? "possible" : "accorde"),
  // Hors heures ouvrées, et seulement avec un motif saisi (rule R7).
  astreinte: (module, action) =>
    action === "voir" || action === "creer"
      ? "accorde"
      : module === "acces_logement"
        ? "jamais"
        : "possible",
  // « Aucun accès en clair aux notes de santé », quelle que soit l'urgence technique.
  administrateur: (module) =>
    module === "comptes_rendus" || module === "fiche_de_vie" || module === "acces_logement"
      ? "jamais"
      : "possible",
};

/** La case de la matrice pour un rôle, un module et une action. */
export function stanceFor(role: Role, module: ModuleKey, action: Action): Stance {
  return isStaffRole(role)
    ? STAFF_STANCES[role](module, action)
    : CLIENT_STANCES[role][module][action];
}

/** Les droits posés d'office à l'ouverture d'un compte : les « ✓ », et eux seuls. */
export function defaultGrants(role: Role): Array<{ module: ModuleKey; actions: Action[] }> {
  return MODULES.map((module) => ({
    module,
    actions: ACTIONS.filter((action) => stanceFor(role, module, action) === "accorde"),
  })).filter((entry) => entry.actions.length > 0);
}
