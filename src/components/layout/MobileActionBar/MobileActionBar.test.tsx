import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { MobileActionBar } from "./MobileActionBar";

const props = {
  phone: { display: "01 84 80 17 03", href: "tel:+33184801703" },
  callbackHref: "/etre-rappele/",
  requestHref: "/demande/",
  texts: {
    nom: "Actions rapides",
    appeler: "Appeler",
    rappel: "Être rappelé(e)",
    demande: "Ma demande",
    court: { appeler: "Appeler", rappel: "Rappel", demande: "Ma demande" },
  },
};

describe("MobileActionBar", () => {
  it("propose les trois voies de contact", () => {
    render(<MobileActionBar {...props} />);
    const bar = screen.getByRole("navigation", { name: "Actions rapides" });
    expect(screen.getByRole("link", { name: "Appeler" })).toHaveAttribute(
      "href",
      "tel:+33184801703",
    );
    expect(screen.getByRole("link", { name: "Être rappelé(e)" })).toHaveAttribute(
      "href",
      expect.stringMatching(/^\/etre-rappele\/?$/),
    );
    expect(screen.getByRole("link", { name: "Ma demande" })).toBeInTheDocument();
    expect(bar).toHaveAttribute("data-field-active", "false");
  });

  it("affiche les libellés courts et garde les libellés complets comme nom accessible", () => {
    render(<MobileActionBar {...props} />);
    const callback = screen.getByRole("link", { name: "Être rappelé(e)" });
    expect(callback).toHaveTextContent(/^Rappel$/);
    expect(callback).toHaveAttribute("aria-label", "Être rappelé(e)");
    // Libellé court identique au complet : pas d'aria-label redondant.
    expect(screen.getByRole("link", { name: "Appeler" })).not.toHaveAttribute("aria-label");
    expect(screen.getByRole("link", { name: "Ma demande" })).toHaveTextContent(/^Ma demande$/);
  });

  it("se retire quand un champ de saisie a le focus, puis revient", async () => {
    render(
      <>
        <label htmlFor="champ">Prénom</label>
        <input id="champ" />
        <button type="button">Autre</button>
        <MobileActionBar {...props} />
      </>,
    );
    const bar = screen.getByRole("navigation", { name: "Actions rapides" });
    await userEvent.click(screen.getByLabelText("Prénom"));
    expect(bar).toHaveAttribute("data-field-active", "true");
    expect(bar).toHaveAttribute("inert");
    await userEvent.click(screen.getByRole("button", { name: "Autre" }));
    expect(bar).toHaveAttribute("data-field-active", "false");
  });

  it("masque l'appel si le téléphone est inconnu", () => {
    render(<MobileActionBar {...props} phone={null} />);
    expect(screen.queryByRole("link", { name: "Appeler" })).not.toBeInTheDocument();
    expect(screen.getAllByRole("link")).toHaveLength(2);
  });

  it("s'habille de verre dense et réserve l'encoche du bas (P9.6)", () => {
    render(<MobileActionBar {...props} />);
    const bar = screen.getByRole("navigation", { name: "Actions rapides" });
    expect(bar).toHaveClass("glass-strong", "glass-edge");
    expect(bar).toHaveClass("pb-[env(safe-area-inset-bottom)]");
    // Chaque voie fait 56 px de haut au moins (docs/02 §4 : bouton principal).
    for (const link of screen.getAllByRole("link")) {
      expect(link.className).toContain("min-h-14");
    }
  });
});
