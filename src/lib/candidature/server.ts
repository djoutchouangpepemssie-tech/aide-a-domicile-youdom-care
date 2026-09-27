import { MIN_FILL_SECONDS, type RateLimiter } from "@/lib/lead/server";
import type { Mailer } from "@/lib/mail/transport";
import {
  renderCandidatureAcknowledgement,
  renderCandidatureTeamEmail,
  type CandidatureRenderContext,
} from "./render";
import {
  candidatureMetaSchema,
  candidatureSchema,
  checkCvFile,
  cvMimeTypes,
  safeCvFilename,
  type CvRejection,
} from "./schema";

/*
 * Traitement d'une candidature côté serveur (docs/05 §2, §6 à §8 ; docs/07 §6), indépendant de
 * Next pour être testé avec un transport simulé :
 * - validation Zod stricte des champs et de la méta ; contrôle du CV (taille, type, signature) ;
 * - anti-robots sans friction : champ piège (202 silencieux, rien n'est envoyé), délai minimal de
 *   remplissage, limite d'envois par adresse (même limiteur que api/lead) ;
 * - e-mail à l'équipe avec le CV en pièce jointe, accusé de réception au candidat ;
 * - aucun stockage, aucune journalisation du contenu : identifiant, statut, motif technique.
 */

export interface CandidatureFile {
  name: string;
  type: string;
  size: number;
  bytes: Buffer;
}

export interface CandidatureInput {
  /** Champs du formulaire, déjà décodés du JSON ; `unknown` tant qu'ils ne sont pas validés. */
  fields: unknown;
  meta: unknown;
  file: CandidatureFile | null;
}

export interface CandidatureServerEnv {
  LEADS_TO?: string | undefined;
}

export interface CandidatureServerContext {
  mailer: Mailer | null;
  render: CandidatureRenderContext;
  env: CandidatureServerEnv;
  limiter: RateLimiter;
  ip: string;
  now?: Date;
  log?: (line: string) => void;
}

export interface CandidatureResult {
  status: 202 | 400 | 422 | 429 | 503;
  body: { ok: boolean; id?: string; erreur?: string; cv?: CvRejection };
}

export async function handleCandidature(
  input: CandidatureInput,
  ctx: CandidatureServerContext,
): Promise<CandidatureResult> {
  const now = ctx.now ?? new Date();
  // Journal opérationnel (identifiant, statut) : jamais le contenu ni le nom du candidat.
  const log = ctx.log ?? ((line: string) => console.warn(line));

  const meta = candidatureMetaSchema.safeParse(input.meta);
  const fields = candidatureSchema.safeParse(input.fields);
  if (!meta.success || !fields.success) {
    log("candidature refusée : corps invalide");
    return { status: 400, body: { ok: false, erreur: "candidature invalide" } };
  }
  const candidature = fields.data;

  if (meta.data.honeypot.trim() !== "") {
    log(`candidature ${candidature.id} ignorée (champ piège)`);
    return { status: 202, body: { ok: true, id: candidature.id } };
  }
  const started = Date.parse(meta.data.startedAt);
  if (Number.isNaN(started) || now.getTime() - started < MIN_FILL_SECONDS * 1000) {
    log(`candidature ${candidature.id} refusée (trop rapide)`);
    return { status: 400, body: { ok: false, erreur: "trop rapide" } };
  }

  const cv = checkCvFile(
    input.file
      ? {
          name: input.file.name,
          type: input.file.type,
          size: input.file.size,
          head: input.file.bytes.subarray(0, 4),
        }
      : null,
  );
  if (!cv.ok || !cv.kind || !input.file) {
    log(`candidature ${candidature.id} refusée (CV : ${cv.reason ?? "inconnu"})`);
    return {
      status: 422,
      body: { ok: false, erreur: "CV refusé", ...(cv.reason ? { cv: cv.reason } : {}) },
    };
  }

  if (!ctx.limiter.allow(ctx.ip, now.getTime())) {
    log(`candidature ${candidature.id} refusée (limite d'envois)`);
    return { status: 429, body: { ok: false, erreur: "trop de demandes" } };
  }

  if (!ctx.mailer || !ctx.env.LEADS_TO) {
    log(`candidature ${candidature.id} non envoyée (messagerie non configurée)`);
    return { status: 503, body: { ok: false, erreur: "envoi indisponible" } };
  }

  const filename = safeCvFilename(input.file.name, cv.kind);
  try {
    const team = renderCandidatureTeamEmail(
      candidature,
      { filename, size: input.file.size },
      ctx.render,
    );
    await ctx.mailer.send({
      to: ctx.env.LEADS_TO,
      replyTo: candidature.contact.email,
      ...team,
      attachments: [{ filename, content: input.file.bytes, contentType: cvMimeTypes[cv.kind] }],
    });
  } catch {
    log(`candidature ${candidature.id} échec d'envoi`);
    return { status: 503, body: { ok: false, erreur: "envoi indisponible" } };
  }

  let ack = "envoyé";
  try {
    await ctx.mailer.send({
      to: candidature.contact.email,
      ...renderCandidatureAcknowledgement(candidature, ctx.render),
    });
  } catch {
    ack = "échec";
  }
  log(`candidature ${candidature.id} envoyée (accusé : ${ack})`);
  return { status: 202, body: { ok: true, id: candidature.id } };
}
