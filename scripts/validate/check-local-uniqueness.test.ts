import path from "node:path";
import { describe, expect, it } from "vitest";
import { loadLocalPages } from "./check-local-facts";
import {
  auditUniqueness,
  formatLocalReport,
  pairSimilarities,
  runLocalUniquenessCheck,
} from "./check-local-uniqueness";

const fixtures = path.join(__dirname, "fixtures", "local");
const conforme = path.join(fixtures, "conforme");
const fautif = path.join(fixtures, "fautif");

describe("check-local-uniqueness", () => {
  it("passe sur deux communes rédigées séparément", async () => {
    const { errors, warnings } = await runLocalUniquenessCheck({ rootDir: conforme, prod: false });
    expect(errors).toEqual([]);
    expect(warnings).toEqual([]);
    const pairs = pairSimilarities((await loadLocalPages(conforme)).pages);
    expect(pairs).toHaveLength(1);
    expect(pairs[0]?.similarity).toBeLessThan(0.05);
    expect(pairs[0]?.threshold).toBe(0.3);
  });

  it("échoue quand deux communes partagent 40 % de leurs séquences, en nommant les pages et la valeur", async () => {
    const { errors } = await runLocalUniquenessCheck({ rootDir: fautif, prod: false });
    expect(errors).toContain(
      "92050 et 92062 : similarité 0,41 (Jaccard, séquences de 5 mots), seuil < 0,30 (docs/04 §4)",
    );
    const pairs = pairSimilarities((await loadLocalPages(fautif)).pages);
    const pair = pairs.find((p) => p.a === "92050" && p.b === "92062");
    expect(pair?.similarity).toBeGreaterThan(0.38);
    expect(pair?.similarity).toBeLessThan(0.45);
  });

  it("abaisse le seuil à 0,25 dès qu'un département est dans la paire", async () => {
    const pairs = pairSimilarities((await loadLocalPages(fautif)).pages);
    const withDept = pairs.filter((p) => p.a === "92" || p.b === "92");
    expect(withDept).toHaveLength(2);
    expect(withDept.every((p) => p.threshold === 0.25)).toBe(true);
  });

  it("signale sous-titre et question en double", async () => {
    const { errors } = await runLocalUniquenessCheck({ rootDir: fautif, prod: false });
    expect(errors).toContain(
      "92050 › sous_titre, 92062 › sous_titre : sous_titre en double — « Une agence sur les quais, des auxiliaires qui connaissent les pentes des Bergères et du centre. » (docs/04 §4 : écrit pour la page)",
    );
    expect(
      errors.some((e) =>
        /questions\[0\]\.question, 92062 › questions\[0\]\.question : questions en double/.test(e),
      ),
    ).toBe(true);
  });

  it("compare titre et description à la casse et aux accents près", async () => {
    const { pages } = await loadLocalPages(conforme);
    const [a, b] = pages;
    if (!a?.editorial || !b?.editorial) throw new Error("fixture absente");
    const clone = {
      ...b,
      editorial: {
        ...b.editorial,
        seo: {
          titre: a.editorial.seo.titre.toUpperCase(),
          description: a.editorial.seo.description,
        },
      },
    };
    const { errors } = auditUniqueness([a, clone]);
    expect(errors.some((e) => /seo\.titre en double/.test(e))).toBe(true);
    expect(errors.some((e) => /seo\.description en double/.test(e))).toBe(true);
  });

  it("imprime un rapport par page avec type, faits, mots et similarité maximale", async () => {
    const report = await formatLocalReport(fautif);
    expect(report).toContain("92 (departement) /aide-a-domicile/hauts-de-seine/");
    // D-043 : le seuil de mots est passé à 1000 pour tous les types de territoire.
    expect(report).toContain("faits sourcés 2/15 · mots 108/1000");
    expect(report).toContain("92062 (commune) /aide-a-domicile/hauts-de-seine/puteaux/");
    expect(report).toContain("similarité max 0,41 avec 92050 (seuil < 0,30, 40,8 %)");
    expect(report).toContain("faits sourcés 9/8 · mots 364/1000");
  });

  it("annonce l'absence de page locale", async () => {
    expect(await formatLocalReport(path.join(fixtures, "inexistant"))).toBe(
      "aucune page locale : content/local absent ou vide",
    );
  });
});
