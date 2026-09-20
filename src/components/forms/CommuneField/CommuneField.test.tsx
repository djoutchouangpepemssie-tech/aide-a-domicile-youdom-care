import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CommuneField, type CompactCommune } from "./CommuneField";

const rows: CompactCommune[] = [
  ["92062", "Puteaux", "92800", "92", "puteaux"],
  ["92050", "Nanterre", "92000", "92", "puteaux"],
  ["75112", "Paris 12e Arrondissement", "75012", "75", "paris-12"],
];
const texts = {
  aucun_resultat: "Aucune commune d’Île-de-France ne correspond à votre saisie.",
  suggestions: "{n} suggestion(s), utilisez les flèches pour choisir.",
};

describe("CommuneField", () => {
  it("propose les communes au clavier et renvoie la commune choisie", async () => {
    const onChange = vi.fn();
    render(
      <CommuneField
        label="Votre commune"
        value={null}
        onChange={onChange}
        loadCommunes={async () => rows}
        texts={texts}
      />,
    );
    const input = screen.getByRole("combobox", { name: "Votre commune" });
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "Nan" } });
    expect(onChange).toHaveBeenLastCalledWith(null, "Nan");
    await waitFor(() => expect(screen.getByRole("option", { name: /Nanterre/ })).toBeVisible());
    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ code: "92050", nom: "Nanterre", agence: "puteaux" }),
      "Nanterre",
    );
    expect(input).toHaveValue("Nanterre");
  });

  it("annonce l'absence de résultat et affiche l'erreur liée au champ", async () => {
    render(
      <CommuneField
        label="Votre commune"
        value={null}
        error="Nous intervenons à Paris et en Île-de-France."
        onChange={() => {}}
        loadCommunes={async () => rows}
        texts={texts}
      />,
    );
    const input = screen.getByRole("combobox", { name: "Votre commune" });
    fireEvent.change(input, { target: { value: "Lyon" } });
    await waitFor(() =>
      expect(screen.getByText(/Aucune commune d’Île-de-France/)).toBeInTheDocument(),
    );
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAccessibleDescription("Nous intervenons à Paris et en Île-de-France.");
  });

  it("lit ?commune= dans l'adresse quand aucun code initial n'est fourni", async () => {
    window.history.replaceState({}, "", "/etre-rappele/?commune=92050");
    const onChange = vi.fn();
    render(
      <CommuneField
        label="Votre commune"
        value={null}
        onChange={onChange}
        loadCommunes={async () => rows}
        texts={texts}
      />,
    );
    await waitFor(() =>
      expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ code: "92050" }), "Nanterre"),
    );
    window.history.replaceState({}, "", "/");
  });

  it("présélectionne la commune d'un code INSEE initial", async () => {
    const onChange = vi.fn();
    render(
      <CommuneField
        label="Votre commune"
        value={null}
        onChange={onChange}
        initialInsee="75112"
        loadCommunes={async () => rows}
        texts={texts}
      />,
    );
    await waitFor(() =>
      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({ code: "75112" }),
        "Paris 12e Arrondissement",
      ),
    );
    expect(screen.getByRole("combobox")).toHaveValue("Paris 12e Arrondissement");
  });
});
