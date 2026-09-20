import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import interfaceJson from "../../../../content/interface.json";
import { MandataireNotice } from "./MandataireNotice";

describe("MandataireNotice", () => {
  it("rend une note « Attention » repérable, avec le texte de interface.json", () => {
    render(<MandataireNotice texts={interfaceJson.mandataire_notice} />);
    const note = screen.getByRole("note", { name: "Mode mandataire" });
    expect(note).toHaveAttribute("data-notice", "mandataire");
    expect(note).toHaveTextContent("le consommateur est l'employeur");
  });
});
