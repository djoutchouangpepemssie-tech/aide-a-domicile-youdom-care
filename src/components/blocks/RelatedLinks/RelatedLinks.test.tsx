import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { RelatedLink } from "@/lib/seo/related";
import { RelatedLinks } from "./RelatedLinks";

const links: RelatedLink[] = [
  {
    href: "/maladies-neurodegeneratives/parkinson/",
    label: "Parkinson",
    icone: "marche",
    public: "neuro",
    type: "pathologie",
    tier: "famille",
  },
  {
    href: "/services/garde-de-nuit/",
    label: "Garde de nuit",
    icone: "nuit",
    public: "transverse",
    type: "service",
    tier: "transverse",
  },
  {
    href: "/aidants/",
    label: "Aidants",
    icone: "inconnue",
    public: "aidant",
    type: "pilier",
    tier: "piliers",
  },
];

const publics = {
  neuro: "Maladies neurodégénératives",
  transverse: "Nos services",
  aidant: "Aidants",
};

describe("RelatedLinks", () => {
  it("rend une navigation nommée, des cartes-liens avec icône, chevron et public quand il diffère", () => {
    render(
      <RelatedLinks
        id="a-lire-aussi"
        title="À lire aussi"
        links={links}
        publics={publics}
        current="neuro"
      />,
    );
    const nav = screen.getByRole("navigation", { name: "À lire aussi" });
    expect(within(nav).getByRole("heading", { level: 2 })).toHaveAttribute("id", "a-lire-aussi");
    const items = within(nav).getAllByRole("link");
    expect(items).toHaveLength(3);
    // Même public : pas de rappel du public ; l'icône de la page cible est là.
    const parkinson = within(nav).getByRole("link", { name: "Parkinson" });
    expect(parkinson).toHaveAttribute(
      "href",
      expect.stringMatching(/^\/maladies-neurodegeneratives\/parkinson\/?$/),
    );
    expect(parkinson.querySelector('[data-icon="marche"]')).not.toBeNull();
    expect(parkinson).toHaveAttribute("data-tier", "famille");
    // Autre public : le nom du public sous le titre fait partie du nom du lien.
    const nuit = within(nav).getByRole("link", { name: /Garde de nuit/ });
    expect(nuit).toHaveTextContent("Nos services");
    expect(nuit.querySelector('[data-icon="nuit"]')).not.toBeNull();
    // Un pilier porte déjà le nom de son public : pas de doublon ; une icône inconnue est ignorée.
    const aidants = within(nav).getByRole("link", { name: "Aidants" });
    expect(aidants.querySelector("[data-icon]")).toBeNull();
    // Cartes inclinables et révélées, sans rien de caché au rendu.
    expect(nav.querySelectorAll(".m-tilt")).toHaveLength(3);
    expect(nav.querySelector(".m-reveal--stagger")).not.toBeNull();
    expect(nav.querySelectorAll("[data-reveal]")).toHaveLength(0);
  });

  it("ne rend rien sans lien", () => {
    const { container } = render(<RelatedLinks id="x" title="À lire aussi" links={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
