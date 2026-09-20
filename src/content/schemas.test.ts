import { describe, expect, it } from "vitest";
import siteConfigJson from "../../content/site.config.json";
import { loadAllContent } from "./loader";
import { interfaceSchema, siteConfigSchema } from "./schemas";

describe("Schémas du contenu", () => {
  it("valide les quatre fichiers de content/", () => {
    const { siteConfig, pricing, commitments, interfaceTexts } = loadAllContent();
    expect(siteConfig.marque.nom).toBe("Youdom Care");
    expect(siteConfig.agences.length).toBeGreaterThan(0);
    expect(pricing.credit_impot_taux).toBe(0.5);
    expect(commitments.engagements.map((e) => e.code)).toEqual(["E1", "E2", "E3", "E4", "E5"]);
    expect(interfaceTexts.formulaires.raccourcis).toHaveLength(5);
  });

  it("refuse un champ mal typé", () => {
    const broken = structuredClone(siteConfigJson);
    broken.contact.telephone_principal = 184801703 as unknown as string;
    expect(siteConfigSchema.safeParse(broken).success).toBe(false);
  });

  it("refuse une clé inconnue (faute de frappe)", () => {
    const broken = { ...structuredClone(siteConfigJson), marqe: {} };
    expect(siteConfigSchema.safeParse(broken).success).toBe(false);
  });

  it("refuse une URL et un e-mail mal formés", () => {
    const broken = structuredClone(siteConfigJson);
    broken.marque.url = "youdom-care";
    broken.contact.email = "contact(at)youdom-care.com";
    const result = siteConfigSchema.safeParse(broken);
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path.join("."));
      expect(paths).toContain("marque.url");
      expect(paths).toContain("contact.email");
    }
  });

  it("exige les jetons de remplacement dans les microtextes", () => {
    const result = interfaceSchema.safeParse({
      _lisezmoi: "",
      boutons: Object.fromEntries(
        Object.keys(interfaceSchema.shape.boutons.shape).map((k) => [k, "x"]),
      ),
      formulaires: {
        ...Object.fromEntries(
          Object.keys(interfaceSchema.shape.formulaires.shape).map((k) => [k, "x"]),
        ),
        raccourcis: ["a", "b", "c", "d", "e"],
      },
    });
    expect(result.success).toBe(false);
  });
});
