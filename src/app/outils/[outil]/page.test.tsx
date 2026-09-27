import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { listToolIds } from "@/content/tool-pages";
import ToolRoute, { generateMetadata, generateStaticParams } from "./page";

describe("/outils/{slug}/", () => {
  it("construit une page statique par outil, avec des balises SEO aux bonnes longueurs", async () => {
    expect(generateStaticParams().map((p) => p.outil)).toEqual(listToolIds());
    for (const outil of listToolIds()) {
      const metadata = await generateMetadata({ params: Promise.resolve({ outil }) });
      expect(String(metadata.title).length, outil).toBeGreaterThanOrEqual(50);
      expect(String(metadata.title).length, outil).toBeLessThanOrEqual(60);
      expect(String(metadata.description).length, outil).toBeGreaterThanOrEqual(140);
      expect(String(metadata.description).length, outil).toBeLessThanOrEqual(155);
      expect(metadata.alternates?.canonical).toBe(`https://www.youdom-care.com/outils/${outil}/`);
    }
    expect(await generateMetadata({ params: Promise.resolve({ outil: "inconnu" }) })).toEqual({});
  });

  it("rend le tour du logement : bouton Imprimer, lien PDF, document, fil d'Ariane, JSON-LD", async () => {
    const { container } = render(
      await ToolRoute({ params: Promise.resolve({ outil: "tour-du-logement-anti-chutes" }) }),
    );
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Le tour du logement anti-chutes",
    );
    expect(screen.getByRole("button", { name: "J'imprime cet outil" })).toHaveAttribute(
      "type",
      "button",
    );
    expect(screen.getByRole("link", { name: "Je télécharge le PDF" })).toHaveAttribute(
      "href",
      "/outils/tour-du-logement-anti-chutes.pdf",
    );
    expect(screen.getByText(/Rien n'est saisi ni collecté sur le site/)).toBeInTheDocument();
    expect(container.querySelectorAll(".tool-box").length).toBeGreaterThanOrEqual(30);
    expect(
      screen.getByRole("navigation", { name: "Fil d’Ariane" }).querySelector("[aria-current=page]"),
    ).toHaveTextContent("Tour du logement anti-chutes");
    // next/link rend l'adresse sans barre finale dans les tests (trailingSlash s'applique au build).
    const bare = (href: string | null) => (href ?? "").replace(/\/$/, "");
    // Le fil d'Ariane mène à l'index ; le bloc « À lire aussi » (P9.4) le lie aussi, avec les autres outils.
    const crumbs = screen.getByRole("navigation", { name: "Fil d’Ariane" });
    expect(
      bare(within(crumbs).getByRole("link", { name: "Outils à imprimer" }).getAttribute("href")),
    ).toBe("/outils");
    expect(bare(screen.getByRole("link", { name: "Tous les outils" }).getAttribute("href"))).toBe(
      "/outils",
    );
    expect(container.textContent).not.toMatch(/\bnull\b|\bundefined\b|\{[a-z_]+\}/);
    // Aucun champ de saisie : l'outil se remplit à la main.
    expect(container.querySelector("input, textarea, form")).toBeNull();

    const types = [...container.querySelectorAll('script[type="application/ld+json"]')]
      .map((s) => (JSON.parse(s.textContent ?? "{}") as { "@type": string })["@type"])
      .sort();
    expect(types).toEqual(["BreadcrumbList", "WebPage"]);
    const webPage = [...container.querySelectorAll('script[type="application/ld+json"]')]
      .map((s) => JSON.parse(s.textContent ?? "{}") as Record<string, unknown>)
      .find((node) => node["@type"] === "WebPage");
    expect(webPage?.dateModified).toBe("2026-09-27");
    expect(webPage?.url).toBe("https://www.youdom-care.com/outils/tour-du-logement-anti-chutes/");
  });
});
