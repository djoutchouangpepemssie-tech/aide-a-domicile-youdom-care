import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

/*
 * Cache des téléchargements du pipeline local (docs/04 §5) : chaque source est enregistrée dans
 * data/raw/{id}-{date}.{ext}. En ligne, un fichier du jour est réutilisé tel quel ; hors ligne
 * (`--offline`), le fichier le plus récent est réutilisé quelle que soit sa date. Chaque
 * téléchargement est vérifié (statut HTTP, taille minimale) et consigné pour data/raw/README.md.
 */

export type SourceExt = "json" | "csv" | "zip" | "html";

export interface SourceSpec {
  /** Identifiant stable, utilisé dans le nom du fichier de cache (minuscules, tirets). */
  id: string;
  label: string;
  url: string;
  ext: SourceExt;
  licence: string;
  /** Taille minimale attendue en octets : en dessous, la réponse est considérée comme fausse. */
  minBytes?: number;
  headers?: Record<string, string>;
}

export interface CachedFile {
  spec: SourceSpec;
  path: string;
  bytes: Buffer;
  collected_at: string;
  fromCache: boolean;
}

export type SourceStatus = "téléchargé" | "cache" | "injoignable";

export interface SourceRecord {
  id: string;
  label: string;
  url: string;
  licence: string;
  collected_at: string | null;
  size: number | null;
  status: SourceStatus;
  error?: string;
}

const USER_AGENT =
  "Mozilla/5.0 (compatible; youdom-care-data-local/1.0; +https://www.youdom-care.fr) pipeline docs/04";

const ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export interface CacheOptions {
  offline: boolean;
  today: string;
  /** Remplace `fetch` (tests). */
  fetchImpl?: typeof fetch;
}

export class SourceCache {
  readonly records: SourceRecord[] = [];
  private readonly rawDir: string;
  private readonly offline: boolean;
  private readonly today: string;
  private readonly fetchImpl: typeof fetch;

  constructor(rawDir: string, options: CacheOptions) {
    this.rawDir = rawDir;
    this.offline = options.offline;
    this.today = options.today;
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  /** Télécharge (ou relit) une source ; lève une erreur si elle est indisponible. */
  async fetch(spec: SourceSpec): Promise<CachedFile> {
    if (!ID_PATTERN.test(spec.id)) throw new Error(`identifiant de source invalide : ${spec.id}`);
    await mkdir(this.rawDir, { recursive: true });
    const cached = await this.findCached(spec);
    if (cached && (this.offline || cached.collected_at === this.today)) {
      const bytes = await readFile(cached.path);
      this.record(spec, { collected_at: cached.collected_at, size: bytes.length, status: "cache" });
      return { spec, path: cached.path, bytes, collected_at: cached.collected_at, fromCache: true };
    }
    if (this.offline) {
      this.record(spec, {
        collected_at: null,
        size: null,
        status: "injoignable",
        error: "aucun fichier en cache (mode hors ligne)",
      });
      throw new Error(`${spec.id} : aucun fichier en cache pour le mode hors ligne`);
    }
    try {
      const bytes = await this.download(spec);
      const filePath = path.join(this.rawDir, `${spec.id}-${this.today}.${spec.ext}`);
      await writeFile(filePath, bytes);
      this.record(spec, { collected_at: this.today, size: bytes.length, status: "téléchargé" });
      return { spec, path: filePath, bytes, collected_at: this.today, fromCache: false };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (cached) {
        // Source injoignable aujourd'hui : on repart du dernier fichier connu et on le signale.
        const bytes = await readFile(cached.path);
        this.record(spec, {
          collected_at: cached.collected_at,
          size: bytes.length,
          status: "cache",
          error: `téléchargement impossible (${message}), fichier du ${cached.collected_at} réutilisé`,
        });
        return {
          spec,
          path: cached.path,
          bytes,
          collected_at: cached.collected_at,
          fromCache: true,
        };
      }
      this.record(spec, { collected_at: null, size: null, status: "injoignable", error: message });
      throw new Error(`${spec.id} : ${message}`);
    }
  }

  /** Consigne une source gérée hors de ce cache (géocodage BAN, ban.ts) pour data/raw/README.md. */
  addRecord(record: SourceRecord): void {
    const existing = this.records.findIndex((r) => r.id === record.id);
    if (existing >= 0) this.records[existing] = record;
    else this.records.push(record);
  }

  /** Comme `fetch`, mais renvoie null au lieu de lever : la source est notée injoignable. */
  async tryFetch(spec: SourceSpec): Promise<CachedFile | null> {
    try {
      return await this.fetch(spec);
    } catch {
      return null;
    }
  }

  private async download(spec: SourceSpec): Promise<Buffer> {
    const response = await this.fetchImpl(spec.url, {
      headers: { "user-agent": USER_AGENT, ...(spec.headers ?? {}) },
      redirect: "follow",
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const bytes = Buffer.from(await response.arrayBuffer());
    const minBytes = spec.minBytes ?? 1;
    if (bytes.length < minBytes) {
      throw new Error(`réponse trop courte (${bytes.length} octets, attendu ≥ ${minBytes})`);
    }
    if (spec.ext === "json") {
      try {
        JSON.parse(bytes.toString("utf8"));
      } catch {
        throw new Error("réponse JSON invalide");
      }
    }
    return bytes;
  }

  private async findCached(spec: SourceSpec): Promise<{ path: string; collected_at: string } | null> {
    const pattern = new RegExp(`^${spec.id}-(\\d{4}-\\d{2}-\\d{2})\\.${spec.ext}$`);
    let best: { path: string; collected_at: string } | null = null;
    for (const name of await readdir(this.rawDir)) {
      const match = pattern.exec(name);
      if (!match) continue;
      const collected_at = match[1] ?? "";
      if (!best || collected_at > best.collected_at) {
        best = { path: path.join(this.rawDir, name), collected_at };
      }
    }
    return best;
  }

  private record(spec: SourceSpec, state: Omit<SourceRecord, "id" | "label" | "url" | "licence">) {
    const existing = this.records.findIndex((r) => r.id === spec.id);
    const record: SourceRecord = {
      id: spec.id,
      label: spec.label,
      url: spec.url,
      licence: spec.licence,
      ...state,
    };
    if (existing >= 0) this.records[existing] = record;
    else this.records.push(record);
  }
}

/** Contenu de data/raw/README.md : sources, adresses, dates, licences, état. */
export function renderRawReadme(records: readonly SourceRecord[], today: string): string {
  const lines = [
    "# Données brutes du pipeline local",
    "",
    `Fichiers téléchargés par \`pnpm data:local\` (scripts/data/local). Ce dossier est ignoré par git`,
    `à l'exception de ce fichier, régénéré à chaque exécution (dernière : ${today}). \`--offline\``,
    "réutilise le fichier le plus récent de chaque source.",
    "",
    "Une entrée par source : libellé (identifiant du fichier), adresse, licence, date de collecte, taille, état.",
    "",
    "## Géocodage des faits parisiens (Base Adresse Nationale)",
    "",
    "Les faits des arrondissements de Paris dont l'adresse est une adresse de voie (numéro puis voie) sont",
    "soumis à l'API Adresse de la Base Adresse Nationale (`https://api-adresse.data.gouv.fr/search/?q=<adresse>&limit=1`,",
    "Licence Ouverte / Open Licence 2.0, Etalab ; appels espacés, ~50 requêtes/s au plus). La requête est le",
    "numéro et la voie suivis de « Paris », sans le code postal (donnée suspecte qui biaise la BAN). Si le score du",
    "premier résultat est ≥ 0,6, que la BAN a reconnu le numéro (`type: housenumber`), que la voie renvoyée",
    "correspond à l'adresse demandée et que `citycode` est un arrondissement (751xx), ce code remplace",
    "`commune_insee` du fait, qui est rattaché à cet arrondissement",
    "(retiré de l'arrondissement d'origine s'il n'est pas le bon, ajouté au bon s'il a une page de vague 1) ;",
    "sinon le fait reste où il est. Motif : la source CNSA rattache des résidences autonomie du CASVP au",
    "mauvais arrondissement (« 7bis rue Clauzel, 75015 » est dans le 9e). Hors Paris, le code postal et la",
    "ville de l'adresse suffisent (`locateFacts`), la BAN n'est pas appelée. Les réponses sont mises en cache",
    "dans `ban-<date>.json` (une entrée par adresse normalisée, réutilisée en `--offline`) ; l'entrée",
    "`ban-adresses-paris` ci-dessous donne la date de collecte. Règle détaillée : scripts/data/local/ban.ts.",
    "",
    "## Sources",
    "",
  ];
  const sorted = [...records].sort((a, b) => a.id.localeCompare(b.id));
  for (const r of sorted) {
    const size = r.size === null ? "—" : formatSize(r.size);
    const state = r.error ? `${r.status} (${r.error})` : r.status;
    lines.push(`- **${r.label}** (\`${r.id}\`)`);
    lines.push(`  - adresse : <${r.url}>`);
    lines.push(`  - licence : ${r.licence}`);
    lines.push(`  - date : ${r.collected_at ?? "—"} · taille : ${size} · état : ${state}`);
  }
  lines.push("");
  return lines.join("\n");
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}
