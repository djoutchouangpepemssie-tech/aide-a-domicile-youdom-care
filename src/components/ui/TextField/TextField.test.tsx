import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { TextField } from "./TextField";

describe("TextField", () => {
  it("associe l'étiquette, l'aide et accepte la saisie", async () => {
    render(
      <TextField label="Votre prénom" hint="Comme vous souhaitez être appelé(e)." name="prenom" />,
    );
    const input = screen.getByLabelText("Votre prénom");
    expect(input).toHaveAccessibleDescription("Comme vous souhaitez être appelé(e).");
    expect(input).not.toHaveAttribute("aria-invalid");
    await userEvent.type(input, "Camille");
    expect(input).toHaveValue("Camille");
  });

  it("relie l'erreur au champ et le marque invalide", () => {
    render(
      <TextField
        id="tel"
        type="tel"
        label="Votre téléphone"
        hint="Nous vous rappelons à ce numéro."
        error="Ce numéro semble incomplet. Pouvez-vous le vérifier ?"
      />,
    );
    const input = screen.getByLabelText("Votre téléphone");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAttribute("aria-describedby", "tel-aide tel-erreur");
    expect(input).toHaveAccessibleDescription(
      "Nous vous rappelons à ce numéro. Ce numéro semble incomplet. Pouvez-vous le vérifier ?",
    );
  });

  it("signale les champs facultatifs et l'état désactivé", () => {
    render(<TextField label="Commune" optional disabled />);
    expect(screen.getByLabelText(/Commune/)).toBeDisabled();
    expect(screen.getByText("(facultatif)")).toBeInTheDocument();
  });
});
