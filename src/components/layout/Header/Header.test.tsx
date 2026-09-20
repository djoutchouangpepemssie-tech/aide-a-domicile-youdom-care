import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { Header, type HeaderProps } from "./Header";

const props: HeaderProps = {
  brandName: "Youdom Care",
  phone: { display: "01 84 80 17 03", href: "tel:+33184801703" },
  navigation: [
    {
      id: "pour-qui",
      libelle: "Pour qui ?",
      enfants: [
        { libelle: "Personnes âgées", href: "/personnes-agees/", description: "Autonomie" },
        { libelle: "Aidants", href: "/aidants/" },
      ],
    },
    { id: "tarifs", libelle: "Tarifs et aides", href: "/tarifs-et-aides/" },
  ],
  callbackHref: "/etre-rappele/",
  callbackLabel: "Être rappelé(e)",
  texts: {
    aller_au_contenu: "Aller au contenu",
    navigation_principale: "Navigation principale",
    accueil: "Youdom Care, accueil",
    menu: "Menu",
    fermer_menu: "Fermer le menu",
    appeler: "Appeler le {téléphone}",
  },
};

describe("Header", () => {
  it("pose le lien d'évitement, la marque, le téléphone et le bouton principal", () => {
    render(<Header {...props} />);
    const skip = screen.getByRole("link", { name: "Aller au contenu" });
    expect(skip).toHaveAttribute("href", "#contenu");
    expect(screen.getByRole("link", { name: "Youdom Care, accueil" })).toHaveAttribute("href", "/");
    expect(screen.getAllByRole("link", { name: "Appeler le 01 84 80 17 03" })[0]).toHaveAttribute(
      "href",
      "tel:+33184801703",
    );
    expect(screen.getAllByRole("link", { name: "Être rappelé(e)" }).length).toBeGreaterThan(0);
  });

  it("ouvre un menu déroulant au clic, le ferme avec Échap et rend le focus au bouton", async () => {
    render(<Header {...props} />);
    const [desktopNav] = screen.getAllByRole("navigation", { name: "Navigation principale" });
    const button = within(desktopNav).getByRole("button", { name: "Pour qui ?" });
    expect(button).toHaveAttribute("aria-expanded", "false");

    await userEvent.click(button);
    expect(button).toHaveAttribute("aria-expanded", "true");
    const link = within(desktopNav).getByRole("link", { name: /Personnes âgées/ });
    expect(link).toBeVisible();

    await userEvent.tab();
    expect(link).toHaveFocus();
    await userEvent.keyboard("{Escape}");
    expect(button).toHaveAttribute("aria-expanded", "false");
    expect(button).toHaveFocus();
  });

  it("ferme le menu quand le focus en sort", async () => {
    render(<Header {...props} />);
    const [desktopNav] = screen.getAllByRole("navigation", { name: "Navigation principale" });
    const button = within(desktopNav).getByRole("button", { name: "Pour qui ?" });
    await userEvent.click(button);
    expect(button).toHaveAttribute("aria-expanded", "true");
    await userEvent.tab();
    await userEvent.tab();
    await userEvent.tab();
    expect(button).toHaveAttribute("aria-expanded", "false");
  });

  it("propose un menu mobile avec les mêmes entrées", async () => {
    render(<Header {...props} />);
    const toggle = screen.getByRole("button", { name: "Menu" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    await userEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(toggle).toHaveAccessibleName("Fermer le menu");
    const panel = document.getElementById("menu-mobile");
    expect(panel).not.toHaveAttribute("hidden");
    expect(within(panel as HTMLElement).getByText("Pour qui ?")).toBeInTheDocument();
    await userEvent.keyboard("{Escape}");
    expect(toggle).toHaveAttribute("aria-expanded", "false");
  });

  it("masque le téléphone quand il est inconnu", () => {
    render(<Header {...props} phone={null} />);
    expect(screen.queryByRole("link", { name: /Appeler le/ })).not.toBeInTheDocument();
  });
});
