import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { CheckboxGroup } from "./CheckboxGroup";

const options = [
  { value: "lever", label: "Aide au lever et au coucher" },
  { value: "repas", label: "Repas" },
  { value: "nuits", label: "Nuits", description: "Présence de nuit, calme ou active." },
];

describe("CheckboxGroup", () => {
  it("rend un groupe nommé par sa légende, avec plusieurs choix possibles", async () => {
    const onChange = vi.fn();
    render(
      <form>
        <CheckboxGroup
          name="besoins"
          legend="De quoi avez-vous besoin ?"
          hint="Plusieurs choix possibles."
          options={options}
          defaultValue={["repas"]}
          onChange={onChange}
        />
      </form>,
    );
    const group = screen.getByRole("group", { name: "De quoi avez-vous besoin ?" });
    expect(group).toHaveAccessibleDescription("Plusieurs choix possibles.");
    expect(screen.getByLabelText("Repas")).toBeChecked();

    await userEvent.click(screen.getByLabelText(/Aide au lever/));
    expect(onChange).toHaveBeenLastCalledWith(["lever", "repas"]);
    expect(screen.getByText("Présence de nuit, calme ou active.")).toBeInTheDocument();
  });

  /*
   * D-048 (29/09/2026) : « Aucune » ne peut plus cohabiter avec un autre choix. Sans cela, une
   * demande partait avec « Fauteuil roulant » et « Aucune aide technique » cochés tous les deux.
   */
  it("fait d'un choix exclusif le seul coché, et le décoche dès qu'un autre est coché", async () => {
    const onChange = vi.fn();
    function Groupe() {
      const [value, setValue] = useState<readonly string[]>([]);
      return (
        <form>
          <CheckboxGroup
            name="aides"
            legend="Quelles aides techniques sont utilisées ?"
            options={[
              { value: "fauteuil", label: "Fauteuil roulant" },
              { value: "leve", label: "Lève-personne" },
              { value: "aucune", label: "Aucune", exclusive: true },
            ]}
            value={value}
            onChange={(values) => {
              onChange(values);
              setValue(values);
            }}
          />
        </form>
      );
    }
    render(<Groupe />);

    await userEvent.click(screen.getByLabelText("Fauteuil roulant"));
    await userEvent.click(screen.getByLabelText("Lève-personne"));
    expect(onChange).toHaveBeenLastCalledWith(["fauteuil", "leve"]);

    await userEvent.click(screen.getByLabelText("Aucune"));
    expect(onChange).toHaveBeenLastCalledWith(["aucune"]);
    expect(screen.getByLabelText("Fauteuil roulant")).not.toBeChecked();
    expect(screen.getByLabelText("Lève-personne")).not.toBeChecked();

    await userEvent.click(screen.getByLabelText("Fauteuil roulant"));
    expect(onChange).toHaveBeenLastCalledWith(["fauteuil"]);
    expect(screen.getByLabelText("Aucune")).not.toBeChecked();
  });

  it("relie l'erreur au groupe et respecte le mode contrôlé", () => {
    render(
      <CheckboxGroup
        id="besoins"
        name="besoins"
        legend="Besoins"
        options={options}
        value={["nuits"]}
        error="Choisissez au moins un besoin, ou « À définir ensemble »."
      />,
    );
    // aria-invalid n'est pas permis sur un rôle group : l'erreur est reliée par aria-describedby.
    const group = screen.getByRole("group", { name: "Besoins" });
    expect(group).not.toHaveAttribute("aria-invalid");
    expect(group).toHaveAttribute("aria-describedby", "besoins-erreur");
    expect(group).toHaveAccessibleDescription(/Choisissez au moins un besoin/);
    expect(screen.getByLabelText(/Nuits/)).toBeChecked();
    expect(screen.getByLabelText("Repas")).not.toBeChecked();
  });

  it("se parcourt au clavier", async () => {
    render(<CheckboxGroup name="b" legend="Besoins" options={options} />);
    await userEvent.tab();
    expect(screen.getByLabelText(/Aide au lever/)).toHaveFocus();
    await userEvent.keyboard(" ");
    expect(screen.getByLabelText(/Aide au lever/)).toBeChecked();
    await userEvent.tab();
    expect(screen.getByLabelText("Repas")).toHaveFocus();
  });
});
