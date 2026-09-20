import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { nearest, type CommuneRecord, type LatLng } from "../../src/lib/geo/geo";

/*
 * Communes et arrondissements d'Île-de-France (docs/04 §5) depuis l'API Découpage administratif,
 * enrichis de l'agence la plus proche (data/agences.geo.json, produit par geocode-agencies.ts).
 * Sortie : data/idf-communes.json (petit fichier de référence, versionné).
 *   pnpm data:communes
 */

const DEPARTEMENTS = ["75", "77", "78", "91", "92", "93", "94", "95"] as const;
const API = "https://geo.api.gouv.fr";
const FIELDS = "nom,code,codesPostaux,population,centre,codeDepartement";

interface ApiCommune {
  nom: string;
  code: string;
  codesPostaux?: string[];
  population?: number;
  centre?: { type: "Point"; coordinates: [number, number] };
  codeDepartement?: string;
}

interface GeocodedAgency {
  id: string;
  coordonnees: LatLng | null;
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { headers: { accept: "application/json" } });
  if (!response.ok) throw new Error(`${url} → HTTP ${response.status}`);
  return (await response.json()) as T;
}

function toRecord(
  item: ApiCommune,
  type: CommuneRecord["type"],
  departement: string,
  agencies: readonly { id: string; coordonnees: LatLng }[],
): CommuneRecord {
  const centre = item.centre
    ? { lat: item.centre.coordinates[1], lng: item.centre.coordinates[0] }
    : null;
  return {
    code: item.code,
    nom: item.nom,
    codes_postaux: item.codesPostaux ?? [],
    departement,
    type,
    population: item.population ?? null,
    centre,
    agence: centre ? (nearest(centre, agencies)?.id ?? null) : null,
  };
}

export async function buildCommunes(rootDir: string): Promise<CommuneRecord[]> {
  const geoFile = path.join(rootDir, "data", "agences.geo.json");
  const geocoded = JSON.parse(await readFile(geoFile, "utf8")) as { agences: GeocodedAgency[] };
  const agencies = geocoded.agences.filter(
    (a): a is { id: string; coordonnees: LatLng } => a.coordonnees !== null,
  );

  const records: CommuneRecord[] = [];
  for (const dep of DEPARTEMENTS) {
    const communes = await fetchJson<ApiCommune[]>(
      `${API}/departements/${dep}/communes?fields=${FIELDS}&format=json`,
    );
    for (const item of communes) {
      // Paris (75056) est remplacé par ses vingt arrondissements ci-dessous.
      if (item.code === "75056") continue;
      records.push(toRecord(item, "commune", dep, agencies));
    }
  }
  const arrondissements = await fetchJson<ApiCommune[]>(
    `${API}/communes?codeDepartement=75&type=arrondissement-municipal&fields=${FIELDS}&format=json`,
  );
  for (const item of arrondissements) {
    records.push(toRecord(item, "arrondissement", "75", agencies));
  }
  records.sort((a, b) => a.code.localeCompare(b.code));
  return records;
}

async function main() {
  const rootDir = process.cwd();
  const communes = await buildCommunes(rootDir);
  const output = {
    _source: `API Découpage administratif (${API}), licence ouverte Etalab ; agence la plus proche à vol d'oiseau depuis data/agences.geo.json`,
    collected_at: new Date().toISOString().slice(0, 10),
    communes,
  };
  await mkdir(path.join(rootDir, "data"), { recursive: true });
  await writeFile(
    path.join(rootDir, "data", "idf-communes.json"),
    `${JSON.stringify(output, null, 2)}\n`,
  );
  // Version compacte pour la recherche côté client (chargée à la demande) : [code, nom, cps, dep, agence]
  const compact = communes.map((c) => [
    c.code,
    c.nom,
    c.codes_postaux.join(" "),
    c.departement,
    c.agence ?? "",
  ]);
  await writeFile(
    path.join(rootDir, "data", "idf-communes.compact.json"),
    `${JSON.stringify(compact)}\n`,
  );
  const withAgency = communes.filter((c) => c.agence !== null).length;
  console.log(
    `data/idf-communes.json : ${communes.length} communes et arrondissements, ${withAgency} avec agence la plus proche`,
  );
}

if (process.argv[1]?.endsWith("fetch-communes.ts")) {
  main().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
