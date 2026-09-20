import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Callout } from "./Callout";

describe("Callout", () => {
  it("rend une note « À retenir » nommée par son titre", () => {
    render(
      <Callout>
        <p>Le prix TTC est toujours l’information principale.</p>
      </Callout>,
    );
    const note = screen.getByRole("note", { name: "À retenir" });
    expect(note).toHaveClass("bg-tint-teal");
    expect(note.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  });

  it("propose les quatre variantes du cahier", () => {
    render(
      <>
        <Callout variant="bon-a-savoir">a</Callout>
        <Callout variant="attention">b</Callout>
        <Callout variant="ne-faisons-pas">c</Callout>
      </>,
    );
    expect(screen.getByRole("note", { name: "Bon à savoir" })).toHaveClass("bg-tint-green");
    expect(screen.getByRole("note", { name: "Attention" })).toHaveClass("bg-warning-bg");
    expect(screen.getByRole("note", { name: "Ce que nous ne faisons pas" })).toHaveClass(
      "bg-tint-raspberry",
    );
  });

  it("accepte un titre personnalisé", () => {
    render(
      <Callout variant="attention" title="Avant de partir">
        d
      </Callout>,
    );
    expect(screen.getByRole("note", { name: "Avant de partir" })).toBeInTheDocument();
  });
});
