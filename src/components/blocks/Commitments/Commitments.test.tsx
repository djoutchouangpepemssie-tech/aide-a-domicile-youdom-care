import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Commitment } from "@/content/schemas";
import { Commitments, visibleCommitments } from "./Commitments";

const commitments: Commitment[] = [
  { code: "E1", titre: "E1", texte: "…", preuve: null, valide: true },
  { code: "E2", titre: "E2", texte: "…", preuve: null, valide: false },
];
const items = [
  { engagement: "E1", titre: "Des intervenants formés.", texte: "Préparés." },
  { engagement: "E2", titre: "Des visages connus.", texte: "Stable." },
  { engagement: "E9", titre: "Sans engagement défini.", texte: "?" },
];

describe("Commitments", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("affiche tout en prévisualisation", () => {
    render(<Commitments items={items} commitments={commitments} />);
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
    expect(screen.getByText("Des visages connus.")).toBeInTheDocument();
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
