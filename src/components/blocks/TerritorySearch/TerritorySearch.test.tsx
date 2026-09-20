import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { TerritorySearch, type CompactCommune } from "./TerritorySearch";

const texts = {
  champ: "Votre commune ou votre code postal",
  bouton: "Vérifier",
  oui: "Oui, nous intervenons à {commune}. Votre agence la plus proche : {agence}.",
  oui_sans_agence: "Oui, nous intervenons à {commune}.",
  hors: "Nous intervenons à Paris et en Île-de-France.",
  aucun_resultat: "Aucune commune d’Île-de-France ne correspond.",
  suggestions: "{n} suggestions",
};

const rows: CompactCommune[] = [
  ["92062", "Puteaux", "92800", "92", "puteaux"],
  ["92063", "Rueil-Malmaison", "92500", "92", "puteaux"],
  ["78646", "Versailles", "78000", "78", "versailles"],
  ["75112", "Paris 12e Arrondissement", "75012", "75", ""],
];

const agencies = { puteaux: "Youdom Care Hauts-de-Seine", versailles: "Youdom Care Yvelines" };
const loadCommunes = () => Promise.resolve(rows);

describe("TerritorySearch", () => {
  it("propose des communes au clavier et annonce l'agence la plus proche", async () => {
    render(<TerritorySearch texts={texts} agencies={agencies} loadCommunes={loadCommunes} />);
    const input = screen.getByRole("combobox", { name: "Votre commune ou votre code postal" });
    await userEvent.type(input, "pu");
    await waitFor(() => expect(input).toHaveAttribute("aria-expanded", "true"));
    expect(screen.getAllByRole("option")).toHaveLength(1);

    await userEvent.keyboard("{ArrowDown}");
    expect(screen.getByRole("option", { name: /Puteaux/ })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await userEvent.keyboard("{Enter}");
    expect(input).toHaveValue("Puteaux");
    expect(screen.getByText(/Oui, nous intervenons à Puteaux/)).toHaveTextContent(
      "Votre agence la plus proche : Youdom Care Hauts-de-Seine.",
    );
  });

  it("répond hors Île-de-France quand rien ne correspond, et cherche par code postal", async () => {
    render(<TerritorySearch texts={texts} agencies={agencies} loadCommunes={loadCommunes} />);
    const input = screen.getByRole("combobox");
    await userEvent.type(input, "Lyon");
    await waitFor(() => expect(screen.getByText(texts.aucun_resultat)).toBeInTheDocument());
    await userEvent.click(screen.getByRole("button", { name: "Vérifier" }));
    expect(screen.getByText(texts.hors)).toBeInTheDocument();

    await userEvent.clear(input);
    await userEvent.type(input, "78000");
    await waitFor(() => expect(screen.getAllByRole("option")).toHaveLength(1));
    await userEvent.click(screen.getByRole("button", { name: "Vérifier" }));
    expect(document.querySelector("[data-result=oui]")).toHaveTextContent(
      "Oui, nous intervenons à Versailles. Votre agence la plus proche : Youdom Care Yvelines.",
    );
  });

  it("répond sans agence si elle est inconnue", async () => {
    render(<TerritorySearch texts={texts} agencies={agencies} loadCommunes={loadCommunes} />);
    await userEvent.type(screen.getByRole("combobox"), "Paris 12");
    await waitFor(() => expect(screen.getAllByRole("option")).toHaveLength(1));
    await userEvent.click(screen.getByRole("button", { name: "Vérifier" }));
    expect(
      screen.getByText("Oui, nous intervenons à Paris 12e Arrondissement."),
    ).toBeInTheDocument();
  });
});
