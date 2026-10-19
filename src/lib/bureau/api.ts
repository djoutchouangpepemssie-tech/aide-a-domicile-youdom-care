/*
 * Le client de l'API du CRM, **côté navigateur**.
 *
 * Deux contraintes d'architecture se lisent dans ce fichier, et elles ne sont pas négociables
 * (`docs/portal/ARCHITECTURE.md` §4.2) :
 *
 * 1. **Aucune donnée ne traverse Vercel.** Les écrans appellent l'API certifiée HDS depuis le
 *    navigateur. Il n'y a donc ici ni route serveur, ni `fetch` dans un composant serveur, ni
 *    cache Next : Vercel sert des fichiers, il ne voit rien.
 * 2. **Le jeton vit dans `sessionStorage`, pas dans un cookie.** Pas de cookie, donc pas de CSRF
 *    à défendre ; `sessionStorage` plutôt que `localStorage` parce qu'un onglet fermé doit finir
 *    la session — un poste de coordination est souvent partagé. Le jeton ne porte aucun droit
 *    (`apps/api/src/auth/sessions.ts`) : il dit qui, l'API décide quoi.
 *
 * Les formes de réponse sont écrites à la main et **doivent suivre** celles de `apps/api`. Un
 * client généré viendra, mais pas avant que les écrans se stabilisent : générer d'abord, c'est
 * figer une forme qu'on ne connaît pas encore.
 */

export const CLEF_JETON = "youdom.bureau.jeton";

export class ApiError extends Error {
  constructor(
    readonly code: string,
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/** L'adresse de l'API, sans barre oblique finale. Absente = écrans en panne annoncée, pas devinée. */
export function apiBase(): string {
  const base = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (!base) {
    throw new ApiError(
      "api_non_configuree",
      0,
      "L'adresse de l'API n'est pas configurée (NEXT_PUBLIC_API_BASE_URL).",
    );
  }
  return base.replace(/\/+$/, "");
}

export const jeton = {
  lire(): string | null {
    try {
      return globalThis.sessionStorage?.getItem(CLEF_JETON) ?? null;
    } catch {
      // Navigation privée, stockage refusé : on se comporte comme si personne n'était connecté.
      return null;
    }
  },
  ecrire(valeur: string): void {
    try {
      globalThis.sessionStorage?.setItem(CLEF_JETON, valeur);
    } catch {
      /* sans stockage, la session ne survit pas au rechargement : c'est tout. */
    }
  },
  effacer(): void {
    try {
      globalThis.sessionStorage?.removeItem(CLEF_JETON);
    } catch {
      /* rien à faire */
    }
  },
};

type Options = { methode?: "GET" | "POST" | "PATCH" | "DELETE"; corps?: unknown; sansJeton?: true };

export async function apiFetch<T>(chemin: string, options: Options = {}): Promise<T> {
  const token = options.sansJeton ? null : jeton.lire();
  const reponse = await fetch(`${apiBase()}${chemin}`, {
    method: options.methode ?? "GET",
    headers: {
      ...(options.corps ? { "content-type": "application/json" } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: options.corps ? JSON.stringify(options.corps) : undefined,
  });

  if (reponse.status === 204) return undefined as T;

  const texte = await reponse.text();
  const donnees = texte ? (JSON.parse(texte) as Record<string, unknown>) : {};

  if (!reponse.ok) {
    // Une session expirée se nettoie tout de suite : garder un jeton mort ne sert personne.
    if (reponse.status === 401) jeton.effacer();
    throw new ApiError(
      typeof donnees.code === "string" ? donnees.code : "erreur",
      reponse.status,
      typeof donnees.message === "string" ? donnees.message : "La demande n'a pas abouti.",
    );
  }
  return donnees as T;
}

/* ------------------------------------------------------------------ formes */

export type Defi = { challengeId: string; expiresIn: number };
export type Session = { token: string; expiresAt: string };

export type Moi = {
  membre: { id: string; nom: string };
  role: string;
  agences: { agencyId: string; foyers: string[] }[];
  secondFacteur: boolean;
};

export type Occurrence = {
  serieId: string;
  householdId: string;
  date: string;
  slotIndex: number;
  start: string;
  end: string;
  endDate: string;
  kind: "jour" | "nuit_calme" | "nuit_active" | "continu";
  workerId: string | null;
  origine: "serie" | "exception";
  motif: string | null;
};

export type Signalement = {
  regle: string;
  severite: "bloquant" | "avertissement";
  message: string;
  visites: string[];
};

export type Semaine = {
  occurrences: Occurrence[];
  aPourvoir: number;
  signalements: Signalement[];
  fenetreJugee: { from: string; to: string };
  aucuneRegleSaisie: boolean;
};

export type Intervenant = {
  id: string;
  prenom: string;
  initiale: string;
  photo: string | null;
  qualifications: string[];
};

export type FoyerListe = {
  id: string;
  code: string;
  mode: "prestataire" | "mandataire";
  statut: string;
  ville: string;
  codePostal: string;
  gele: boolean;
  /** Le foyer technique de l'agence : les salariés y sont rattachés, personne n'y est accompagné. */
  technique: boolean;
};

export type DroitEffectif = { id: string; module: string; actions: string[] };

export type MembreDuFoyer = {
  id: string;
  nom: string | null;
  role: string;
  statut: string;
  droits: DroitEffectif[];
};

export type Protection = {
  memberId: string;
  type: string;
  portee: string[];
  representation: "assistance" | "representation";
  verifiee: boolean;
};

export type Foyer = {
  foyer: {
    id: string;
    code: string;
    agencyId: string;
    mode: "prestataire" | "mandataire";
    statut: string;
    gele: boolean;
    adresse: { ligne1: string; ligne2: string | null; codePostal: string; ville: string };
  };
  membres: MembreDuFoyer[];
  protections: Protection[];
};

export type SerieDuFoyer = {
  id: string;
  libelle: string;
  du: string;
  au: string | null;
  rythme: number;
  creneaux: number;
  statut: string;
  version: number;
  remplaceePar: string | null;
};

export type Suggestion = { workerId: string; score: number; raisons: string[] };
export type CreneauASuggerer = {
  serieId: string;
  householdId: string;
  date: string;
  heure: string;
  slotIndex: number;
  suggestions: Suggestion[];
  exclus: { workerId: string; raison: string }[];
};

/* ------------------------------------------------------------------ appels */

export const api = {
  /** Demande un lien (adresse) ou un code (téléphone). Répond pareil, connu ou non. */
  demanderCode: (identifiant: { email?: string; phone?: string }) =>
    apiFetch<Defi>("/auth/v1/challenges", { methode: "POST", corps: identifiant, sansJeton: true }),

  ouvrirSession: (challengeId: string, secret: string, appareil: string) =>
    apiFetch<Session>("/auth/v1/sessions", {
      methode: "POST",
      corps: { challengeId, secret, device: { label: appareil } },
      sansJeton: true,
    }),

  moi: () => apiFetch<Moi>("/admin/v1/me"),

  semaine: (agencyId: string, from: string, to: string) =>
    apiFetch<Semaine>(`/admin/v1/planning?agencyId=${agencyId}&from=${from}&to=${to}`),

  intervenants: (agencyId: string) =>
    apiFetch<{ intervenants: Intervenant[] }>(`/admin/v1/workers?agencyId=${agencyId}`),

  suggestions: (agencyId: string, from: string, to: string) =>
    apiFetch<{ creneaux: CreneauASuggerer[]; total: number }>(
      `/admin/v1/planning/suggestions?agencyId=${agencyId}&from=${from}&to=${to}`,
    ),

  foyers: (agencyId: string) =>
    apiFetch<{ foyers: FoyerListe[] }>(`/admin/v1/households?agencyId=${agencyId}`),

  foyer: (householdId: string) => apiFetch<Foyer>(`/admin/v1/households/${householdId}`),

  seriesDuFoyer: (householdId: string) =>
    apiFetch<{ series: SerieDuFoyer[] }>(`/admin/v1/households/${householdId}/series`),

  deconnecter: () => jeton.effacer(),
};
