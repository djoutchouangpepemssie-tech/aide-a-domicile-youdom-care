import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { getInterfaceTexts, getSiteConfig } from "@/content/loader";
import { getToolPage, listToolPages } from "@/content/tool-pages";
import { displayUrl, slugifyHeading, ToolSheet } from "./ToolSheet";

function renderTool(id: string) {
  const tool = getToolPage(id);
  if (!tool) throw new Error(`outil inconnu : ${id}`);
  const { outils, page_aide, aides } = getInterfaceTexts();
  const { marque } = getSiteConfig();
  return render(
    <ToolSheet
      tool={tool}
      brand={{ nom: marque.nom, url: marque.url }}
      texts={{
        outils,
        sources: {
          source_verifiee: page_aide.source_verifiee,
          source_consultee: page_aide.source_consultee,
          lien_externe: aides.lien_externe,
        },
      }}
    />,
  );
}

describe("ToolSheet", () => {
  it("rend la liste des 48 heures : en-tête, mode d'emploi, cases carrées, lignes, prudence, sources, pied de page", () => {
    const { container } = renderTool("sortie-d-hospitalisation-48-heures");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Sortie d'hospitalisation : la liste des 48 heures",
    );
    expect(screen.getByRole("heading", { level: 2, name: "Mode d'emploi" })).toBeInTheDocument();
    expect(screen.getByText(/Imprimez cette liste dès que la date de sortie/)).toBeInTheDocument();

    // Cases à cocher décoratives (le texte porte le sens) et lignes à remplir à la main.
    const boxes = container.querySelectorAll(".tool-box[aria-hidden='true']");
    expect(boxes.length).toBeGreaterThanOrEqual(20);
    const lines = container.querySelectorAll(".tool-line");
    expect(lines.length).toBeGreaterThanOrEqual(10);
    const numeros = screen.getByRole("region", {
      name: "Les numéros à garder près du téléphone",
    });
    expect(within(numeros).getByText("Médecin traitant")).toBeInTheDocument();
    expect(within(numeros).getByText("15 (SAMU) ou 112")).toBeInTheDocument();

    expect(screen.getByRole("note", { name: "Prudence" })).toHaveTextContent(/pharmacien/);
    const sources = screen.getByRole("region", { name: "Sources" });
    expect(within(sources).getByRole("link", { name: /Haute Autorité de santé/ })).toHaveAttribute(
      "href",
      "https://www.has-sante.fr/jcms/c_2035081/fr/check-list-de-sortie-d-hospitalisation-superieure-a-24h",
    );
    expect(within(sources).getAllByText(/consultée le 27 septembre 2026/)).toHaveLength(3);
    expect(within(sources).getByText(/vérifiée le 22 mai 2015/)).toBeInTheDocument();

    const footer = container.querySelector("footer");
    expect(footer).toHaveTextContent("Youdom Care");
    expect(footer).toHaveTextContent("www.youdom-care.com");
    expect(footer).toHaveTextContent("Document gratuit, sans contrepartie");
    expect(footer).toHaveTextContent("Mis à jour le 27 septembre 2026");
  });

  it("n'affiche jamais « null », « undefined » ni de jeton non remplacé, pour aucun outil", () => {
    for (const tool of listToolPages()) {
      const { container, unmount } = renderTool(tool.id);
      const text = container.textContent ?? "";
      expect(text).not.toMatch(/\bnull\b|\bundefined\b|\{[a-z_]+\}/);
      expect(container.querySelectorAll("h1")).toHaveLength(1);
      // Aucun saut de niveau : h1 puis h2 seulement.
      const levels = [...container.querySelectorAll("h1, h2, h3, h4")].map((h) =>
        Number(h.tagName.slice(1)),
      );
      expect(levels.every((level) => level <= 2)).toBe(true);
      unmount();
    }
  });

  it("un modèle de fiche de vie n'a que des champs à remplir, sans source et avec une note de prudence", () => {
    const { container } = renderTool("fiche-de-vie-enfant");
    expect(container.querySelectorAll(".tool-box")).toHaveLength(0);
    expect(container.querySelectorAll(".tool-line").length).toBeGreaterThanOrEqual(40);
    expect(screen.queryByRole("region", { name: "Sources" })).toBeNull();
    expect(screen.getByRole("note", { name: "Prudence" })).toHaveTextContent(/ordonnance/);
    expect(screen.getAllByText("Champs à remplir à la main").length).toBeGreaterThan(0);
  });

  it("le mémo des aides affiche les montants avec leur date de vérification", () => {
    renderTool("aides-en-un-coup-d-oeil");
    const apa = screen.getByRole("region", { name: "APA, l'allocation personnalisée d'autonomie" });
    expect(within(apa).getByText(/2 080,33 €/)).toBeInTheDocument();
    expect(within(apa).getByText(/vérifiés le 1er juin 2026/)).toBeInTheDocument();
  });

  it("aide : identifiants de section et adresse affichée", () => {
    expect(slugifyHeading("Les 48 premières heures")).toBe("les-48-premieres-heures");
    expect(slugifyHeading("Ce qui l'apaise, ce qui le met en difficulté")).toBe(
      "ce-qui-l-apaise-ce-qui-le-met-en-difficulte",
    );
    expect(displayUrl("https://www.youdom-care.com/")).toBe("www.youdom-care.com");
  });
});
