import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { Regle, RegleCatalogue } from "@/lib/bureau/api";
import { ReglesForm, valider } from "./ReglesForm";

const CATALOGUE: RegleCatalogue[] = [
  {
    key: "amplitude_quotidienne",
    libelle: "Amplitude d’une journée",
    verifie: "de la première minute travaillée à la dernière, pauses comprises",
    unite: "heures",
    suggestion: 13,
  },
  {
    key: "chevauchement",
    libelle: "Deux visites en même temps",
    verifie: "un intervenant ne peut pas être à deux endroits à la fois",
    unite: null,
    suggestion: null,
  },
];

const VIDES: Record<string, Regle> = {
  amplitude_quotidienne: { active: false, severite: "avertissement", valeur: null },
  chevauchement: { active: false, severite: "avertissement", valeur: null },
};

describe("le formulaire des règles", () => {
  it("n'active aucune règle par défaut : le logiciel n'impose rien", () => {
    render(<ReglesForm catalogue={CATALOGUE} initiales={VIDES} onEnregistrer={vi.fn()} />);
    for (const case_ of screen.getAllByRole("checkbox")) expect(case_).not.toBeChecked();
    // Le seuil n'apparaît qu'une fois la règle demandée : un champ prérempli serait un seuil imposé.
    expect(screen.queryByLabelText(/Seuil/)).toBeNull();
    // Et chaque case porte le nom de sa règle : « Vérifier cette règle » dix fois ne dit rien.
    expect(screen.getByRole("checkbox", { name: /Amplitude d’une journée/ })).toBeInTheDocument();
    expect(
      screen.getByRole("checkbox", { name: /Deux visites en même temps/ }),
    ).toBeInTheDocument();
  });

  it("affiche la valeur courante comme suggestion, sans la préremplir", async () => {
    const utilisateur = userEvent.setup();
    render(<ReglesForm catalogue={CATALOGUE} initiales={VIDES} onEnregistrer={vi.fn()} />);
    await utilisateur.click(
      screen.getByRole("checkbox", { name: /Vérifier cette règle : Amplitude/ }),
    );
    const seuil = screen.getByLabelText(/Seuil \(en heures\) : Amplitude/);
    expect(seuil).toHaveValue(null);
    expect(screen.getByText(/Souvent 13 heures — à vous de décider/)).toBeVisible();
  });

  it("refuse une règle active sans seuil, et le dit à la bonne ligne", async () => {
    const utilisateur = userEvent.setup();
    const onEnregistrer = vi.fn();
    render(<ReglesForm catalogue={CATALOGUE} initiales={VIDES} onEnregistrer={onEnregistrer} />);
    await utilisateur.click(screen.getByRole("checkbox", { name: /Amplitude/ }));
    await utilisateur.click(screen.getByRole("button", { name: /Enregistrer les règles/ }));
    expect(screen.getByText("Une règle active a besoin de son seuil.")).toBeVisible();
    expect(onEnregistrer).not.toHaveBeenCalled();
  });

  it("n'attend aucun seuil pour une règle qui constate un fait", async () => {
    const utilisateur = userEvent.setup();
    const onEnregistrer = vi.fn();
    render(<ReglesForm catalogue={CATALOGUE} initiales={VIDES} onEnregistrer={onEnregistrer} />);
    await utilisateur.click(screen.getByRole("checkbox", { name: /Deux visites/ }));
    expect(screen.getByText(/cette règle constate un fait/)).toBeVisible();
    await utilisateur.click(screen.getByRole("button", { name: /Enregistrer les règles/ }));
    expect(onEnregistrer).toHaveBeenCalledWith(
      expect.objectContaining({
        chevauchement: { active: true, severite: "avertissement", valeur: null },
      }),
    );
  });

  it("transmet le seuil et la sévérité choisis", async () => {
    const utilisateur = userEvent.setup();
    const onEnregistrer = vi.fn();
    render(<ReglesForm catalogue={CATALOGUE} initiales={VIDES} onEnregistrer={onEnregistrer} />);
    await utilisateur.click(screen.getByRole("checkbox", { name: /Amplitude/ }));
    await utilisateur.type(screen.getByLabelText(/Seuil \(en heures\) : Amplitude/), "12");
    await utilisateur.selectOptions(
      screen.getByLabelText(/En cas de dépassement : Amplitude/),
      "bloquant",
    );
    await utilisateur.click(screen.getByRole("button", { name: /Enregistrer les règles/ }));
    expect(onEnregistrer).toHaveBeenCalledWith(
      expect.objectContaining({
        amplitude_quotidienne: { active: true, severite: "bloquant", valeur: 12 },
      }),
    );
  });

  it("valider() refuse un seuil nul ou négatif", () => {
    expect(
      valider(CATALOGUE, {
        ...VIDES,
        amplitude_quotidienne: { active: true, severite: "bloquant", valeur: 0 },
      }),
    ).toEqual({ amplitude_quotidienne: "Le seuil doit être supérieur à zéro." });
  });
});
