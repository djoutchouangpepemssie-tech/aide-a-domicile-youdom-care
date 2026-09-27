import { idfDepartments, leadForms, type IdfDepartment, type LeadForm } from "@/lib/lead/forms";

/*
 * Mesure d'audience sans donnée personnelle (docs/05 §9, D-029) : les listes fermées que le
 * client et le serveur partagent. Ce module ne dépend d'aucune bibliothèque : il entre dans le
 * JavaScript initial de toutes les pages (île « appel_clic » du gabarit racine) ; le schéma zod
 * qui en découle vit dans ./schema.ts et n'est chargé que par la route, côté serveur.
 */

export const mesureEvents = [
  "demande_etape_vue",
  "demande_envoyee",
  "rappel_envoye",
  "appel_clic",
] as const;
export type MesureEvent = (typeof mesureEvents)[number];

/** Emplacements des liens d'appel (attribut `data-mesure` posé sur le lien `tel:`). */
export const callPlacements = [
  "en-tete",
  "barre-mobile",
  "rail",
  "reponse-locale",
  "pied-de-page",
  "agence",
  "formulaire",
] as const;
export type CallPlacement = (typeof callPlacements)[number];

/** Formulaires mesurables : les identifiants de docs/05 §2. */
export const mesureForms = leadForms;
/** Départements : les codes de `site.config.zones` (vérifié par events.test.ts). */
export const mesureDepartments = idfDepartments;
export const MAX_STEP = 6;

export interface MesureProps {
  demande_etape_vue: { formulaire: LeadForm; etape: number };
  demande_envoyee: { formulaire: LeadForm; departement?: IdfDepartment };
  rappel_envoye: Record<never, never>;
  appel_clic: { emplacement: CallPlacement };
}

export interface MesureBody<E extends MesureEvent = MesureEvent> {
  event: E;
  props: MesureProps[E];
  /** Chemin de la page, sans paramètres ni ancre. */
  page: string;
}

/** Longueur maximale d'un chemin de page et taille maximale d'un corps de requête. */
export const MAX_PAGE_LENGTH = 200;
export const MAX_MESURE_BODY_BYTES = 2 * 1024;

/**
 * Chemin de page normalisé : tout ce qui suit `?` ou `#` disparaît, minuscules, longueur bornée.
 * Un chemin qui ne ressemble pas à une adresse du site devient « / ».
 */
export function normalizePage(pathname: string): string {
  const cut = pathname.split(/[?#]/)[0] ?? "";
  const lower = cut.toLowerCase().slice(0, MAX_PAGE_LENGTH);
  return /^\/[a-z0-9\-_/.]*$/.test(lower) ? lower : "/";
}
