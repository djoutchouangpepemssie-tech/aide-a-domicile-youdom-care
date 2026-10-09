import type { EmailTexts, InterfaceTexts } from "@/content/schemas";
import type { LeadPayload } from "@/lib/lead/schema";
import { formatFrenchPhone, toTelHref } from "@/lib/phone";
import { weekDays, weekSlots, type WeekDay, type WeekSlot } from "@/lib/week/week";
import {
  escapeHtml,
  mailColors,
  renderMailDocument,
  sanitizeSubject,
  type MailBadge,
  type MailRow,
  type MailSection,
  type RenderedMail,
} from "./layout";

/*
 * Rendu des deux e-mails de docs/05 §7 et docs/01 §9, sur la maquette commune de ./layout.ts.
 *
 * - Alerte à l'équipe : l'objet ne porte que le formulaire, la commune et l'urgence — jamais une
 *   donnée de santé. Le corps place d'abord ce qui sert à agir (qui appeler, à quel numéro, pour
 *   quand), puis la demande, puis le contexte, puis la traçabilité en petit.
 * - Accusé de réception au demandeur : le texte de docs/01 §9 et rien d'autre. Aucun détail de la
 *   demande n'y figure, parce que nous ne maîtrisons pas la sécurité de cette boîte.
 *
 * Le `LeadPayload` complet ferme le message, dans un bloc discret : il reste dans le corps de
 * l'e-mail à l'équipe, seul endroit autorisé pour une donnée de santé (CLAUDE.md), et n'est donc
 * ni mis en pièce jointe ni envoyé ailleurs.
 */

export type { RenderedMail };
export { escapeHtml, sanitizeSubject };

export interface RenderContext {
  emails: EmailTexts;
  interfaceTexts: Pick<InterfaceTexts, "semaine_type" | "planning">;
  /** Téléphone principal de Youdom Care, formaté ; null s'il est inconnu. */
  phone: string | null;
  /** Délai de rappel promis (site.config + E5 validé), null sinon. */
  callbackDelay: string | null;
  /** Nom des agences par identifiant. */
  agencies: Record<string, string>;
  /**
   * Intitulé des questions de situation, par clé, pour le formulaire donné. La route le branche
   * sur content/formulaires/ ; sans lui l'e-mail retomberait sur la clé technique. C'est une
   * fonction et non une table parce que les clés ne sont uniques qu'à l'intérieur d'un
   * formulaire, et que le formulaire n'est connu qu'après analyse du corps de la requête.
   */
  questionLabels?: (form: LeadPayload["form"]) => Record<string, string>;
}

const dateFormat = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "full",
  timeStyle: "short",
  timeZone: "Europe/Paris",
});
const dayFormat = new Intl.DateTimeFormat("fr-FR", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

function formatDay(iso: string): string {
  return dayFormat.format(new Date(`${iso}T12:00:00Z`));
}

function answerToText(answer: string | string[]): string {
  return Array.isArray(answer) ? answer.join(", ") : answer;
}

/**
 * Libellé lisible d'une clé de situation : l'intitulé de la question quand le formulaire le
 * fournit, sinon celui de content/emails.json, sinon la clé rendue présentable (`date_sortie` →
 * « Date sortie »). Le dernier recours ne doit jamais servir — il évite seulement qu'une clé
 * technique nue parte chez le client si un formulaire ajoute une question sans libellé.
 */
function situationLabel(key: string, labels: Record<string, string>, ctx: RenderContext): string {
  const fromForm = labels[key];
  if (fromForm) return fromForm;
  const known = ctx.emails.equipe.libelles_situation as Record<string, string>;
  if (known[key]) return known[key];
  const words = key.replace(/_/g, " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/** Ton du bandeau d'urgence : le délai se lit à la couleur, et reste écrit en toutes lettres. */
function urgencyTone(urgence: LeadPayload["urgence"]): MailBadge["tone"] {
  if (urgence === "48h") return "urgent";
  if (urgence === "semaine") return "attention";
  return "calme";
}

const cellStyle = `border:1px solid ${mailColors.line};padding:7px 9px;text-align:center;`;
const headStyle = `border:1px solid ${mailColors.line};padding:7px 9px;text-align:left;background:${mailColors.sand};font-weight:600;`;

function planningSections(lead: LeadPayload, ctx: RenderContext): MailSection[] {
  const { planning } = lead;
  if (!planning) return [];
  const t = ctx.emails.equipe;
  const days = ctx.interfaceTexts.semaine_type.jours;
  const slots = ctx.interfaceTexts.semaine_type.creneaux;
  const lines: string[] = [t.rythmes[planning.rythme]];
  let html = `<p style="margin:0 0 10px;font-weight:600;">${escapeHtml(t.rythmes[planning.rythme])}</p>`;

  if (planning.grille) {
    const grid = planning.grille;
    const rows = weekSlots
      .map((slot) => {
        const cells = weekDays
          .map((day) => `<td style="${cellStyle}">${grid[day]?.includes(slot) ? "✔" : "·"}</td>`)
          .join("");
        return `<tr><th scope="row" style="${headStyle}">${escapeHtml(slots[slot])}</th>${cells}</tr>`;
      })
      .join("");
    const head = weekDays
      .map(
        (day) =>
          `<th scope="col" style="${headStyle}text-align:center;">${escapeHtml(days[day].slice(0, 3))}</th>`,
      )
      .join("");
    html +=
      `<table border="0" cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-size:13px;margin:0 0 10px;">` +
      `<thead><tr><td></td>${head}</tr></thead><tbody>${rows}</tbody></table>`;
    for (const day of weekDays) {
      const chosen = grid[day];
      if (chosen && chosen.length > 0) {
        lines.push(`${days[day]} : ${chosen.map((slot: WeekSlot) => slots[slot]).join(", ")}`);
      }
    }
  }

  if (planning.plages) {
    const items: string[] = [];
    for (const day of weekDays) {
      const ranges = planning.plages[day as WeekDay];
      if (ranges && ranges.length > 0) {
        const text = `${days[day]} : ${ranges.map((r) => `${r.debut} – ${r.fin}`).join(", ")}`;
        lines.push(text);
        items.push(`<li>${escapeHtml(text)}</li>`);
      }
    }
    if (items.length > 0)
      html += `<ul style="margin:0 0 10px;padding-left:20px;">${items.join("")}</ul>`;
  }

  const extras: [string, string | undefined][] = [
    [planning.rythme === "24h" ? t.urgence : t.dates, planning.dates?.map(formatDay).join(", ")],
    [t.creneaux_dates, planning.creneaux?.map((slot) => slots[slot]).join(", ")],
    [t.duree, planning.duree ? t.durees[planning.duree] : undefined],
    [t.nuit, planning.nuit ? t.nuits[planning.nuit] : undefined],
  ];
  for (const [label, value] of extras) {
    if (value === undefined) continue;
    lines.push(`${label} : ${value}`);
    html += `<p style="margin:0 0 6px;"><span style="color:${mailColors.inkSoft};">${escapeHtml(label)} :</span> ${escapeHtml(value)}</p>`;
  }
  if (planning.heuresParSemaine !== undefined) {
    const text = t.heures.replace("{h}", String(planning.heuresParSemaine));
    lines.push(text);
    html += `<p style="margin:10px 0 0;font-weight:700;color:${mailColors.teal800};">${escapeHtml(text)}</p>`;
  }
  return [{ kind: "rich", title: t.planning, lines, html }];
}

export function teamSubject(lead: LeadPayload, ctx: RenderContext): string {
  const t = ctx.emails.equipe;
  const urgency = ctx.interfaceTexts.planning.debuts[lead.urgence];
  const form = t.formulaires[lead.form];
  const subject = lead.commune
    ? t.objet
        .replace("{formulaire}", form)
        .replace("{commune}", lead.commune.nom)
        .replace("{urgence}", urgency)
    : t.objet_sans_commune.replace("{formulaire}", form).replace("{urgence}", urgency);
  return sanitizeSubject(subject);
}

export function renderTeamEmail(lead: LeadPayload, ctx: RenderContext): RenderedMail {
  const t = ctx.emails.equipe;
  const urgency = ctx.interfaceTexts.planning.debuts[lead.urgence];
  const phone = formatFrenchPhone(lead.contact.telephone);
  const telHref = toTelHref(lead.contact.telephone) ?? `tel:${lead.contact.telephone}`;
  const sections: MailSection[] = [];
  const labels = ctx.questionLabels?.(lead.form) ?? {};

  // La demande : « pour qui », puis une ligne par question posée, avec son intitulé réel.
  const situationRows: MailRow[] = [];
  if (lead.pourQui) situationRows.push({ label: t.pour_qui, value: lead.pourQui });
  for (const [key, answer] of Object.entries(lead.situation ?? {})) {
    situationRows.push({ label: situationLabel(key, labels, ctx), value: answerToText(answer) });
  }
  if (situationRows.length > 0) {
    sections.push({ kind: "rows", title: t.situation, rows: situationRows });
  }

  if (lead.besoins && lead.besoins.length > 0) {
    sections.push({
      kind: "rich",
      title: t.besoins,
      lines: lead.besoins,
      html: `<ul style="margin:0;padding-left:20px;">${lead.besoins.map((b) => `<li style="margin-bottom:3px;">${escapeHtml(b)}</li>`).join("")}</ul>`,
    });
  }

  sections.push(...planningSections(lead, ctx));

  if (lead.message) {
    sections.push({
      kind: "rich",
      title: t.message,
      lines: lead.message.split("\n"),
      // Un message est un champ libre : les retours à la ligne du demandeur sont conservés.
      html: `<p style="margin:0;white-space:pre-wrap;">${escapeHtml(lead.message)}</p>`,
    });
  }

  // L'urgence est portée par le bandeau en tête : ne pas la répéter ici.
  const contextRows: MailRow[] = [];
  if (lead.commune) {
    contextRows.push({
      label: t.commune,
      value: `${lead.commune.nom} (${lead.commune.codePostal})`,
    });
  }
  if (lead.agenceProche) {
    contextRows.push({
      label: t.agence,
      value: ctx.agencies[lead.agenceProche] ?? lead.agenceProche,
    });
  }
  // Le formulaire de contact n'a ni commune ni agence : pas de bloc vide (D-021).
  if (contextRows.length > 0) {
    sections.push({ kind: "rows", title: t.titre_contexte, rows: contextRows });
  }

  sections.push({
    kind: "rows",
    title: t.titre_tracabilite,
    rows: [
      // « Reçue le {date} » devient l'intitulé « Reçue le » et la date en valeur, pour tenir dans
      // le tableau à deux colonnes sans répéter le mot « date ».
      {
        label: t.recu_le.replace("{date}", "").trim(),
        value: dateFormat.format(new Date(lead.createdAt)),
      },
      { label: t.origine, value: lead.sourcePage },
      {
        label: t.consentement,
        value: `${lead.consentement.sante ? t.oui : t.non} (${t.version_consentement.replace("{version}", lead.consentement.version)})`,
      },
      { label: t.reference, value: lead.id },
    ],
  });

  // Réservé à la version texte du message : voir MailSection « textOnly » dans ./layout.ts.
  sections.push({ kind: "textOnly", title: t.json, content: JSON.stringify(lead, null, 2) });

  const subject = teamSubject(lead, ctx);
  const { html, text } = renderMailDocument({
    subject,
    // Aperçu dans la liste des messages : le délai et le numéro, pour décider sans ouvrir.
    preheader: [urgency, phone, lead.commune?.nom].filter(Boolean).join(" · "),
    hero: {
      eyebrow: [t.formulaires[lead.form], lead.commune?.nom].filter(Boolean).join(" · "),
      name: `${lead.contact.prenom} ${lead.contact.nom}`,
      phone: { display: phone, href: telHref, callLabel: t.appeler },
      ...(lead.contact.email ? { email: lead.contact.email } : {}),
      ...(lead.contact.rappel ? { lines: [`${t.rappel_prefere} : ${lead.contact.rappel}`] } : {}),
      badge: { label: `${t.urgence} : ${urgency}`, tone: urgencyTone(lead.urgence) },
    },
    sections,
  });
  return { subject, html, text };
}

export function renderAcknowledgement(lead: LeadPayload, ctx: RenderContext): RenderedMail {
  const t = ctx.emails.accuse;
  const body = t.corps
    .replace("{prénom}", lead.contact.prenom)
    .replace("{délai}", ctx.callbackDelay ?? t.delai_inconnu)
    .replace("{téléphone}", ctx.phone ?? "");
  return renderSimpleMail(t.objet, body, t.signature);
}

/**
 * Accusé de réception : une maquette sobre, sans aucun détail de la demande (docs/01 §9). Elle ne
 * passe pas par `renderMailDocument`, qui est fait pour des fiches à champs ; ici il n'y a qu'un
 * paragraphe et une signature, et c'est voulu.
 */
export function renderSimpleMail(subject: string, body: string, signature: string): RenderedMail {
  const FONT =
    "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Helvetica,Arial,sans-serif";
  const html =
    `<!doctype html><html lang="fr"><head><meta charset="utf-8">` +
    `<meta name="viewport" content="width=device-width,initial-scale=1">` +
    `<meta name="color-scheme" content="light only">` +
    `<title>${escapeHtml(subject)}</title>` +
    `<!--[if mso]><style>table,td,p,a{font-family:Arial,Helvetica,sans-serif !important;}</style><![endif]-->` +
    `</head><body style="margin:0;padding:0;background:${mailColors.paper};-webkit-text-size-adjust:100%;">` +
    `<table role="presentation" border="0" cellpadding="0" cellspacing="0" style="width:100%;background:${mailColors.paper};">` +
    `<tr><td align="center" style="padding:24px 12px;">` +
    `<!--[if mso]><table role="presentation" border="0" cellpadding="0" cellspacing="0" width="560" align="center"><tr><td><![endif]-->` +
    `<table role="presentation" border="0" cellpadding="0" cellspacing="0" style="width:100%;max-width:560px;background:${mailColors.white};border-radius:14px;border:1px solid ${mailColors.line};">` +
    `<tr><td style="background:${mailColors.teal900};padding:16px 24px;border-radius:13px 13px 0 0;">` +
    `<p style="margin:0;font:700 15px/1.3 ${FONT};letter-spacing:.04em;color:${mailColors.white};">YOUDOM CARE</p>` +
    `</td></tr>` +
    `<tr><td style="padding:24px;">` +
    `<p style="margin:0 0 18px;font:400 17px/1.65 ${FONT};color:${mailColors.ink};">${escapeHtml(body)}</p>` +
    `<p style="margin:0;font:600 15px/1.5 ${FONT};color:${mailColors.teal800};">${escapeHtml(signature)}</p>` +
    `</td></tr></table>` +
    `<!--[if mso]></td></tr></table><![endif]-->` +
    `</td></tr></table></body></html>`;
  return { subject, html, text: `${body}\n\n${signature}\n` };
}
