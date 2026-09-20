import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Commitment } from "@/content/schemas";
import { Commitments, visibleCommitments } from "./Commitments";

const commitments: Commitment[] = [
  { code: "E1", titre: "E1", texte: "…", preuve: null, valide: true },
  { code: "E2", titre: "E2", texte: "…", preuve: null, valide: false },
];
const items = [
  {
    engagement: "E1",
    titre: "Des intervenants formés.",
    texte: "Préparés.",
    icone: "coeur" as const,
  },
  { engagement: "E2", titre: "Des visages connus.", texte: "Stable." },
  { engagement: "E9", titre: "Sans engagement défini.", texte: "?" },
];

describe("Commitments", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("affiche tout en prévisualisation, sur le fil, avec une icône facultative", () => {
    render(<Commitments items={items} commitments={commitments} />);
    const list = screen.getByRole("list");
    expect(list).toHaveClass("commitments", "t-rail");
    const shown = screen.getAllByRole("listitem");
    expect(shown).toHaveLength(3);
    expect(screen.getByText("Des visages connus.")).toBeInTheDocument();
    expect(shown[0]).toHaveAttribute("data-engagement", "E1");
    expect(shown[0]?.querySelector('[data-icon="coeur"]')).not.toBeNull();
    expect(shown[1]).toHaveTextContent("2Des visages connus.");
    // Fil entre les engagements (pas après le dernier), nœud framboise au dernier
    expect(list.querySelectorAll(".t-connector")).toHaveLength(2);
    expect(shown[2]?.querySelector(".t-knot")).toHaveClass("text-raspberry-500");
  });

  it("ne garde en production que les engagements validés", () => {
    vi.stubEnv("VERCEL_ENV", "production");
    expect(visibleCommitments(items, commitments).map((i) => i.engagement)).toEqual(["E1"]);
    render(<Commitments items={items} commitments={commitments} />);
    expect(screen.getAllByRole("listitem")).toHaveLength(1);
  });

  it("ne rend rien s'il n'y a plus d'engagement affichable", () => {
    const { container } = render(<Commitments items={items} commitments={[]} />);
    expect(container).not.toBeEmptyDOMElement();
    vi.stubEnv("VERCEL_ENV", "production");
    const { container: prod } = render(<Commitments items={items} commitments={[]} />);
    expect(prod).toBeEmptyDOMElement();
  });
});
