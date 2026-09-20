import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SituationCard } from "./SituationCard";

describe("SituationCard", () => {
  it("rend la citation entre guillemets, une phrase et un seul lien", () => {
    render(
      <SituationCard
        quote="Un diagnostic vient de tomber"
        text="Alzheimer, Parkinson, sclérose en plaques… Vous cherchez comment organiser la suite."
        href="/maladies-neurodegeneratives/"
        linkLabel="Voir l’accompagnement par maladie"
        illustration="carnet"
      />,
    );
    const card = screen.getByRole("article");
    expect(within(card).getByText("« Un diagnostic vient de tomber »")).toHaveClass("heading-3");
    const links = within(card).getAllByRole("link");
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAccessibleName("Voir l’accompagnement par maladie");
    expect(links[0]).toHaveAttribute(
      "href",
      expect.stringMatching(/^\/maladies-neurodegeneratives\/?$/),
    );
    expect(links[0]?.className).toContain("after:absolute");
    expect(card.querySelector("svg.thread")).toHaveAttribute("data-illustration", "carnet");
  });

  it("affiche une icône décorative de 48 px à la place de la pastille et s'incline de 3° au plus", () => {
    render(
      <SituationCard
        quote="Mon parent ne peut plus rester seul"
        text="Chutes, oublis, repas sautés : il est temps d'une présence régulière."
        href="/personnes-agees/"
        linkLabel="Voir l’aide aux personnes âgées"
        icon="maison"
      />,
    );
    const card = screen.getByRole("article");
    expect(card).toHaveClass("m-tilt");
    const icon = card.querySelector("svg[data-icon=maison]");
    expect(icon).toHaveAttribute("aria-hidden", "true");
    expect(icon).toHaveClass("size-12!");
    expect(card.querySelector("svg.thread")).toBeNull();
    expect(within(card).getAllByRole("link")).toHaveLength(1);
  });
});
