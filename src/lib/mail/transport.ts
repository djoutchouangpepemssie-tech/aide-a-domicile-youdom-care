import nodemailer from "nodemailer";
import type { RenderedMail } from "./render";

/*
 * Transport SMTP (docs/05 §7) : SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, LEADS_FROM,
 * LEADS_TO. Chiffré : TLS implicite sur le port 465, STARTTLS exigé sinon. Sans SMTP_HOST, le
 * transport n'existe pas et l'envoi échoue proprement (le formulaire garde la saisie).
 */

/** Pièce jointe (CV d'une candidature, P8.2) : le contenu ne transite que vers la boîte de l'équipe. */
export interface MailAttachment {
  filename: string;
  content: Buffer;
  contentType: string;
}

export interface Mailer {
  send(
    input: { to: string; replyTo?: string; attachments?: MailAttachment[] } & RenderedMail,
  ): Promise<void>;
}

export interface MailEnv {
  SMTP_HOST?: string | undefined;
  SMTP_PORT?: string | undefined;
  SMTP_USER?: string | undefined;
  SMTP_PASS?: string | undefined;
  LEADS_FROM?: string | undefined;
  LEADS_TO?: string | undefined;
  /** Tests seulement : accepte un serveur SMTP local sans TLS. */
  SMTP_ALLOW_INSECURE?: string | undefined;
}

export function mailerFromEnv(env: MailEnv = process.env as MailEnv): Mailer | null {
  if (!env.SMTP_HOST || !env.LEADS_FROM) return null;
  const port = Number(env.SMTP_PORT ?? "465");
  const insecure = env.SMTP_ALLOW_INSECURE === "true";
  const transport = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port,
    secure: port === 465,
    requireTLS: !insecure && port !== 465,
    ignoreTLS: insecure,
    ...(env.SMTP_USER ? { auth: { user: env.SMTP_USER, pass: env.SMTP_PASS ?? "" } } : {}),
  });
  const from = env.LEADS_FROM;
  return {
    async send({ to, replyTo, subject, html, text, attachments }) {
      await transport.sendMail({
        from,
        to,
        ...(replyTo ? { replyTo } : {}),
        subject,
        text,
        html,
        ...(attachments && attachments.length > 0 ? { attachments } : {}),
      });
    },
  };
}
