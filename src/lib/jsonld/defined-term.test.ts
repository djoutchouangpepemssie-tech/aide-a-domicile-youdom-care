import { describe, expect, it } from "vitest";
import { getSiteConfig } from "@/content/loader";
import {
  definedTerm,
  definedTermSet,
  definedTermSetId,
  lexiqueTermJsonLd,
  lexiqueWebPage,
} from "./defined-term";

const config = getSiteConfig();
const set = { name: "Lexique du Fil" };
const apa = {
  slug: "apa",
  terme: "APA",
  developpe: "Allocation personnalisée d'autonomie",
  definition: "L'APA est une aide du département.",
  seo: {
    titre: "APA : définition, conditions et démarche de l'allocation",
    description: "Une description moteur.",
  },
  maj: "2026-09-27",
};

describe("jsonld/definedTerm", () => {
  it("décrit le terme, son développé, sa définition et son lexique", () => {
    const node = definedTerm(apa, set, config);
    expect(node).toEqual({
      "@context": "https://schema.org",
      "@type": "DefinedTerm",
      "@id": "https://www.youdom-care.com/lexique/apa/#terme",
      name: "APA",
      alternateName: "Allocation personnalisée d'autonomie",
      description: "L'APA est une aide du département.",
      url: "https://www.youdom-care.com/lexique/apa/",
      inDefinedTermSet: {
        "@type": "DefinedTermSet",
        "@id": "https://www.youdom-care.com/lexique/#lexique",
        name: "Lexique du Fil",
        url: "https://www.youdom-care.com/lexique/",
      },
    });
    expect(definedTermSetId(config.marque.url)).toBe(
      "https://www.youdom-care.com/lexique/#lexique",
    );
  });

  it("omet le développé absent et renvoie null sans définition ni nom", () => {
    const { developpe: _d, ...word } = apa;
    const node = definedTerm(
      { ...word, slug: "auxiliaire-de-vie", terme: "auxiliaire de vie" },
      set,
      config,
    );
    expect(node).not.toHaveProperty("alternateName");
    expect(JSON.stringify(node)).not.toMatch(/null|""|\[\]|\{\}/);
    expect(definedTerm({ ...apa, definition: "" }, set, config)).toBeNull();
    expect(definedTerm({ ...apa, terme: " " }, set, config)).toBeNull();
  });

  it("émet le lexique entier avec ses termes pour l'index", () => {
    const node = definedTermSet(set, config, [apa, { ...apa, slug: "pch", terme: "PCH" }]);
    expect(node).toMatchObject({
      "@type": "DefinedTermSet",
      "@id": "https://www.youdom-care.com/lexique/#lexique",
      name: "Lexique du Fil",
      url: "https://www.youdom-care.com/lexique/",
    });
    const terms = node?.hasDefinedTerm as { "@type": string; name: string; url: string }[];
    expect(terms.map((t) => [t["@type"], t.name])).toEqual([
      ["DefinedTerm", "APA"],
      ["DefinedTerm", "PCH"],
    ]);
    expect(definedTermSet(set, config)).not.toHaveProperty("hasDefinedTerm");
    expect(definedTermSet({ name: "" }, config)).toBeNull();
  });

  it("date la page du terme et référence l'éditeur", () => {
    expect(lexiqueWebPage(apa, config)).toMatchObject({
      "@type": "WebPage",
      "@id": "https://www.youdom-care.com/lexique/apa/",
      name: apa.seo.titre,
      headline: "APA",
      inLanguage: "fr-FR",
      dateModified: "2026-09-27",
      publisher: { "@id": "https://www.youdom-care.com/#organization" },
    });
    expect(lexiqueWebPage({ ...apa, maj: "" }, config)).toBeNull();
    expect(lexiqueTermJsonLd(apa, set, config).map((n) => n["@type"])).toEqual([
      "DefinedTerm",
      "WebPage",
    ]);
  });
});
