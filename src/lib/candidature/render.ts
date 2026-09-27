import type { EmailTexts, InterfaceTexts } from "@/content/schemas";
import { escapeHtml, type RenderedMail } from "@/lib/mail/render";
import { formatFrenchPhone, toTelHref } from "@/lib/phone";
import { formatFileSize, type CandidaturePayload } from "./schema";

/*
 * E-mails d'une candidature (docs/05 §2 et §7, P8.2) :
 * - alerte à l'équipe : coordonnées avec lien tel:, secteur souhaité, disponibilité, offre
 *   concernée ou candidature spontanée, message, CV nommé dans le corps et joint au message ;
 * - accusé de réception au candidat : aucun détail de la candidature, le téléphone de Youdom Care.
 * Le contenu n'est jamais journalisé ni stocké : la boîte de réception est le seul lieu de
 * conservation (docs/05 §8).
 */

export interface CandidatureRenderContext {
  emails: EmailTexts;
  interfaceTexts: Pick<InterfaceTexts, "recrutement">;
  /** Téléphone principal de Youdom Care, formaté ; null s'il est inconnu. */
  phone: string | null;
  /** Nom des départements par code (site.config.json > zones). */
  departements: Record<string, string>;
  /** Titre des offres publiées par slug, pour nommer l'offre concernée. */
  offres: Record<string, string>;
}

export interface CvSummary {
  filename: string;
  size: number;
}

const dateFormat = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "full",
  timeStyle: "short",
  timeZone: "Europe/Paris",
});

export function candidatureSubject(
  candidature: CandidaturePayload,
  ctx: CandidatureRenderContext,
): string {
  const departement = ctx.departements[candidature.departement] ?? candidature.departement;
  return ctx.emails.candidature.objet.replace("{departement}", departement);
}

export function renderCandidatureTeamEmail(
  candidature: CandidaturePayload,
  cv: CvSummary,
  ctx: CandidatureRenderContext,
): RenderedMail {
  const t = ctx.emails.candidature;
  const { contact } = candidature;
  const phone = formatFrenchPhone(contact.telephone);
  const telHref = toTelHref(contact.telephone) ?? `tel:${contact.telephone}`;
  const departement = ctx.departements[candidature.departement] ?? candidature.departement;
  const offre = candidature.offre
    ? (ctx.offres[candidature.offre] ?? candidature.offre)
    : t.candidature_spontanee;
  const cvLine = t.cv_joint
    .replace("{nom}", cv.filename)
    .replace("{taille}", formatFileSize(cv.size));

  const sections: { title: string; lines: string[]; html?: string }[] = [
    {
      title: t.coordonnees,
      lines: [`${contact.prenom} ${contact.nom}`, phone, contact.email],
      html:
        `<p><strong>${escapeHtml(`${contact.prenom} ${contact.nom}`)}</strong><br>` +
        `<a href="${escapeHtml(telHref)}" style="font-size:18px;">${escapeHtml(phone)}</a><br>` +
        `<a href="mailto:${escapeHtml(contact.email)}">${escapeHtml(contact.email)}</a></p>`,
    },
    {
      title: t.secteur,
      lines: [
        `${t.departement} : ${departement}`,
        ...(candidature.commune
          ? [`${t.commune} : ${candidature.commune.nom} (${candidature.commune.codePostal})`]
          : []),
      ],
    },
    { title: t.disponibilite, lines: [candidature.disponibilite] },
    { title: t.offre, lines: [offre] },
    ...(candidature.message ? [{ title: t.message, lines: [candidature.message] }] : []),
    { title: t.cv, lines: [cvLine] },
    {
      title: t.origine,
      lines: [
        candidature.sourcePage,
        t.consentement.replace("{version}", candidature.consentement.version),
        t.recu_le.replace("{date}", dateFormat.format(new Date(candidature.createdAt))),
      ],
    },
  ];

  const subject = candidatureSubject(candidature, ctx);
  const text =
    `${subject}\n\n` +
    sections.map((s) => `${s.title}\n${s.lines.map((l) => `  ${l}`).join("\n")}`).join("\n\n") +
    "\n";
  const html =
    `<!doctype html><html lang="fr"><body style="font-family:system-ui,sans-serif;font-size:16px;line-height:1.5;color:#1f1d1a;max-width:640px;margin:0 auto;padding:16px;">` +
    `<h1 style="font-size:20px;">${escapeHtml(subject)}</h1>` +
    sections
      .map(
        (s) =>
          `<h2 style="font-size:16px;margin:20px 0 6px;color:#005a6b;">${escapeHtml(s.title)}</h2>` +
          (s.html ?? `<p>${s.lines.map(escapeHtml).join("<br>")}</p>`),
      )
      .join("") +
    `</body></html>`;
  return { subject, html, text };
}

export function renderCandidatureAcknowledgement(
  candidature: CandidaturePayload,
  ctx: CandidatureRenderContext,
): RenderedMail {
  const t = ctx.emails.candidature;
  const body = t.accuse_corps
    .replace("{prénom}", candidature.contact.prenom)
    .replace("{téléphone}", ctx.phone ?? "");
  const signature = ctx.emails.accuse.signature;
  const text = `${body}\n\n${signature}\n`;
  const html =
    `<!doctype html><html lang="fr"><body style="font-family:system-ui,sans-serif;font-size:16px;line-height:1.6;color:#1f1d1a;max-width:640px;margin:0 auto;padding:16px;">` +
    `<p>${escapeHtml(body)}</p><p>${escapeHtml(signature)}</p></body></html>`;
  return { subject: t.accuse_objet, html, text };
}
