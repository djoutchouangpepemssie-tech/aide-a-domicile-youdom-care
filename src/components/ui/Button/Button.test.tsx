import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Button } from "./Button";

describe("Button", () => {
  it("rend un bouton principal framboise de type button par défaut", async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Être rappelé(e)</Button>);
    const button = screen.getByRole("button", { name: "Être rappelé(e)" });
    expect(button).toHaveAttribute("type", "button");
    expect(button).toHaveClass("bg-action", "min-h-14");
    await userEvent.click(button);
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("rend un lien quand href est fourni", () => {
    render(
      <Button href="/demande/" variant="secondary">
        Je décris ma situation
      </Button>,
    );
    const link = screen.getByRole("link", { name: "Je décris ma situation" });
    // Hors du routeur Next (jsdom), Link normalise la barre finale : on tolère les deux formes.
    expect(link).toHaveAttribute("href", expect.stringMatching(/^\/demande\/?$/));
    expect(link).toHaveClass("glass", "glass-dark", "text-white");
  });

  it("applique les variantes contour et lien", () => {
    render(
      <>
        <Button variant="outline">Contour</Button>
        <Button variant="link">Lien</Button>
      </>,
    );
    expect(screen.getByRole("button", { name: "Contour" })).toHaveClass(
      "border-teal-700",
      "glass-quiet",
    );
    expect(screen.getByRole("button", { name: "Lien" })).toHaveClass("underline");
  });

  it("gère l'état désactivé et l'icône décorative", () => {
    render(
      <Button disabled icon={<svg data-testid="icone" />} block>
        Désactivé
      </Button>,
    );
    const button = screen.getByRole("button", { name: "Désactivé" });
    expect(button).toBeDisabled();
    expect(button).toHaveClass("w-full");
    expect(screen.getByTestId("icone").parentElement).toHaveAttribute("aria-hidden", "true");
  });
});
