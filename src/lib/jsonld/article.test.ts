import path from "node:path";
import { describe, expect, it } from "vitest";
import { listArticleMetas } from "@/content/article-meta";
import { getSiteConfig } from "@/content/loader";
import { articleJsonLd } from "./article";

const dir = path.resolve(__dirname, "../../../tests/fixtures/magazine");

describe("JSON-LD Article", () => {
  it("décrit l'article avec l'organisation pour auteur, les dates, l'image et les sources en citation", async () => {
    const articles = await listArticleMetas({ dir, warn: () => {} });
    const valide = articles.find((a) => a.slug === "valide");
    if (!valide) throw new Error("fixture manquante");
    const node = articleJsonLd(valide, getSiteConfig());
    expect(node).not.toBeNull();
    expect(node?.["@type"]).toBe("Article");
    expect(node?.headline).toBe(valide.meta.titre);
    expect(node?.url).toBe("https://www.youdom-care.com/magazine/valide/");
    expect(node?.datePublished).toBe("2026-09-20");
    expect(node?.dateModified).toBe("2026-09-27");
    expect(node?.image).toBe("https://www.youdom-care.com/images/exemples/exemple-article.jpg");
    expect(node?.author).toEqual({ "@id": "https://www.youdom-care.com/#organization" });
    expect(node?.publisher).toEqual({ "@id": "https://www.youdom-care.com/#organization" });
    expect(node?.articleSection).toBe("Comprendre");
    expect(node?.timeRequired).toBe("PT1M");
    expect(node?.citation).toEqual([
      {
        "@type": "CreativeWork",
        name: "Source fictive un, « Titre de la page »",
        url: "https://exemple.test/source-un",
      },
      {
        "@type": "CreativeWork",
        name: "Source fictive deux, « Titre de la page »",
        url: "https://exemple.test/source-deux",
      },
    ]);
    // Non relu : aucun relecteur, aucune valeur vide.
    expect(node).not.toHaveProperty("reviewedBy");
    expect(node).not.toHaveProperty("lastReviewed");
    expect(JSON.stringify(node)).not.toMatch(/null|""|\[\]|\{\}/);
  });

  it("nomme le relecteur d'un article relu et l'auteur réel quand une fiche existe", async () => {
    const articles = await listArticleMetas({ dir, warn: () => {} });
    const troisieme = articles.find((a) => a.slug === "troisieme");
    if (!troisieme) throw new Error("fixture manquante");
    const node = articleJsonLd(troisieme, getSiteConfig(), {
      author: {
        slug: "autrice-fictive",
        nom: "Autrice Fictive",
        fonction: "fonction fictive",
        biographie: "Une biographie fictive.",
      },
      authorPath: "/magazine/auteurs/autrice-fictive/",
    });
    expect(node?.author).toEqual({
      "@type": "Person",
      name: "Autrice Fictive",
      jobTitle: "fonction fictive",
      url: "https://www.youdom-care.com/magazine/auteurs/autrice-fictive/",
    });
    expect(node?.reviewedBy).toEqual({
      "@type": "Person",
      name: "Relectrice Fictive",
      jobTitle: "fonction fictive",
    });
    expect(node?.lastReviewed).toBe("2026-09-01");
  });
});
