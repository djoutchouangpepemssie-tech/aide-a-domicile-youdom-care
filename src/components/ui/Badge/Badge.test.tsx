import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Badge } from "./Badge";

describe("Badge", () => {
  it("rend une pastille neutre par défaut", () => {
    render(<Badge>Exemple illustratif</Badge>);
    const badge = screen.getByText("Exemple illustratif");
    expect(badge.tagName).toBe("SPAN");
    expect(badge).toHaveClass("rounded-full", "glass-quiet", "glass-tint-sable", "text-ink");
  });

  it("garde un texte encre sur l'aplat vert « fait »", () => {
    render(<Badge tone="done">Fait</Badge>);
    const badge = screen.getByText("Fait");
    expect(badge).toHaveClass("bg-green-500", "text-ink");
    expect(badge).not.toHaveClass("glass-quiet");
    expect(badge).not.toHaveClass("text-white");
  });
});
