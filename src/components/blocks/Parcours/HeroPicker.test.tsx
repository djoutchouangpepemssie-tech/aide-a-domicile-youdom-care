import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HeroPicker, type HeroPickerChoice } from "./HeroPicker";
import { ParcoursProvider } from "./ParcoursProvider";

const choices: HeroPickerChoice[] = [
  {
    id: "personne-agee",
    libelle: "Pour un parent âgé",
    icone: "public-personnes-agees",
    href: "/personnes-agees/",
    panel: true,
  },
  {
    id: "neuro",
    libelle: "Pour une personne qui a Alzheimer, Parkinson…",
    icone: "public-neuro",
    href: "/maladies-neurodegeneratives/",
    panel: true,
  },
  {
    id: "enfant-handicap",
    libelle: "Pour mon enfant",
    icone: "public-enfants",
    href: "/enfants-en-situation-de-handicap/",
    panel: true,
  },
  {
    id: "adulte-handicap",
    libelle: "Pour moi : je vis avec un handicap",
    icone: "public-adultes",
    href: "/adultes-en-situation-de-handicap/",
    panel: true,
  },
  {
    id: "aidant",
    libelle: "Pour moi : j'aide un proche",
    icone: "public-aidants",
    href: "/aidants/",
    panel: true,
  },
  {
    id: "inconnu",
    libelle: "Je ne sais pas encore",
    icone: "rappel",
    href: "/etre-rappele/",
    panel: false,
  },
];

function Picker() {
  return (
    <ParcoursProvider>
      <HeroPicker
        question="Pour qui cherchez-vous de l'aide ?"
        choices={choices}
        panelTitleId="situations"
      />
      <h2 id="situations" tabIndex={-1}>
        Que vivez-vous en ce moment ?
      </h2>
    </ParcoursProvider>
  );
}

describe("HeroPicker", () => {
  const scrollIntoView = vi.fn();

  beforeEach(() => {
    Element.prototype.scrollIntoView = scrollIntoView;
    delete document.documentElement.dataset.comfort;
    delete document.documentElement.dataset.motion;
  });

  afterEach(() => {
    scrollIntoView.mockReset();
    document.body.innerHTML = "";
  });

  it("sans JavaScript, rend la question et six liens (cinq piliers, Être rappelé)", () => {
    const container = document.createElement("div");
    container.innerHTML = renderToString(<Picker />);
    document.body.append(container);
    const group = container.querySelector("[role=group]");
    expect(group).toHaveAccessibleName("Pour qui cherchez-vous de l'aide ?");
    expect(container.querySelectorAll("button")).toHaveLength(0);
    const links = Array.from(container.querySelectorAll("a")).map((a) => a.getAttribute("href"));
    expect(links).toEqual([
      "/personnes-agees/",
      "/maladies-neurodegeneratives/",
      "/enfants-en-situation-de-handicap/",
      "/adultes-en-situation-de-handicap/",
      "/aidants/",
      "/etre-rappele/",
    ]);
    expect(container.querySelectorAll("svg[data-icon]")).toHaveLength(6);
    expect(container.querySelector("svg[data-icon=public-personnes-agees]")).toHaveAttribute(
      "width",
      "32",
    );
  });

  it("avec JavaScript, cinq boutons aria-pressed et un lien vers Être rappelé", () => {
    render(<Picker />);
    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(5);
    for (const button of buttons) expect(button).toHaveAttribute("aria-pressed", "false");
    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAccessibleName("Je ne sais pas encore");
    expect(links[0]).toHaveAttribute("href", expect.stringMatching(/^\/etre-rappele\/?$/));
  });

  it("un choix presse le bouton, fait défiler doucement jusqu'au bloc 2 et déplace le focus", async () => {
    const user = userEvent.setup();
    render(<Picker />);
    const parent = screen.getByRole("button", { name: "Pour un parent âgé" });
    await user.click(parent);
    expect(parent).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Pour mon enfant" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth", block: "start" });
    expect(screen.getByRole("heading", { level: 2 })).toHaveFocus();

    await user.click(screen.getByRole("button", { name: "Pour mon enfant" }));
    expect(parent).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("button", { name: "Pour mon enfant" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("en mouvement réduit (mode confort), le défilement est immédiat", async () => {
    document.documentElement.dataset.comfort = "on";
    const user = userEvent.setup();
    render(<Picker />);
    await user.click(screen.getByRole("button", { name: "Pour moi : j'aide un proche" }));
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: "auto", block: "start" });
  });
});
