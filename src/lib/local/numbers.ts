import type { LocalData } from "@/content/local-schema";

/*
 * Contrôle des nombres (docs/04 §4, « aucun fait local sans source ») : tout nombre écrit dans
 * la zone éditoriale ou les réponses aux questions locales doit être couvert par une valeur de
 * référence du `LocalData`, à l'arrondi près. Fonctions pures, utilisées par `check-local-facts`.
 *
 * Nombres relevés (`extractNumbers`) : chiffres avec séparateur de milliers (espace, espace
 * insécable, espace fine) et décimale (virgule ou point), ex. « 12 345 », « 27,3 % », « 3,2 km ».
 * Ne sont PAS relevés, parce que ce ne sont pas des faits locaux :
 *   - les âges et durées : « 75 ans et plus », « 60 à 74 ans », « depuis 20 ans » ;
 *   - les horaires et durées : « 8 h 30 », « 24 h/24 », « 7 j/7 », « 45 minutes », « 3 jours » ;
 *   - les ordinaux : « 15e arrondissement », « 1er », « 2ème » ;
 *   - les numéros d'ordre de titre ou de note : « n° 3 », « [1] ».
 * Un chiffre national ou d'entreprise (crédit d'impôt de 50 %, 6 agences) n'est pas exclu : il
 * se déclare comme un fait de type `autre` avec sa source, comme tout autre fait.
 *
 * Valeurs de référence (`referenceNumbers`) : tous les nombres écrits dans `facts[].value`,
 * `facts[].label` et `facts[].address` ; les champs numériques de `demographie` (population,
 * parts par tranche d'âge, millésime) ; `population`, `superficie_ha` ; les distances
 * (`agence_proche.distance_km`, `communes_voisines[].distance_km`) ; les codes postaux, le code
 * INSEE et le code du département ; le nombre total de faits et le nombre de faits par type
 * (« 3 marchés » est couvert par trois faits `marche`).
 *
 * Arrondi (`numberMatches`) : un nombre écrit n couvre une référence v si v, arrondi à la
 * précision de n, vaut n. La précision de n est celle de son dernier chiffre écrit (« 27,3 » :
 * 0,1 ; « 27 » : 1 ; « 12 000 » : 1 000), sans jamais dépasser deux chiffres significatifs :
 * « 30 » ne couvre pas 27,3 (il faudrait « 27 »), « 12 000 » couvre 11 500 à 12 499, « 100 »
 * couvre 95 à 105. Un « 0 » écrit ne couvre que des valeurs inférieures à 0,5.
 */

export interface NumberMention {
  /** Le nombre tel qu'il est écrit dans le texte. */
  raw: string;
  value: number;
  /** Position du premier caractère dans le texte fourni. */
  index: number;
}

const thinSpaces = /[\u00a0\u202f]/g;

/** Contextes où un nombre n'est pas un fait local (voir l'en-tête). */
const ignoredContexts: readonly RegExp[] = [
  /\b\d+(?:[,.]\d+)?\s*(?:à|a|-|–)\s*\d+(?:[,.]\d+)?\s*ans?\b/gi,
  /\b\d+(?:[,.]\d+)?\s*ans?\b/gi,
  /\b\d+\s*[jh]?\s*\/\s*\d+\b/gi,
  /\b\d{1,2}\s*h(?:\s*\d{2})?\b/gi,
  /\b\d+\s*(?:heures?|minutes?|min|secondes?|jours?|j|semaines?|mois)\b/gi,
  /\b\d+\s*(?:er|re|ère|e|ème|eme|nd|nde)\b/gi,
  /\bn\s?°\s?\d+/gi,
  /\[\d+\]/g,
];

const numberPattern = /\d{1,3}(?: \d{3})+(?:[,.]\d+)?|\d+(?:[,.]\d+)?/g;

function parseFrenchNumber(raw: string): number {
  return Number(raw.replace(/ /g, "").replace(",", "."));
}

/** Nombres écrits dans un texte brut, hors contextes ignorés. */
export function extractNumbers(text: string): NumberMention[] {
  let clean = text.replace(thinSpaces, " ");
  for (const context of ignoredContexts) {
    clean = clean.replace(context, (match) => " ".repeat(match.length));
  }
  const mentions: NumberMention[] = [];
  for (const match of clean.matchAll(numberPattern)) {
    const raw = match[0];
    const value = parseFrenchNumber(raw);
    if (Number.isFinite(value)) mentions.push({ raw, value, index: match.index });
  }
  return mentions;
}

/** Nombres écrits dans un texte de référence (valeur ou libellé de fait), sans exclusion. */
function allNumbers(text: string): number[] {
  const clean = text.replace(thinSpaces, " ");
  const values: number[] = [];
  for (const match of clean.matchAll(numberPattern)) {
    const value = parseFrenchNumber(match[0]);
    if (Number.isFinite(value)) values.push(value);
  }
  return values;
}

/** Valeurs de référence d'un territoire (voir l'en-tête). */
export function referenceNumbers(data: LocalData): number[] {
  const values = new Set<number>();
  const add = (value: number | undefined) => {
    if (value !== undefined && Number.isFinite(value)) values.add(value);
  };
  const addText = (text: string | undefined) => {
    if (text) for (const value of allNumbers(text)) values.add(value);
  };

  const perType = new Map<string, number>();
  for (const fact of data.facts) {
    addText(fact.value);
    addText(fact.label);
    addText(fact.address);
    perType.set(fact.type, (perType.get(fact.type) ?? 0) + 1);
  }
  add(data.facts.length);
  for (const count of perType.values()) add(count);

  add(data.population);
  add(data.superficie_ha);
  if (data.demographie) {
    add(Number(data.demographie.millesime));
    add(data.demographie.population);
    add(data.demographie.part_60_74);
    add(data.demographie.part_75_89);
    add(data.demographie.part_90_plus);
    add(data.demographie.part_75_plus);
  }
  add(data.agence_proche?.distance_km);
  for (const neighbour of data.communes_voisines ?? []) add(neighbour.distance_km);
  for (const code of data.codes_postaux ?? []) add(Number(code));
  if (/^\d+$/.test(data.code)) add(Number(data.code));
  if (data.departement) add(Number(data.departement));

  return [...values];
}

/** Précision d'un nombre tel qu'il est écrit (voir l'en-tête : au plus deux chiffres significatifs). */
export function writtenPrecision(raw: string): number {
  const compact = raw.replace(/[ \u00a0\u202f]/g, "");
  const [integerPart = "", decimalPart] = compact.split(/[,.]/);
  if (decimalPart !== undefined && decimalPart.length > 0) {
    return 10 ** -decimalPart.length;
  }
  const digits = integerPart.replace(/^0+(?=\d)/, "");
  const trailingZeros = digits.match(/0+$/)?.[0].length ?? 0;
  const maxFromSignificance = Math.max(0, digits.length - 2);
  return 10 ** Math.min(trailingZeros, maxFromSignificance);
}

/** Vrai si le nombre écrit `mention` est l'arrondi de `reference` à la précision écrite. */
export function numberMatches(mention: NumberMention, reference: number): boolean {
  const precision = writtenPrecision(mention.raw);
  const rounded = Math.round(reference / precision) * precision;
  return Math.abs(rounded - mention.value) < precision / 1000;
}

/** Nombres écrits qui ne sont couverts par aucune valeur de référence. */
export function findUnsourcedNumbers(text: string, references: readonly number[]): NumberMention[] {
  return extractNumbers(text).filter(
    (mention) => !references.some((reference) => numberMatches(mention, reference)),
  );
}
