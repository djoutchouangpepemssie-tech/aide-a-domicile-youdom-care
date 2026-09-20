import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { Select } from "./Select";

const options = [
  { value: "obtenue", label: "Obtenue" },
  { value: "en-cours", label: "En cours" },
  { value: "pas-encore", label: "Pas encore" },
];

describe("Select", () => {
  it("rend une liste déroulante étiquetée avec une option vide", async () => {
    render(<Select label="APA ou PCH" options={options} placeholder="Choisissez…" name="aide" />);
    const select = screen.getByLabelText("APA ou PCH");
    expect(select).toHaveValue("");
    expect(screen.getAllByRole("option")).toHaveLength(4);
    await userEvent.selectOptions(select, "en-cours");
    expect(select).toHaveValue("en-cours");
  });

  it("relie l'erreur et marque le champ invalide", () => {
    render(
      <Select id="mode" label="Mode souhaité" options={options} error="Choisissez un mode." />,
    );
    const select = screen.getByLabelText("Mode souhaité");
    expect(select).toHaveAttribute("aria-invalid", "true");
    expect(select).toHaveAccessibleDescription("Choisissez un mode.");
  });
});
