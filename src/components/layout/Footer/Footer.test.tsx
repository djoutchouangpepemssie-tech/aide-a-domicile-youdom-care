import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Footer, type FooterProps } from "./Footer";

const agency = {
  id: "puteaux",
  nom: "Youdom Care Hauts-de-Seine",
  adresse: "49-51 quai de Dion-Bouton",
  code_postal: "92800",
  commune: "Puteaux",
  code_insee: "92062",
  departement: "92",
  telephone: null,
  horaires: null,
  coordonnees: null,
};

const props: FooterProps = {
  brandName: "Youdom Care",
  signature: "Vous, chez vous. Nous, à vos côtés.",
  phones: [{ display: "01 84 80 17 03", href: "tel:+33184801703" }],
  email: "contact@youdom-care.com",
  agencies: [agency],
  zones: [{ nom: "Paris", slug: "paris" }],
  audiences: [{ libelle: "Aidants", href: "/aidants/" }],
  services: [{ libelle: "Garde de nuit", href: "/services/garde-de-nuit/" }],
  company: [{ libelle: "À propos", href: "/a-propos/" }],
  legal: [{ libelle: "Mentions légales", href: "/mentions-legales/" }],
  labels: [],
  texts: {
    nous_joindre: "Nous joindre",
    nos_agences: "Nos agences",
    pour_qui: "Pour qui ?",
    nos_services: "Nos services",
    territoires: "Territoires",
    entreprise: "Youdom Care",
    labels: "Labels et adhésions",
    navigation_pied: "Pied de page",
    toutes_les_agences: "Toutes les agences",
    aide_a_domicile_en: "Aide à domicile en {territoire}",
    voir_agence: "Voir l’agence {nom}",
  },
};

describe("Footer", () => {
  it("rend le repère contentinfo avec coordonnées, colonnes, agences et mentions", () => {
    render(<Footer {...props} />);
    const footer = screen.getByRole("contentinfo");
    expect(within(footer).getByRole("link", { name: "01 84 80 17 03" })).toHaveAttribute(
      "href",
      "tel:+33184801703",
    );
    expect(within(footer).getByRole("link", { name: "contact@youdom-care.com" })).toHaveAttribute(
      "href",
      "mailto:contact@youdom-care.com",
    );
    expect(within(footer).getByRole("navigation", { name: "Territoires" })).toBeInTheDocument();
    // Hors du routeur Next (jsdom), Link normalise la barre finale : on tolère les deux formes.
    expect(within(footer).getByRole("link", { name: "Aide à domicile en Paris" })).toHaveAttribute(
      "href",
      expect.stringMatching(/^\/aide-a-domicile\/paris\/?$/),
    );
    expect(
      within(footer).getByRole("link", { name: /^Voir l’agence Youdom Care Hauts-de-Seine, / }),
    ).toHaveAttribute("href", expect.stringMatching(/^\/agences\/puteaux\/?$/));
    expect(
      within(footer).getByText(/49-51 quai de Dion-Bouton, 92800 Puteaux/),
    ).toBeInTheDocument();
    expect(within(footer).getByRole("link", { name: "Mentions légales" })).toBeInTheDocument();
    expect(within(footer).getByText("Vous, chez vous. Nous, à vos côtés.")).toBeInTheDocument();
    expect(footer).toHaveAttribute("data-print", "hide");
  });

  it("donne 44 px de haut à chaque lien de colonne et réserve la place de la barre d'action (P9.6)", () => {
    render(<Footer {...props} />);
    const footer = screen.getByRole("contentinfo");
    for (const name of [
      "01 84 80 17 03",
      "contact@youdom-care.com",
      "Aidants",
      "Garde de nuit",
      "Aide à domicile en Paris",
      "À propos",
      "Mentions légales",
    ]) {
      expect(within(footer).getByRole("link", { name }), name).toHaveClass("min-h-11");
    }
    // Marge basse : hauteur de la barre d'action mobile plus l'encoche, retirée à partir de 64 rem.
    const inner = footer.firstElementChild;
    expect(inner).toHaveClass("pb-[calc(3rem+4rem+env(safe-area-inset-bottom))]", "lg:pb-12");
  });

  it("n'affiche les labels que s'ils sont détenus, et masque l'e-mail inconnu", () => {
    const { rerender } = render(<Footer {...props} email={null} />);
    expect(screen.queryByText("Labels et adhésions")).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /@/ })).not.toBeInTheDocument();

    rerender(<Footer {...props} labels={[{ id: "cesu", nom: "CESU préfinancés acceptés" }]} />);
    expect(screen.getByText("Labels et adhésions")).toBeInTheDocument();
    expect(screen.getByText("CESU préfinancés acceptés")).toBeInTheDocument();
  });
});
