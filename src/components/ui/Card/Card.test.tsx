import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Card } from "./Card";

describe("Card", () => {
  it("rend une carte de verre standard avec l'élévation 1", () => {
    render(<Card data-testid="carte">Contenu</Card>);
    const card = screen.getByTestId("carte");
    expect(card.tagName).toBe("DIV");
    expect(card).toHaveClass("rounded-card", "glass", "p-6");
    expect(card).not.toHaveClass("hover:shadow-2");
  });

  it("accepte une balise sémantique, l'état interactif et un autre espacement", () => {
    render(
      <ul>
        <Card as="li" interactive padding="lg" aria-label="Élément">
          Contenu
        </Card>
      </ul>,
    );
    const item = screen.getByRole("listitem");
    expect(item).toHaveClass("hover:shadow-2", "glass-sheen", "p-8");
  });
});
