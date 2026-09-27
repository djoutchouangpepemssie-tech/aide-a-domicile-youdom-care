import { fireEvent, render, screen, within } from "@testing-library/react";
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
    {
      id: "services",
      libelle: "Nos services",
      libelle_court: "Services",
      enfants: [{ libelle: "Garde de nuit", href: "/services/garde-de-nuit/" }],
    },
    {
      id: "tarifs",
      libelle: "Tarifs et aides",
      libelle_court: "Tarifs",
      href: "/tarifs-et-aides/",
    },
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

  it("ferme le menu mobile quand la tabulation en sort vers la page (focus non masqué)", async () => {
    render(
      <>
        <Header {...props} />
        <button type="button">Contenu de la page</button>
      </>,
    );
    const toggle = screen.getByRole("button", { name: "Menu" });
    await userEvent.click(toggle);
    const panel = document.getElementById("menu-mobile") as HTMLElement;
    const links = within(panel).getAllByRole("link");
    const last = links[links.length - 1] as HTMLElement;
    last.focus();
    // Le focus passe à un lien du panneau : le menu reste ouvert.
    fireEvent.focusOut(toggle, { relatedTarget: last });
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    // Le focus quitte l'en-tête : le menu se ferme.
    const outside = screen.getByRole("button", { name: "Contenu de la page" });
    fireEvent.focusOut(last, { relatedTarget: outside });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
  });

  it("affiche les libellés courts dans la barre, les complets ailleurs", async () => {
    render(<Header {...props} />);
    const [desktopNav] = screen.getAllByRole("navigation", { name: "Navigation principale" });
    const nav = desktopNav as HTMLElement;

    // Barre : texte court visible, libellé complet comme nom accessible.
    const tarifs = within(nav).getByRole("link", { name: "Tarifs et aides" });
    expect(tarifs).toHaveTextContent(/^Tarifs$/);
    const services = within(nav).getByRole("button", { name: "Nos services" });
    expect(services).toHaveTextContent(/^Services$/);
    // Sans libellé court : pas d'aria-label redondant.
    expect(within(nav).getByRole("button", { name: "Pour qui ?" })).not.toHaveAttribute(
      "aria-label",
    );

    // Menu mobile : libellés complets, aucun libellé court.
    await userEvent.click(screen.getByRole("button", { name: "Menu" }));
    const panel = document.getElementById("menu-mobile") as HTMLElement;
    expect(within(panel).getByText("Nos services")).toBeInTheDocument();
    expect(within(panel).getByRole("link", { name: "Tarifs et aides" })).toHaveTextContent(
      /^Tarifs et aides$/,
    );
    expect(within(panel).queryByText("Services")).not.toBeInTheDocument();
  });

  it("place le mode confort compact dans la barre et complet dans le menu mobile", () => {
    render(
      <Header
        {...props}
        comfortSlot={<button type="button">Confort complet</button>}
        comfortSlotCompact={<button type="button">Confort compact</button>}
      />,
    );
    expect(screen.getByRole("button", { name: "Confort compact" })).toBeInTheDocument();
    // Le panneau mobile est `hidden` tant que le menu est fermé : on l'interroge quand même.
    const panel = document.getElementById("menu-mobile") as HTMLElement;
    expect(
      within(panel).getByRole("button", { name: "Confort complet", hidden: true }),
    ).toBeInTheDocument();
    expect(within(panel).queryByText("Confort compact")).not.toBeInTheDocument();
  });

  it("masque le téléphone quand il est inconnu", () => {
    render(<Header {...props} phone={null} />);
    expect(screen.queryByRole("link", { name: /Appeler le/ })).not.toBeInTheDocument();
  });

  it("habille l'en-tête de verre et donne 44 px de haut au lien de marque (P9.6)", () => {
    render(<Header {...props} />);
    const header = screen.getByRole("banner");
    // `glass` au repos, `glass-strong` seulement au défilement (data-compact="true").
    expect(header).toHaveClass("glass", "glass-edge");
    expect(header).not.toHaveClass("glass-strong");
    expect(header).toHaveAttribute("data-compact", "false");
    expect(header).toHaveAttribute("data-edge", "bottom");
    expect(screen.getByRole("link", { name: "Youdom Care, accueil" })).toHaveClass("min-h-11");
    // Le panneau du menu réserve la place de la barre d'action mobile.
    const panel = document.getElementById("menu-mobile") as HTMLElement;
    expect(panel).toHaveClass("glass-strong");
    expect(panel.firstElementChild).toHaveClass(
      "pb-[calc(4rem+env(safe-area-inset-bottom))]",
      "lg:pb-4",
    );
  });
});
