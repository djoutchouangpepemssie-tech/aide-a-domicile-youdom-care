import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StepsTimeline } from "./StepsTimeline";

describe("StepsTimeline", () => {
  it("rend une liste ordonnée d'étapes numérotées", () => {
    render(
      <>
        <h2 id="etapes">Comment ça commence</h2>
        <StepsTimeline
          aria-labelledby="etapes"
          steps={[
            { title: "Nous vous écoutons.", text: "Un appel." },
            { title: "Nous venons vous voir.", text: "Une évaluation." },
          ]}
        />
      </>,
    );
    const list = screen.getByRole("list", { name: "Comment ça commence" });
    expect(list.tagName).toBe("OL");
    const items = within(list).getAllByRole("listitem");
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent("1Nous vous écoutons.Un appel.");
    expect(items[1]?.querySelector(".border-raspberry-500")).not.toBeNull();
    expect(items[0]?.querySelector(".bg-teal-700")).not.toBeNull();
    expect(items[1]?.querySelector(".bg-teal-700")).toBeNull();
  });
});
