import { describe, expect, it } from "vitest";
import { breadcrumbList } from "./breadcrumb-list";

const site = "https://www.example.org";

describe("jsonld/breadcrumbList", () => {
  it("numérote les éléments et rend les adresses absolues", () => {
    expect(
      breadcrumbList(
        [
          { name: "Accueil", url: "/" },
          { name: "Personnes âgées", url: "/personnes-agees/" },
          { name: "Aide à l’autonomie" },
        ],
        site,
      ),
    ).toEqual({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Accueil", item: "https://www.example.org/" },
        {
          "@type": "ListItem",
          position: 2,
          name: "Personnes âgées",
          item: "https://www.example.org/personnes-agees/",
        },
        { "@type": "ListItem", position: 3, name: "Aide à l’autonomie" },
      ],
    });
  });

  it("garde l'adresse de la page courante quand elle est donnée", () => {
    const node = breadcrumbList(
      [
        { name: "Accueil", url: "/" },
        { name: "Contact", url: "/contact/" },
      ],
      site,
    );
    expect(node?.itemListElement).toHaveLength(2);
    expect(JSON.stringify(node)).toContain("https://www.example.org/contact/");
  });

  it("renvoie null avec moins de deux éléments, un nom vide, une adresse intermédiaire absente ou sans site", () => {
    expect(breadcrumbList([{ name: "Accueil", url: "/" }], site)).toBeNull();
    expect(
      breadcrumbList(
        [
          { name: "Accueil", url: "/" },
          { name: "", url: "/x/" },
        ],
        site,
      ),
    ).toBeNull();
    expect(breadcrumbList([{ name: "Accueil" }, { name: "Page" }], site)).toBeNull();
    expect(breadcrumbList([{ name: "Accueil", url: "/" }, { name: "Page" }], "")).toBeNull();
  });
});
