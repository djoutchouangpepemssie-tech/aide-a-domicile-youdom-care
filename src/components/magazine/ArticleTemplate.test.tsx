import path from "node:path";
import { render, screen, within } from "@testing-library/react";
import { beforeAll, describe, expect, it } from "vitest";
import { articleMetadata } from "@/app/magazine/data";
import { loadArticles, relatedArticles, type LoadedArticle } from "@/content/articles";
import { getInterfaceTexts } from "@/content/loader";
import { ArticleTemplate, type ArticleTemplateData } from "./ArticleTemplate";

const dir = path.resolve(__dirname, "../../../tests/fixtures/magazine");

function dataFor(article: LoadedArticle, pool: LoadedArticle[]): ArticleTemplateData {
  return {
    article,
    texts: getInterfaceTexts(),
    magazineLabel: "Le Fil",
    related: relatedArticles(article, pool),
    author: null,
    url: `https://www.youdom-care.com${article.chemin}`,
  };
}

describe("ArticleTemplate", () => {
  let pool: LoadedArticle[];
  let valide: LoadedArticle;
  let troisieme: LoadedArticle;

  beforeAll(async () => {
    pool = await loadArticles({ dir, warn: () => {} });
    const first = pool.find((a) => a.slug === "valide");
    const third = pool.find((a) => a.slug === "troisieme");
    if (!first || !third) throw new Error("fixtures manquantes");
    valide = first;
    troisieme = third;
  });

  it("rend les dix blocs de docs/06 §3 dans l'ordre", () => {
    const { container } = render(<ArticleTemplate data={dataFor(valide, pool)} />);

    // 1. fil d'Ariane avec la rubrique, titre
    const crumbs = screen.getByRole("navigation", { name: "Fil d’Ariane" });
    expect(within(crumbs).getByRole("link", { name: "Le Fil" })).toBeInTheDocument();
    expect(within(crumbs).getByRole("link", { name: "Comprendre" })).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(valide.meta.titre);
    // 2. chapô
    expect(container.querySelector(".lead")).toHaveTextContent(valide.meta.chapo);
    // 3. ligne de confiance
    const trust = container.querySelector("[data-confiance]");
    expect(trust).toHaveTextContent("Écrit par Équipe éditoriale Youdom Care");
    // D-034 : plus aucune mention d'attente de relecture.
    expect(trust).not.toHaveTextContent(/[Rr]electure/);
    expect(trust).toHaveTextContent("Publié le 20 septembre 2026");
    expect(trust).toHaveTextContent("Mis à jour le 27 septembre 2026");
    expect(trust).toHaveTextContent("1 min de lecture");
    // 4. l'essentiel
    const essentiel = screen.getByRole("region", { name: "L'essentiel" });
    expect(within(essentiel).getAllByRole("listitem")).toHaveLength(3);
    // 5. sommaire = les ## du corps, ancres présentes dans le corps
    const toc = screen.getByRole("navigation", { name: "Sommaire" });
    const links = within(toc).getAllByRole("link");
    expect(links.map((l) => l.textContent)).toEqual(valide.headings.map((h) => h.text));
    const body = container.querySelector("[data-article-body]");
    for (const link of links) {
      const id = (link.getAttribute("href") ?? "").slice(1);
      expect(body?.querySelector(`h2#${id}`), id).not.toBeNull();
    }
    // 6. corps avec encarts À retenir et Attention
    expect(body?.querySelector('[data-encart="a-retenir"]')).toHaveTextContent("À retenir");
    expect(body?.querySelector('[data-encart="attention"]')).toHaveTextContent("Attention");
    // 7. demain : trois actions
    expect(container.querySelectorAll("[data-demain] li")).toHaveLength(3);
    // 8. un seul encart d'appel ; deux boutons framboise sur la page, jamais sur le même écran :
    // celui du hero (D-032 : on doit pouvoir agir sans défiler) et celui de l'encart de fin, qui
    // portent le même libellé et la même destination.
    expect(container.querySelectorAll('[data-encart="appel"]')).toHaveLength(1);
    const primary = container.querySelectorAll("a.bg-action, button.bg-action");
    expect(primary).toHaveLength(2);
    expect(container.querySelectorAll("[data-hero-primary] a.bg-action")).toHaveLength(1);
    expect(container.querySelectorAll('[data-encart="appel"] a.bg-action')).toHaveLength(1);
    for (const button of primary) expect(button).toHaveTextContent("Être rappelé(e)");
    // 9. sources numérotées
    const sources = screen.getByRole("region", { name: "Sources" });
    expect(sources.querySelector("ol")).not.toBeNull();
    expect(within(sources).getAllByRole("listitem")).toHaveLength(2);
    // 10. à lire ensuite, partage, version imprimable
    const next = screen.getByRole("region", { name: "À lire ensuite" });
    expect(next.querySelectorAll("[data-article-card]")).toHaveLength(2);
    expect(next.querySelector('[data-article-card="valide"]')).toBeNull();
    const share = screen.getByRole("region", { name: "Partager cet article" });
    expect(within(share).getByRole("link", { name: "Envoyer par e-mail" })).toHaveAttribute(
      "href",
      expect.stringMatching(
        /^mailto:\?subject=.*&body=https%3A%2F%2Fwww\.youdom-care\.com%2Fmagazine%2Fvalide%2F$/,
      ),
    );
    expect(within(share).getByRole("button", { name: "Copier le lien" })).toBeInTheDocument();
    expect(within(share).getByRole("button", { name: "Version imprimable" })).toBeInTheDocument();

    // Ordre des blocs dans le document.
    const order = [
      crumbs,
      screen.getByRole("heading", { level: 1 }),
      essentiel,
      toc,
      body,
      container.querySelector("[data-section='demain']"),
      container.querySelector('[data-encart="appel"]'),
      sources,
      next,
      share,
    ];
    for (let i = 1; i < order.length; i += 1) {
      const before = order[i - 1];
      const after = order[i];
      expect(
        before &&
          after &&
          Boolean(before.compareDocumentPosition(after) & Node.DOCUMENT_POSITION_FOLLOWING),
        `bloc ${i}`,
      ).toBe(true);
    }
  });

  it("n'affiche aucun bandeau d'attente et reste indexable (D-034, D-035)", () => {
    render(<ArticleTemplate data={dataFor(valide, pool)} />);
    expect(screen.queryByText(/attend sa relecture/)).toBeNull();
    const metadata = articleMetadata(valide);
    expect(metadata.robots).toBeUndefined();
    expect(String(metadata.alternates?.canonical)).toBe(
      "https://www.youdom-care.com/magazine/valide/",
    );
    expect(metadata.openGraph?.images).toEqual([
      expect.objectContaining({ url: "/og/magazine/valide/" }),
    ]);
  });

  it("nomme le relecteur d'un article relu, sans bandeau ni mention d'attente", () => {
    const { container } = render(<ArticleTemplate data={dataFor(troisieme, pool)} />);
    const trust = container.querySelector("[data-confiance]");
    expect(trust).toHaveTextContent(
      "Relu par Relectrice Fictive, fonction fictive, le 1 septembre 2026",
    );
    expect(trust).not.toHaveTextContent("Relecture professionnelle à venir");
    expect(screen.queryByText(/attend sa relecture/)).toBeNull();
    // Publié et mis à jour le même jour : une seule date.
    expect(trust?.querySelectorAll("time")).toHaveLength(1);
    // Titres : h1 puis h2, sans saut de niveau.
    const levels = [...container.querySelectorAll("h1, h2, h3, h4")].map((h) =>
      Number(h.tagName[1]),
    );
    let previous = 1;
    for (const level of levels) {
      expect(level).toBeLessThanOrEqual(previous + 1);
      previous = level;
    }
  });
});
