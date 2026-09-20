import { describe, expect, it } from "vitest";
import {
  addressOverlaps,
  addressStartsWith,
  extractPhones,
  extractPostalCities,
  extractStreetAddresses,
  extractTelHrefs,
  findElements,
  findMarkedRegions,
  normalizeAddress,
  normalizePhone,
  removeRegions,
} from "./nap";

describe("téléphones", () => {
  it("normalise les formes françaises et refuse le reste", () => {
    expect(normalizePhone("01 84 80 17 03")).toBe("0184801703");
    expect(normalizePhone("+33 1 84 80 17 03")).toBe("0184801703");
    expect(normalizePhone("tel:+33184801703")).toBe("0184801703");
    expect(normalizePhone("0033184801703")).toBe("0184801703");
    expect(normalizePhone("918 366 600 00016")).toBeNull();
    expect(normalizePhone("12 34")).toBeNull();
  });

  it("relève les numéros du texte et des liens tel:, dédoublonnés", () => {
    const text =
      "Appelez le 01 84 80 17 03 ou le 01.84.80.17.03, mobile +33 6 67 22 45 07 ; SIRET 918 366 600 00016.";
    expect(extractPhones(text).map((m) => m.normalized)).toEqual(["0184801703", "0667224507"]);
    expect(
      extractTelHrefs("<a href=\"tel:+33184801703\">x</a><a href='tel:0667224507'>y</a>"),
    ).toEqual([
      { raw: "tel:+33184801703", normalized: "0184801703" },
      { raw: "tel:0667224507", normalized: "0667224507" },
    ]);
  });
});

describe("adresses", () => {
  it("normalise sans accents ni ponctuation", () => {
    expect(normalizeAddress("49-51 quai de Dion-Bouton")).toBe("49 51 quai de dion bouton");
    expect(normalizeAddress("Hôtel de ville, place de l'Église")).toBe(
      "hotel de ville place de l eglise",
    );
  });

  it("relève les adresses de voie avec numéro, jusqu'à la ponctuation ou au code postal", () => {
    const text =
      "Agence : 49-51 quai de Dion-Bouton 92800 Puteaux. Aussi 5-7-9 rue Pleyel, 93200 Saint-Denis ; " +
      "12 bis avenue Foch (Paris) et l'avenue de la République sans numéro.";
    expect(extractStreetAddresses(text).map((m) => m.raw)).toEqual([
      "49-51 quai de Dion-Bouton",
      "5-7-9 rue Pleyel",
      "12 bis avenue Foch",
    ]);
  });

  it("relève code postal + ville, sans les noms communs, au plus quatre mots", () => {
    const text =
      "92800 Puteaux, 93200 Saint-Denis, 78000 Versailles Nos horaires, 92800 habitants, 77700 Serris";
    expect(extractPostalCities(text).map((m) => m.raw)).toEqual([
      "92800 Puteaux",
      "93200 Saint-Denis",
      "78000 Versailles Nos",
      "77700 Serris",
    ]);
  });

  it("compare sur une frontière de mot", () => {
    expect(addressStartsWith("61 rue de lyon 75012 paris", "61 rue de lyon")).toBe(true);
    expect(addressStartsWith("61 rue de lyonnais", "61 rue de lyon")).toBe(false);
    expect(addressOverlaps("92800 puteaux", "131 rue de la republique 92800 puteaux")).toBe(true);
    expect(addressOverlaps("92800 puteaux", "131 rue de la republique 92000 nanterre")).toBe(false);
  });
});

describe("régions HTML", () => {
  const html =
    '<main><p>Avant</p><section data-local-facts class="x"><div><div>Un</div></div><section>Deux</section></section>' +
    '<div class="local-facts">Trois</div><img src="a.png"><br/></main><footer>Pied</footer>';

  it("trouve un élément par attribut ou par classe, imbrications comprises", () => {
    const regions = findMarkedRegions(html, "data-local-facts", "local-facts");
    expect(regions.map((r) => r.inner)).toEqual([
      "<div><div>Un</div></div><section>Deux</section>",
      "Trois",
    ]);
  });

  it("trouve <main> et retire des régions", () => {
    const main = findElements(html, (tag) => /^<main\b/i.test(tag))[0];
    expect(main?.inner.startsWith("<p>Avant</p>")).toBe(true);
    const stripped = removeRegions(
      html,
      findMarkedRegions(html, "data-local-facts", "local-facts"),
    );
    expect(stripped).not.toContain("Un");
    expect(stripped).not.toContain("Trois");
    expect(stripped).toContain("Avant");
    expect(stripped).toContain("Pied");
  });
});
