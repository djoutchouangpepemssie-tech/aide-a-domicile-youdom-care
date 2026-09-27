import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import interfaceJson from "../../../../content/interface.json";
import { AidCard } from "./AidCard";

describe("AidCard", () => {
  it("présente pour qui, combien, comment, et nomme la source sans lien sortant", () => {
    render(
      <AidCard
        name="Crédit d’impôt"
        forWho="Les particuliers qui paient des services à la personne."
        howMuch="La moitié des sommes versées, dans la limite des plafonds."
        howTo="Lors de la déclaration de revenus."
        official={{ label: "impots.gouv.fr", href: "https://www.impots.gouv.fr/" }}
        texts={interfaceJson.aides}
      />,
    );
    const article = screen.getByRole("article");
    expect(
      within(article).getByRole("heading", { level: 3, name: "Crédit d’impôt" }),
    ).toBeInTheDocument();
    expect(
      within(article)
        .getAllByRole("term")
        .map((t) => t.textContent),
    ).toEqual(["Pour qui ?", "Combien ?", "Comment la demander ?"]);
    /*
     * 27/09/2026, demande d'Arcel : plus aucun lien sortant vers un service public. Le nom de la
     * source reste affiché, pour que le lecteur sache d'où vient l'information.
     */
    expect(within(article).getByText("impots.gouv.fr")).toBeInTheDocument();
    expect(within(article).queryByRole("link", { name: /impots\.gouv\.fr/ })).toBeNull();
    expect(article.querySelector('a[href^="http"]')).toBeNull();
  });
});
