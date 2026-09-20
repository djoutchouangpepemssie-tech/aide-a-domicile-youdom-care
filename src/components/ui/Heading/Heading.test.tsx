import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Heading } from "./Heading";

describe("Heading", () => {
  it("rend la balise du niveau sémantique demandé", () => {
    render(<Heading level={2}>Aide à domicile</Heading>);
    const heading = screen.getByRole("heading", { level: 2, name: "Aide à domicile" });
    expect(heading.tagName).toBe("H2");
    expect(heading).toHaveClass("heading-2");
  });

  it("découple le niveau visuel du niveau sémantique", () => {
    render(
      <Heading level={3} visual={1} id="titre" className="mt-4">
        Grand titre de section
      </Heading>,
    );
    const heading = screen.getByRole("heading", { level: 3 });
    expect(heading).toHaveAttribute("id", "titre");
    expect(heading).toHaveClass("heading-1", "mt-4");
    expect(heading).not.toHaveClass("heading-3");
  });
});
