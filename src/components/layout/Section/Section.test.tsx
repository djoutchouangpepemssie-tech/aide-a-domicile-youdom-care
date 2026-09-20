import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Section } from "./Section";

describe("Section", () => {
  it("rend une section nommée avec conteneur et fond", () => {
    render(
      <Section aria-labelledby="t" tone="teal">
        <h2 id="t">Titre</h2>
      </Section>,
    );
    const section = screen.getByRole("region", { name: "Titre" });
    expect(section).toHaveClass("bg-tint-teal");
    expect(section.firstElementChild).toHaveClass("container-site");
  });

  it("peut se passer de conteneur", () => {
    render(
      <Section bare data-testid="s">
        <p>Bord à bord</p>
      </Section>,
    );
    expect(screen.getByTestId("s").firstElementChild?.tagName).toBe("P");
  });
});
