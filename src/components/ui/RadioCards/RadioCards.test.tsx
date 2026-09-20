import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { RadioCards } from "./RadioCards";

const options = [
  { value: "parent", label: "Un parent âgé", description: "Père, mère, grand-parent." },
  { value: "enfant", label: "Mon enfant" },
  { value: "moi", label: "Moi-même" },
];

describe("RadioCards", () => {
  it("rend un groupe radio nommé, un seul choix à la fois", async () => {
    const onChange = vi.fn();
    render(
      <RadioCards
        name="pour_qui"
        legend="Pour qui cherchez-vous de l'aide ?"
        options={options}
        onChange={onChange}
      />,
    );
    const group = screen.getByRole("radiogroup", { name: "Pour qui cherchez-vous de l'aide ?" });
    expect(group).toBeInTheDocument();
    await userEvent.click(screen.getByLabelText(/Mon enfant/));
    expect(onChange).toHaveBeenLastCalledWith("enfant");
    expect(screen.getByLabelText(/Mon enfant/)).toBeChecked();
    await userEvent.click(screen.getByLabelText(/Moi-même/));
    expect(screen.getByLabelText(/Mon enfant/)).not.toBeChecked();
    expect(screen.getByLabelText(/Moi-même/)).toBeChecked();
  });

  it("relie l'erreur et l'aide, et respecte la valeur contrôlée", () => {
    render(
      <RadioCards
        id="qui"
        name="pour_qui"
        legend="Pour qui ?"
        hint="Une seule réponse."
        error="Dites-nous pour qui vous cherchez de l'aide."
        options={options}
        value="parent"
      />,
    );
    const group = screen.getByRole("radiogroup", { name: "Pour qui ?" });
    expect(group).toHaveAttribute("aria-invalid", "true");
    expect(group).toHaveAccessibleDescription(
      "Une seule réponse. Dites-nous pour qui vous cherchez de l'aide.",
    );
    expect(screen.getByLabelText(/Un parent âgé/)).toBeChecked();
  });
});
