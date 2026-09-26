import { stripDiacritics } from "./text";

/*
 * NAP (nom, adresse, téléphone) des pages locales et d'agence (docs/04 §4 : « adresse d'agence
 * affichée = agence réelle la plus proche uniquement » ; docs/07 §7 : `check-local-nap`).
 * Fonctions pures : extraction des téléphones et des adresses d'un texte visible, découpage
 * d'un HTML par attribut repère. Aucune lecture de fichier ici.
 *
 * Motifs :
 * - téléphone français : « 01 84 80 17 03 », « 01.84.80.17.03 », « +33 1 84 80 17 03 »,
 *   « tel:+33184801703 » ; normalisé en dix chiffres (`0184801703`) ;
 * - adresse de voie : un numéro (avec bis/ter, « 49-51 », « 5-7-9 ») suivi d'un type de voie
 *   (rue, avenue, boulevard, quai, place, allée, chemin, impasse, route, cours, square,
 *   passage, villa, voie, esplanade, promenade, mail, sente, rond-point, av., bd) et du nom,
 *   jusqu'à la ponctuation ou un code postal ; une voie citée sans numéro (« l'avenue de la
 *   République ») n'est pas une adresse ;
 * - code postal + ville : cinq chiffres puis un nom propre (majuscule initiale) ;
 *   « 92800 habitants » n'en est pas un.
 * Toute comparaison se fait sur une forme normalisée : minuscules, sans accents, tout ce qui
 * n'est ni lettre ni chiffre devient un espace (`normalizeAddress`).
 */

const streetTypes =
  "rue|avenue|av\\.?|boulevard|bd|quai|place|all[ée]e|chemin|impasse|route|cours|square|passage|villa|voie|esplanade|promenade|mail|sente|rond-point";

// Une année (1900 à 2099) n'est pas un numéro de rue : dans le texte visible d'une grille,
// « consulté le 20 septembre 2026 » précède le libellé suivant (« Square Louvois »). La mention
// s'arrête aussi devant « à » (« 84 avenue du Général-Leclerc à Viroflay »).
const streetAddressPattern = new RegExp(
  `(?<![\\d,.])\\b(?!(?:19|20)\\d{2}\\b)\\d{1,4}(?:\\s?(?:bis|ter|quater)\\b)?(?:\\s?[-–/]\\s?\\d{1,4})*,?\\s+(?:${streetTypes})\\s+[^,;.:()\\n|]*?(?=\\s*(?:[,;.:()|]|\\d{5}\\b|\\s(?:à|et|ou)\\s|$))`,
  "giu",
);

/*
 * Code postal + ville : le nom de ville est une suite d'au plus quatre mots à majuscule initiale
 * (ou particules « sur », « sous », « la », « le »…) ; le texte visible d'une page étant une seule
 * ligne, la limite évite d'avaler le mot suivant (« 92000 Nanterre Hôpital » reste couvert par
 * « 92000 Nanterre » grâce à `addressStartsWith`).
 */
const postalCityPattern =
  /\b(\d{5})\s+((?:[A-ZÀ-ÖØ-Þ][\p{L}'’]*(?:-[\p{L}'’]+)*)(?:\s(?:[A-ZÀ-ÖØ-Þ][\p{L}'’]*(?:-[\p{L}'’]+)*|sur|sous|en|la|le|les|de|des|du|au|aux|et)){0,3})/gu;

const phonePattern =
  /(?:\+33|0033)[\s.-]?[1-9](?:[\s.-]?\d{2}){4}\b|(?<!\d)0[1-9](?:[\s.-]?\d{2}){4}(?!\d)/g;

const telHrefPattern = /href=["']tel:([^"']+)["']/gi;

/** Dix chiffres nationaux (`0184801703`) ; null si ce n'est pas un numéro français. */
export function normalizePhone(display: string): string | null {
  const digits = display.replace(/\D/g, "");
  if (digits.length === 10 && digits.startsWith("0")) return digits;
  if (digits.length === 11 && digits.startsWith("33")) return `0${digits.slice(2)}`;
  if (digits.length === 13 && digits.startsWith("0033")) return `0${digits.slice(4)}`;
  return null;
}

/**
 * Forme comparable d'une adresse ou d'un nom de ville. Un mot répété à la suite est réduit
 * (« 56 rue rue Ordener », coquille de source, vaut « 56 rue Ordener »).
 */
export function normalizeAddress(text: string): string {
  return (
    stripDiacritics(text.toLowerCase())
      .replace(/[^a-z0-9]+/g, " ")
      // « 24bis » → « 24 bis »
      .replace(/(\d)([a-z])/g, "$1 $2")
      .split(" ")
      .map((token) => ADDRESS_ABBREVIATIONS[token] ?? token)
      .filter((token) => token !== "" && !ADDRESS_STOPWORDS.has(token))
      .join(" ")
      .replace(/\b(\w+)(?: \1\b)+/g, "$1")
      .trim()
  );
}

/** Abréviations courantes des sources officielles (FINESS, CNSA) ramenées au mot entier. */
const ADDRESS_ABBREVIATIONS: Record<string, string> = {
  av: "avenue",
  bd: "boulevard",
  bld: "boulevard",
  pl: "place",
  dr: "docteur",
  gal: "general",
  gen: "general",
  mal: "marechal",
  lt: "lieutenant",
  col: "colonel",
  st: "saint",
  ste: "sainte",
  pdt: "president",
};

/** Mots-outils ignorés dans la comparaison (« rue de la Paix » vaut « rue La Paix »). */
const ADDRESS_STOPWORDS: ReadonlySet<string> = new Set([
  "de",
  "du",
  "des",
  "la",
  "le",
  "les",
  "l",
  "d",
]);

export interface Mention {
  raw: string;
  normalized: string;
}

/** Téléphones français d'un texte visible, dédoublonnés sur la forme normalisée. */
export function extractPhones(text: string): Mention[] {
  const out = new Map<string, Mention>();
  for (const match of text.replace(/[\u00a0\u202f]/g, " ").matchAll(phonePattern)) {
    const normalized = normalizePhone(match[0]);
    if (normalized && !out.has(normalized)) out.set(normalized, { raw: match[0], normalized });
  }
  return [...out.values()];
}

/** Téléphones des liens `href="tel:…"` d'un HTML. */
export function extractTelHrefs(html: string): Mention[] {
  const out = new Map<string, Mention>();
  for (const match of html.matchAll(telHrefPattern)) {
    const raw = match[1] ?? "";
    const normalized = normalizePhone(raw);
    if (normalized && !out.has(normalized)) out.set(normalized, { raw: `tel:${raw}`, normalized });
  }
  return [...out.values()];
}

/** Adresses de voie (numéro + type de voie + nom) d'un texte visible. */
export function extractStreetAddresses(text: string): Mention[] {
  const out = new Map<string, Mention>();
  for (const match of text.replace(/[\u00a0\u202f]/g, " ").matchAll(streetAddressPattern)) {
    const raw = match[0].trim();
    const normalized = normalizeAddress(raw);
    if (normalized && !out.has(normalized)) out.set(normalized, { raw, normalized });
  }
  return [...out.values()];
}

/** Couples « code postal + ville » d'un texte visible. */
export function extractPostalCities(text: string): Mention[] {
  const out = new Map<string, Mention>();
  for (const match of text.replace(/[\u00a0\u202f]/g, " ").matchAll(postalCityPattern)) {
    const raw = match[0].trim();
    const normalized = normalizeAddress(raw);
    if (!out.has(normalized)) out.set(normalized, { raw, normalized });
  }
  return [...out.values()];
}

/**
 * Vrai si la mention normalisée commence par la référence normalisée, sur une frontière de
 * mot : « 61 rue de lyon 75012 paris » couvre « 61 rue de lyon », pas « 61 rue de lyonnais ».
 */
export function addressStartsWith(mention: string, reference: string): boolean {
  return mention === reference || mention.startsWith(`${reference} `);
}

/** Vrai si la mention est contenue dans la référence ou la contient (adresse d'un fait). */
export function addressOverlaps(mention: string, reference: string): boolean {
  return (
    addressStartsWith(mention, reference) ||
    reference === mention ||
    reference.includes(` ${mention} `) ||
    reference.startsWith(`${mention} `) ||
    reference.endsWith(` ${mention}`)
  );
}

export interface HtmlRegion {
  /** HTML intérieur de l'élément. */
  inner: string;
  start: number;
  end: number;
}

const tagPattern = /<(\/?)([a-zA-Z][\w-]*)\b[^>]*>/g;

/**
 * Éléments d'un HTML dont la balise ouvrante satisfait `matches` (ex. porte l'attribut
 * `data-local-facts`, ou est `<main>`), avec leur contenu ; les imbrications d'une balise de
 * même nom sont respectées. Les régions imbriquées l'une dans l'autre sont toutes renvoyées.
 */
export function findElements(html: string, matches: (openingTag: string) => boolean): HtmlRegion[] {
  const regions: HtmlRegion[] = [];
  const opened: { name: string; contentStart: number; depth: number }[] = [];
  const depths = new Map<string, number>();
  for (const match of html.matchAll(tagPattern)) {
    const closing = match[1] === "/";
    const name = (match[2] ?? "").toLowerCase();
    const selfClosing = match[0].endsWith("/>");
    if (closing) {
      const depth = (depths.get(name) ?? 1) - 1;
      depths.set(name, depth);
      for (let i = opened.length - 1; i >= 0; i -= 1) {
        const item = opened[i];
        if (item && item.name === name && item.depth === depth) {
          regions.push({
            inner: html.slice(item.contentStart, match.index),
            start: item.contentStart,
            end: match.index,
          });
          opened.splice(i, 1);
        }
      }
    } else if (!selfClosing) {
      const depth = depths.get(name) ?? 0;
      if (matches(match[0])) {
        opened.push({ name, contentStart: match.index + match[0].length, depth });
      }
      depths.set(name, depth + 1);
    }
  }
  return regions.sort((a, b) => a.start - b.start);
}

/** Éléments portant l'attribut `data-…` donné (`data-local-facts`) ou la classe donnée. */
export function findMarkedRegions(
  html: string,
  attribute: string,
  className?: string,
): HtmlRegion[] {
  const attr = new RegExp(`\\s${attribute}(?:[\\s=>/]|$)`, "i");
  const cls = className ? new RegExp(`\\sclass=["'][^"']*\\b${className}\\b`, "i") : null;
  return findElements(html, (tag) => attr.test(tag) || (cls !== null && cls.test(tag)));
}

/** HTML privé des régions données (remplacées par un espace). */
export function removeRegions(html: string, regions: readonly HtmlRegion[]): string {
  let out = "";
  let cursor = 0;
  for (const region of [...regions].sort((a, b) => a.start - b.start)) {
    if (region.start < cursor) continue;
    out += `${html.slice(cursor, region.start)} `;
    cursor = region.end;
  }
  return out + html.slice(cursor);
}
