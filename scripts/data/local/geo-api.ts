import type { LatLng } from "../../../src/lib/geo/geo";
import type { CachedFile, SourceCache } from "./cache";

/*
 * API Découpage administratif (docs/04 §5) : communes des huit départements, arrondissements de
 * Paris, intercommunalités, départements et région. Licence ouverte Etalab 2.0.
 */

export const GEO_API = "https://geo.api.gouv.fr";
export const GEO_LICENCE = "Licence Ouverte / Open Licence 2.0 (Etalab)";
export const COMMUNE_FIELDS = "nom,code,codesPostaux,population,centre,surface,codeEpci";

export const IDF_DEPARTEMENTS = ["75", "77", "78", "91", "92", "93", "94", "95"] as const;
export type DepartementCode = (typeof IDF_DEPARTEMENTS)[number];
export const PARIS_COMMUNE = "75056";

interface ApiCommune {
  nom: string;
  code: string;
  codesPostaux?: string[];
  population?: number;
  centre?: { type: "Point"; coordinates: [number, number] };
  surface?: number;
  codeEpci?: string;
}

export interface GeoCommune {
  code: string;
  nom: string;
  codes_postaux: string[];
  departement: DepartementCode;
  type: "commune" | "arrondissement";
  population: number | null;
  centre: LatLng | null;
  /** Superficie en hectares (API : `surface`). */
  superficie_ha: number | null;
  epci: string | null;
}

export interface GeoDepartement {
  code: DepartementCode;
  nom: string;
  chefLieu: string;
}

export interface GeoData {
  region: { code: string; nom: string };
  departements: GeoDepartement[];
  /** Communes (Paris 75056 inclus) et arrondissements de Paris. */
  communes: GeoCommune[];
  epcis: Map<string, string>;
  /** Adresses interrogées, pour `sources[]` et `source_url`. */
  urls: { communes: Record<string, string>; arrondissements: string; departements: string };
  collected_at: string;
}

function parseJson<T>(file: CachedFile): T {
  return JSON.parse(file.bytes.toString("utf8")) as T;
}

function toCommune(
  item: ApiCommune,
  type: GeoCommune["type"],
  departement: DepartementCode,
): GeoCommune {
  return {
    code: item.code,
    nom: item.nom,
    codes_postaux: item.codesPostaux ?? [],
    departement,
    type,
    population: typeof item.population === "number" ? item.population : null,
    centre: item.centre
      ? { lat: item.centre.coordinates[1], lng: item.centre.coordinates[0] }
      : null,
    superficie_ha: typeof item.surface === "number" ? item.surface : null,
    epci: item.codeEpci ?? null,
  };
}

export async function loadGeoData(cache: SourceCache): Promise<GeoData> {
  const communes: GeoCommune[] = [];
  const urls: GeoData["urls"] = { communes: {}, arrondissements: "", departements: "" };
  let collected_at = "";
  for (const dep of IDF_DEPARTEMENTS) {
    const url = `${GEO_API}/departements/${dep}/communes?fields=${COMMUNE_FIELDS}&format=json`;
    urls.communes[dep] = url;
    const file = await cache.fetch({
      id: `geo-communes-${dep}`,
      label: `API Découpage administratif — communes du ${dep}`,
      url,
      ext: "json",
      licence: GEO_LICENCE,
      // Paris (75) ne compte qu'une commune : quelques centaines d'octets.
      minBytes: 200,
    });
    collected_at = collected_at || file.collected_at;
    for (const item of parseJson<ApiCommune[]>(file)) communes.push(toCommune(item, "commune", dep));
  }
  const arrondissementsUrl = `${GEO_API}/communes?codeDepartement=75&type=arrondissement-municipal&fields=${COMMUNE_FIELDS}&format=json`;
  urls.arrondissements = arrondissementsUrl;
  const arrondissements = parseJson<ApiCommune[]>(
    await cache.fetch({
      id: "geo-arrondissements-paris",
      label: "API Découpage administratif — arrondissements de Paris",
      url: arrondissementsUrl,
      ext: "json",
      licence: GEO_LICENCE,
      minBytes: 500,
    }),
  );
  for (const item of arrondissements) communes.push(toCommune(item, "arrondissement", "75"));
  communes.sort((a, b) => a.code.localeCompare(b.code));

  const epcis = new Map<string, string>();
  for (const dep of IDF_DEPARTEMENTS) {
    const file = await cache.fetch({
      id: `geo-epcis-${dep}`,
      label: `API Découpage administratif — intercommunalités du ${dep}`,
      url: `${GEO_API}/epcis?codeDepartement=${dep}&fields=nom,code`,
      ext: "json",
      licence: GEO_LICENCE,
      minBytes: 10,
    });
    for (const epci of parseJson<{ nom: string; code: string }[]>(file)) epcis.set(epci.code, epci.nom);
  }

  const departementsUrl = `${GEO_API}/departements?codeRegion=11&fields=nom,code,chefLieu`;
  urls.departements = departementsUrl;
  const departements = parseJson<{ nom: string; code: string; chefLieu: string }[]>(
    await cache.fetch({
      id: "geo-departements-idf",
      label: "API Découpage administratif — départements d'Île-de-France",
      url: departementsUrl,
      ext: "json",
      licence: GEO_LICENCE,
      minBytes: 50,
    }),
  )
    .filter((d): d is { nom: string; code: DepartementCode; chefLieu: string } =>
      (IDF_DEPARTEMENTS as readonly string[]).includes(d.code),
    )
    .map((d) => ({ code: d.code, nom: d.nom, chefLieu: d.chefLieu }));
  const region = parseJson<{ nom: string; code: string }>(
    await cache.fetch({
      id: "geo-region-idf",
      label: "API Découpage administratif — région Île-de-France",
      url: `${GEO_API}/regions/11`,
      ext: "json",
      licence: GEO_LICENCE,
      minBytes: 10,
    }),
  );
  return { region, departements, communes, epcis, urls, collected_at };
}
