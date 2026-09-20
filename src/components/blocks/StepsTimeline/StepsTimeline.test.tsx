import { render, screen, within } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { StepsTimeline } from "./StepsTimeline";

const steps = [
  { title: "Nous vous écoutons.", text: "Un appel.", icone: "telephone" as const },
  { title: "Nous venons vous voir.", text: "Une évaluation." },
];

describe("StepsTimeline", () => {
  it("rend une liste ordonnée d'étapes reliées par le fil vertical", () => {
    render(
      <>
        <h2 id="etapes">Comment ça commence</h2>
        <StepsTimeline aria-labelledby="etapes" steps={steps} />
      </>,
    );
    const list = screen.getByRole("list", { name: "Comment ça commence" });
    expect(list.tagName).toBe("OL");
    expect(list).toHaveClass("steps-timeline", "t-rail");
    const items = within(list).getAllByRole("listitem");
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent("Nous vous écoutons.Un appel.");
    expect(items[1]).toHaveTextContent("2Nous venons vous voir.");
    // Icône à la place du numéro ; segment vertical seulement entre les étapes
    expect(items[0]?.querySelector('[data-icon="telephone"]')).not.toBeNull();
    expect(items[0]?.querySelector(".t-connector")).toHaveAttribute("data-orientation", "vertical");
    expect(items[1]?.querySelector(".t-connector")).toBeNull();
    expect(items[1]?.querySelector(".t-knot")).toHaveClass("text-raspberry-500");
    expect(items[0]?.querySelector(".t-knot")).toHaveClass("text-teal-700");
    expect((items[1] as HTMLElement).style.getPropertyValue("--m-delay")).toBe("200ms");
  });

  it("est complet au rendu serveur, sans état de révélation", () => {
    const html = renderToString(<StepsTimeline steps={steps} />);
    expect(html).toContain("Une évaluation.");
    expect(html).not.toContain("data-reveal");
  });
});
