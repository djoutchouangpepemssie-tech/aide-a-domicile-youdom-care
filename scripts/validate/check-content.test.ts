import path from "node:path";
import { describe, expect, it } from "vitest";
import { loadAllContent } from "../../src/content/loader";
import { collectProdErrors, runContentCheck } from "./check-content";

const rootDir = path.resolve(__dirname, "../..");

describe("check-content", () => {
  it("accepte le contenu du dépôt en prévisualisation", async () => {
    const { errors } = await runContentCheck({ rootDir, prod: false });
    expect(errors).toEqual([]);
  });

  it("refuse le contenu actuel en production tant qu'Arcel n'a pas répondu", async () => {
    const { errors } = await runContentCheck({ rootDir, prod: true });
    const joined = errors.join("\n");
    expect(joined).toContain("tarifs.json : aucune prestation");
    expect(joined).toContain("legal.raison_sociale");
    expect(joined).toContain("a_confirmer");
    expect(joined).toContain("E1 a un texte mais valide vaut false");
  });

  it("accepte un contenu complet en production", () => {
    const content = structuredClone(loadAllContent());
    const { siteConfig, pricing, commitments } = content;

    for (const key of Object.keys(siteConfig.legal) as (keyof typeof siteConfig.legal)[]) {
      if (siteConfig.legal[key] === null) {
        (siteConfig.legal as Record<string, unknown>)[key] = "renseigné";
      }
    }
    siteConfig.legal.hebergeur.adresse = "renseignée";
    siteConfig.legal.hebergeur.contact = "renseigné";
    siteConfig.a_confirmer = [];

    pricing.date_application = "2026-01-01";
    pricing.prestations = [
      { ...pricing._exemple_de_structure, prix_ttc: 30, prix_ht: 25, tva: 0.2 },
    ];
    pricing.forfaits = [];

    for (const e of commitments.engagements) e.valide = true;
    for (const j of commitments.suivi.jalons) j.valide = true;

    expect(collectProdErrors({ siteConfig, pricing, commitments })).toEqual([]);
  });

  it("signale un prix manquant sur une prestation", () => {
    const { siteConfig, pricing, commitments } = structuredClone(loadAllContent());
    pricing.prestations = [{ ...pricing._exemple_de_structure, prix_ttc: 30, prix_ht: null }];
    const errors = collectProdErrors({ siteConfig, pricing, commitments });
    expect(errors.some((e) => e.includes("sans prix TTC et HT"))).toBe(true);
  });

  it("échoue sur un fichier invalide", async () => {
    const tmpRoot = path.resolve(__dirname, "fixtures/invalid-content");
    const { errors } = await runContentCheck({ rootDir: tmpRoot, prod: false });
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.join("\n")).toContain("site.config.json");
  });
});
