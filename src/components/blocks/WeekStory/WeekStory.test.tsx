import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { WeekStory } from "./WeekStory";

const story = "Le matin, quelqu'un vient. Exemple illustratif, prénom fictif.";

describe("WeekStory", () => {
  it("affiche la photo en 3:2 à côté du récit, sans légende", () => {
    const { container } = render(
      <WeekStory
        story={story}
        photo={{
          src: "/images/exemples/exemple-semaine.jpg",
          alt: "Une table de cuisine avec deux tasses",
          focal: "50% 55%",
        }}
      />,
    );
    expect(screen.getByRole("img", { name: "Une table de cuisine avec deux tasses" })).toHaveStyle({
      objectPosition: "50% 55%",
    });
    expect(container.querySelector(".photo-figure")).toHaveAttribute("data-ratio", "3:2");
    expect(container.querySelector("figcaption")).toBeNull();
    expect(screen.getByText(story)).toBeInTheDocument();
  });

  it("rend le récit seul quand l'exemple n'a pas de photo", () => {
    render(<WeekStory story={story} />);
    expect(screen.queryByRole("img")).toBeNull();
    expect(screen.getByText(/prénom fictif/)).toBeInTheDocument();
  });
});
