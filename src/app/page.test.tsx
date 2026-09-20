import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Home from "./page";

describe("Accueil (blocs 1 à 8)", () => {
  it("rend la bannière, les six situations, les engagements et le bloc neuro", () => {
    render(<Home />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Vivre chez soi, bien accompagné. Même quand la maladie ou le handicap compliquent tout.",
    );
    // Le numéro est formaté avec des espaces insécables : on tolère tout séparateur.
    expect(screen.getByRole("link", { name: /Ou appelez le 01.84.80.17.03/ })).toHaveAttribute(
      "href",
      "tel:+33184801703",
    );

    const situations = screen.getByRole("region", { name: "Que vivez-vous en ce moment ?" });
    expect(within(situations).getAllByRole("article")).toHaveLength(6);
    expect(within(situations).getAllByRole("link")).toHaveLength(6);

    const engagements = screen.getByRole("region", { name: "Ce qui change avec Youdom Care" });
    expect(within(engagements).getAllByRole("listitem")).toHaveLength(4);

    const neuro = screen.getByRole("region", { name: /un accompagnement qui évolue/ });
    expect(within(neuro).getAllByRole("listitem")).toHaveLength(3);
  });

  it("rend les semaines types en onglets, les étapes, le prix sans tarif et les proches", () => {
    render(<Home />);
    const semaine = screen.getByRole("region", {
      name: "À quoi ressemble une semaine avec nous ?",
    });
    const tabs = within(semaine).getAllByRole("tab");
    expect(tabs.map((t) => t.textContent)).toEqual([
      "Madeleine, 82 ans, maladie d'Alzheimer",
      "Noé, 8 ans, autisme",
      "Bernard, 74 ans, retour d'hospitalisation",
    ]);
    expect(within(semaine).getByRole("tabpanel")).toHaveTextContent("Exemple illustratif");
    expect(
      within(semaine).getByRole("link", { name: "Je compose ma semaine" }),
    ).toBeInTheDocument();

    const etapes = screen.getByRole("region", { name: "Comment ça commence" });
    const steps = within(etapes).getAllByRole("listitem");
    expect(steps).toHaveLength(4);
    expect(steps[2]).toHaveTextContent("Si le courant ne passe pas, nous changeons.");

    const prix = screen.getByRole("region", { name: "Combien ça coûte, vraiment ?" });
    expect(prix.querySelector("[data-block=tarifs]")).toBeNull();
    expect(within(prix).getByRole("article", { name: "Les aides possibles" })).toBeInTheDocument();
    expect(within(prix).getByRole("link", { name: "Je découvre les aides" })).toBeInTheDocument();

    const proches = screen.getByRole("region", { name: "Et vous, qui prend soin de vous ?" });
    expect(within(proches).getByRole("link", { name: "J'ai besoin de relais" })).toHaveAttribute(
      "href",
      expect.stringMatching(/^\/aidants\/?$/),
    );
  });
});

describe("Accueil (blocs 9 à 12)", () => {
  it("rend le territoire avec le nombre d'agences calculé, l'appel final et le recrutement", () => {
    render(<Home />);
    const territoire = screen.getByRole("region", { name: "Partout à Paris et en Île-de-France" });
    expect(territoire).toHaveTextContent("6 agences, huit départements.");
    expect(within(territoire).getByRole("combobox")).toBeInTheDocument();
    expect(within(territoire).getByRole("button", { name: "Vérifier" })).toBeInTheDocument();

    expect(screen.queryByRole("region", { name: /Le Fil, le magazine/ })).not.toBeInTheDocument();

    const appel = screen.getByRole("region", { name: "Parlons de votre situation." });
    expect(within(appel).getByRole("link", { name: "Être rappelé(e)" })).toBeInTheDocument();
    expect(
      within(appel).getByRole("link", { name: /J'appelle le 01.84.80.17.03/ }),
    ).toHaveAttribute("href", "tel:+33184801703");

    const recrutement = screen.getByRole("region", { name: "Vous êtes auxiliaire de vie ?" });
    expect(within(recrutement).getByRole("link", { name: "Voir les offres" })).toBeInTheDocument();
  });
});
