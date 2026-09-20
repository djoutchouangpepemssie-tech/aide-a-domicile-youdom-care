import { cp, mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { loadLocalPages } from "./check-local-facts";
import {
  agencyIdOf,
  auditNapData,
  auditPageNap,
  loadNapConfig,
  runLocalNapCheck,
  scanNap,
} from "./check-local-nap";

const fixtures = path.join(__dirname, "fixtures", "local");
const conforme = path.join(fixtures, "conforme");
const fautif = path.join(fixtures, "fautif");

async function scan(root: string) {
  const { pages } = await loadLocalPages(root);
  const config = await loadNapConfig(root);
  return { pages, config, report: await scanNap(path.join(root, "rendu"), pages, config) };
}

describe("check-local-nap", () => {
  it("passe sur un rendu conforme : agence la plus proche, faits dans la grille, pied de page", async () => {
    const { report } = await scan(conforme);
    expect(report.errors).toEqual([]);
    expect(report.warnings).toEqual([
      "content/local/92050.json : page /aide-a-domicile/hauts-de-seine/nanterre/ absente du rendu, NAP non vérifié",
    ]);
  });

  it("signale une adresse étrangère, un téléphone différent et une autre agence que la plus proche", async () => {
    const { report } = await scan(fautif);
    const route = "/aide-a-domicile/hauts-de-seine/puteaux/";
    expect(report.errors).toContain(
      `${route} : téléphone « 01 23 45 67 89 » absent de site.config.json (contact, agences)`,
    );
    expect(
      report.errors.filter((e) => e.includes("23 45 67 89") || e.includes("123456789")),
    ).toHaveLength(1);
    expect(report.errors).toContain(
      `${route} : adresse « 12 rue Imaginaire » n'est celle d'aucune agence de site.config.json`,
    );
    expect(report.errors).toContain(
      `${route} : code postal et ville « 75001 Paris » ne sont ceux d'aucune agence de site.config.json`,
    );
    expect(report.errors).toContain(
      `${route} : affiche l'agence paris-12 (61 rue de Lyon, 75012 Paris), l'agence la plus proche est puteaux (49-51 quai de Dion-Bouton, 92800 Puteaux) (docs/04 §4)`,
    );
    expect(report.errors).toContain(
      `${route} (grille des ressources) : adresse « 8 avenue Inconnue » n'est ni une agence de site.config.json ni l'adresse d'un fait de data/local`,
    );
    expect(report.errors).toContain(
      `${route} (grille des ressources) : téléphone « 01 98 76 54 32 » absent de site.config.json (contact, agences)`,
    );
    expect(report.errors).toContain(
      "/agences/versailles/ : adresse de l'agence versailles (35 rue des Chantiers, 78000 Versailles) absente du corps de la page",
    );
    expect(report.warnings).toContain(
      `${route} : adresse de l'agence la plus proche (puteaux, 49-51 quai de Dion-Bouton, 92800 Puteaux) absente du corps de la page`,
    );
  });

  it("tolère les adresses des faits sur toute la page quand le repère manque, avec avertissement", async () => {
    const { pages, config } = await scan(conforme);
    const page = pages.find((p) => p.code === "92062") ?? null;
    const html =
      "<main><h1>Puteaux</h1><p>49-51 quai de Dion-Bouton, 92800 Puteaux</p>" +
      "<ul><li>131 rue de la République, 92800 Puteaux — 01 46 92 92 92</li></ul></main>";
    const report = auditPageNap("/aide-a-domicile/hauts-de-seine/puteaux/", html, { config, page });
    expect(report.errors).toEqual([]);
    expect(report.warnings).toEqual([
      "/aide-a-domicile/hauts-de-seine/puteaux/ : repère data-local-facts absent, adresses et téléphones de facts[] tolérés sur toute la page",
    ]);
  });

  it("refuse l'adresse d'un fait hors de la grille quand le repère existe", async () => {
    const { pages, config } = await scan(conforme);
    const page = pages.find((p) => p.code === "92062") ?? null;
    const html =
      "<main><p>Permanence : 131 rue de la République, 92800 Puteaux</p>" +
      "<section data-local-facts><p>2 rue Rigault, 92000 Nanterre</p></section></main>";
    const report = auditPageNap("/aide-a-domicile/hauts-de-seine/puteaux/", html, { config, page });
    expect(report.errors).toEqual([
      "/aide-a-domicile/hauts-de-seine/puteaux/ : adresse « 131 rue de la République » n'est celle d'aucune agence de site.config.json",
    ]);
  });

  it("vérifie la cohérence des données : agence inconnue, téléphone de fait douteux", async () => {
    const { pages, config } = await scan(conforme);
    const page = pages.find((p) => p.code === "92062");
    const first = page?.data?.facts[0];
    if (!page?.data || !first) throw new Error("fixture absente");
    const broken = {
      ...page,
      data: {
        ...page.data,
        agence_proche: { id: "inconnue", distance_km: 1 },
        facts: [{ ...first, telephone: "12 34" }, ...page.data.facts.slice(1)],
      },
    };
    const report = auditNapData([broken], config);
    expect(report.errors).toEqual([
      "data/local/92062.json : agence_proche.id « inconnue » n'est pas une agence de site.config.json",
    ]);
    expect(report.warnings).toEqual([
      "data/local/92062.json : facts[0].telephone « 12 34 » n'est pas un numéro français",
    ]);
  });

  it("lit l'id d'agence dans la route", () => {
    expect(agencyIdOf("/agences/puteaux/")).toBe("puteaux");
    expect(agencyIdOf("/agences/")).toBeNull();
    expect(agencyIdOf("/aide-a-domicile/paris/")).toBeNull();
  });

  describe("via runLocalNapCheck", () => {
    let dir: string;
    beforeEach(async () => {
      dir = await mkdtemp(path.join(os.tmpdir(), "yc-local-nap-"));
    });
    afterEach(async () => {
      await rm(dir, { recursive: true, force: true });
    });

    it("sans rendu, vérifie les données et avertit « rendu absent »", async () => {
      await cp(path.join(conforme, "content"), path.join(dir, "content"), { recursive: true });
      await cp(path.join(conforme, "data"), path.join(dir, "data"), { recursive: true });
      const { errors, warnings } = await runLocalNapCheck({ rootDir: dir, prod: false });
      expect(errors).toEqual([]);
      expect(warnings).toEqual([expect.stringContaining("rendu absent")]);
    });

    it("avec rendu dans .next/server/app, contrôle les pages", async () => {
      await cp(path.join(fautif, "content"), path.join(dir, "content"), { recursive: true });
      await cp(path.join(fautif, "data"), path.join(dir, "data"), { recursive: true });
      await cp(path.join(fautif, "rendu"), path.join(dir, ".next", "server", "app"), {
        recursive: true,
      });
      const { errors, warnings } = await runLocalNapCheck({ rootDir: dir, prod: false });
      expect(errors.length).toBeGreaterThanOrEqual(7);
      expect(warnings.some((w) => w.includes("rendu absent"))).toBe(false);
    });

    it("sans page locale, passe avec un avertissement", async () => {
      await cp(
        path.join(conforme, "content", "site.config.json"),
        path.join(dir, "content", "site.config.json"),
        {
          recursive: true,
        },
      );
      const { errors, warnings } = await runLocalNapCheck({ rootDir: dir, prod: false });
      expect(errors).toEqual([]);
      expect(warnings[0]).toBe("aucune page locale : content/local absent ou vide");
    });
  });
});
