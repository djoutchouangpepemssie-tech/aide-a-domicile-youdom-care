import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Markdown, parseBlocks } from "./Markdown";

describe("Markdown (zone éditoriale)", () => {
  it("découpe paragraphes, titres et listes", () => {
    const blocks = parseBlocks(
      "Premier paragraphe\nsur deux lignes.\n\n## Titre\n\n- un\n- deux\n  suite\n\n1. a\n2. b\n\n### Sous-titre\nTexte.",
    );
    expect(blocks).toEqual([
      { kind: "paragraph", text: "Premier paragraphe sur deux lignes." },
      { kind: "heading", depth: 2, text: "Titre" },
      { kind: "list", ordered: false, items: ["un", "deux suite"] },
      { kind: "list", ordered: true, items: ["a", "b"] },
      { kind: "heading", depth: 3, text: "Sous-titre" },
      { kind: "paragraph", text: "Texte." },
    ]);
  });

  it("rend les titres sous le niveau demandé, le gras, l'italique et les liens", () => {
    render(
      <Markdown
        headingLevel={3}
        externalLabel="lien externe"
        source={
          "## Se déplacer\n\nUn **mot** en *italique* et un [lien interne](/personnes-agees/) puis [officiel](https://example.org/).\n\n### Détail"
        }
      />,
    );
    expect(screen.getByRole("heading", { level: 3 })).toHaveTextContent("Se déplacer");
    expect(screen.getByRole("heading", { level: 4 })).toHaveTextContent("Détail");
    expect(screen.getByText("mot").tagName).toBe("STRONG");
    expect(screen.getByText("italique").tagName).toBe("EM");
    expect(screen.getByRole("link", { name: "lien interne" }).getAttribute("href")).toMatch(
      /^\/personnes-agees/,
    );
    const external = screen.getByRole("link", { name: /officiel.*lien externe/ });
    expect(external).toHaveAttribute("href", "https://example.org/");
    expect(external).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("n'exécute rien et n'accepte pas d'adresse dangereuse", () => {
    render(
      <Markdown
        source={"<script>alert(1)</script> {1 + 1} [x](javascript:alert(1)) <b>gras</b>"}
      />,
    );
    expect(document.querySelector("script")).toBeNull();
    expect(document.querySelector("b")).toBeNull();
    expect(screen.queryByRole("link")).toBeNull();
    expect(document.body.textContent).toContain("<script>alert(1)</script> {1 + 1} x");
    expect(document.body.textContent).toContain("<b>gras</b>");
  });
});
