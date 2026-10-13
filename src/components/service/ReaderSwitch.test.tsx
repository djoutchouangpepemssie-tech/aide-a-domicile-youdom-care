import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { ReaderProvider } from "./ReaderContext";
import { ReaderSwitch, ReaderText } from "./ReaderSwitch";

const texts = {
  legende: "Vous cherchez de l’aide",
  proche: "pour un proche",
  soi: "pour vous-même",
};

/*
 * Les commandes et le chapô sont deux composants voisins depuis D-086 : le sélecteur ne vit plus
 * dans le paragraphe. Ils partagent leur état par le fournisseur, comme sur la page.
 */
function renderSwitch() {
  return render(
    <ReaderProvider>
      <ReaderSwitch texts={texts} />
      <ReaderText proche="Texte proche." soi="Texte soi." />
    </ReaderProvider>,
  );
}

describe("ReaderSwitch (docs/03 §4)", () => {
  it("affiche le chapô « pour un proche » par défaut, avec un groupe de boutons à bascule", () => {
    renderSwitch();
    expect(screen.getByRole("group", { name: texts.legende })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: texts.proche })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: texts.soi })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    expect(screen.getByText("Texte proche.")).toBeInTheDocument();
    expect(screen.queryByText("Texte soi.")).not.toBeInTheDocument();
  });

  it("bascule vers « pour vous-même » au clic et au clavier", async () => {
    const user = userEvent.setup();
    renderSwitch();
    await user.click(screen.getByRole("button", { name: texts.soi }));
    expect(screen.getByRole("button", { name: texts.soi })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("Texte soi.")).toBeInTheDocument();

    screen.getByRole("button", { name: texts.proche }).focus();
    await user.keyboard("{Enter}");
    expect(screen.getByRole("button", { name: texts.proche })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByText("Texte proche.")).toBeInTheDocument();
  });

  it("annonce la version affichée dans une zone de statut, vide au départ (audit P8.4 R-2)", async () => {
    const user = userEvent.setup();
    renderSwitch();
    const status = screen.getByRole("status");
    expect(status).toHaveAttribute("aria-live", "polite");
    expect(status).toHaveTextContent("");
    await user.click(screen.getByRole("button", { name: texts.soi }));
    expect(status).toHaveTextContent("Vous cherchez de l’aide pour vous-même");
    await user.click(screen.getByRole("button", { name: texts.proche }));
    expect(status).toHaveTextContent("Vous cherchez de l’aide pour un proche");
  });
});
