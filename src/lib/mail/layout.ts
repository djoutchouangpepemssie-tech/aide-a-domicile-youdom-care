/*
 * Maquette commune des e-mails sortants (docs/05 §7).
 *
 * Un e-mail n'est pas une page : les clients de messagerie ignorent les feuilles de style
 * externes, les variables CSS, la grille et les boîtes flexibles. Outlook rend le HTML avec le
 * moteur de Word, qui ne connaît ni `max-width` sur un bloc ni `<details>`. Les règles suivies
 * ici, et qui expliquent la forme du code :
 *
 * - **tableaux de disposition** (`role="presentation"`, `cellpadding`/`cellspacing` à zéro), pas
 *   de `div` imbriquées : c'est la seule structure qu'Outlook centre et largeur-limite ;
 * - **styles en ligne uniquement**, et jetons de couleur recopiés en dur : `var(--color-…)` ne
 *   vaut rien ici (docs/02 reste la source, cette table en est la copie figée) ;
 * - **`<meta charset>` explicite** : sans lui, « é » arrive en « Ã© » chez plusieurs clients ;
 * - **aucun `<details>`** : non pris en charge par Gmail et Outlook, qui l'affichent donc
 *   toujours ouvert — c'est ce qui déversait le JSON brut au milieu du message ;
 * - **texte d'aperçu** masqué, pour que la liste de la boîte montre l'essentiel et non le début
 *   du gabarit ;
 * - **une version texte** construite depuis le même modèle, jamais à la main : les deux ne
 *   peuvent pas divulguer des champs différents.
 *
 * Le modèle (`MailDocument`) est volontairement abstrait : les deux rendus, HTML et texte,
 * dérivent du même objet, donc un champ ajouté apparaît dans les deux ou dans aucun.
 */

export interface RenderedMail {
  subject: string;
  html: string;
  text: string;
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

/** Jetons de docs/02, recopiés en dur : un e-mail ne lit pas les variables CSS. */
export const mailColors = {
  ink: "#0f2f38",
  inkSoft: "#47626b",
  paper: "#fbf8f3",
  sand: "#f4eee4",
  white: "#ffffff",
  line: "#d9e3e6",
  teal700: "#00788d",
  teal800: "#00606f",
  teal900: "#0b4753",
  teal50: "#e6f5f8",
  raspberry600: "#d42a5b",
  raspberry50: "#fdecee",
  warning: "#7a4f00",
  warningBg: "#fff4d6",
} as const;

const FONT =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Helvetica,Arial,sans-serif";

/** Ton du bandeau : l'urgence se lit à la couleur, et reste écrite en toutes lettres. */
export type BadgeTone = "urgent" | "attention" | "calme";

export interface MailBadge {
  label: string;
  tone: BadgeTone;
}

/** Une ligne « intitulé : valeur ». `html` remplace la valeur quand elle est mise en forme. */
export interface MailRow {
  label: string;
  /** Valeur en texte brut (version texte, et secours du HTML). Plusieurs lignes acceptées. */
  value: string | string[];
  /** Fragment HTML déjà échappé, s'il faut autre chose que du texte. */
  html?: string;
}

export type MailSection =
  | { kind: "rows"; title: string; rows: MailRow[] }
  /** Bloc libre : le HTML est déjà échappé, `lines` en est la version texte. */
  | { kind: "rich"; title: string; lines: string[]; html: string }
  /**
   * Bloc réservé à la **version texte** du message : rendu dans `text`, absent de `html`.
   *
   * Sert au `LeadPayload` en JSON, qui existe pour une reprise automatique et non pour être lu.
   * Déversé dans le HTML, il noyait la fiche que l'équipe doit lire d'un coup d'œil. Il reste
   * dans le corps de l'e-mail — seul endroit autorisé pour une donnée de santé (CLAUDE.md) — et
   * demeure donc lisible dans la source du message et exploitable par un outil. Pour le rendre
   * de nouveau visible, il suffirait de le traiter ici comme les autres blocs.
   */
  | { kind: "textOnly"; title: string; content: string };

export interface MailHero {
  /** Ligne de contexte au-dessus du nom : formulaire, commune. */
  eyebrow: string;
  /** Nom de la personne, mis en avant. */
  name: string;
  /** Téléphone formaté et son lien `tel:`, rendus en bouton d'appel. */
  phone?: { display: string; href: string; callLabel: string };
  /** Adresse e-mail cliquable, si elle a été laissée. */
  email?: string;
  /** Compléments : créneau de rappel préféré, commune. */
  lines?: string[];
  badge?: MailBadge;
}

export interface MailDocument {
  subject: string;
  /** Texte d'aperçu de la liste des messages : ce qu'il faut savoir sans ouvrir. */
  preheader: string;
  hero: MailHero;
  sections: MailSection[];
}

const badgeStyles: Record<BadgeTone, { bg: string; fg: string }> = {
  urgent: { bg: mailColors.raspberry50, fg: mailColors.raspberry600 },
  attention: { bg: mailColors.warningBg, fg: mailColors.warning },
  calme: { bg: mailColors.teal50, fg: mailColors.teal800 },
};

function rowValueLines(row: MailRow): string[] {
  return Array.isArray(row.value) ? row.value : [row.value];
}

/** Cellule de disposition : ouverture d'une rangée pleine largeur avec marge intérieure. */
function pad(content: string, style = ""): string {
  return `<tr><td style="padding:0 24px;${style}">${content}</td></tr>`;
}

function heroHtml(hero: MailHero): string {
  const parts: string[] = [];
  parts.push(
    `<p style="margin:0 0 4px;font:600 13px/1.4 ${FONT};letter-spacing:.06em;text-transform:uppercase;color:${mailColors.teal700};">${escapeHtml(hero.eyebrow)}</p>`,
  );
  parts.push(
    `<p style="margin:0 0 14px;font:700 24px/1.25 ${FONT};color:${mailColors.ink};">${escapeHtml(hero.name)}</p>`,
  );

  if (hero.phone) {
    // Bouton en tableau : la seule forme qu'Outlook rend avec son fond et sa marge intérieure.
    parts.push(
      `<table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin:0 0 12px;">` +
        `<tr><td style="background:${mailColors.teal800};border-radius:8px;">` +
        `<a href="${escapeHtml(hero.phone.href)}" style="display:inline-block;padding:13px 22px;font:700 20px/1.2 ${FONT};color:${mailColors.white};text-decoration:none;">` +
        `${escapeHtml(hero.phone.display)}</a></td>` +
        `<td style="padding-left:12px;font:400 14px/1.4 ${FONT};color:${mailColors.inkSoft};">${escapeHtml(hero.phone.callLabel)}</td>` +
        `</tr></table>`,
    );
  }

  const details: string[] = [];
  if (hero.email) {
    details.push(
      `<a href="mailto:${escapeHtml(hero.email)}" style="color:${mailColors.teal700};">${escapeHtml(hero.email)}</a>`,
    );
  }
  for (const line of hero.lines ?? []) details.push(escapeHtml(line));
  if (details.length > 0) {
    parts.push(
      `<p style="margin:0;font:400 15px/1.6 ${FONT};color:${mailColors.ink};">${details.join("<br>")}</p>`,
    );
  }

  if (hero.badge) {
    const { bg, fg } = badgeStyles[hero.badge.tone];
    parts.push(
      `<table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin:16px 0 0;width:100%;">` +
        `<tr><td style="background:${bg};border-radius:8px;padding:11px 16px;font:600 15px/1.4 ${FONT};color:${fg};">` +
        `${escapeHtml(hero.badge.label)}</td></tr></table>`,
    );
  }
  return parts.join("");
}

/** Rend un bloc en HTML ; rend la chaîne vide pour un bloc réservé à la version texte. */
function sectionHtml(section: MailSection): string {
  if (section.kind === "textOnly") return "";
  const title =
    `<p style="margin:28px 0 10px;font:700 12px/1.4 ${FONT};letter-spacing:.08em;` +
    `text-transform:uppercase;color:${mailColors.inkSoft};">${escapeHtml(section.title)}</p>`;

  if (section.kind === "rich") {
    return `${title}<div style="font:400 15px/1.6 ${FONT};color:${mailColors.ink};">${section.html}</div>`;
  }

  // Tableau intitulé / valeur : deux colonnes sur large écran, repliées par le client sur mobile.
  const rows = section.rows
    .map((row) => {
      const value =
        row.html ??
        rowValueLines(row)
          .map((line) => escapeHtml(line))
          .join("<br>");
      return (
        `<tr>` +
        `<th scope="row" style="width:34%;text-align:left;vertical-align:top;padding:9px 14px 9px 0;` +
        `border-top:1px solid ${mailColors.line};font:600 14px/1.5 ${FONT};color:${mailColors.inkSoft};">` +
        `${escapeHtml(row.label)}</th>` +
        `<td style="vertical-align:top;padding:9px 0;border-top:1px solid ${mailColors.line};` +
        `font:400 15px/1.6 ${FONT};color:${mailColors.ink};">${value}</td>` +
        `</tr>`
      );
    })
    .join("");
  return `${title}<table role="presentation" border="0" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;">${rows}</table>`;
}

/** Rendu HTML et texte du même modèle : un champ oublié manque des deux côtés, jamais d'un seul. */
export function renderMailDocument(doc: MailDocument): { html: string; text: string } {
  const { hero } = doc;

  const html =
    `<!doctype html><html lang="fr"><head>` +
    `<meta charset="utf-8">` +
    `<meta name="viewport" content="width=device-width,initial-scale=1">` +
    `<meta name="color-scheme" content="light only">` +
    `<title>${escapeHtml(doc.subject)}</title>` +
    `<!--[if mso]><style>table,td,p,a{font-family:Arial,Helvetica,sans-serif !important;}</style><![endif]-->` +
    `</head>` +
    `<body style="margin:0;padding:0;background:${mailColors.paper};-webkit-text-size-adjust:100%;">` +
    // Aperçu : lu par la liste des messages, invisible à l'ouverture.
    `<div style="display:none;max-height:0;overflow:hidden;opacity:0;font-size:1px;line-height:1px;color:${mailColors.paper};">` +
    `${escapeHtml(doc.preheader)}&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;</div>` +
    `<table role="presentation" border="0" cellpadding="0" cellspacing="0" style="width:100%;background:${mailColors.paper};">` +
    `<tr><td align="center" style="padding:24px 12px;">` +
    // Outlook (moteur de Word) ignore `max-width` : sans cet encadrement conditionnel, la fiche
    // s'étire sur toute la largeur de la fenêtre. Les autres clients ne voient pas ce commentaire.
    `<!--[if mso]><table role="presentation" border="0" cellpadding="0" cellspacing="0" width="640" align="center"><tr><td><![endif]-->` +
    `<table role="presentation" border="0" cellpadding="0" cellspacing="0" style="width:100%;max-width:640px;background:${mailColors.white};border-radius:14px;overflow:hidden;border:1px solid ${mailColors.line};">` +
    // Bandeau de marque : identifie l'expéditeur avant toute lecture.
    `<tr><td style="background:${mailColors.teal900};padding:16px 24px;">` +
    `<p style="margin:0;font:700 15px/1.3 ${FONT};letter-spacing:.04em;color:${mailColors.white};">YOUDOM CARE</p>` +
    `<p style="margin:2px 0 0;font:400 13px/1.4 ${FONT};color:#a9e4f2;">Vous, chez vous. Nous, à vos côtés.</p>` +
    `</td></tr>` +
    `<tr><td style="padding:24px 24px 0;">${heroHtml(hero)}</td></tr>` +
    doc.sections
      .map(sectionHtml)
      .filter((fragment) => fragment !== "")
      .map((fragment) => pad(fragment))
      .join("") +
    `<tr><td style="padding:28px 24px 24px;"></td></tr>` +
    `</table>` +
    `<!--[if mso]></td></tr></table><![endif]-->` +
    `</td></tr></table></body></html>`;

  // L'objet n'est pas répété : il voyage déjà dans l'en-tête `Subject` du message.
  const textLines: string[] = [hero.eyebrow.toUpperCase(), "", hero.name];
  if (hero.phone) textLines.push(`${hero.phone.display} — ${hero.phone.callLabel}`);
  if (hero.email) textLines.push(hero.email);
  for (const line of hero.lines ?? []) textLines.push(line);
  if (hero.badge) textLines.push("", `>>> ${hero.badge.label}`);

  for (const section of doc.sections) {
    textLines.push("", `-- ${section.title} --`);
    if (section.kind === "textOnly") {
      textLines.push(section.content);
      continue;
    }
    if (section.kind === "rich") {
      for (const line of section.lines) textLines.push(`  ${line}`);
      continue;
    }
    for (const row of section.rows) {
      const [first, ...rest] = rowValueLines(row);
      textLines.push(`  ${row.label} : ${first ?? ""}`);
      for (const line of rest) textLines.push(`  ${" ".repeat(row.label.length)}   ${line}`);
    }
  }
  return { html, text: `${textLines.join("\n")}\n` };
}
