import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import interfaceJson from "../../../../content/interface.json";
import { AidCard } from "./AidCard";

describe("AidCard", () => {
  it("présente pour qui, combien, comment et un lien officiel signalé comme externe", () => {
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
    const link = within(article).getByRole("link", { name: /impots\.gouv\.fr/ });
    expect(link).toHaveAttribute("href", "https://www.impots.gouv.fr/");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
    expect(link).toHaveAccessibleName(/impots\.gouv\.fr\s*\(site officiel, lien externe\)/);
  });
});
