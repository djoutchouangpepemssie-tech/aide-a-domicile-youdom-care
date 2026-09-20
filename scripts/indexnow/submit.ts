import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { absoluteUrl, listPopulatedSegments, siteUrl } from "../../src/lib/seo/sitemaps";

/*
 * IndexNow (docs/04 §2) : après un déploiement, les adresses des plans de site sont soumises
 * à https://api.indexnow.org/indexnow (Bing, Yandex, Seznam, Naver… partagent la clé). Le protocole
 * exige un fichier /<clé>.txt à la racine du site dont le contenu est la clé : `--write-key`
 * l'écrit dans public/ avant le build (script `prebuild`), uniquement quand INDEXNOW_KEY est
 * définie, c'est-à-dire sur Vercel. Ce fichier n'entre jamais dans le dépôt.
 *
 * Sans clé, ou avec `--dry-run`, rien n'est envoyé : la charge utile est seulement affichée.
 */

export const INDEXNOW_ENDPOINT = "https://api.indexnow.org/indexnow";
/** Clé IndexNow : 8 à 128 caractères parmi a-z, A-Z, 0-9 et le tiret. */
export const KEY_PATTERN = /^[A-Za-z0-9-]{8,128}$/;
/** Limite du protocole par requête. */
export const MAX_URLS = 10_000;

export interface IndexNowPayload {
  host: string;
  key: string;
  keyLocation: string;
  urlList: string[];
}

export interface CliOptions {
  dryRun: boolean;
  writeKey: boolean;
}

export function parseArgs(argv: readonly string[]): CliOptions {
  const known = new Set(["--dry-run", "--write-key"]);
  for (const arg of argv) {
    if (!known.has(arg)) throw new Error(`indexnow : option inconnue « ${arg} »`);
  }
  return { dryRun: argv.includes("--dry-run"), writeKey: argv.includes("--write-key") };
}

function assertKey(key: string): void {
  if (!KEY_PATTERN.test(key)) {
    throw new Error("INDEXNOW_KEY : 8 à 128 caractères parmi a-z, A-Z, 0-9 et le tiret");
  }
}

export function keyFileName(key: string): string {
  return `${key}.txt`;
}

/** Ne montre que le début de la clé dans les journaux. */
export function maskKey(key: string): string {
  return `${key.slice(0, 4)}…(${key.length} caractères)`;
}

export function buildIndexNowPayload(input: {
  siteUrl: string;
  key: string;
  urls: readonly string[];
}): IndexNowPayload {
  assertKey(input.key);
  const site = new URL(input.siteUrl);
  const urlList = [...new Set(input.urls)];
  if (urlList.length === 0) throw new Error("indexnow : aucune adresse à soumettre");
  if (urlList.length > MAX_URLS) {
    throw new Error(`indexnow : plus de ${MAX_URLS} adresses, découper l'envoi`);
  }
  for (const url of urlList) {
    if (new URL(url).host !== site.host) {
      throw new Error(`indexnow : adresse hors de ${site.host} : ${url}`);
    }
  }
  return {
    host: site.host,
    key: input.key,
    keyLocation: `${site.origin}/${keyFileName(input.key)}`,
    urlList,
  };
}

/** Toutes les adresses des segments non vides des plans de site. */
export async function collectSitemapUrls(): Promise<string[]> {
  const segments = await listPopulatedSegments();
  return segments.flatMap((segment) => segment.entries.map((entry) => absoluteUrl(entry.path)));
}

export async function writeKeyFile(publicDir: string, key: string): Promise<string> {
  assertKey(key);
  await mkdir(publicDir, { recursive: true });
  const file = path.join(publicDir, keyFileName(key));
  await writeFile(file, key, "utf8");
  return file;
}

export function describeStatus(status: number): string {
  switch (status) {
    case 200:
      return "reçu";
    case 202:
      return "reçu, clé en cours de validation";
    case 400:
      return "requête invalide";
    case 403:
      return "clé refusée (fichier de clé introuvable ou différent)";
    case 422:
      return "adresses hors du domaine ou clé incohérente";
    case 429:
      return "trop de requêtes, réessayer plus tard";
    default:
      return "réponse inattendue";
  }
}

export interface RunDeps {
  argv: readonly string[];
  env: Readonly<Record<string, string | undefined>>;
  fetchImpl?: typeof fetch;
  log?: (line: string) => void;
  /** Dossier public/ où écrire le fichier de clé (tests). */
  publicDir?: string;
  /** Source des adresses (tests) ; par défaut, les plans de site. */
  urls?: () => Promise<string[]>;
}

export type RunResult =
  | { mode: "key-skipped" }
  | { mode: "key-written"; file: string }
  | { mode: "dry-run"; payload: IndexNowPayload | null; urls: string[] }
  | { mode: "submitted"; payload: IndexNowPayload; status: number };

export async function run(deps: RunDeps): Promise<RunResult> {
  const options = parseArgs(deps.argv);
  const log = deps.log ?? ((line: string) => console.log(line));
  const key = deps.env.INDEXNOW_KEY?.trim() || undefined;

  if (options.writeKey) {
    if (!key) {
      log("indexnow : INDEXNOW_KEY absente, aucun fichier de clé écrit (normal hors déploiement)");
      return { mode: "key-skipped" };
    }
    const publicDir = deps.publicDir ?? path.join(process.cwd(), "public");
    const file = await writeKeyFile(publicDir, key);
    log(`indexnow : clé ${maskKey(key)} écrite dans ${path.relative(process.cwd(), file)}`);
    return { mode: "key-written", file };
  }

  const site = siteUrl();
  const urls = await (deps.urls ?? collectSitemapUrls)();

  if (!key || options.dryRun) {
    const payload = key ? buildIndexNowPayload({ siteUrl: site, key, urls }) : null;
    const reason = key ? "--dry-run" : "INDEXNOW_KEY absente";
    log(`indexnow (simulation, ${reason}) : ${urls.length} adresse(s) pour ${new URL(site).host}`);
    for (const url of urls.slice(0, 5)) log(`  ${url}`);
    if (urls.length > 5) log(`  … et ${urls.length - 5} autre(s)`);
    return { mode: "dry-run", payload, urls };
  }

  const payload = buildIndexNowPayload({ siteUrl: site, key, urls });
  const fetchImpl = deps.fetchImpl ?? fetch;
  const response = await fetchImpl(INDEXNOW_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify(payload),
  });
  const status = response.status;
  log(
    `indexnow : ${payload.urlList.length} adresse(s) envoyée(s) à ${INDEXNOW_ENDPOINT} → HTTP ${status}, ${describeStatus(status)}`,
  );
  if (status !== 200 && status !== 202) {
    throw new Error(`indexnow : HTTP ${status} (${describeStatus(status)})`);
  }
  return { mode: "submitted", payload, status };
}
