import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import PricingPage, { generateMetadata } from "./page";

describe("Tarifs et aides", () => {
  it("a des balises titre et description aux longueurs de docs/01 §8", async () => {
    const metadata = generateMetadata();
    expect(String(metadata.title).length).toBeGreaterThanOrEqual(50);
    expect(String(metadata.title).length).toBeLessThanOrEqual(60);
    expect(String(metadata.description).length).toBeGreaterThanOrEqual(140);
    expect(String(metadata.description).length).toBeLessThanOrEqual(155);
  });

  it("sans tarif renseigné : aucun prix, le devis gratuit et six cartes d'aides sans montant", async () => {
    render(await PricingPage());
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Tarifs et aides : ce que vous paierez vraiment",
    );
    expect(document.querySelector("[data-block=tarifs]")).toBeNull();
    expect(screen.queryByText(/€/)).not.toBeInTheDocument();
    expect(screen.getByRole("note", { name: "Un devis gratuit et détaillé" })).toBeInTheDocument();
    expect(screen.queryByRole("note", { name: "Mode mandataire" })).not.toBeInTheDocument();

    const aides = screen.getByRole("region", { name: /Les aides qui réduisent/ });
    const cards = within(aides).getAllByRole("article");
    expect(cards).toHaveLength(6);
    expect(within(aides).queryByText("Combien ?")).not.toBeInTheDocument();
    expect(within(aides).getAllByRole("link", { name: "Tout savoir sur cette aide" })).toHaveLength(
      6,
    );
    expect(within(aides).getAllByRole("link", { name: /lien externe/ })).toHaveLength(6);

    expect(screen.getByRole("link", { name: "Je demande un devis gratuit" })).toBeInTheDocument();
  });
});
