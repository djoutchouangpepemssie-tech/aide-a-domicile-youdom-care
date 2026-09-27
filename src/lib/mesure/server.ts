import { createHmac, randomBytes } from "node:crypto";
import { signWebhook } from "@/lib/lead/server";
import { MAX_MESURE_BODY_BYTES } from "./events";
import { mesureBodySchema, type ValidatedMesureBody } from "./schema";

/*
 * Traitement d'un événement de mesure côté serveur (D-029, docs/07 §6), indépendant de Next pour
 * être testé avec un collecteur simulé :
 * - validation zod stricte (nom d'événement, propriétés, chemin de page) ;
 * - limitation de débit par adresse : l'adresse n'est jamais conservée telle quelle, seulement
 *   son empreinte HMAC salée par un secret aléatoire propre au processus, et les entrées expirées
 *   sont effacées à chaque passage ;
 * - relais vers le collecteur MESURE_WEBHOOK_URL, signé par MESURE_WEBHOOK_SECRET (même mécanisme
 *   que le webhook des demandes) ; sans adresse, rien n'est stocké : la route répond 204 ;
 * - aucun journal du corps, ni en succès ni en échec.
 */

export { MAX_MESURE_BODY_BYTES };

export const MESURE_RATE_LIMIT = 120;
export const MESURE_RATE_WINDOW_MS = 10 * 60 * 1000;

export interface ForgetfulRateLimiter {
  /** true si l'événement est accepté pour cette adresse. */
  allow(ip: string, now: number): boolean;
  /** Nombre d'adresses (empreintes) encore en mémoire ; pour les tests. */
  size(): number;
}

/**
 * Compteur glissant par adresse qui oublie : la clé est l'empreinte HMAC de l'adresse (sel
 * aléatoire, jamais persisté) et toute entrée sans passage récent est supprimée à chaque appel.
 */
export function createForgetfulRateLimiter(
  max = MESURE_RATE_LIMIT,
  windowMs = MESURE_RATE_WINDOW_MS,
): ForgetfulRateLimiter {
  const salt = randomBytes(16);
  const hits = new Map<string, number[]>();
  const fingerprint = (ip: string) => createHmac("sha256", salt).update(ip).digest("base64url");
  return {
    allow(ip, now) {
      for (const [key, times] of hits) {
        const recent = times.filter((t) => now - t < windowMs);
        if (recent.length === 0) hits.delete(key);
        else hits.set(key, recent);
      }
      const key = fingerprint(ip);
      const recent = hits.get(key) ?? [];
      if (recent.length >= max) return false;
      recent.push(now);
      hits.set(key, recent);
      return true;
    },
    size: () => hits.size,
  };
}

export interface MesureServerEnv {
  MESURE_WEBHOOK_URL?: string | undefined;
  MESURE_WEBHOOK_SECRET?: string | undefined;
}

export interface MesureServerContext {
  env: MesureServerEnv;
  limiter: ForgetfulRateLimiter;
  ip: string;
  now?: Date;
  fetchImpl?: typeof fetch;
}

export type MesureStatus = 204 | 400 | 429;

/** Corps relayé au collecteur : l'événement validé et l'heure arrondie à la minute. */
export interface RelayedMesure {
  event: ValidatedMesureBody["event"];
  props: ValidatedMesureBody["props"];
  page: string;
  horodatage: string;
}

export function roundToMinute(date: Date): string {
  const copy = new Date(date.getTime());
  copy.setUTCSeconds(0, 0);
  return copy.toISOString();
}

export function parseMesureBody(raw: string): ValidatedMesureBody | null {
  if (raw.length > MAX_MESURE_BODY_BYTES) return null;
  let input: unknown;
  try {
    input = JSON.parse(raw);
  } catch {
    return null;
  }
  const parsed = mesureBodySchema.safeParse(input);
  return parsed.success ? parsed.data : null;
}

/** Délai accordé au collecteur : au-delà, l'événement est abandonné et la route répond quand même 204. */
export const MESURE_RELAY_TIMEOUT_MS = 5000;

async function relay(body: RelayedMesure, env: MesureServerEnv, fetchImpl: typeof fetch) {
  if (!env.MESURE_WEBHOOK_URL) return;
  const json = JSON.stringify(body);
  try {
    await fetchImpl(env.MESURE_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(env.MESURE_WEBHOOK_SECRET
          ? { "X-Signature": signWebhook(env.MESURE_WEBHOOK_SECRET, json) }
          : {}),
      },
      body: json,
      signal: AbortSignal.timeout(MESURE_RELAY_TIMEOUT_MS),
    });
  } catch {
    /* collecteur injoignable ou trop lent : on ne journalise rien, l'événement est perdu */
  }
}

export async function handleMesure(raw: string, ctx: MesureServerContext): Promise<MesureStatus> {
  const now = ctx.now ?? new Date();
  const body = parseMesureBody(raw);
  if (!body) return 400;
  if (!ctx.limiter.allow(ctx.ip, now.getTime())) return 429;
  await relay(
    { event: body.event, props: body.props, page: body.page, horodatage: roundToMinute(now) },
    ctx.env,
    ctx.fetchImpl ?? fetch,
  );
  return 204;
}
