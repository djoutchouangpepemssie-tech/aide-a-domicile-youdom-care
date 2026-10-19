import type { Context } from "hono";

/*
 * Les réponses d'erreur, et une règle qui tient tout le reste : **il n'existe aucun chemin vers
 * 403**. Un refus d'autorisation répond « introuvable », parce qu'un 403 confirmerait l'existence
 * de la ressource à qui n'y a pas droit (`PERMISSIONS.md` §7).
 *
 * Le corps dit le minimum : un code stable pour l'interface, une phrase pour l'humain. Jamais le
 * motif du refus — il part au journal d'audit, où le bénéficiaire peut le lire, et nulle part
 * ailleurs.
 */

export type ErrorCode =
  "introuvable" | "non_authentifie" | "requete_invalide" | "trop_de_demandes" | "erreur_interne";

const MESSAGES: Record<ErrorCode, string> = {
  introuvable: "Cette page n'existe pas, ou elle ne vous est pas partagée.",
  non_authentifie: "Votre session a expiré. Reconnectez-vous.",
  requete_invalide: "La demande est incomplète.",
  trop_de_demandes: "Trop de tentatives. Patientez quelques minutes.",
  erreur_interne: "Une erreur est survenue de notre côté. Nous en sommes informés.",
};

const STATUSES: Record<ErrorCode, 400 | 401 | 404 | 429 | 500> = {
  introuvable: 404,
  non_authentifie: 401,
  requete_invalide: 400,
  trop_de_demandes: 429,
  erreur_interne: 500,
};

export function fail(context: Context, code: ErrorCode, details?: string) {
  return context.json(
    { code, message: MESSAGES[code], ...(details ? { details } : {}) },
    STATUSES[code],
  );
}

/** Un refus d'autorisation, quelle qu'en soit la raison. Toujours 404. */
export function notFound(context: Context) {
  return fail(context, "introuvable");
}
