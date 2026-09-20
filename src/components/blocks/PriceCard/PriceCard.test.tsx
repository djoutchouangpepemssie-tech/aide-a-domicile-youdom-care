import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import interfaceJson from "../../../../content/interface.json";
import type { Service } from "@/content/schemas";
import { PriceCard } from "./PriceCard";

const texts = interfaceJson.tarifs;

// Chiffres de test uniquement : aucun tarif réel n'est connu (Q-TARIFS-1).
const service: Service = {
  id: "aide-a-l-autonomie-prestataire",
  libelle: "Aide à l’autonomie",
  activite: "Assistance aux personnes âgées",
  mode: "prestataire",
  unite: "heure",
  prix_ttc: 30,
  prix_ht: 27.27,
  tva: 0.1,
  majorations: [],
  degressivite: [],
  frais: [],
};

describe("PriceCard", () => {
  it("met le prix TTC en avant, puis le HT, le crédit d'impôt et le mode", () => {
    render(
      <PriceCard service={service} creditImpotTaux={0.5} exampleHoursPerWeek={10} texts={texts} />,
    );
    const card = screen.getByRole("article", { name: "Aide à l’autonomie" });
    // Le montant contient une espace insécable : on cible la classe du grand chiffre.
    const ttc = card.querySelector(".text-h2");
    expect(ttc).toHaveTextContent("30 €");
    expect(card).toHaveTextContent("30 € TTC par heure");
    expect(card).toHaveTextContent("27,27 € HT");
    expect(card).toHaveTextContent("Soit 15 € après crédit d’impôt de 50 %");
    expect(screen.getByText(/après crédit/)).toHaveClass("text-small");
    expect(card).toHaveTextContent("Exemple : 10 h par semaine, environ 1 300 € par mois");
    expect(card).toHaveTextContent("Mode prestataire");
    expect(card).toHaveTextContent("Devis personnalisé gratuit");
  });

  it("se masque si le tarif n'est pas renseigné", () => {
    const { container } = render(
      <PriceCard service={{ ...service, prix_ttc: null }} creditImpotTaux={0.5} texts={texts} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("affiche la mention mandataire fournie par le parent", () => {
    render(
      <PriceCard
        service={{ ...service, mode: "mandataire" }}
        creditImpotTaux={0.5}
        notice={<p>Mention mandataire</p>}
        texts={texts}
      />,
    );
    expect(screen.getByText("Mention mandataire")).toBeInTheDocument();
    expect(screen.getByText("Mode mandataire")).toBeInTheDocument();
  });
});
