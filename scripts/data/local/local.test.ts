import { deflateRawSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { distanceKm } from "../../../src/lib/geo/geo";
import { parseCsv, parseCsvRecords } from "./csv";
import { analyzeUrl, cleanUrl, dedupeFacts, fact, formatPhone, sortFacts } from "./facts";
import { computeShares, parseInseeCsv, sumCounts } from "./insee";
import {
  arrondissementName,
  arrondissementPath,
  arrondissementSlug,
  communePath,
  departementPath,
  regionPath,
  slugify,
} from "./slug";
import { arrondissementsInLabel } from "./sources/annuaire";
import { departementAgency, nearestAgency, nearestNeighbours, selectWave1, type Agency, type TerritoryCommune } from "./territoires";
import { listZipEntries, readZipFile } from "./zip";

/* ---------- Haversine ---------- */

describe("distance à vol d'oiseau", () => {
  it("Paris – Versailles ≈ 17 km, symétrique, nulle sur un même point", () => {
    const paris = { lat: 48.8589, lng: 2.347 };
    const versailles = { lat: 48.8049, lng: 2.1204 };
    const d = distanceKm(paris, versailles);
    expect(d).toBeGreaterThan(16.5);
    expect(d).toBeLessThan(17.8);
    expect(distanceKm(versailles, paris)).toBeCloseTo(d, 9);
    expect(distanceKm(paris, paris)).toBe(0);
  });

  it("arrondit la distance à l'agence la plus proche à une décimale", () => {
    const agencies: Agency[] = [
      { id: "puteaux", code_insee: "92062", departement: "92", coordonnees: { lat: 48.88366, lng: 2.248934 } },
      { id: "versailles", code_insee: "78646", departement: "78", coordonnees: { lat: 48.795923, lng: 2.138577 } },
    ];
    const nearest = nearestAgency({ lat: 48.8925, lng: 2.2071 }, agencies);
    expect(nearest?.id).toBe("puteaux");
    expect(nearest?.distance_km).toBe(3.2);
    expect(nearestAgency({ lat: 48.8, lng: 2.1 }, [])).toBeNull();
  });
});

/* ---------- Vague 1 ---------- */

const agencies: Agency[] = [
  { id: "puteaux", code_insee: "92062", departement: "92", coordonnees: { lat: 48.884, lng: 2.249 } },
  { id: "paris-12", code_insee: "75112", departement: "75", coordonnees: { lat: 48.8506, lng: 2.3701 } },
];

function commune(
  code: string,
  nom: string,
  departement: TerritoryCommune["departement"],
  population: number | null,
  centre: { lat: number; lng: number } | null,
  type: TerritoryCommune["type"] = "commune",
): TerritoryCommune {
  return { code, nom, departement, type, population, centre };
}

const fixtures: TerritoryCommune[] = [
  commune("75056", "Paris", "75", 2_100_000, { lat: 48.8589, lng: 2.347 }),
  commune("75101", "Paris 1er Arrondissement", "75", 15_000, { lat: 48.862, lng: 2.3359 }, "arrondissement"),
  commune("75112", "Paris 12e Arrondissement", "75", 140_000, { lat: 48.835, lng: 2.4211 }, "arrondissement"),
  commune("92062", "Puteaux", "92", 45_000, { lat: 48.884, lng: 2.238 }),
  commune("92026", "Courbevoie", "92", 82_000, { lat: 48.8978, lng: 2.2531 }),
  commune("92050", "Nanterre", "92", 96_000, { lat: 48.896, lng: 2.2071 }),
  commune("92002", "Antony", "92", 64_000, { lat: 48.7507, lng: 2.2976 }),
  commune("92078", "Villeneuve-la-Garenne", "92", 27_000, { lat: 48.9, lng: 2.27 }),
  commune("92001", "Sans centre", "92", 30_000, null),
  commune("78646", "Versailles", "78", 85_000, { lat: 48.8049, lng: 2.1204 }),
  commune("78005", "Petit village", "78", 500, { lat: 48.7, lng: 1.9 }),
  commune("78006", "Sans population", "78", null, { lat: 48.71, lng: 1.91 }),
];

describe("sélection de la vague 1", () => {
  const wave = selectWave1(fixtures, agencies, { topByDepartement: 3, radiusKm: 5 });

  it("retient les communes des agences avec le motif commune-agence", () => {
    expect(wave.get("92062")).toBe("commune-agence");
    expect(wave.get("75112")).toBe("commune-agence");
  });

  it("retient tous les arrondissements et jamais Paris 75056", () => {
    expect(wave.get("75101")).toBe("arrondissement");
    expect(wave.has("75056")).toBe(false);
  });

  it("retient les N communes les plus peuplées par département hors Paris", () => {
    expect(wave.get("92050")).toBe("population");
    expect(wave.get("92026")).toBe("population");
    expect(wave.get("92002")).toBe("population");
    expect(wave.get("78646")).toBe("population");
    expect(wave.get("78005")).toBe("population");
    expect(wave.has("78006")).toBe(false);
  });

  it("retient toute commune à moins de 5 km d'une agence", () => {
    expect(wave.get("92078")).toBe("proximite");
    expect(wave.has("92001")).toBe(false);
  });
});

describe("agence de département et voisins", () => {
  it("prend l'agence implantée dans le département, sinon la plus proche du chef-lieu", () => {
    const chefLieu = { lat: 48.896, lng: 2.2071 };
    expect(departementAgency("92", chefLieu, agencies)).toEqual({ id: "puteaux", distance_km: 3.3 });
    expect(departementAgency("91", { lat: 48.6, lng: 2.4 }, agencies)?.id).toBe("paris-12");
    expect(departementAgency("91", null, agencies)).toBeNull();
  });

  it("classe les voisins par distance réelle, sans Paris 75056 ni la commune elle-même", () => {
    const origin = fixtures.find((c) => c.code === "92062");
    if (!origin) throw new Error("fixture");
    const neighbours = nearestNeighbours(origin, fixtures, 3);
    expect(neighbours.map((n) => n.code)).toEqual(["92026", "92050", "92078"]);
    expect(neighbours[0]?.distance_km).toBeGreaterThan(0);
    expect(neighbours.every((n) => n.code !== "75056" && n.code !== "92062")).toBe(true);
  });
});

/* ---------- Parts d'âge (Insee) ---------- */

describe("parts d'âge Insee", () => {
  it("calcule les parts en pourcentage à une décimale et arrondit la population", () => {
    const shares = computeShares({ population: 44198.4, pop_60_74: 5605.77, pop_75_89: 2505.53, pop_90_plus: 414.31 });
    expect(shares.population).toBe(44198);
    expect(shares.part_60_74).toBe(12.7);
    expect(shares.part_75_89).toBe(5.7);
    expect(shares.part_90_plus).toBe(0.9);
    expect(shares.part_75_plus).toBe(6.6);
  });

  it("renvoie 0 pour une population nulle et additionne les communes d'un département", () => {
    expect(computeShares({ population: 0, pop_60_74: 0, pop_75_89: 0, pop_90_plus: 0 }).part_75_plus).toBe(0);
    const total = sumCounts([
      { population: 100, pop_60_74: 10, pop_75_89: 5, pop_90_plus: 1 },
      { population: 200, pop_60_74: 30, pop_75_89: 15, pop_90_plus: 3 },
    ]);
    expect(total).toEqual({ population: 300, pop_60_74: 40, pop_75_89: 20, pop_90_plus: 4 });
  });

  it("lit la base communale (séparateur point-virgule) en ne gardant que les codes demandés", () => {
    const csv = [
      "CODGEO;P22_POP;P22_POP0014;P22_POP6074;P22_POP7589;P22_POP90P",
      "01001;800;100;120,5;60;5",
      "92062;44198;7363;5605.77;2505.53;414.31",
      "75101;15475;1489;2357.7;1167.6;169.7",
      "",
    ].join("\r\n");
    const counts = parseInseeCsv(csv, "2022", (code) => code.startsWith("92") || code.startsWith("75"));
    expect([...counts.keys()]).toEqual(["92062", "75101"]);
    expect(counts.get("92062")).toEqual({ population: 44198, pop_60_74: 5605.77, pop_75_89: 2505.53, pop_90_plus: 414.31 });
    expect(() => parseInseeCsv(csv, "2023", () => true)).toThrow(/P23_POP/);
  });
});

/* ---------- Slugs et chemins ---------- */

describe("slugs et chemins", () => {
  it("construit des slugs en minuscules sans accent", () => {
    expect(slugify("L'Haÿ-les-Roses")).toBe("l-hay-les-roses");
    expect(slugify("Val-d'Oise")).toBe("val-d-oise");
    expect(slugify("Saint-Fargeau-Ponthierry")).toBe("saint-fargeau-ponthierry");
    expect(slugify("Île-de-France")).toBe("ile-de-france");
  });

  it("nomme les arrondissements comme le seed", () => {
    expect(arrondissementSlug("75101")).toBe("1er-arrondissement");
    expect(arrondissementSlug("75115")).toBe("15e-arrondissement");
    expect(arrondissementName("75120")).toBe("Paris 20e arrondissement");
    expect(() => arrondissementSlug("75056")).toThrow();
  });

  it("produit les chemins de docs/04 §4", () => {
    expect(regionPath()).toBe("/aide-a-domicile/");
    expect(departementPath("hauts-de-seine")).toBe("/aide-a-domicile/hauts-de-seine/");
    expect(communePath("hauts-de-seine", "puteaux")).toBe("/aide-a-domicile/hauts-de-seine/puteaux/");
    expect(arrondissementPath("75115")).toBe("/aide-a-domicile/paris/15e-arrondissement/");
  });
});

/* ---------- Faits ---------- */

describe("faits", () => {
  const base = { source_url: "https://example.org/source", collected_at: "2026-09-20" } as const;

  it("valide un fait et rejette une source absente ou un lien invalide", () => {
    const f = fact({ type: "ccas", label: "CCAS", address: "1 rue A, 92800 Puteaux", url: "https://puteaux.fr/", ...base });
    expect(f.url).toBe("https://puteaux.fr/");
    expect(() => fact({ type: "ccas", label: "CCAS", url: "www.puteaux.frvie", ...base })).toThrow();
    expect(cleanUrl("www.adapei77.org")).toBeUndefined();
  });

  it("répare la barre oblique perdue après le domaine d'un lien officiel", () => {
    expect(cleanUrl("http://www.puteaux.frvie-sociale/ccas/les-4-poles-du-ccas")).toBe("http://www.puteaux.fr/vie-sociale/ccas/les-4-poles-du-ccas");
    expect(cleanUrl("http://www.hauts-de-seine.frsolidarites/personnes-agees")).toBe("http://www.hauts-de-seine.fr/solidarites/personnes-agees");
    expect(cleanUrl("http://www.lesabondances.frplateforme-des-aidants")).toBe("http://www.lesabondances.fr/plateforme-des-aidants");
    expect(cleanUrl("https://association.orgagenda?mois=9#haut")).toBe("https://association.org/agenda?mois=9#haut");
    expect(cleanUrl("https://ville.parisseniors/")).toBe("https://ville.paris/seniors/");
    expect(analyzeUrl("http://www.puteaux.frvie-sociale/ccas")).toMatchObject({ action: "reparee", url: "http://www.puteaux.fr/vie-sociale/ccas" });
  });

  it("garde tel quel un lien valide, y compris gouv.fr et les domaines longs réels", () => {
    for (const url of [
      "https://www.paris.fr/pages/loisirs-185",
      "http://www.logementseniors-paris.fr",
      "https://www.service-public.gouv.fr/",
      "https://www.ville.paris/",
      "https://exemple.company/page",
      "https://Exemple.FR/Page?x=1",
    ]) {
      expect(cleanUrl(` ${url} `)).toBe(url);
      expect(analyzeUrl(url).action).toBe("conservee");
    }
  });

  it("supprime les adresses électroniques, les hôtes sans domaine plausible et les liens illisibles", () => {
    for (const url of [
      "http://www.logementseniors@paris.fr",
      "mailto:ccas@ville.fr",
      "http://www.puteaux",
      "http://localhost/x",
      "http://www.mairie.fr solidarites",
      "http://ville.xxinconnu/page",
      "ftp://www.ville.fr/",
      "www.adapei77.org",
      "n/a",
    ]) {
      expect(cleanUrl(url)).toBeUndefined();
      expect(analyzeUrl(url).action).toBe("supprimee");
    }
    expect(analyzeUrl("   ").action).toBe("absent");
    expect(analyzeUrl(null).action).toBe("absent");
    expect(cleanUrl(undefined)).toBeUndefined();
  });

  it("dédoublonne sur l'adresse normalisée et trie par type puis libellé", () => {
    const a = fact({ type: "point-information", label: "Point d'information - Puteaux", address: "102 bis rue de la République, 92800 Puteaux", ...base });
    const b = fact({ type: "point-information", label: "Maison des aînés", address: "102 BIS RUE DE LA REPUBLIQUE 92800 PUTEAUX", ...base });
    const c = fact({ type: "demographie", label: "Population", value: "44 198", ...base });
    const result = sortFacts(dedupeFacts([a, b, c]));
    expect(result.map((f) => f.label)).toEqual(["Population", "Point d'information - Puteaux"]);
  });

  it("met en forme les téléphones français et garde les autres tels quels", () => {
    expect(formatPhone("+33146929595")).toBe("01 46 92 95 95");
    expect(formatPhone("0146929292")).toBe("01 46 92 92 92");
    expect(formatPhone("0 809 361 212")).toBe("0 809 361 212");
    expect(formatPhone("")).toBeUndefined();
  });

  it("lit les arrondissements cités dans un libellé parisien", () => {
    expect([...arrondissementsInLabel("Point d'information local - Paris 9e - 10e - 19e arrondissements")]).toEqual([9, 10, 19]);
    expect([...arrondissementsInLabel("Paris centre 1er - 2e - 3e - 4e - 5e - 6e arrondissements")]).toEqual([1, 2, 3, 4, 5, 6]);
    expect(arrondissementsInLabel("Mairie - Puteaux").size).toBe(0);
  });
});

/* ---------- CSV et ZIP ---------- */

describe("CSV", () => {
  it("gère guillemets doublés, retours à la ligne dans les champs et CRLF", () => {
    const rows = parseCsv('"a","b ""c""","d\ne"\r\n1,2,3\r\n');
    expect(rows).toEqual([["a", 'b "c"', "d\ne"], ["1", "2", "3"]]);
    const records = parseCsvRecords("﻿title,IsCLIC\nCLIC X,TRUE\n");
    expect(records).toEqual([{ title: "CLIC X", IsCLIC: "TRUE" }]);
  });
});

function buildZip(entries: { name: string; data: Buffer; deflate: boolean }[]): Buffer {
  const parts: Buffer[] = [];
  const central: Buffer[] = [];
  let offset = 0;
  for (const e of entries) {
    const name = Buffer.from(e.name, "utf8");
    const payload = e.deflate ? deflateRawSync(e.data) : e.data;
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(e.deflate ? 8 : 0, 8);
    local.writeUInt32LE(payload.length, 18);
    local.writeUInt32LE(e.data.length, 22);
    local.writeUInt16LE(name.length, 26);
    const cd = Buffer.alloc(46);
    cd.writeUInt32LE(0x02014b50, 0);
    cd.writeUInt16LE(e.deflate ? 8 : 0, 10);
    cd.writeUInt32LE(payload.length, 20);
    cd.writeUInt32LE(e.data.length, 24);
    cd.writeUInt16LE(name.length, 28);
    cd.writeUInt32LE(offset, 42);
    parts.push(local, name, payload);
    central.push(cd, name);
    offset += local.length + name.length + payload.length;
  }
  const centralBuffer = Buffer.concat(central);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(entries.length, 8);
  eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(centralBuffer.length, 12);
  eocd.writeUInt32LE(offset, 16);
  return Buffer.concat([...parts, centralBuffer, eocd]);
}

describe("ZIP", () => {
  it("liste et lit des entrées stockées ou compressées", () => {
    const zip = buildZip([
      { name: "meta.CSV", data: Buffer.from("COD_VAR;LIB_VAR\n"), deflate: false },
      { name: "base-cc-evol-struct-pop-2022.CSV", data: Buffer.from("CODGEO;P22_POP\n92062;44198\n".repeat(50)), deflate: true },
    ]);
    expect(listZipEntries(zip).map((e) => e.name)).toEqual(["meta.CSV", "base-cc-evol-struct-pop-2022.CSV"]);
    const csv = readZipFile(zip, (name) => /^base-cc-evol-struct-pop-\d{4}\.csv$/i.test(name)).toString("utf8");
    expect(csv.startsWith("CODGEO;P22_POP\n92062;44198\n")).toBe(true);
    expect(() => readZipFile(zip, () => false)).toThrow(/absent/);
    expect(() => listZipEntries(Buffer.from("pas une archive"))).toThrow();
  });
});
