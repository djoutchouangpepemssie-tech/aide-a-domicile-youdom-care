import { describe, expect, it } from "vitest";
import { articleRubriques } from "@/content/article-schema";
import { getMagazinePage } from "@/content/loader";
import { authorSeo, extraPages, indexData, paginatedSeo, truncate } from "./data";

describe("données des pages du magazine", () => {
  it("garde les titres et descriptions des pages paginées dans les longueurs de docs/01 §8", () => {
    const page = getMagazinePage();
    const seos = [page.seo, ...articleRubriques.map((r) => page.rubriques[r].seo)];
    for (const seo of seos) {
      for (const n of [1, 2, 9, 10, 99]) {
        const { titre, description } = paginatedSeo(seo, n);
        expect(titre.length, `${titre} (page ${n})`).toBeGreaterThanOrEqual(50);
        expect(titre.length, `${titre} (page ${n})`).toBeLessThanOrEqual(60);
        expect(description.length, `${description} (page ${n})`).toBeGreaterThanOrEqual(140);
        expect(description.length, `${description} (page ${n})`).toBeLessThanOrEqual(155);
      }
    }
    // Les titres paginés restent distincts entre eux et de la page 1.
    const titles = new Set(seos.flatMap((seo) => [1, 2, 3].map((n) => paginatedSeo(seo, n).titre)));
    expect(titles.size).toBe(seos.length * 3);
  });

  it("numérote les pages supplémentaires à partir de 2", () => {
    expect(extraPages(0)).toEqual([]);
    expect(extraPages(12)).toEqual([]);
    expect(extraPages(13)).toEqual([2]);
    expect(extraPages(37)).toEqual([2, 3, 4]);
  });

  it("l'index existe toujours et n'est indexable qu'avec un article publié", async () => {
    const data = await indexData(1);
    expect(data).not.toBeNull();
    expect(data?.current).toBe(1);
    expect(data?.noindex).toBe(!data?.articles.some((a) => a.meta.statut === "publie"));
    expect(await indexData(999)).toBeNull();
  });

  it("compose le titre et la description d'une fiche auteur sans dépasser les longueurs", () => {
    expect(truncate("court", 10)).toBe("court");
    expect(truncate("un texte assez long pour être coupé sur un mot", 20)).toBe(
      "un texte assez long…",
    );
    const seo = authorSeo({
      slug: "autrice-fictive",
      nom: "Autrice Fictive",
      fonction: "infirmière coordinatrice fictive",
      biographie:
        "Une biographie fictive, assez longue pour dépasser la limite de la description moteur ".repeat(
          3,
        ),
    });
    expect(seo.titre.length).toBeLessThanOrEqual(60);
    expect(seo.description.length).toBeLessThanOrEqual(155);
  });
});
