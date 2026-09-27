import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import type { SourceRecord } from "./cache";

/*
 * Géocodage des faits parisiens par la Base Adresse Nationale (docs/04 §5).
 *
 * Pourquoi : la source CNSA rattache certaines résidences autonomie du CASVP au mauvais
 * arrondissement (« Logements Clauzel, 7bis rue Clauzel, 75015 » est dans le 9e). Hors Paris, le
 * code postal et la ville de l'adresse suffisent (`locateFacts`) ; à Paris, le code postal est
 * précisément la donnée fausse, d'où l'appel à la BAN.
 *
 * Règle : pour chaque fait d'un arrondissement (département 75) dont l'adresse est une adresse
 * de voie (numéro puis voie), la partie « numéro et voie » de l'adresse suivie de « Paris » est
 * soumise à https://api-adresse.data.gouv.fr/search/?q=<adresse>&limit=1 (Licence Ouverte 2.0,
 * gratuit, ~50 requêtes/s au plus : les appels sont espacés). Le code postal et les compléments
 * sont retirés de la requête : le code postal est la donnée suspecte et il biaise la BAN
 * (« 115 rue des Amandiers, 75019 » renvoyait « 115 Rue Manin 75019 » au lieu du 20e). Si le
 * premier résultat a un score ≥ 0,6, que la BAN a reconnu le numéro (`type: housenumber` : une
 * voie seule peut border deux arrondissements, rue du Faubourg Saint-Antoine 11e/12e), que la
 * voie renvoyée contient tous les mots significatifs de la voie demandée (« 10 rue Tour-des-Dames »
 * ne doit pas être pris pour « 10 Rue des Dames », 17e) et que `citycode` est un arrondissement
 * (751xx), ce code remplace `commune_insee` du fait et le fait est rattaché à cet
 * arrondissement (retiré de l'arrondissement d'origine s'il n'est pas le bon, ajouté au bon s'il
 * a une page de vague 1). Sinon le fait reste où il est.
 *
 * Cache : data/raw/ban-<date>.json, une entrée par adresse normalisée (adresse publiée, requête
 * envoyée, réponse). En ligne, le fichier du jour est complété ; en `--offline`, le plus récent est
 * relu sans réseau (adresse absente → non tranché). Une entrée dont la requête ne suit plus la
 * règle courante est refaite.
 */

export const BAN_SOURCE = {
  id: "ban-adresses-paris",
  label: "Base Adresse Nationale — API Adresse (api-adresse.data.gouv.fr), géocodage des faits parisiens",
  url: "https://api-adresse.data.gouv.fr/search/",
  page: "https://adresse.data.gouv.fr/api-doc/adresse",
  licence: "Licence Ouverte / Open Licence 2.0 (Etalab)",
} as const;

export const BAN_MIN_SCORE = 0.6;

/** Espacement minimal entre deux appels (la BAN admet ~50 requêtes/s). */
const REQUEST_SPACING_MS = 40;

const banResultSchema = z.looseObject({
  label: z.string(),
  score: z.number(),
  citycode: z.string(),
  postcode: z.string().optional(),
  type: z.string().optional(),
  name: z.string().optional(),
  street: z.string().optional(),
  city: z.string().optional(),
  district: z.string().optional(),
});
export type BanResult = z.infer<typeof banResultSchema>;

const banResponseSchema = z.looseObject({
  features: z.array(z.looseObject({ properties: banResultSchema })),
});

const banEntrySchema = z.strictObject({
  /** Adresse telle que publiée par la source (clé : sa forme normalisée). */
  address: z.string(),
  /** Requête envoyée à la BAN (`banQuery`). */
  query: z.string(),
  collected_at: z.string(),
  result: banResultSchema.nullable(),
});
export type BanEntry = z.infer<typeof banEntrySchema>;

const banCacheSchema = z.strictObject({
  _source: z.strictObject({ label: z.string(), url: z.string(), licence: z.string(), collected_at: z.string() }),
  entries: z.record(z.string(), banEntrySchema),
});
type BanCacheFile = z.infer<typeof banCacheSchema>;

/** Minuscules, sans accents ni ponctuation, espaces réduits : clé du cache. */
export function normalizeAddress(address: string): string {
  return address
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const VOIE_WORDS =
  "rue|avenue|av|boulevard|bd|place|pl|quai|passage|allee|allees|villa|cite|square|impasse|cours|chaussee|route|chemin|esplanade|promenade|sentier|voie|faubourg|galerie|hameau|mail|parvis|porte|pont|rond point|carrefour|terrasse|jardin|jardins|residence";

const STREET_ADDRESS = new RegExp(`^\\d{1,4} ?(?:bis|ter|quater|[a-z])? (?:${VOIE_WORDS})\\b`);

/** Adresse de voie : un numéro puis un type de voie (« 7bis rue Clauzel, 75015 PARIS »). */
export function isStreetAddress(address: string): boolean {
  return STREET_ADDRESS.test(normalizeAddress(address));
}

/**
 * Requête soumise à la BAN : numéro et voie (avant la première virgule ou le code postal), puis
 * « Paris » ; « 7bis rue Clauzel, 75015 PARIS » → « 7bis rue Clauzel Paris ».
 */
export function banQuery(address: string): string {
  const compact = address.replace(/\s+/g, " ").trim();
  const cut = compact.search(/,|\s\d{5}(?!\d)/);
  const street = (cut >= 0 ? compact.slice(0, cut) : compact).replace(/[\s,;-]+$/, "").trim();
  return `${street} Paris`;
}

const STOP_WORDS = new Set([
  ...VOIE_WORDS.split("|"),
  "de",
  "du",
  "des",
  "la",
  "le",
  "les",
  "l",
  "d",
  "et",
  "saint",
  "sainte",
  "st",
  "ste",
  "bis",
  "ter",
  "quater",
  "paris",
  "cedex",
  "general",
  "docteur",
  "dr",
  "professeur",
  "pr",
  "marechal",
  "mal",
  "gal",
  "president",
  "pdt",
  "commandant",
  "cdt",
  "capitaine",
  "colonel",
  "lieutenant",
  "sergent",
  "amiral",
  "abbe",
  "pere",
  "mere",
  "frere",
  "soeur",
  "cardinal",
  "monseigneur",
  "mgr",
  "monsieur",
  "madame",
  "mme",
]);

/** Mots significatifs d'une voie : ni numéros (« 7bis »), ni types de voie, ni titres, ni mots-outils. */
function significantTokens(value: string): Set<string> {
  return new Set(
    normalizeAddress(value)
      .split(" ")
      .filter((t) => t.length >= 3 && !/^\d/.test(t) && !STOP_WORDS.has(t)),
  );
}

const ARRONDISSEMENT_CODE = /^751(?:0[1-9]|1\d|20)$/;

/**
 * Décision pure : code INSEE de l'arrondissement (751xx) où la BAN situe l'adresse, ou null si la
 * BAN n'a pas tranché (aucun résultat, score < 0,6, numéro non reconnu, voie renvoyée ne
 * contenant pas tous les mots significatifs de la voie demandée, commune hors Paris ou Paris
 * entier 75056).
 */
export function decideArrondissement(query: string, result: BanResult | null | undefined): string | null {
  if (!result) return null;
  if (!(result.score >= BAN_MIN_SCORE)) return null;
  if (result.type !== undefined && result.type !== "housenumber") return null;
  if (!ARRONDISSEMENT_CODE.test(result.citycode)) return null;
  const wanted = significantTokens(query.replace(/\b\d{5}\b.*$/, ""));
  const got = significantTokens(result.street ?? result.name ?? result.label);
  if (wanted.size > 0 && got.size > 0 && ![...wanted].every((t) => got.has(t))) return null;
  return result.citycode;
}

/** Adresse normalisée → arrondissement décidé (null : non tranché). */
export type BanLookup = ReadonlyMap<string, string | null>;

export interface BanOptions {
  offline: boolean;
  today: string;
  fetchImpl?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
}

export interface BanOutcome {
  lookup: BanLookup;
  /** Adresses demandées absentes du cache et non géocodées (hors ligne ou erreur réseau). */
  missing: string[];
  fetched: number;
  record: SourceRecord;
}

function trimResult(raw: BanResult): BanResult {
  return {
    label: raw.label,
    score: Math.round(raw.score * 10_000) / 10_000,
    citycode: raw.citycode,
    postcode: raw.postcode,
    type: raw.type,
    name: raw.name,
    street: raw.street,
    city: raw.city,
    district: raw.district,
  };
}

async function findCacheFile(rawDir: string): Promise<{ path: string; date: string } | null> {
  const pattern = /^ban-(\d{4}-\d{2}-\d{2})\.json$/;
  let best: { path: string; date: string } | null = null;
  let names: string[] = [];
  try {
    names = await readdir(rawDir);
  } catch {
    return null;
  }
  for (const name of names) {
    const m = pattern.exec(name);
    if (!m?.[1]) continue;
    if (!best || m[1] > best.date) best = { path: path.join(rawDir, name), date: m[1] };
  }
  return best;
}

async function readCache(file: string): Promise<BanCacheFile | null> {
  try {
    return banCacheSchema.parse(JSON.parse(await readFile(file, "utf8")));
  } catch {
    return null;
  }
}

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Géocode les adresses (parisiennes) demandées, en complétant le cache data/raw/ban-<date>.json,
 * et renvoie la décision par adresse normalisée. Ne lève pas : une adresse injoignable reste non
 * tranchée et est comptée dans `missing`.
 */
export async function geocodeAddresses(
  rawDir: string,
  addresses: readonly string[],
  options: BanOptions,
): Promise<BanOutcome> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const sleep = options.sleep ?? defaultSleep;
  const existing = await findCacheFile(rawDir);
  const reusable =
    existing && (options.offline || existing.date === options.today) ? await readCache(existing.path) : null;
  const entries: Record<string, BanEntry> = { ...(reusable?.entries ?? {}) };
  const wanted = new Map<string, string>();
  for (const a of addresses) {
    const query = a.replace(/\s+/g, " ").trim();
    const key = normalizeAddress(query);
    if (key.length > 0 && !wanted.has(key)) wanted.set(key, query);
  }
  const missing: string[] = [];
  let fetched = 0;
  let networkError: string | undefined;
  for (const [key, address] of wanted) {
    const query = banQuery(address);
    const cached = entries[key];
    if (cached && cached.query === query) continue;
    if (options.offline) {
      missing.push(address);
      continue;
    }
    const result = await search(fetchImpl, sleep, query);
    if (result.ok) {
      entries[key] = { address, query, collected_at: options.today, result: result.value };
      fetched += 1;
    } else {
      missing.push(address);
      networkError = networkError ?? result.error;
    }
  }
  const lookup = new Map<string, string | null>();
  for (const [key, entry] of Object.entries(entries)) {
    lookup.set(key, decideArrondissement(entry.query, entry.result));
  }

  let filePath = existing?.path ?? null;
  let size: number | null = null;
  let collected_at: string | null = reusable ? (existing?.date ?? null) : null;
  if (!options.offline && (fetched > 0 || !reusable)) {
    filePath = path.join(rawDir, `ban-${options.today}.json`);
    const content: BanCacheFile = {
      _source: {
        label: BAN_SOURCE.label,
        url: BAN_SOURCE.url,
        licence: BAN_SOURCE.licence,
        collected_at: options.today,
      },
      entries: Object.fromEntries(Object.entries(entries).sort(([a], [b]) => a.localeCompare(b))),
    };
    const text = `${JSON.stringify(content, null, 2)}\n`;
    await writeFile(filePath, text);
    size = Buffer.byteLength(text);
    collected_at = options.today;
  } else if (filePath && reusable) {
    size = (await readFile(filePath)).length;
  }
  const status = fetched > 0 ? "téléchargé" : reusable ? "cache" : "injoignable";
  const problems: string[] = [];
  if (networkError) problems.push(`${missing.length} adresse(s) non géocodée(s) : ${networkError}`);
  else if (missing.length > 0) problems.push(`${missing.length} adresse(s) absente(s) du cache (mode hors ligne)`);
  const record: SourceRecord = {
    id: BAN_SOURCE.id,
    label: BAN_SOURCE.label,
    url: BAN_SOURCE.url,
    licence: BAN_SOURCE.licence,
    collected_at,
    size,
    status,
    error: problems.length > 0 ? problems.join(" ; ") : undefined,
  };
  return { lookup, missing, fetched, record };
}

type SearchOutcome = { ok: true; value: BanResult | null } | { ok: false; error: string };

async function search(
  fetchImpl: typeof fetch,
  sleep: (ms: number) => Promise<void>,
  query: string,
): Promise<SearchOutcome> {
  const url = `${BAN_SOURCE.url}?${new URLSearchParams({ q: query, limit: "1" }).toString()}`;
  let lastError = "";
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await sleep(attempt === 0 ? REQUEST_SPACING_MS : 1_000 * attempt);
    try {
      const response = await fetchImpl(url, { headers: { accept: "application/json" } });
      if (response.status === 429 || response.status >= 500) {
        lastError = `HTTP ${response.status}`;
        continue;
      }
      if (!response.ok) return { ok: false, error: `HTTP ${response.status}` };
      const parsed = banResponseSchema.safeParse(await response.json());
      if (!parsed.success) return { ok: false, error: "réponse BAN inattendue" };
      const first = parsed.data.features[0]?.properties;
      return { ok: true, value: first ? trimResult(first) : null };
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
  }
  return { ok: false, error: lastError || "échec réseau" };
}
