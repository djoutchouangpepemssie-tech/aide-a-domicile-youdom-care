import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Textarea } from "./Textarea";

describe("Textarea", () => {
  it("associe l'étiquette et l'aide, avec quatre lignes par défaut", () => {
    render(
      <Textarea
        label="Ce que vous souhaitez nous dire"
        hint="Inutile de détailler l’état de santé : nous en parlerons de vive voix."
        optional
      />,
    );
    const textarea = screen.getByLabelText(/Ce que vous souhaitez nous dire/);
    expect(textarea).toHaveAttribute("rows", "4");
    expect(textarea).toHaveAccessibleDescription(/Inutile de détailler/);
  });

  it("relie l'erreur et marque le champ invalide", () => {
    render(<Textarea id="msg" label="Message" error="Le message est trop long." maxLength={500} />);
    const textarea = screen.getByLabelText("Message");
    expect(textarea).toHaveAttribute("aria-invalid", "true");
    expect(textarea).toHaveAttribute("aria-describedby", "msg-erreur");
    expect(textarea).toHaveAttribute("maxlength", "500");
  });
});
