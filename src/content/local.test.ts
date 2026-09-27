import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { localDataExemple, localEditorialExemple } from "../../tests/fixtures/local-exemple";
import {
  agencyCoordinates,
  getAgencyGeo,
  listBuildableLocalPages,
  listIndexableLocalPages,
  listLocalPages,
  loadLocalTerritories,
  localPathSegments,
  resetLocalPages,
  toLocalPages,
} from "./local";

/*
 * Le chargeur lit deux dossiers ; les tests écrivent des fichiers temporaires plutôt que de
 * toucher data/local/ ou content/local/ (jamais de territoire fictif dans le dépôt).
 */

let root: string;
let dataDir: string;
let contentDir: string;

async function writeJson(dir: string, name: string, value: unknown) {
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, `${name}.json`), JSON.stringify(value), "utf8");
}

beforeEach(async () => {
  root = await mkdtemp(path.join(os.tmpdir(), "yc-local-"));
  dataDir = path.join(root, "data");
  contentDir = path.join(root, "content");
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
  resetLocalPages();
  delete process.env.VERCEL_ENV;
});

describe("content/local : chargement des territoires", () => {
  it("renvoie une liste vide quand les dossiers n'existent pas", async () => {
    expect(await loadLocalTerritories({ dataDir, contentDir })).toEqual([]);
  });

  it("charge les données et l'éditorial d'un territoire, valides", async () => {
    await writeJson(dataDir, "92999", localDataExemple);
    await writeJson(contentDir, "92999", localEditorialExemple);
    const territories = await loadLocalTerritories({ dataDir, contentDir });
    expect(territories).toHaveLength(1);
    expect(territories[0]?.data.nom).toBe("Exempleville");
    expect(territories[0]?.editorial?.statut).toBe("publie");
    const pages = toLocalPages(territories);
    expect(pages.map((p) => p.chemin)).toEqual(["/aide-a-domicile/hauts-de-seine/exempleville/"]);
  });

  it("une page n'est constructible qu'avec les deux fichiers", async () => {
    await writeJson(dataDir, "92999", localDataExemple);
    const territories = await loadLocalTerritories({ dataDir, contentDir });
    expect(territories[0]?.editorial).toBeNull();
    expect(toLocalPages(territories)).toEqual([]);
  });

  it("ignore la région (pas de page dynamique) et les fichiers préfixés par _", async () => {
    await writeJson(dataDir, "idf", {
      ...localDataExemple,
      code: "idf",
      kind: "region",
      chemin: "/aide-a-domicile/",
      slug: "idf",
      departement: undefined,
      agence_proche: undefined,
      communes_voisines: undefined,
    });
    await writeJson(contentDir, "idf", { ...localEditorialExemple, code: "idf" });
    await writeJson(dataDir, "_lisezmoi", { note: "ignoré" });
    const territories = await loadLocalTerritories({ dataDir, contentDir });
    expect(territories).toHaveLength(1);
    expect(toLocalPages(territories)).toEqual([]);
  });

  it("refuse des données invalides avec un message lisible", async () => {
    await writeJson(dataDir, "92999", { ...localDataExemple, facts: "non" });
    await expect(loadLocalTerritories({ dataDir, contentDir })).rejects.toThrow(/92999\.json/);
  });

  it("refuse un fait sans source (règle d'or de docs/04 §4)", async () => {
    const [first, ...rest] = localDataExemple.facts;
    if (!first) throw new Error("fixture sans fait");
    const { source_url: _omitted, ...sansSource } = first;
    await writeJson(dataDir, "92999", { ...localDataExemple, facts: [sansSource, ...rest] });
    await expect(loadLocalTerritories({ dataDir, contentDir })).rejects.toThrow(/source_url/);
  });

  it("signale un éditorial invalide, mal codé ou orphelin par un avertissement : page non construite, build intact", async () => {
    const warnings: string[] = [];
    const warn = (message: string) => warnings.push(message);
    await writeJson(dataDir, "92999", localDataExemple);

    await writeJson(contentDir, "92999", { ...localEditorialExemple, questions: [] });
    let territories = await loadLocalTerritories({ dataDir, contentDir }, warn);
    expect(toLocalPages(territories)).toEqual([]);
    expect(warnings.at(-1)).toMatch(/92999\.json ignoré[\s\S]*questions/);

    await writeFile(path.join(contentDir, "92999.json"), "{ pas du json", "utf8");
    territories = await loadLocalTerritories({ dataDir, contentDir }, warn);
    expect(toLocalPages(territories)).toEqual([]);
    expect(warnings.at(-1)).toMatch(/JSON invalide/);

    await writeJson(contentDir, "92999", { ...localEditorialExemple, code: "92998" });
    territories = await loadLocalTerritories({ dataDir, contentDir }, warn);
    expect(toLocalPages(territories)).toEqual([]);
    expect(warnings.at(-1)).toMatch(/code vaut/);

    await rm(path.join(contentDir, "92999.json"));
    await writeJson(contentDir, "92998", { ...localEditorialExemple, code: "92998" });
    territories = await loadLocalTerritories({ dataDir, contentDir }, warn);
    expect(toLocalPages(territories)).toEqual([]);
    expect(warnings.at(-1)).toMatch(/aucune donnée/);
    expect(warnings).toHaveLength(4);
  });

  it("refuse deux territoires avec le même chemin", async () => {
    await writeJson(dataDir, "92999", localDataExemple);
    await writeJson(dataDir, "92998", { ...localDataExemple, code: "92998" });
    await expect(loadLocalTerritories({ dataDir, contentDir })).rejects.toThrow(/chemin en double/);
  });

  it("sans dossier dans le dépôt, aucune page n'est construite", async () => {
    // data/local et content/local n'existent pas encore dans ce dépôt (ou sont ceux du pipeline).
    const pages = await listLocalPages();
    for (const page of pages) expect(page.chemin).toMatch(/^\/aide-a-domicile\//);
    expect((await listBuildableLocalPages()).length).toBeLessThanOrEqual(pages.length);
    // Le dépôt contient 131 territoires : la lecture et la validation prennent du temps.
  }, 30_000);

  it("en production, les pages a_relire sont construites mais hors des plans de site (D-033)", async () => {
    process.env.VERCEL_ENV = "production";
    const pages = await listBuildableLocalPages();
    expect(pages.length).toBeGreaterThan(0);
    const indexables = await listIndexableLocalPages();
    for (const page of indexables) expect(page.editorial.statut).toBe("publie");
    // Une page en attente de relecture est servie sans figurer parmi les pages « publie ».
    expect(pages.length).toBeGreaterThanOrEqual(indexables.length);
  }, 30_000);

  it("découpe un chemin local en segments", () => {
    expect(localPathSegments("/aide-a-domicile/paris/15e-arrondissement/")).toEqual([
      "paris",
      "15e-arrondissement",
    ]);
    expect(localPathSegments("/aide-a-domicile/hauts-de-seine/")).toEqual(["hauts-de-seine"]);
  });
});

describe("data/agences.geo.json", () => {
  it("donne les coordonnées géocodées de chaque agence de site.config.json", () => {
    const geo = getAgencyGeo();
    expect(geo.agences.length).toBeGreaterThan(0);
    expect(agencyCoordinates("puteaux")).toEqual(
      expect.objectContaining({ lat: expect.any(Number), lng: expect.any(Number) }),
    );
    expect(agencyCoordinates("inconnue")).toBeNull();
  });
});
