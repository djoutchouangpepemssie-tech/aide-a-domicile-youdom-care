import { render, screen, within } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Callout } from "./Callout";

describe("Callout", () => {
  it("rend une note « À retenir » nommée par son titre", () => {
    render(
      <Callout>
        <p>Le prix TTC est toujours l’information principale.</p>
      </Callout>,
    );
    const note = screen.getByRole("note", { name: "À retenir" });
    expect(note).toHaveClass("glass", "glass-tint-teal");
    expect(note.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  });

  it("propose les quatre variantes du cahier", () => {
    render(
      <>
        <Callout variant="bon-a-savoir">a</Callout>
        <Callout variant="attention">b</Callout>
        <Callout variant="ne-faisons-pas">c</Callout>
      </>,
    );
    expect(screen.getByRole("note", { name: "Bon à savoir" })).toHaveClass("glass-tint-green");
    expect(screen.getByRole("note", { name: "Attention" })).toHaveClass("glass-tint-warning");
    expect(screen.getByRole("note", { name: "Ce que nous ne faisons pas" })).toHaveClass(
      "glass-tint-framboise",
    );
  });

  it("accepte un titre personnalisé", () => {
    render(
      <Callout variant="attention" title="Avant de partir">
        d
      </Callout>,
    );
    expect(screen.getByRole("note", { name: "Avant de partir" })).toBeInTheDocument();
  });

  it("variante frontiere : bloc sable au trait teal, deux colonnes quand un relais existe, ligne de fin", () => {
    render(
      <Callout
        variant="frontiere"
        subtitle="Et avec qui nous travaillons pour cela."
        columns={{ faits: "Nous ne faisons pas", relais: "Qui le fait" }}
        items={[
          {
            texte: "Les soins infirmiers et les actes médicaux.",
            relais: "les infirmiers, le SSIAD",
          },
          { texte: "Le ménage lourd." },
        ]}
        footer="Nous nous coordonnons avec ces acteurs ; nous ne les remplaçons pas."
        data-section="ne-faisons-pas"
      />,
    );
    const note = screen.getByRole("note", { name: "Ce que nous ne faisons pas" });
    expect(note).toHaveAttribute("data-variant", "frontiere");
    expect(note).toHaveClass("glass-tint-sable", "border-teal-700", "rounded-block");
    expect(note).not.toHaveClass("glass-tint-framboise");
    expect(note).toHaveAttribute("data-section", "ne-faisons-pas");
    expect(within(note).getByText("Et avec qui nous travaillons pour cela.")).toBeInTheDocument();

    const list = within(note).getByRole("list");
    const rows = within(list).getAllByRole("listitem");
    expect(rows).toHaveLength(2);
    // Une seule ligne sur deux nomme son relais : liste simple, pas de tableau troué (27/09/2026).
    expect(rows[0]).not.toHaveClass("md:grid-cols-2");
    expect(rows[0]).toHaveTextContent("Les soins infirmiers et les actes médicaux.");
    expect(rows[0]).toHaveTextContent("→ les infirmiers, le SSIAD");
    expect(rows[1]).not.toHaveTextContent("→");
    // Une icône croix ouverte par item (tracé sans Z), plus celle du titre
    const paths = Array.from(note.querySelectorAll("path"));
    expect(paths).toHaveLength(3);
    expect(paths.every((path) => !/z/i.test(path.getAttribute("d") ?? ""))).toBe(true);
    expect(
      within(note).getByText(
        "Nous nous coordonnons avec ces acteurs ; nous ne les remplaçons pas.",
      ),
    ).toHaveClass("text-small");
  });

  it("variante frontiere : une seule colonne sans relais, enfants libres, titre personnalisé", () => {
    render(
      <Callout variant="frontiere" title="Nos limites" items={[{ texte: "A" }, { texte: "B" }]}>
        <p>Précision.</p>
      </Callout>,
    );
    const note = screen.getByRole("note", { name: "Nos limites" });
    const rows = within(note).getAllByRole("listitem");
    expect(rows[0]).not.toHaveClass("md:grid-cols-2");
    expect(within(note).getByText("Précision.")).toBeInTheDocument();
    const html = renderToString(<Callout variant="frontiere" items={[{ texte: "A" }]} />);
    expect(html).toContain("Ce que nous ne faisons pas");
  });
});
