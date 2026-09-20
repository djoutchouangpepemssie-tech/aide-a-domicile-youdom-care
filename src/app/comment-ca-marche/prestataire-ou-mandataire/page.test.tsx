import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import ModesPage, { generateMetadata } from "./page";

describe("Prestataire ou mandataire", () => {
  it("a des balises titre et description aux longueurs de docs/01 §8", () => {
    const metadata = generateMetadata();
    expect(String(metadata.title).length).toBeGreaterThanOrEqual(50);
    expect(String(metadata.title).length).toBeLessThanOrEqual(60);
    expect(String(metadata.description).length).toBeGreaterThanOrEqual(140);
    expect(String(metadata.description).length).toBeLessThanOrEqual(155);
  });

  it("rend un tableau comparatif réel, la mention mandataire et la question qui tranche", () => {
    render(<ModesPage />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Prestataire ou mandataire : quel mode choisir ?",
    );
    const table = screen.getByRole("table", {
      name: "Comparatif des modes prestataire et mandataire",
    });
    expect(
      within(table)
        .getAllByRole("columnheader")
        .map((th) => th.textContent),
    ).toEqual(["Critère", "Prestataire", "Mandataire"]);
    expect(within(table).getAllByRole("rowheader").length).toBeGreaterThanOrEqual(3);
    expect(
      within(table).getByRole("rowheader", { name: /employeur de l'intervenant/ }),
    ).toBeInTheDocument();

    expect(screen.getByRole("note", { name: "Mode mandataire" })).toHaveTextContent(
      "le consommateur est l'employeur",
    );

    const question = screen.getByRole("region", { name: "La question qui tranche" });
    const cards = within(question).getAllByRole("listitem");
    expect(cards).toHaveLength(2);
    expect(cards[0]).toHaveAttribute("data-mode", "prestataire");
    expect(cards[1]).toHaveAttribute("data-mode", "mandataire");

    const crumbs = screen.getByRole("navigation", { name: "Fil d’Ariane" });
    expect(within(crumbs).getByRole("link", { name: "Comment ça marche" })).toHaveAttribute(
      "href",
      expect.stringMatching(/^\/comment-ca-marche\/?$/),
    );
  });
});
