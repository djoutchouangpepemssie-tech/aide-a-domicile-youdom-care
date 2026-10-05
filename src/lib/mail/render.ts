import type { EmailTexts, InterfaceTexts } from "@/content/schemas";
import type { LeadPayload } from "@/lib/lead/schema";
import { formatFrenchPhone, toTelHref } from "@/lib/phone";
import { weekDays, weekSlots, type WeekDay, type WeekSlot } from "@/lib/week/week";

/*
 * Rendu des deux e-mails de docs/05 §7 et docs/01 §9.
 * - Alerte à l'équipe : objet sans donnée de santé (formulaire, commune, urgence) ; corps HTML
 *   lisible sur téléphone : coordonnées avec lien tel:, urgence, situation et besoins, planning
 *   en tableau, estimation, page d'origine, agence ; le LeadPayload en JSON dans un bloc
 *   repliable. Une version texte accompagne le HTML.
 * - Accusé de réception : texte de docs/01 §9, aucun détail de la demande.
 */

export interface RenderedMail {
  subject: string;
  html: string;
  text: string;
}

export interface RenderContext {
  emails: EmailTexts;
  interfaceTexts: Pick<InterfaceTexts, "semaine_type" | "planning">;
  /** Téléphone principal de Youdom Care, formaté ; null s'il est inconnu. */
  phone: string | null;
  /** Délai de rappel promis (site.config + E5 validé), null sinon. */
  callbackDelay: string | null;
  /** Nom des agences par identifiant. */
  agencies: Record<string, string>;
}

/**
 * Objet d'e-mail assaini : un retour chariot dans un champ libre (le nom d'une commune, par
 * exemple) terminerait l'en-tête `Subject` et laisserait injecter les suivants. `nodemailer`
 * neutralise déjà le cas, mais la garantie ne doit pas dépendre d'une dépendance : les sauts de
 * ligne et les caractères de commande deviennent une espace, les espaces sont repliées.
 */
export function sanitizeSubject(value: string): string {
  return value
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
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

const cellStyle = "border:1px solid #d9d4cb;padding:6px 8px;text-align:center;";
const headStyle = "border:1px solid #d9d4cb;padding:6px 8px;text-align:left;background:#f4f1ea;";

interface Section {
  title: string;
  /** Lignes en texte brut. */
  lines: string[];
  /** Fragment HTML (déjà échappé) ; par défaut, les lignes. */
  html?: string;
}

function planningSections(lead: LeadPayload, ctx: RenderContext): Section[] {
  const { planning } = lead;
  if (!planning) return [];
  const t = ctx.emails.equipe;
  const days = ctx.interfaceTexts.semaine_type.jours;
  const slots = ctx.interfaceTexts.semaine_type.creneaux;
  const lines: string[] = [t.rythmes[planning.rythme]];
  let html = `<p>${escapeHtml(t.rythmes[planning.rythme])}</p>`;

  if (planning.grille) {
    const grid = planning.grille;
    const rows = weekSlots
      .map((slot) => {
        const cells = weekDays
          .map((day) => `<td style="${cellStyle}">${grid[day]?.includes(slot) ? "✔" : ""}</td>`)
          .join("");
        return `<tr><th scope="row" style="${headStyle}">${escapeHtml(slots[slot])}</th>${cells}</tr>`;
      })
      .join("");
    const head = weekDays
      .map(
        (day) => `<th scope="col" style="${headStyle}">${escapeHtml(days[day].slice(0, 3))}</th>`,
      )
      .join("");
    html += `<table style="border-collapse:collapse;font-size:14px;"><thead><tr><td></td>${head}</tr></thead><tbody>${rows}</tbody></table>`;
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
    html += `<ul>${items.join("")}</ul>`;
  }

  if (planning.dates) {
    const label = planning.rythme === "24h" ? t.urgence : t.dates;
    const text = `${label} : ${planning.dates.map(formatDay).join(", ")}`;
    lines.push(text);
    html += `<p>${escapeHtml(text)}</p>`;
  }
  if (planning.creneaux) {
    const text = `${t.creneaux_dates} : ${planning.creneaux.map((slot) => slots[slot]).join(", ")}`;
    lines.push(text);
    html += `<p>${escapeHtml(text)}</p>`;
  }
  if (planning.duree) {
    const text = `${t.duree} : ${t.durees[planning.duree]}`;
    lines.push(text);
    html += `<p>${escapeHtml(text)}</p>`;
  }
  if (planning.heuresParSemaine !== undefined) {
    const text = t.heures.replace("{h}", String(planning.heuresParSemaine));
    lines.push(text);
    html += `<p><strong>${escapeHtml(text)}</strong></p>`;
  }
  if (planning.nuit) {
    const text = `${t.nuit} : ${t.nuits[planning.nuit]}`;
    lines.push(text);
    html += `<p>${escapeHtml(text)}</p>`;
  }
  return [{ title: t.planning, lines, html }];
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
  const sections: Section[] = [];

  const phone = formatFrenchPhone(lead.contact.telephone);
  const telHref = toTelHref(lead.contact.telephone) ?? `tel:${lead.contact.telephone}`;
  const contactLines = [
    `${lead.contact.prenom} ${lead.contact.nom}`,
    phone,
    ...(lead.contact.email ? [lead.contact.email] : []),
    ...(lead.contact.rappel ? [`${t.rappel_prefere} : ${lead.contact.rappel}`] : []),
    ...(lead.commune ? [`${lead.commune.nom} (${lead.commune.codePostal})`] : []),
  ];
  sections.push({
    title: t.coordonnees,
    lines: contactLines,
    html:
      `<p><strong>${escapeHtml(`${lead.contact.prenom} ${lead.contact.nom}`)}</strong><br>` +
      `<a href="${escapeHtml(telHref)}" style="font-size:18px;">${escapeHtml(phone)}</a> — ${escapeHtml(t.appeler)}` +
      (lead.contact.email ? `<br>${escapeHtml(lead.contact.email)}` : "") +
      (lead.contact.rappel
        ? `<br>${escapeHtml(t.rappel_prefere)} : ${escapeHtml(lead.contact.rappel)}`
        : "") +
      (lead.commune
        ? `<br>${escapeHtml(`${lead.commune.nom} (${lead.commune.codePostal})`)}`
        : "") +
      `</p>`,
  });

  sections.push({ title: t.urgence, lines: [ctx.interfaceTexts.planning.debuts[lead.urgence]] });
  if (lead.pourQui) sections.push({ title: t.pour_qui, lines: [lead.pourQui] });
  if (lead.situation) {
    sections.push({
      title: t.situation,
      lines: Object.entries(lead.situation).map(
        ([key, answer]) => `${key} : ${answerToText(answer)}`,
      ),
    });
  }
  if (lead.besoins && lead.besoins.length > 0) {
    sections.push({ title: t.besoins, lines: lead.besoins });
  }
  sections.push(...planningSections(lead, ctx));
  if (lead.message) sections.push({ title: t.message, lines: [lead.message] });
  sections.push({
    title: t.origine,
    lines: [
      lead.sourcePage,
      ...(lead.agenceProche
        ? [`${t.agence} : ${ctx.agencies[lead.agenceProche] ?? lead.agenceProche}`]
        : []),
      `${t.consentement} : ${lead.consentement.sante ? t.oui : t.non} (${t.version_consentement.replace("{version}", lead.consentement.version)})`,
      t.recu_le.replace("{date}", dateFormat.format(new Date(lead.createdAt))),
    ],
  });

  const subject = teamSubject(lead, ctx);
  const json = JSON.stringify(lead, null, 2);
  const text =
    `${subject}\n\n` +
    sections.map((s) => `${s.title}\n${s.lines.map((l) => `  ${l}`).join("\n")}`).join("\n\n") +
    `\n\n${t.json}\n${json}\n`;
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
    `<details style="margin-top:24px;"><summary>${escapeHtml(t.json)}</summary><pre style="font-size:12px;white-space:pre-wrap;">${escapeHtml(json)}</pre></details>` +
    `</body></html>`;
  return { subject, html, text };
}

export function renderAcknowledgement(lead: LeadPayload, ctx: RenderContext): RenderedMail {
  const t = ctx.emails.accuse;
  const body = t.corps
    .replace("{prénom}", lead.contact.prenom)
    .replace("{délai}", ctx.callbackDelay ?? t.delai_inconnu)
    .replace("{téléphone}", ctx.phone ?? "");
  const text = `${body}\n\n${t.signature}\n`;
  const html =
    `<!doctype html><html lang="fr"><body style="font-family:system-ui,sans-serif;font-size:16px;line-height:1.6;color:#1f1d1a;max-width:640px;margin:0 auto;padding:16px;">` +
    `<p>${escapeHtml(body)}</p><p>${escapeHtml(t.signature)}</p></body></html>`;
  return { subject: t.objet, html, text };
}
