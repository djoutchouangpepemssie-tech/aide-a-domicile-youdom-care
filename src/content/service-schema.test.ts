import { describe, expect, it } from "vitest";
import { serviceExemple } from "../../tests/fixtures/service-exemple";
import { servicePageSchema, wordCount } from "./service-schema";

function issues(input: unknown): string[] {
  const result = servicePageSchema.safeParse(input);
  return result.success ? [] : result.error.issues.map((i) => i.path.join("."));
}

describe("en-tête d'une page service", () => {
  it("accepte l'exemple fictif complet", () => {
    expect(issues(serviceExemple)).toEqual([]);
    expect(wordCount("un deux  trois\nquatre")).toBe(4);
  });

  it("impose les 13 sections et les règles de docs/03", () => {
    expect(issues({ ...serviceExemple, ne_faisons_pas: [] })).toEqual(["ne_faisons_pas"]);
    expect(issues({ ...serviceExemple, faq: serviceExemple.faq.slice(0, 5) })).toEqual(["faq"]);
    expect(
      issues({
        ...serviceExemple,
        faq: [{ ...serviceExemple.faq[0], reponse: "Trop court." }, ...serviceExemple.faq.slice(1)],
      }),
    ).toEqual(["faq.0.reponse"]);
    expect(
      issues({ ...serviceExemple, semaine_type: { exemple: "x", recit: "Trop court." } }),
    ).toEqual(["semaine_type.recit"]);
    expect(issues({ ...serviceExemple, sources: [serviceExemple.sources[0]] })).toEqual([
      "sources",
    ]);
    expect(issues({ ...serviceExemple, actions: serviceExemple.actions.slice(0, 3) })).toContain(
      "actions",
    );
  });

  it("refuse une page publiée sans relecture et une page rattachée sans pilier", () => {
    expect(issues({ ...serviceExemple, statut: "publie" })).toEqual(["statut"]);
    expect(
      issues({
        ...serviceExemple,
        statut: "publie",
        relu_par: { nom: "Relectrice fictive", fonction: "infirmière", date: "2026-09-20" },
      }),
    ).toEqual([]);
    const { pilier: _pilier, ...sansPilier } = serviceExemple;
    expect(issues(sansPilier)).toEqual(["pilier"]);
    expect(issues({ ...sansPilier, type: "pilier" })).toEqual([]);
  });
});
