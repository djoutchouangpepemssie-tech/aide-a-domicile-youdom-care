import { createHmac } from "node:crypto";
import { z } from "zod";
import type { Mailer } from "@/lib/mail/transport";
import { renderAcknowledgement, renderTeamEmail, type RenderContext } from "@/lib/mail/render";
import { leadPayloadSchema, type LeadPayload } from "./schema";

/*
 * Traitement d'une demande côté serveur (docs/05 §6-§8, docs/07 §6), indépendant de Next pour
 * être testé avec un serveur SMTP simulé :
 * - validation Zod stricte du corps { lead, meta } ;
 * - anti-robots sans friction : champ piège (réponse 202 silencieuse, rien n'est envoyé), délai
 *   minimal de remplissage, limite d'envois par adresse IP, Cloudflare Turnstile si la clé
 *   secrète est fournie ;
 * - e-mail à l'équipe, accusé de réception si un e-mail est fourni, webhook optionnel signé
 *   (HMAC-SHA256) dont l'échec ne touche pas l'e-mail ;
 * - aucune journalisation du contenu : seuls l'identifiant, le formulaire et le statut.
 */

export const MIN_FILL_SECONDS = 3;
export const MAX_BODY_BYTES = 64 * 1024;

export const submitBodySchema = z.strictObject({
  lead: leadPayloadSchema,
  meta: z.strictObject({
    honeypot: z.string().max(200),
    startedAt: z.iso.datetime(),
    turnstileToken: z.string().max(2048).optional(),
  }),
});
export type SubmitBody = z.infer<typeof submitBodySchema>;

export interface RateLimiter {
  /** true si l'envoi est autorisé pour cette clé. */
  allow(key: string, now: number): boolean;
}

/**
 * Compteur glissant par clé, **en mémoire du processus**.
 *
 * Limite à connaître avant de s'y fier : sur des fonctions serveur sans état, chaque instance a
 * son propre compteur et les instances se multiplient avec la charge ; la clé est de plus
 * l'adresse transmise par l'hébergeur, donc un en-tête. Ce compteur décourage un envoi répété à
 * la main ; il n'arrête pas un robot. Un compteur partagé ou une limitation au bord, et
 * l'activation de Turnstile, restent nécessaires avant l'ouverture des formulaires au public
 * (docs/07 §6, docs/PLAN.md DC.3).
 */
export function createRateLimiter(max = 5, windowMs = 10 * 60 * 1000): RateLimiter {
  const hits = new Map<string, number[]>();
  return {
    allow(key, now) {
      const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
      if (recent.length >= max) {
        hits.set(key, recent);
        return false;
      }
      recent.push(now);
      hits.set(key, recent);
      return true;
    },
  };
}

export interface LeadServerEnv {
  LEADS_TO?: string | undefined;
  LEAD_WEBHOOK_URL?: string | undefined;
  LEAD_WEBHOOK_SECRET?: string | undefined;
  TURNSTILE_SECRET_KEY?: string | undefined;
}

export interface LeadServerContext {
  mailer: Mailer | null;
  render: RenderContext;
  env: LeadServerEnv;
  limiter: RateLimiter;
  /** Adresse IP ou autre clé de limitation ; "inconnue" sinon. */
  ip: string;
  now?: Date;
  fetchImpl?: typeof fetch;
  log?: (line: string) => void;
}

export interface LeadResult {
  status: 202 | 400 | 403 | 429 | 503;
  body: { ok: boolean; id?: string; erreur?: string };
}

export function signWebhook(secret: string, body: string): string {
  return `sha256=${createHmac("sha256", secret).update(body).digest("hex")}`;
}

async function verifyTurnstile(
  secret: string,
  token: string | undefined,
  ip: string,
  fetchImpl: typeof fetch,
): Promise<boolean> {
  if (!token) return false;
  try {
    const response = await fetchImpl("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret, response: token, remoteip: ip }),
    });
    const data = (await response.json()) as { success?: boolean };
    return data.success === true;
  } catch {
    return false;
  }
}

async function postWebhook(lead: LeadPayload, env: LeadServerEnv, fetchImpl: typeof fetch) {
  if (!env.LEAD_WEBHOOK_URL) return "aucun";
  const body = JSON.stringify(lead);
  try {
    const response = await fetchImpl(env.LEAD_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(env.LEAD_WEBHOOK_SECRET
          ? { "X-Signature": signWebhook(env.LEAD_WEBHOOK_SECRET, body) }
          : {}),
      },
      body,
    });
    return response.ok ? "envoyé" : `refusé ${response.status}`;
  } catch {
    return "échec";
  }
}

export async function handleLead(input: unknown, ctx: LeadServerContext): Promise<LeadResult> {
  const now = ctx.now ?? new Date();
  // Journal opérationnel (identifiant, formulaire, statut) : jamais le contenu de la demande.
  const log = ctx.log ?? ((line: string) => console.warn(line));
  const fetchImpl = ctx.fetchImpl ?? fetch;

  const parsed = submitBodySchema.safeParse(input);
  if (!parsed.success) {
    log("lead refusé : corps invalide");
    return { status: 400, body: { ok: false, erreur: "demande invalide" } };
  }
  const { lead, meta } = parsed.data;

  if (meta.honeypot.trim() !== "") {
    log(`lead ${lead.id} ${lead.form} ignoré (champ piège)`);
    return { status: 202, body: { ok: true, id: lead.id } };
  }
  const started = Date.parse(meta.startedAt);
  if (Number.isNaN(started) || now.getTime() - started < MIN_FILL_SECONDS * 1000) {
    log(`lead ${lead.id} ${lead.form} refusé (trop rapide)`);
    return { status: 400, body: { ok: false, erreur: "trop rapide" } };
  }
  if (!ctx.limiter.allow(ctx.ip, now.getTime())) {
    log(`lead ${lead.id} ${lead.form} refusé (limite d'envois)`);
    return { status: 429, body: { ok: false, erreur: "trop de demandes" } };
  }
  if (ctx.env.TURNSTILE_SECRET_KEY) {
    const ok = await verifyTurnstile(
      ctx.env.TURNSTILE_SECRET_KEY,
      meta.turnstileToken,
      ctx.ip,
      fetchImpl,
    );
    if (!ok) {
      log(`lead ${lead.id} ${lead.form} refusé (vérification anti-robots)`);
      return { status: 403, body: { ok: false, erreur: "vérification anti-robots" } };
    }
  }

  if (!ctx.mailer || !ctx.env.LEADS_TO) {
    log(`lead ${lead.id} ${lead.form} non envoyé (messagerie non configurée)`);
    return { status: 503, body: { ok: false, erreur: "envoi indisponible" } };
  }

  try {
    const team = renderTeamEmail(lead, ctx.render);
    await ctx.mailer.send({
      to: ctx.env.LEADS_TO,
      ...(lead.contact.email ? { replyTo: lead.contact.email } : {}),
      ...team,
    });
  } catch {
    log(`lead ${lead.id} ${lead.form} échec d'envoi`);
    return { status: 503, body: { ok: false, erreur: "envoi indisponible" } };
  }

  let ack = "sans e-mail";
  if (lead.contact.email) {
    try {
      await ctx.mailer.send({ to: lead.contact.email, ...renderAcknowledgement(lead, ctx.render) });
      ack = "envoyé";
    } catch {
      ack = "échec";
    }
  }
  const webhook = await postWebhook(lead, ctx.env, fetchImpl);
  log(`lead ${lead.id} ${lead.form} envoyé (accusé : ${ack}, webhook : ${webhook})`);
  return { status: 202, body: { ok: true, id: lead.id } };
}
