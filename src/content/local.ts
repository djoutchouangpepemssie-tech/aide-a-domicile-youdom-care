import type { Dirent } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import agenciesGeoJson from "../../data/agences.geo.json";
import { getWeekExamples } from "./loader";
import {
  localDataSchema,
  localEditorialSchema,
  type LocalData,
  type LocalEditorial,
} from "./local-schema";

/*
 * Territoires (docs/04 §4, P6.5) : deux fichiers par territoire, `data/local/{code}.json`
 * (produit par le pipeline, validé par `localDataSchema`) et `content/local/{code}.json` (écrit
 * à la main, validé par `localEditorialSchema`). Une page locale n'est constructible que si les
 * deux existent et sont valides. Un fichier de données invalide, un code qui ne correspond pas
 * à son nom de fichier ou un chemin en double interrompent le build (contrat du pipeline). Un
 * éditorial invalide, incomplet, orphelin ou dont la semaine type est inconnue est signalé par
 * un avertissement et la page n'est pas construite : les rédacteurs écrivent pendant que le
 * site se construit. En production, seules les pages `statut: publie` sont construites ; en
 * prévisualisation, toutes le sont, les autres en `noindex` (même règle que les services).
 *
 * Le territoire `region` (code `idf`) n'a pas de page dynamique : la carte régionale est la
 * route statique /aide-a-domicile/. Les seuils bloquants (faits, mots, similarité) relèvent des
 * contrôles `check-local-*` de `pnpm validate`, pas du chargeur.
 */

export const LOCAL_DATA_DIR = path.join(process.cwd(), "data", "local");
export const LOCAL_CONTENT_DIR = path.join(process.cwd(), "content", "local");

export interface LocalDirs {
  dataDir?: string;
  contentDir?: string;
}

export interface LocalTerritory {
  data: LocalData;
  /** Absent tant que la page n'est pas rédigée (ou tant que l'éditorial est invalide) : pas de page. */
  editorial: LocalEditorial | null;
}

/** Destination des avertissements (éditorial ignoré) ; `console.warn` par défaut. */
export type LocalWarn = (message: string) => void;

const defaultWarn: LocalWarn = (message) => {
  console.warn(`content/local : ${message}`);
};

export interface LocalPage {
  data: LocalData;
  editorial: LocalEditorial;
  /** Chemin canonique de la page (`data.chemin`). */
  chemin: string;
}

async function listJsonFiles(dir: string): Promise<string[]> {
  let entries: Dirent[];
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  return entries
    .filter(
      (entry) => entry.isFile() && entry.name.endsWith(".json") && !entry.name.startsWith("_"),
    )
    .map((entry) => path.join(dir, entry.name))
    .sort();
}

async function readJson(file: string): Promise<unknown> {
  const raw = await readFile(file, "utf8");
  try {
    return JSON.parse(raw) as unknown;
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(`${path.relative(process.cwd(), file)} : JSON invalide (${reason})`);
  }
}

function parseFile<T extends z.ZodType>(schema: T, data: unknown, file: string): z.output<T> {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new Error(
      `${path.relative(process.cwd(), file)} est invalide :\n${z.prettifyError(result.error)}`,
    );
  }
  return result.data;
}

function codeOf(file: string): string {
  return path.basename(file, ".json");
}

/**
 * Lit et valide tous les territoires : erreur lisible au premier fichier de données fautif,
 * avertissement (et page non construite) pour un éditorial fautif.
 */
export async function loadLocalTerritories(
  dirs: LocalDirs = {},
  warn: LocalWarn = defaultWarn,
): Promise<LocalTerritory[]> {
  const dataDir = dirs.dataDir ?? LOCAL_DATA_DIR;
  const contentDir = dirs.contentDir ?? LOCAL_CONTENT_DIR;
  const byCode = new Map<string, LocalTerritory>();
  const paths = new Set<string>();

  for (const file of await listJsonFiles(dataDir)) {
    const data = parseFile(localDataSchema, await readJson(file), file);
    const code = codeOf(file);
    if (data.code !== code) {
      throw new Error(
        `${path.relative(process.cwd(), file)} : le champ code vaut « ${data.code} »`,
      );
    }
    if (paths.has(data.chemin)) {
      throw new Error(`data/local : chemin en double ${data.chemin}`);
    }
    paths.add(data.chemin);
    byCode.set(code, { data, editorial: null });
  }

  for (const file of await listJsonFiles(contentDir)) {
    const rel = path.relative(process.cwd(), file);
    let raw: unknown;
    try {
      raw = await readJson(file);
    } catch (error) {
      warn(`${rel} ignoré : ${error instanceof Error ? error.message : String(error)}`);
      continue;
    }
    const result = localEditorialSchema.safeParse(raw);
    if (!result.success) {
      warn(`${rel} ignoré, éditorial invalide ou incomplet :
${z.prettifyError(result.error)}`);
      continue;
    }
    const editorial = result.data;
    const code = codeOf(file);
    if (editorial.code !== code) {
      warn(`${rel} ignoré : le champ code vaut « ${editorial.code} »`);
      continue;
    }
    const territory = byCode.get(code);
    if (!territory) {
      warn(`${rel} ignoré : aucune donnée data/local/${code}.json pour cet éditorial`);
      continue;
    }
    territory.editorial = editorial;
  }

  return [...byCode.values()];
}

/** Territoires dont les deux fichiers existent et qui ont une page dédiée (hors région). */
export function toLocalPages(territories: readonly LocalTerritory[]): LocalPage[] {
  const pages: LocalPage[] = [];
  for (const { data, editorial } of territories) {
    if (!editorial || data.kind === "region") continue;
    pages.push({ data, editorial, chemin: data.chemin });
  }
  return pages;
}

let cache: Promise<LocalPage[]> | undefined;

async function loadPages(): Promise<LocalPage[]> {
  const pages = toLocalPages(await loadLocalTerritories());
  const examples = new Set(getWeekExamples().exemples.map((example) => example.id));
  return pages.filter((page) => {
    if (examples.has(page.editorial.semaine_type)) return true;
    defaultWarn(
      `content/local/${page.data.code}.json ignoré : semaine_type « ${page.editorial.semaine_type} » absente de content/semaines-types.json`,
    );
    return false;
  });
}

/** Toutes les pages locales rédigées (dépôt courant), en cache. */
export function listLocalPages(): Promise<LocalPage[]> {
  cache ??= loadPages();
  return cache;
}

/**
 * Pages construites : toutes, y compris en production (D-033) ; une page `a_relire` est servie
 * en `noindex` avec son bandeau, et reste hors des plans de site (`listIndexableLocalPages`).
 */
export async function listBuildableLocalPages(): Promise<LocalPage[]> {
  return listLocalPages();
}

/** Pages indexables (plans de site) : publiées, quel que soit l'environnement. */
export async function listIndexableLocalPages(): Promise<LocalPage[]> {
  const pages = await listLocalPages();
  return pages.filter((page) => page.editorial.statut === "publie");
}

export async function getLocalPage(chemin: string): Promise<LocalPage | null> {
  const pages = await listBuildableLocalPages();
  return pages.find((page) => page.chemin === chemin) ?? null;
}

/** Code du département d'une page locale (`departement`, ou le code lui-même pour un département). */
export function departementCodeOf(page: Pick<LocalPage, "data">): string | undefined {
  return page.data.departement ?? (page.data.kind === "departement" ? page.data.code : undefined);
}

/** Vide le cache (tests). */
export function resetLocalPages() {
  cache = undefined;
}

/** Segments d'un chemin local sans son préfixe : « /aide-a-domicile/paris/15e-arrondissement/ » → ["paris", "15e-arrondissement"]. */
export function localPathSegments(chemin: string): string[] {
  return chemin
    .replace(/^\/aide-a-domicile\//, "")
    .split("/")
    .filter(Boolean);
}

/* ---------- data/agences.geo.json : coordonnées géocodées des agences ---------- */

const agencyGeoSchema = z.strictObject({
  _source: z.string(),
  collected_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  agences: z.array(
    z.strictObject({
      id: z.string().min(1),
      requete: z.string(),
      coordonnees: z.strictObject({ lat: z.number(), lng: z.number() }),
      adresse_trouvee: z.string(),
      score: z.number(),
    }),
  ),
});
export type AgencyGeo = z.infer<typeof agencyGeoSchema>;

let agencyGeo: AgencyGeo | undefined;

export function getAgencyGeo(): AgencyGeo {
  if (!agencyGeo) {
    const result = agencyGeoSchema.safeParse(agenciesGeoJson);
    if (!result.success) {
      throw new Error(`data/agences.geo.json est invalide :\n${z.prettifyError(result.error)}`);
    }
    agencyGeo = result.data;
  }
  return agencyGeo;
}

/** Coordonnées géocodées d'une agence (site.config.json > agences[].id) ; null si absentes. */
export function agencyCoordinates(id: string): { lat: number; lng: number } | null {
  return getAgencyGeo().agences.find((agency) => agency.id === id)?.coordonnees ?? null;
}
