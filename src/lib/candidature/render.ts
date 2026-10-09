import type { EmailTexts, InterfaceTexts } from "@/content/schemas";
import {
  escapeHtml,
  renderMailDocument,
  sanitizeSubject,
  type MailRow,
  type MailSection,
  type RenderedMail,
} from "@/lib/mail/layout";
import { renderSimpleMail } from "@/lib/mail/render";
import { formatFrenchPhone, toTelHref } from "@/lib/phone";
import { formatFileSize, type CandidaturePayload } from "./schema";

/*
 * E-mails d'une candidature (docs/05 §2 et §7, P8.2), sur la maquette commune de
 * src/lib/mail/layout.ts — la même que l'alerte de demande, pour que l'équipe lise les deux de la
 * même façon :
 * - alerte à l'équipe : coordonnées en tête avec le numéro en bouton d'appel et l'adresse
 *   cliquable, puis la candidature (secteur, disponibilité, offre, message, CV), puis la
 *   traçabilité en petit. Le CV est nommé dans le corps et joint au message ;
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
  return sanitizeSubject(ctx.emails.candidature.objet.replace("{departement}", departement));
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

  const applicationRows: MailRow[] = [
    { label: t.departement, value: departement },
    ...(candidature.commune
      ? [
          {
            label: t.commune,
            value: `${candidature.commune.nom} (${candidature.commune.codePostal})`,
          },
        ]
      : []),
    { label: t.disponibilite, value: candidature.disponibilite },
    { label: t.offre, value: offre },
    { label: t.cv, value: cvLine },
  ];

  const sections: MailSection[] = [
    { kind: "rows", title: t.titre_candidature, rows: applicationRows },
    ...(candidature.message
      ? [
          {
            kind: "rich" as const,
            title: t.message,
            lines: candidature.message.split("\n"),
            html: `<p style="margin:0;white-space:pre-wrap;">${escapeHtml(candidature.message)}</p>`,
          },
        ]
      : []),
    {
      kind: "rows",
      title: t.titre_tracabilite,
      rows: [
        {
          label: t.recu_le.replace("{date}", "").trim(),
          value: dateFormat.format(new Date(candidature.createdAt)),
        },
        { label: t.origine, value: candidature.sourcePage },
        { label: t.reference, value: candidature.id },
      ],
    },
  ];

  const subject = candidatureSubject(candidature, ctx);
  const { html, text } = renderMailDocument({
    subject,
    preheader: [`${contact.prenom} ${contact.nom}`, departement, candidature.disponibilite].join(
      " · ",
    ),
    hero: {
      eyebrow: [t.secteur, departement].join(" · "),
      name: `${contact.prenom} ${contact.nom}`,
      phone: { display: phone, href: telHref, callLabel: ctx.emails.equipe.appeler },
      email: contact.email,
      lines: [t.consentement.replace("{version}", candidature.consentement.version)],
    },
    sections,
  });
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
  return renderSimpleMail(t.accuse_objet, body, ctx.emails.accuse.signature);
}
