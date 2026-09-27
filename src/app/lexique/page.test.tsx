import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { listLexiqueTerms } from "@/content/lexique";
import LexiqueIndexPage, { buildLexiqueIndexGroups, generateMetadata } from "./page";

function jsonLdNodes(): Record<string, unknown>[] {
  return [...document.querySelectorAll('script[type="application/ld+json"]')].map(
    (script) => JSON.parse(script.textContent ?? "{}") as Record<string, unknown>,
  );
}

describe("/lexique/", () => {
  it("a des balises titre et description aux longueurs de docs/01 §8, canonique sur /lexique/", () => {
    const metadata = generateMetadata();
    const title = String(metadata.title);
    expect(title.length).toBeGreaterThanOrEqual(50);
    expect(title.length).toBeLessThanOrEqual(60);
    expect(String(metadata.description).length).toBeGreaterThanOrEqual(140);
    expect(String(metadata.description).length).toBeLessThanOrEqual(155);
    expect(String(metadata.alternates?.canonical)).toMatch(/\/lexique\/$/);
  });

  it("groupe tous les termes par lettre, avec leur définition", async () => {
    const terms = await listLexiqueTerms();
    const groups = await buildLexiqueIndexGroups();
    const listed = groups.flatMap((g) => g.termes);
    expect(listed.map((t) => t.slug).sort()).toEqual(terms.map((t) => t.slug).sort());
    for (const term of listed) expect(term.definition.length).toBeGreaterThan(20);
  });

  it("rend un seul H1, le fil d'Ariane, l'index et le DefinedTermSet avec ses termes", async () => {
    render(await LexiqueIndexPage());
    const terms = await listLexiqueTerms();
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/lexique/i);
    expect(
      within(screen.getByRole("navigation", { name: "Fil d’Ariane" })).getByText("Lexique"),
    ).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("navigation", { name: "Aller à une lettre" })).toBeInTheDocument();
    for (const term of terms) {
      expect(screen.getByRole("link", { name: term.terme })).toHaveAttribute(
        "href",
        expect.stringContaining(`/lexique/${term.slug}`),
      );
    }
    const set = jsonLdNodes().find((node) => node["@type"] === "DefinedTermSet");
    expect(set?.name).toBe("Lexique du Fil");
    expect((set?.hasDefinedTerm as unknown[]).length).toBe(terms.length);
    expect(JSON.stringify(set)).not.toMatch(/null|""|\[\]|\{\}/);
  });
});
