import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Milestone } from "@/content/schemas";
import { FollowUpTimeline, visibleMilestones } from "./FollowUpTimeline";

const milestones: Milestone[] = [
  { moment: "Avant de commencer", texte: "Évaluation gratuite à domicile.", valide: true },
  { moment: "Première semaine", texte: null, valide: false },
  { moment: "Chaque mois", texte: "Un point avec la famille.", valide: false },
];

describe("FollowUpTimeline", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("masque les jalons sans texte et garde les jalons non validés en prévisualisation", () => {
    render(<FollowUpTimeline milestones={milestones} />);
    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(2);
    expect(screen.queryByText("Première semaine")).not.toBeInTheDocument();
    expect(screen.getByText("Chaque mois")).toBeInTheDocument();
  });

  it("masque aussi les jalons non validés en production", () => {
    vi.stubEnv("VERCEL_ENV", "production");
    expect(visibleMilestones(milestones).map((m) => m.moment)).toEqual(["Avant de commencer"]);
    expect(visibleMilestones(milestones, false).map((m) => m.moment)).toEqual([
      "Avant de commencer",
      "Chaque mois",
    ]);
  });

  it("ne rend rien s'il n'y a aucun jalon affichable", () => {
    const { container } = render(<FollowUpTimeline milestones={[milestones[1] as Milestone]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
