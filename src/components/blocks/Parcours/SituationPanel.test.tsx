import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Link from "next/link";
import { renderToString } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { HeroPicker } from "./HeroPicker";
import { ParcoursProvider } from "./ParcoursProvider";
import { SituationPanel, type PanelPublic } from "./SituationPanel";

const publics: PanelPublic[] = [
  {
    id: "personne-agee",
    pour: "pour votre parent",
    situations: [
      {
        titre: "« Elle est tombée deux fois ce mois-ci. »",
        texte: "Les chutes…",
        href: "/personnes-agees/#situations",
      },
      {
        titre: "« Il ne mange plus que du pain et du fromage. »",
        texte: "Cuisiner…",
        href: "/personnes-agees/#situations",
      },
      { titre: "« Elle ne sort plus. »", texte: "La peur…", href: "/personnes-agees/#situations" },
    ],
  },
  {
    id: "aidant",
    pour: "pour vous, qui aidez un proche",
    situations: [
      {
        titre: "« Je ne dors plus, il se lève toutes les nuits. »",
        texte: "…",
        href: "/aidants/#situations",
      },
      {
        titre: "« Je n'ai pas vu un ami depuis six mois. »",
        texte: "…",
        href: "/aidants/#situations",
      },
      {
        titre: "« Je m'énerve contre elle, et après je m'en veux. »",
        texte: "…",
        href: "/aidants/#situations",
      },
    ],
  },
];

const texts = {
  titre_panneau: "Vous cherchez de l'aide {pour}. Que vivez-vous ?",
  autre: "Autre chose : je décris ma situation",
  toutes: "Toutes les situations",
};

function Block() {
  return (
    <ParcoursProvider>
      <HeroPicker
        question="Pour qui cherchez-vous de l'aide ?"
        panelTitleId="situations"
        choices={[
          {
            id: "personne-agee",
            libelle: "Pour un parent âgé",
            icone: "public-personnes-agees",
            href: "/personnes-agees/",
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
        ]}
      />
      <section aria-labelledby="situations">
        <SituationPanel
          titleId="situations"
          heading="Que vivez-vous en ce moment ?"
          lead="Choisissez ce qui vous ressemble le plus."
          texts={texts}
          publics={publics}
          autreHref="/demande/"
        >
          <li>
            <Link href="/maladies-neurodegeneratives/">Carte 1</Link>
          </li>
          <li>
            <Link href="/personnes-agees/">Carte 2</Link>
          </li>
        </SituationPanel>
      </section>
    </ParcoursProvider>
  );
}

describe("SituationPanel", () => {
  beforeEach(() => {
    Element.prototype.scrollIntoView = vi.fn();
  });

  it("sans choix, garde le titre d'origine et montre les cartes ; tout le contenu des publics est rendu mais masqué", () => {
    const container = document.createElement("div");
    container.innerHTML = renderToString(<Block />);
    const panel = container.querySelector(".situation-panel");
    expect(panel?.querySelector("h2")).toHaveTextContent("Que vivez-vous en ce moment ?");
    expect(panel?.querySelector("h2")).toHaveAttribute("id", "situations");
    expect(panel?.querySelector("[aria-live=polite]")).not.toBeNull();
    const blocks = panel?.querySelectorAll("[data-panel]") ?? [];
    expect(blocks).toHaveLength(2);
    for (const block of blocks) expect(block).toHaveAttribute("hidden");
    // Les situations de tous les publics sont dans le HTML : aucune n'est absente.
    expect(panel?.querySelectorAll("[data-panel=personne-agee] a")).toHaveLength(4);
    expect(panel?.querySelectorAll("[data-panel=aidant] a")).toHaveLength(4);
    expect(panel?.querySelector("details")).toBeNull();
    expect(
      panel?.querySelector("ul.m-reveal--stagger")?.querySelectorAll(":scope > li"),
    ).toHaveLength(2);
  });

  it("après un choix, titre personnalisé, situations du public en liens, « Autre chose », cartes repliées", async () => {
    const user = userEvent.setup();
    render(<Block />);
    const region = screen.getByRole("region", { name: "Que vivez-vous en ce moment ?" });
    expect(within(region).getAllByRole("link")).toHaveLength(2);

    await user.click(screen.getByRole("button", { name: "Pour un parent âgé" }));

    const title = screen.getByRole("heading", { level: 2 });
    expect(title).toHaveTextContent("Vous cherchez de l'aide pour votre parent. Que vivez-vous ?");
    expect(title).toHaveFocus();
    expect(region).toHaveAccessibleName(
      "Vous cherchez de l'aide pour votre parent. Que vivez-vous ?",
    );

    const shown = region.querySelector("[data-panel=personne-agee]");
    expect(shown).not.toHaveAttribute("hidden");
    expect(region.querySelector("[data-panel=aidant]")).toHaveAttribute("hidden");
    const links = within(shown as HTMLElement).getAllByRole("link");
    expect(links.map((l) => l.textContent)).toEqual([
      "« Elle est tombée deux fois ce mois-ci. »",
      "« Il ne mange plus que du pain et du fromage. »",
      "« Elle ne sort plus. »",
      "Autre chose : je décris ma situation",
    ]);
    expect(links[0]).toHaveAttribute(
      "href",
      expect.stringMatching(/^\/personnes-agees\/?#situations$/),
    );
    expect(links[3]).toHaveAttribute("href", expect.stringMatching(/^\/demande\/?$/));

    const details = region.querySelector("details");
    expect(details).not.toBeNull();
    expect(within(details as HTMLElement).getByText("Toutes les situations").tagName).toBe(
      "SUMMARY",
    );
    expect(details?.querySelectorAll("li")).toHaveLength(2);

    await user.click(screen.getByRole("button", { name: "Pour moi : j'aide un proche" }));
    expect(title).toHaveTextContent(
      "Vous cherchez de l'aide pour vous, qui aidez un proche. Que vivez-vous ?",
    );
    expect(region.querySelector("[data-panel=personne-agee]")).toHaveAttribute("hidden");
    expect(region.querySelector("[data-panel=aidant]")).not.toHaveAttribute("hidden");
  });
});
