import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { LexiqueTerm } from "@/content/lexique-schema";
import { getInterfaceTexts, getNavigation } from "@/content/loader";
import { LexiqueTemplate, type LexiqueTemplateData } from "./LexiqueTemplate";

const term: LexiqueTerm = {
  slug: "apa",
  terme: "APA",
  developpe: "Allocation personnalisée d'autonomie",
  variantes: ["allocation personnalisée d'autonomie"],
  seo: {
    titre: "APA : définition, conditions et démarche de l'allocation",
    description:
      "L'APA, allocation personnalisée d'autonomie, en clair : pour qui après 60 ans, ce qu'elle finance à domicile et comment la demander au département.",
  },
  definition: "L'APA est une aide versée par le département.",
  explication: Array.from({ length: 125 }, (_, i) => `mot${i}`).join(" "),
  pour_qui: "Les personnes de 60 ans et plus.",
  lien_officiel: {
    libelle: "service-public.gouv.fr — Allocation personnalisée d'autonomie",
    href: "https://www.service-public.gouv.fr/particuliers/vosdroits/F10009",
    verifie_le: "2026-06-01",
    consulte_le: "2026-09-27",
  },
  pages_liees: ["/tarifs-et-aides/apa/", "/personnes-agees/"],
  maj: "2026-09-27",
};

function data(overrides: Partial<LexiqueTemplateData> = {}): LexiqueTemplateData {
  const texts = getInterfaceTexts();
  const navigation = getNavigation();
  return {
    term,
    Body: () => <p>Explication compilée.</p>,
    texts: texts.lexique,
    breadcrumb: texts.fil_ariane,
    lexiqueAriane: "Lexique",
    sources: {
      source_verifiee: texts.page_aide.source_verifiee,
      source_consultee: texts.page_aide.source_consultee,
      lien_externe: texts.aides.lien_externe,
    },
    linked: [
      { href: "/tarifs-et-aides/apa/", label: "APA" },
      { href: "/personnes-agees/", label: "Personnes âgées" },
    ],
    neighbours: [
      { slug: "gir-et-grille-aggir", terme: "GIR et grille AGGIR", definition: "La grille." },
      { slug: "pch", terme: "PCH", developpe: "Prestation de compensation", definition: "La PCH." },
    ],
    appel: { h2: "Un mot vous manque ?", texte: "Appelez-nous." },
    buttons: { rappel: texts.boutons.rappel, demande: texts.boutons.demande_detaillee },
    navigation: { rappel_href: navigation.rappel_href, demande_href: navigation.demande_href },
    ...overrides,
  };
}

/** `next/link` retire la barre finale hors de Next : on compare sans elle. */
const bare = (value: string | null) => (value ?? "").replace(/\/$/, "");

describe("LexiqueTemplate", () => {
  it("rend le fil d'Ariane, un seul H1 (terme et développé), la définition et la date", () => {
    render(<LexiqueTemplate data={data()} />);
    const crumbs = screen.getByRole("navigation", { name: "Fil d’Ariane" });
    expect(within(crumbs).getByRole("link", { name: "Lexique" })).toBeInTheDocument();
    const headings = screen.getAllByRole("heading", { level: 1 });
    expect(headings).toHaveLength(1);
    expect(headings[0]).toHaveTextContent("APA");
    expect(headings[0]).toHaveTextContent("Allocation personnalisée d'autonomie");
    expect(screen.getByText("L'APA est une aide versée par le département.")).toHaveClass("lead");
    expect(screen.getByText("Définition mise à jour le 27 septembre 2026")).toBeInTheDocument();
    expect(screen.getByText("Explication compilée.")).toBeInTheDocument();
  });

  it("montre « Pour qui ? », la source officielle datée sans lien, les pages liées et les voisins", () => {
    render(<LexiqueTemplate data={data()} />);
    expect(screen.getByRole("region", { name: "Pour qui ?" })).toHaveTextContent(
      "Les personnes de 60 ans et plus.",
    );
    const official = screen.getByRole("region", { name: "Le texte officiel" });
    // 27/09/2026, demande d'Arcel : la source officielle est nommée et datée, sans lien sortant.
    expect(within(official).queryByRole("link")).toBeNull();
    expect(official.querySelector('a[href^="http"]')).toBeNull();
    expect(official).toHaveTextContent(term.lien_officiel.libelle);
    expect(official).toHaveTextContent("vérifiée le 1 juin 2026");
    expect(official).toHaveTextContent("consultée le 27 septembre 2026");

    const linked = screen.getByRole("navigation", { name: "Sur ce site" });
    const linkedHrefs = within(linked)
      .getAllByRole("link")
      .map((a) => bare(a.getAttribute("href")));
    expect(linkedHrefs).toEqual(["/tarifs-et-aides/apa", "/personnes-agees"]);

    const neighbours = screen.getByRole("navigation", { name: "Termes voisins" });
    expect(within(neighbours).getByRole("link", { name: "PCH" })).toHaveAttribute(
      "href",
      expect.stringContaining("/lexique/pch"),
    );
    expect(neighbours).toHaveTextContent("Prestation de compensation");
    expect(screen.getByRole("link", { name: "Tout le lexique" })).toHaveAttribute(
      "href",
      expect.stringContaining("/lexique"),
    );
  });

  it("masque les blocs vides, garde le rail de conversation et l'appel final sans formulaire", () => {
    render(<LexiqueTemplate data={data({ linked: [], neighbours: [] })} />);
    expect(screen.queryByRole("navigation", { name: "Sur ce site" })).toBeNull();
    expect(screen.queryByRole("navigation", { name: "Termes voisins" })).toBeNull();
    expect(screen.getByRole("complementary", { name: "Nous joindre" })).toBeInTheDocument();
    expect(screen.queryByRole("form")).toBeNull();
    const appel = screen.getByRole("region", { name: "Un mot vous manque ?" });
    expect(within(appel).getByRole("link", { name: "Être rappelé(e)" })).toBeInTheDocument();
    expect(within(appel).getByRole("link", { name: "Je décris ma situation" })).toBeInTheDocument();
  });
});
