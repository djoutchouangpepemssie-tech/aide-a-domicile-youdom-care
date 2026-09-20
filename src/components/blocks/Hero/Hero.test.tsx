import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Hero } from "./Hero";

const props = {
  surtitle: "Aide et accompagnement à domicile · Paris et Île-de-France",
  title: "Vivre chez soi, bien accompagné.",
  lead: "Chaque situation est unique.",
  primary: { label: "Être rappelé(e)", href: "/etre-rappele/" },
  secondary: { label: "Je décris ma situation", href: "/demande/" },
  phone: { label: "Ou appelez le 01 84 80 17 03", href: "tel:+33184801703" },
  reassurance: ["Évaluation à domicile gratuite", "Sans engagement"],
  footnote: { text: "* Selon les conditions.", href: "/tarifs-et-aides/" },
};

describe("Hero", () => {
  it("rend le H1, le chapô, les deux boutons, le téléphone et la réassurance", () => {
    render(<Hero {...props} />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Vivre chez soi, bien accompagné.",
    );
    expect(
      screen.getByText("Aide et accompagnement à domicile · Paris et Île-de-France"),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Être rappelé(e)" })).toHaveClass("bg-action");
    expect(screen.getByRole("link", { name: "Je décris ma situation" })).toHaveClass(
      "border-teal-700",
    );
    expect(screen.getByRole("link", { name: "Ou appelez le 01 84 80 17 03" })).toHaveAttribute(
      "href",
      "tel:+33184801703",
    );
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    expect(screen.getByRole("link", { name: "* Selon les conditions." })).toBeInTheDocument();
    expect(document.querySelector("svg.thread")).toHaveAttribute("data-illustration", "maison");
  });

  it("masque le téléphone inconnu", () => {
    render(<Hero {...props} phone={null} />);
    expect(screen.queryByRole("link", { name: /appelez/ })).not.toBeInTheDocument();
  });
});
