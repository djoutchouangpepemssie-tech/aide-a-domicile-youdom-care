import { describe, expect, it } from "vitest";
import { absoluteUrl, compact, filled, organizationId, siteOrigin } from "./types";

describe("jsonld/types", () => {
  it("compact retire null, undefined, chaînes, tableaux et objets vides à toute profondeur", () => {
    expect(
      compact({
        "@context": "https://schema.org",
        "@type": "Thing",
        a: undefined,
        b: null,
        c: "",
        d: "  ",
        e: [],
        f: {},
        g: [null, "", { h: "" }, "ok"],
        i: { j: { k: null } },
        l: 0,
        m: false,
        n: "n",
      }),
    ).toEqual({
      "@context": "https://schema.org",
      "@type": "Thing",
      g: ["ok"],
      l: 0,
      m: false,
      n: "n",
    });
  });

  it("construit des adresses absolues et l'identifiant de l'organisation", () => {
    expect(siteOrigin("https://www.example.org/")).toBe("https://www.example.org");
    expect(absoluteUrl("/aidants/", "https://www.example.org/")).toBe(
      "https://www.example.org/aidants/",
    );
    expect(absoluteUrl("aidants/", "https://www.example.org")).toBe(
      "https://www.example.org/aidants/",
    );
    expect(absoluteUrl("https://autre.org/x/", "https://www.example.org")).toBe(
      "https://autre.org/x/",
    );
    expect(organizationId("https://www.example.org/")).toBe(
      "https://www.example.org/#organization",
    );
  });

  it("filled ne garde que les chaînes non vides", () => {
    expect(filled("a")).toBe(true);
    expect(filled(" ")).toBe(false);
    expect(filled("")).toBe(false);
    expect(filled(null)).toBe(false);
    expect(filled(undefined)).toBe(false);
  });
});
