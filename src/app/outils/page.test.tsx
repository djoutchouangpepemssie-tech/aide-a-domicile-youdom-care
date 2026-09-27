import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { listToolIds } from "@/content/tool-pages";
import ToolsIndexPage, { generateMetadata } from "./page";

describe("/outils/", () => {
  it("a des balises titre et description aux longueurs de docs/01 §8 et une canonique", () => {
    const metadata = generateMetadata();
    expect(String(metadata.title).length).toBeGreaterThanOrEqual(50);
    expect(String(metadata.title).length).toBeLessThanOrEqual(60);
    expect(String(metadata.description).length).toBeGreaterThanOrEqual(140);
    expect(String(metadata.description).length).toBeLessThanOrEqual(155);
    expect(metadata.alternates?.canonical).toBe("https://www.youdom-care.com/outils/");
  });

  it("liste les cinq outils avec un lien vers la page et un vers le PDF, sans demander d'e-mail", () => {
    const { container } = render(<ToolsIndexPage />);
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    const list = screen.getByRole("region", { name: "Les cinq outils" });
    const items = within(list).getAllByRole("listitem");
    expect(items).toHaveLength(5);
    // next/link rend l'adresse sans barre finale dans les tests (trailingSlash s'applique au build).
    const hrefs = within(list)
      .getAllByRole("link")
      .map((link) => (link.getAttribute("href") ?? "").replace(/\/$/, ""));
    for (const id of listToolIds()) {
      expect(hrefs, id).toContain(`/outils/${id}`);
      expect(
        within(list)
          .getAllByRole("link")
          .some((link) => link.getAttribute("href") === `/outils/${id}.pdf`),
        `${id}.pdf`,
      ).toBe(true);
    }
    expect(
      screen.getByRole("note", { name: "Sans e-mail, sans compte, sans contrepartie" }),
    ).toHaveTextContent(/Rien n'est saisi sur le site/);
    expect(container.querySelector("input, textarea, form")).toBeNull();
    expect(container.textContent).not.toMatch(/\bnull\b|\bundefined\b/);

    // JSON-LD WebPage + BreadcrumbList (via le fil d'Ariane).
    const scripts = [...container.querySelectorAll('script[type="application/ld+json"]')].map(
      (s) => JSON.parse(s.textContent ?? "{}") as { "@type": string },
    );
    expect(scripts.map((s) => s["@type"]).sort()).toEqual(["BreadcrumbList", "WebPage"]);
  });
});
