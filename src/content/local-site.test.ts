import { describe, expect, it } from "vitest";
import { listBuildableLocalPages } from "./local";
import { departementPages, NEARBY_PAGES, nearbyPages } from "./local-site";

/*
 * Pages proches calculées (P9.4) : chaque commune ou arrondissement construit compte, entre ses
 * voisines déclarées qui ont une page et les pages proches calculées, au moins `NEARBY_PAGES`
 * liens vers d'autres pages du même département ; la relation est réciproque ; aucune page de
 * département, aucun lien mort, aucune voisine déclarée en double.
 */
describe("nearbyPages", () => {
  it("complète les voisines à trois pages au moins, réciproquement, dans le même département", async () => {
    const pages = await listBuildableLocalPages();
    const byCode = new Map(pages.map((p) => [p.data.code, p] as const));
    const territories = pages.filter((p) => p.data.kind !== "departement" && p.data.centre);
    expect(territories.length).toBeGreaterThan(50);
    for (const page of territories) {
      const nearby = await nearbyPages(page);
      const declared = new Set((page.data.communes_voisines ?? []).map((n) => n.code));
      const declaredWithPage = [...declared].filter((code) => byCode.has(code)).length;
      expect(declaredWithPage + nearby.length, page.chemin).toBeGreaterThanOrEqual(NEARBY_PAGES);
      for (const near of nearby) {
        expect(declared.has(near.code), `${page.chemin} → ${near.code} déjà voisine`).toBe(false);
        const target = byCode.get(near.code);
        expect(target?.chemin, `${page.chemin} → ${near.code}`).toBe(near.chemin);
        expect(target?.data.departement).toBe(page.data.departement);
        expect(near.distance_km).toBeGreaterThan(0);
        // Réciprocité : la page proche cite la page courante, comme voisine déclarée ou calculée.
        const back = target ? await nearbyPages(target) : [];
        const backDeclared = (target?.data.communes_voisines ?? []).some(
          (n) => n.code === page.data.code,
        );
        expect(
          backDeclared || back.some((n) => n.code === page.data.code),
          `${near.chemin} ne cite pas ${page.chemin}`,
        ).toBe(true);
      }
    }
    // Une commune sans voisine construite (Meaux) reçoit exactement trois pages proches.
    const meaux = pages.find((p) => p.chemin === "/aide-a-domicile/seine-et-marne/meaux/");
    expect(meaux).toBeDefined();
    if (meaux) {
      const nearby = await nearbyPages(meaux);
      expect(nearby.length).toBeGreaterThanOrEqual(NEARBY_PAGES);
      expect(nearby.map((n) => n.distance_km)).toEqual(
        [...nearby.map((n) => n.distance_km)].sort((a, b) => a - b),
      );
    }
    const departement = pages.find((p) => p.data.kind === "departement");
    expect(departement).toBeDefined();
    if (departement) expect(await nearbyPages(departement)).toEqual([]);
  }, 60_000);
});

describe("departementPages", () => {
  it("range les arrondissements de Paris par numéro, pas par ordre alphabétique", async () => {
    const pages = await listBuildableLocalPages();
    const paris = pages.find((p) => p.data.kind === "departement" && p.data.code === "75");
    expect(paris, "la page du département 75 doit exister").toBeDefined();
    if (!paris) return;

    const numbers = (await departementPages(paris))
      .map((entry) => /Paris (\d+)(?:er|e)/.exec(entry.label)?.[1])
      .filter((value): value is string => value !== undefined)
      .map(Number);

    // Les vingt arrondissements sont là, et dans l'ordre. Un tri alphabétique donnerait
    // 10, 11 … 19, 1, 20, 2, 3 … : le 1er en onzième position (relevé le 09/10/2026).
    expect(numbers).toHaveLength(20);
    expect(numbers).toEqual([...numbers].sort((a, b) => a - b));
    expect(numbers[0]).toBe(1);
    expect(numbers.at(-1)).toBe(20);
  });
});
