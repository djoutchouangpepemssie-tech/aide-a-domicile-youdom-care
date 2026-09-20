import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Prose } from "./Prose";

describe("Prose", () => {
  it("enveloppe le texte courant dans un conteneur .prose", () => {
    render(
      <Prose>
        <p>Premier paragraphe.</p>
        <ul>
          <li>Un point</li>
        </ul>
      </Prose>,
    );
    const paragraph = screen.getByText("Premier paragraphe.");
    expect(paragraph.parentElement).toHaveClass("prose");
    expect(paragraph.parentElement?.tagName).toBe("DIV");
    expect(screen.getByRole("list")).toBeInTheDocument();
  });

  it("accepte une balise sémantique", () => {
    render(
      <Prose as="article" aria-label="Article">
        <p>Texte</p>
      </Prose>,
    );
    expect(screen.getByRole("article")).toHaveClass("prose");
  });
});
