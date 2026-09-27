import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { listLexiqueTerms } from "@/content/lexique";
import LexiqueTermRoute, {
  buildLexiqueData,
  generateMetadata,
  generateStaticParams,
  linkedPageLabel,
} from "./page";

function jsonLdTypes(): string[] {
  return [...document.querySelectorAll('script[type="application/ld+json"]')].map(
    (script) => (JSON.parse(script.textContent ?? "{}") as { "@type": string })["@type"],
  );
}

describe("/lexique/{slug}/", () => {
  it("construit une page par terme, avec des balises aux longueurs de docs/01 §8", async () => {
    const terms = await listLexiqueTerms();
    expect(await generateStaticParams()).toEqual(terms.map((t) => ({ slug: t.slug })));
    for (const term of terms) {
      const metadata = await generateMetadata({ params: Promise.resolve({ slug: term.slug }) });
      const title = String(metadata.title);
      expect(title.length, term.slug).toBeGreaterThanOrEqual(50);
      expect(title.length, term.slug).toBeLessThanOrEqual(60);
      expect(String(metadata.description).length, term.slug).toBeGreaterThanOrEqual(140);
      expect(String(metadata.description).length, term.slug).toBeLessThanOrEqual(155);
      expect(String(metadata.alternates?.canonical)).toMatch(new RegExp(`/lexique/${term.slug}/$`));
    }
    expect(await generateMetadata({ params: Promise.resolve({ slug: "inconnu" }) })).toEqual({});
    expect(await buildLexiqueData("inconnu")).toBeNull();
  });

  it("nomme les pages liées construites et ignore les autres", async () => {
    expect(await linkedPageLabel("/tarifs-et-aides/")).toBe("Tarifs et aides");
    expect(await linkedPageLabel("/tarifs-et-aides/apa/")).toBeTruthy();
    expect(await linkedPageLabel("/personnes-agees/")).toBe("Personnes âgées");
    expect(await linkedPageLabel("/services/garde-de-nuit/")).toBe("Garde de nuit");
    expect(await linkedPageLabel("/page-inconnue/")).toBeNull();
    // Chaque page liée de chaque terme existe dans ce build (prévisualisation).
    for (const term of await listLexiqueTerms()) {
      for (const href of term.pages_liees) {
        expect(await linkedPageLabel(href), `${term.slug} → ${href}`).toBeTruthy();
      }
    }
  });

  it("rend la page APA : H1, définition, autres termes liés une fois, jamais elle-même, JSON-LD", async () => {
    render(await LexiqueTermRoute({ params: Promise.resolve({ slug: "apa" }) }));
    const h1 = screen.getByRole("heading", { level: 1 });
    expect(h1).toHaveTextContent("APA");
    expect(h1).toHaveTextContent("Allocation personnalisée d'autonomie");
    expect(screen.getByText(/^L'APA est une aide versée par le département/)).toHaveClass("lead");

    const explication = document.querySelector("[data-explication]");
    if (!explication) throw new Error("explication absente");
    const gir = explication.querySelectorAll('a[data-lexique="gir-et-grille-aggir"]');
    expect(gir).toHaveLength(1);
    expect(gir[0]).toHaveAttribute("href", "/lexique/gir-et-grille-aggir/");
    expect(gir[0]).toHaveTextContent("grille AGGIR");
    expect(explication.querySelectorAll('a[data-lexique="apa"]')).toHaveLength(0);
    const slugs = [...explication.querySelectorAll("a[data-lexique]")].map((a) =>
      a.getAttribute("data-lexique"),
    );
    expect(new Set(slugs).size).toBe(slugs.length);

    const linked = screen.getByRole("navigation", { name: "Sur ce site" });
    expect(
      within(linked)
        .getAllByRole("link")
        .map((a) => a.getAttribute("href")),
    ).toEqual(expect.arrayContaining([expect.stringContaining("/tarifs-et-aides/apa")]));
    expect(screen.getByRole("navigation", { name: "Termes voisins" })).toBeInTheDocument();
    expect(jsonLdTypes()).toEqual(
      expect.arrayContaining(["DefinedTerm", "WebPage", "BreadcrumbList"]),
    );
    expect(screen.getByRole("region", { name: "Le texte officiel" })).toHaveTextContent(
      "consultée le 27 septembre 2026",
    );
  });
});
