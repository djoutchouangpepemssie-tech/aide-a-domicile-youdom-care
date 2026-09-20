import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { WeekStory } from "./WeekStory";

const story = "Le matin, quelqu'un vient. Exemple illustratif, prénom fictif.";

const examples = [
  {
    id: "suzanne",
    label: "Suzanne, 84 ans",
    story: "Suzanne vit seule. Exemple illustratif, prénom fictif.",
    photo: { src: "/images/exemples/suzanne.jpg", alt: "Un petit-déjeuner sur une table" },
    icone: "maison" as const,
  },
  {
    id: "noe",
    label: "Noé, 7 ans",
    story: "Noé rentre de l'école. Exemple illustratif, prénom fictif.",
    icone: "ecole" as const,
  },
];

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

  it("rend le récit seul quand l'exemple n'a pas de photo, avec la mention si elle est fournie", () => {
    render(<WeekStory story={story} mention="Exemple illustratif" />);
    expect(screen.queryByRole("img")).toBeNull();
    expect(screen.getByText(/prénom fictif/)).toBeInTheDocument();
    expect(screen.getByText("Exemple illustratif")).toHaveClass("text-raspberry-700");
  });

  it("passe d'un exemple à l'autre avec un sélecteur segmenté, le premier affiché d'emblée", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <WeekStory
        examples={examples}
        selectorLabel="Choisir un exemple"
        mention="Exemple illustratif"
      />,
    );
    const group = screen.getByRole("group", { name: "Choisir un exemple" });
    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(2);
    expect(buttons[0]).toHaveAttribute("aria-pressed", "true");
    expect(group.querySelector('[data-icon="maison"]')).not.toBeNull();
    expect(screen.getByText(/Suzanne vit seule/)).toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: "Un petit-déjeuner sur une table" }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Noé rentre/)).toBeNull();

    await user.click(buttons[1] as HTMLElement);
    expect(buttons[1]).toHaveAttribute("aria-pressed", "true");
    expect(buttons[0]).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByText(/Noé rentre/)).toBeInTheDocument();
    expect(screen.queryByRole("img")).toBeNull();
    expect(screen.getByText("Exemple illustratif")).toBeInTheDocument();
    expect(container.querySelector("[data-example]")).toHaveAttribute("data-example", "noe");
  });

  it("rend le premier exemple côté serveur, sans sélecteur pour un exemple seul", () => {
    const html = renderToString(<WeekStory examples={examples} selectorLabel="Choisir" />);
    expect(html).toContain("Suzanne vit seule");
    expect(html).toContain('aria-pressed="true"');
    const single = renderToString(<WeekStory examples={[examples[1] as (typeof examples)[1]]} />);
    expect(single).toContain("Noé rentre");
    expect(single).not.toContain("aria-pressed");
  });
});
