import { describe, expect, it } from "vitest";
import { localDataExemple, localEditorialExemple } from "../../../tests/fixtures/local-exemple";
import { getSiteConfig } from "@/content/loader";
import { localPageJsonLd, localWebPage } from "./local-page";

describe("jsonld/local-page", () => {
  it("émet WebPage (titre, H1, auteur, date, territoire) puis FAQPage avec les questions locales", () => {
    const nodes = localPageJsonLd(
      localDataExemple,
      localEditorialExemple,
      "Aide à domicile à Exempleville (92990)",
      getSiteConfig(),
    );
    expect(nodes.map((node) => node["@type"])).toEqual(["WebPage", "FAQPage"]);
    expect(nodes[0]).toMatchObject({
      "@id": "https://www.youdom-care.com/aide-a-domicile/hauts-de-seine/exempleville/",
      url: "https://www.youdom-care.com/aide-a-domicile/hauts-de-seine/exempleville/",
      name: localEditorialExemple.seo.titre,
      headline: "Aide à domicile à Exempleville (92990)",
      inLanguage: "fr-FR",
      dateModified: "2026-09-20",
      author: { "@type": "Person", name: "Auteur fictif", jobTitle: "rédaction" },
      publisher: { "@id": "https://www.youdom-care.com/#organization" },
      about: { "@type": "Place", name: "Exempleville" },
    });
    const faq = nodes[1]?.mainEntity as { name: string }[];
    expect(faq.map((q) => q.name)).toEqual(localEditorialExemple.questions.map((q) => q.question));
    expect(JSON.stringify(nodes)).not.toMatch(/null|""|\[\]|\{\}/);
    // Jamais d'adresse postale sur une page locale : elle appartient à la page de l'agence.
    expect(JSON.stringify(nodes)).not.toContain("PostalAddress");
  });

  it("décrit un département comme AdministrativeArea et renvoie null sans chemin", () => {
    const node = localWebPage(
      { ...localDataExemple, kind: "departement", nom: "Hauts-de-Seine" },
      localEditorialExemple,
      "Aide à domicile dans les Hauts-de-Seine",
      getSiteConfig(),
    );
    expect(node?.about).toEqual({ "@type": "AdministrativeArea", name: "Hauts-de-Seine" });
    expect(
      localWebPage(
        { ...localDataExemple, chemin: " " },
        localEditorialExemple,
        "x",
        getSiteConfig(),
      ),
    ).toBeNull();
  });
});
