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

  it("relie les jalons par le fil (vertical puis horizontal), nœud framboise au dernier, icône par moment", () => {
    render(<FollowUpTimeline milestones={milestones} icons={{ "Avant de commencer": "maison" }} />);
    const list = screen.getByRole("list");
    expect(list).toHaveClass("follow-up-timeline", "t-rail");
    const items = screen.getAllByRole("listitem");
    const connector = items[0]?.querySelector(".t-connector");
    expect(connector).toHaveAttribute("data-orientation", "responsive");
    expect(connector?.querySelectorAll("path")).toHaveLength(2);
    expect(items[1]?.querySelector(".t-connector")).toBeNull();
    expect(items[0]?.querySelector('[data-icon="maison"]')).not.toBeNull();
    expect(items[1]?.querySelector("[data-icon]")).toBeNull();
    expect(items[1]?.querySelector(".t-knot")).toHaveClass("text-raspberry-500");
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
