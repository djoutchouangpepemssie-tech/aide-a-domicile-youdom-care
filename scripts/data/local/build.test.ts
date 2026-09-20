import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { localDataSchema, localThresholds } from "../../../src/content/local-schema";
import { buildTerritories, compareWithSeed, type BuildInputs, type Seed } from "./build";
import type { GeoData } from "./geo-api";
import type { InseeData } from "./insee";
import type { AnnuaireData } from "./sources/annuaire";
import type { CnsaData } from "./sources/cnsa";
import type { FinessData } from "./sources/finess";
import type { ParisData } from "./sources/paris";
import type { UnapeiData } from "./sources/unapei";
import type { Agency } from "./territoires";

const today = "2026-09-20";

const geo: GeoData = {
  region: { code: "11", nom: "Île-de-France" },
  departements: [
    { code: "75", nom: "Paris", chefLieu: "75056" },
    { code: "77", nom: "Seine-et-Marne", chefLieu: "77288" },
    { code: "78", nom: "Yvelines", chefLieu: "78646" },
    { code: "91", nom: "Essonne", chefLieu: "91228" },
    { code: "92", nom: "Hauts-de-Seine", chefLieu: "92050" },
    { code: "93", nom: "Seine-Saint-Denis", chefLieu: "93008" },
    { code: "94", nom: "Val-de-Marne", chefLieu: "94028" },
    { code: "95", nom: "Val-d'Oise", chefLieu: "95500" },
  ],
  communes: [
    { code: "75056", nom: "Paris", codes_postaux: ["75001", "75012"], departement: "75", type: "commune", population: 2_100_000, centre: { lat: 48.8589, lng: 2.347 }, superficie_ha: 10536, epci: "200054781" },
    { code: "75112", nom: "Paris 12e Arrondissement", codes_postaux: ["75012"], departement: "75", type: "arrondissement", population: 140_000, centre: { lat: 48.835, lng: 2.4211 }, superficie_ha: 1632, epci: null },
    { code: "92062", nom: "Puteaux", codes_postaux: ["92800"], departement: "92", type: "commune", population: 45_000, centre: { lat: 48.884, lng: 2.238 }, superficie_ha: 319, epci: "200054781" },
    { code: "92050", nom: "Nanterre", codes_postaux: ["92000"], departement: "92", type: "commune", population: 96_000, centre: { lat: 48.896, lng: 2.2071 }, superficie_ha: 1219, epci: "200054781" },
    { code: "92001", nom: "Lointaine", codes_postaux: ["92999"], departement: "92", type: "commune", population: null, centre: { lat: 48.7, lng: 2.4 }, superficie_ha: 100, epci: null },
    // Chefs-lieux sans population connue (hors vague 1) : servent au centre des départements.
    { code: "77288", nom: "Melun", codes_postaux: ["77000"], departement: "77", type: "commune", population: null, centre: { lat: 48.5421, lng: 2.6554 }, superficie_ha: null, epci: null },
    { code: "78646", nom: "Versailles", codes_postaux: ["78000"], departement: "78", type: "commune", population: null, centre: { lat: 48.8049, lng: 2.1204 }, superficie_ha: null, epci: null },
    { code: "91228", nom: "Évry-Courcouronnes", codes_postaux: ["91000"], departement: "91", type: "commune", population: null, centre: { lat: 48.6238, lng: 2.4296 }, superficie_ha: null, epci: null },
    { code: "93008", nom: "Bobigny", codes_postaux: ["93000"], departement: "93", type: "commune", population: null, centre: { lat: 48.9088, lng: 2.4391 }, superficie_ha: null, epci: null },
    { code: "94028", nom: "Créteil", codes_postaux: ["94000"], departement: "94", type: "commune", population: null, centre: { lat: 48.7771, lng: 2.4531 }, superficie_ha: null, epci: null },
    { code: "95500", nom: "Pontoise", codes_postaux: ["95300"], departement: "95", type: "commune", population: null, centre: { lat: 49.0508, lng: 2.0953 }, superficie_ha: null, epci: null },
  ],
  epcis: new Map([["200054781", "Métropole du Grand Paris"]]),
  urls: {
    communes: { "92": "https://geo.api.gouv.fr/departements/92/communes?fields=nom" },
    arrondissements: "https://geo.api.gouv.fr/communes?codeDepartement=75&type=arrondissement-municipal",
    departements: "https://geo.api.gouv.fr/departements?codeRegion=11",
  },
  collected_at: today,
};

const agencies: Agency[] = [
  { id: "puteaux", code_insee: "92062", departement: "92", coordonnees: { lat: 48.88366, lng: 2.248934 } },
  { id: "paris-12", code_insee: "75112", departement: "75", coordonnees: { lat: 48.850552, lng: 2.370136 } },
];

const zones = [
  { code: "75", nom: "Paris", slug: "paris" },
  { code: "77", nom: "Seine-et-Marne", slug: "seine-et-marne" },
  { code: "78", nom: "Yvelines", slug: "yvelines" },
  { code: "91", nom: "Essonne", slug: "essonne" },
  { code: "92", nom: "Hauts-de-Seine", slug: "hauts-de-seine" },
  { code: "93", nom: "Seine-Saint-Denis", slug: "seine-saint-denis" },
  { code: "94", nom: "Val-de-Marne", slug: "val-de-marne" },
  { code: "95", nom: "Val-d'Oise", slug: "val-d-oise" },
];

const insee: InseeData = {
  millesime: "2022",
  source_url: "https://www.insee.fr/fr/statistiques/8581696",
  collected_at: today,
  counts: new Map([
    ["92062", { population: 44198, pop_60_74: 5605.77, pop_75_89: 2505.53, pop_90_plus: 414.31 }],
    ["92050", { population: 96000, pop_60_74: 9000, pop_75_89: 4000, pop_90_plus: 500 }],
    ["75056", { population: 2113705, pop_60_74: 302819, pop_75_89: 154040, pop_90_plus: 24566 }],
    ["75112", { population: 140000, pop_60_74: 20000, pop_75_89: 9000, pop_90_plus: 1500 }],
  ]),
};

const annuaireSource92 = { label: "Annuaire — 92", url: "https://api-lannuaire.service-public.fr/…92", collected_at: today };
const annuaireSource75 = { label: "Annuaire — 75", url: "https://api-lannuaire.service-public.fr/…75", collected_at: today };
const annuaire: AnnuaireData = {
  collected_at: today,
  sources: [annuaireSource75, annuaireSource92],
  sourceByDepartement: { "75": annuaireSource75, "92": annuaireSource92 },
  records: [
    { nom: "Centre communal d'action sociale (CCAS) - Puteaux", pivot: "ccas", communes: ["92062"], departement: "92", address: "102bis Rue de la République, 92800 Puteaux", telephone: "01 46 92 95 95", url: "https://www.puteaux.fr/", page: "https://lannuaire.service-public.gouv.fr/ile-de-france/hauts-de-seine/ccas-puteaux" },
    { nom: "Maison départementale des personnes handicapées (MDPH) - Hauts-de-Seine", pivot: "maison_handicapees", communes: ["92026"], departement: "92", page: "https://lannuaire.service-public.gouv.fr/ile-de-france/hauts-de-seine/mdph" },
    { nom: "Conseil départemental - Hauts-de-Seine", pivot: "cg", communes: ["92050"], departement: "92", page: "https://lannuaire.service-public.gouv.fr/ile-de-france/hauts-de-seine/cd" },
    { nom: "Point d'information local dédié aux personnes âgées - Paris 11e- 12e- 20e arrondissements", pivot: "clic", communes: ["75112"], departement: "75", page: "https://lannuaire.service-public.gouv.fr/ile-de-france/paris/clic-12" },
    { nom: "Centre d'Action Sociale de la Ville de Paris (CASVP)", pivot: "ccas", communes: ["75056"], departement: "75", page: "https://lannuaire.service-public.gouv.fr/ile-de-france/paris/casvp" },
  ],
};

const cnsa: CnsaData = { points: [], etablissements: [], sources: [], pointsCollectedAt: "", etabCollectedAt: "" };
const finess: FinessData = { etablissements: [], source: null, collected_at: "" };
const paris: ParisData = { quartiers: [], marches: [], espacesVerts: [], seniors: [], sources: [], collected: {} };
const unapei: UnapeiData = { associations: [], source: null, collected_at: "" };

const inputs: BuildInputs = { geo, agencies, zones, insee, annuaire, cnsa, finess, paris, unapei, today };

describe("assemblage des territoires", () => {
  const result = buildTerritories(inputs);
  const byCode = new Map(result.files.map((f) => [f.code, f]));

  it("produit la région, les 8 départements, l'arrondissement et les communes de la vague 1 seulement", () => {
    expect([...byCode.keys()]).toEqual(["75", "75112", "77", "78", "91", "92", "92050", "92062", "93", "94", "95", "idf"]);
    expect(byCode.has("75056")).toBe(false);
    expect(byCode.has("92001")).toBe(false);
  });

  it("écrit des fichiers conformes au schéma LocalData", () => {
    for (const file of result.files) expect(() => localDataSchema.parse(file)).not.toThrow();
  });

  it("renseigne identité, démographie, agence et voisins d'une commune", () => {
    const puteaux = byCode.get("92062");
    expect(puteaux).toBeDefined();
    if (!puteaux) return;
    expect(puteaux.chemin).toBe("/aide-a-domicile/hauts-de-seine/puteaux/");
    expect(puteaux.slug).toBe("puteaux");
    expect(puteaux.parent).toBe("92");
    expect(puteaux.motif_vague).toBe("commune-agence");
    expect(puteaux.epci).toEqual({ code: "200054781", nom: "Métropole du Grand Paris" });
    expect(puteaux.demographie?.part_75_plus).toBe(6.6);
    expect(puteaux.agence_proche?.id).toBe("puteaux");
    expect(puteaux.communes_voisines?.[0]).toMatchObject({ code: "92050", slug: "nanterre", page: true });
    expect(puteaux.communes_voisines?.some((n) => n.page === false)).toBe(true);
    expect(puteaux.communes_voisines?.length).toBeLessThanOrEqual(8);
    expect(puteaux.facts.map((f) => f.type)).toEqual(
      expect.arrayContaining(["demographie", "ccas", "mdph", "aide-departementale", "transport-adapte", "association", "autre"]),
    );
    expect(puteaux.facts.every((f) => f.source_url.startsWith("http") && /^\d{4}-\d{2}-\d{2}$/.test(f.collected_at))).toBe(true);
    expect(puteaux.sources.some((s) => s.url.includes("insee.fr"))).toBe(true);
    // Une seule exportation de l'annuaire (celle du département), pas les huit.
    expect(puteaux.sources.filter((s) => s.label.startsWith("Annuaire")).map((s) => s.label)).toEqual(["Annuaire — 92"]);
    // Faits situés dans la commune contre faits départementaux.
    expect(puteaux.facts.find((f) => f.type === "ccas")?.in_territory).toBe(true);
    expect(puteaux.facts.find((f) => f.type === "demographie")?.in_territory).toBe(true);
    expect(puteaux.facts.find((f) => f.type === "mdph")?.in_territory).toBe(false);
    expect(puteaux.facts.find((f) => f.type === "transport-adapte")?.in_territory).toBe(false);
  });

  it("nomme et relie l'arrondissement à Paris, avec les services couvrant plusieurs arrondissements", () => {
    const arr = byCode.get("75112");
    expect(arr?.nom).toBe("Paris 12e arrondissement");
    expect(arr?.chemin).toBe("/aide-a-domicile/paris/12e-arrondissement/");
    expect(arr?.parent).toBe("75");
    expect(arr?.motif_vague).toBe("commune-agence");
    expect(arr?.facts.some((f) => f.type === "point-information")).toBe(true);
    expect(arr?.facts.some((f) => f.type === "ccas" && f.label.includes("CASVP"))).toBe(true);
  });

  it("agrège la démographie du département et de la région depuis les communes", () => {
    const dep = byCode.get("92");
    expect(dep?.chemin).toBe("/aide-a-domicile/hauts-de-seine/");
    expect(dep?.demographie?.population).toBe(140198);
    expect(dep?.agence_proche?.id).toBe("puteaux");
    expect(dep?.facts.some((f) => f.type === "mdph")).toBe(true);
    const region = byCode.get("idf");
    expect(region?.chemin).toBe("/aide-a-domicile/");
    expect(region?.demographie?.population).toBe(140198 + 2113705);
    expect(region?.agence_proche).toBeUndefined();
  });

  it("signale les territoires sous les seuils avec les types absents", () => {
    const report = result.reports.find((r) => r.code === "75112");
    expect(report?.required).toBe(localThresholds.arrondissement.faits);
    expect(report?.facts).toBeLessThan(localThresholds.arrondissement.faits);
    expect(report?.missingTypes).toEqual(expect.arrayContaining(["hopital", "accueil-jour", "marche"]));
    expect(result.reports.find((r) => r.code === "idf")?.required).toBeNull();
  });
});

describe("contrôle croisé avec le seed", () => {
  const seed: Seed = {
    departements: zones.map((z) => ({ ...z, agences: z.code === "92" ? ["puteaux"] : z.code === "75" ? ["paris-12"] : [] })),
    regle_vague_1: { communes_des_agences: ["92062"] },
    paris: {
      code_insee_commune: "75056",
      arrondissements: [
        { numero: 12, nom: "12e arrondissement", slug: "12e-arrondissement", code_insee: "75112", codes_postaux: ["75012"], quartiers: [{ numero: 47, nom: "Bercy", slug: "bercy" }] },
      ],
    },
  };
  const bercy = { numero: 47, nom: "Bercy", slug: "bercy", arrondissement: 12, code_insee_arrondissement: "75112", code_quartier_insee: "7511203", surface_m2: 1, centre: null };
  // 80 quartiers comme opendata.paris.fr : Bercy plus des quartiers fictifs pour les autres numéros.
  const quartiers = Array.from({ length: 80 }, (_, i) => {
    const numero = i + 1;
    if (numero === 47) return bercy;
    const arrondissement = Math.ceil(numero / 4);
    return { numero, nom: `Quartier ${numero}`, slug: `quartier-${numero}`, arrondissement, code_insee_arrondissement: `751${String(arrondissement).padStart(2, "0")}`, code_quartier_insee: `x${numero}`, surface_m2: null, centre: null };
  });

  it("ne signale rien quand tout concorde", () => {
    expect(compareWithSeed(seed, geo, zones, agencies, quartiers)).toEqual([]);
  });

  it("signale un nom, un slug ou un code postal différent de la source officielle", () => {
    const altered: Seed = JSON.parse(JSON.stringify(seed)) as Seed;
    altered.departements[4] = { ...altered.departements[4], nom: "Hauts de Seine", slug: "hauts-de-seine", code: "92", agences: ["puteaux"] };
    const arr = altered.paris.arrondissements[0];
    if (arr) arr.codes_postaux = ["75012", "75112"];
    const diffs = compareWithSeed(
      altered,
      geo,
      zones,
      agencies,
      quartiers.map((q) => (q.numero === 47 ? { ...q, nom: "Bercy-Village", slug: "bercy-village" } : q)),
    );
    expect(diffs.some((d) => d.includes("Hauts de Seine"))).toBe(true);
    expect(diffs.some((d) => d.includes("codes postaux"))).toBe(true);
    expect(diffs.some((d) => d.includes("Bercy-Village"))).toBe(true);
  });
});

describe("fichiers produits dans data/local", () => {
  it("sont tous conformes au schéma et aux chemins de docs/04 §4", async () => {
    const dir = path.join(process.cwd(), "data", "local");
    let names: string[] = [];
    try {
      names = (await readdir(dir)).filter((n) => /^(\d{2,5}|idf)\.json$/.test(n));
    } catch {
      names = [];
    }
    for (const name of names) {
      const data = localDataSchema.parse(JSON.parse(await readFile(path.join(dir, name), "utf8")));
      expect(`${data.code}.json`).toBe(name);
      expect(data.chemin.startsWith("/aide-a-domicile/")).toBe(true);
      for (const f of data.facts) expect(f.source_url.startsWith("http")).toBe(true);
    }
  });
});
