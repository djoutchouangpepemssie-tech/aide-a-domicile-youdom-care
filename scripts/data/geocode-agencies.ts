import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { getSiteConfig } from "../../src/content/loader";

/*
 * Géocodage des six agences (docs/04 §5) par la Base adresse nationale. Les coordonnées ne
 * sont pas écrites dans site.config.json (fichier d'Arcel) mais dans data/agences.geo.json,
 * avec la source, le score et la date. Une agence non géocodée garde coordonnees: null.
 *   pnpm data:agences
 */

const BAN = "https://api-adresse.data.gouv.fr/search/";

interface BanResponse {
  features: {
    properties: { label: string; score: number; postcode?: string; citycode?: string };
    geometry: { coordinates: [number, number] };
  }[];
}

export interface GeocodedAgency {
  id: string;
  requete: string;
  coordonnees: { lat: number; lng: number } | null;
  adresse_trouvee: string | null;
  score: number | null;
}

export async function geocodeAgencies(): Promise<GeocodedAgency[]> {
  const { agences } = getSiteConfig();
  const results: GeocodedAgency[] = [];
  for (const agency of agences) {
    const query = `${agency.adresse} ${agency.code_postal} ${agency.commune}`;
    const url = `${BAN}?q=${encodeURIComponent(query)}&postcode=${agency.code_postal}&limit=1`;
    const response = await fetch(url, { headers: { accept: "application/json" } });
    if (!response.ok) throw new Error(`${url} → HTTP ${response.status}`);
    const data = (await response.json()) as BanResponse;
    const best = data.features[0];
    if (!best || best.properties.score < 0.5) {
      results.push({ id: agency.id, requete: query, coordonnees: null, adresse_trouvee: null, score: best?.properties.score ?? null });
      continue;
    }
    results.push({
      id: agency.id,
      requete: query,
      coordonnees: { lat: best.geometry.coordinates[1], lng: best.geometry.coordinates[0] },
      adresse_trouvee: best.properties.label,
      score: Math.round(best.properties.score * 1000) / 1000,
    });
  }
  return results;
}

async function main() {
  const agences = await geocodeAgencies();
  const output = {
    _source: `Base adresse nationale (${BAN}), licence ouverte ; adresses de content/site.config.json (à confirmer, Q-ID-1)`,
    collected_at: new Date().toISOString().slice(0, 10),
    agences,
  };
  const dir = path.join(process.cwd(), "data");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, "agences.geo.json"), `${JSON.stringify(output, null, 2)}\n`);
  for (const a of agences) {
    console.log(`${a.id} : ${a.coordonnees ? `${a.adresse_trouvee} (score ${a.score})` : "non géocodée"}`);
  }
}

if (process.argv[1]?.endsWith("geocode-agencies.ts")) {
  main().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
