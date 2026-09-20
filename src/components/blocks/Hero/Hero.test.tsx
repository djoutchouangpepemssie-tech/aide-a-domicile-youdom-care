import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PhotoFigure } from "@/components/ui/PhotoFigure/PhotoFigure";
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

const photo = (
  <PhotoFigure
    src="/images/exemples/exemple-hero.jpg"
    alt="Une pièce claire avec une table et deux chaises"
    ratio="4:5"
    mobileRatio="16:9"
    radius={28}
    priority
  />
);

/** Vrai si `a` précède `b` dans l'ordre du document (ordre de lecture mobile). */
function precedes(a: Element, b: Element): boolean {
  return (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;
}

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
    expect(document.querySelector(".hero")).toHaveAttribute("data-tone", "clair");
  });

  it("masque le téléphone inconnu", () => {
    render(<Hero {...props} phone={null} />);
    expect(screen.queryByRole("link", { name: /appelez/ })).not.toBeInTheDocument();
  });

  it("place la photo juste sous le H1 et le geste sous le chapô, sans illustration au fil", () => {
    render(<Hero {...props} media={photo} gesture={<button type="button">Pour moi</button>} />);
    const h1 = screen.getByRole("heading", { level: 1 });
    const img = screen.getByRole("img", {
      name: "Une pièce claire avec une table et deux chaises",
    });
    const lead = screen.getByText("Chaque situation est unique.");
    const gesture = screen.getByRole("button", { name: "Pour moi" });
    const primary = screen.getByRole("link", { name: "Être rappelé(e)" });
    expect(precedes(h1, img)).toBe(true);
    expect(precedes(img, lead)).toBe(true);
    expect(precedes(lead, gesture)).toBe(true);
    expect(precedes(gesture, primary)).toBe(true);
    expect(document.querySelector(".hero-media")).toHaveClass("lg:col-start-2", "lg:row-start-1");
    expect(document.querySelector(".photo-figure")).toHaveClass("aspect-video", "lg:aspect-[4/5]");
    expect(document.querySelector("svg.thread")).toBeNull();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(props.title);
  });

  it("ton sombre : texte blanc, fil blanc, bouton de contour blanc", () => {
    render(<Hero {...props} tone="sombre" />);
    expect(document.querySelector(".hero")).toHaveAttribute("data-tone", "sombre");
    expect(document.querySelector(".hero")).toHaveClass("text-white");
    expect(screen.getByRole("link", { name: "Je décris ma situation" })).toHaveClass(
      "border-white",
      "text-white",
    );
    expect(screen.getByRole("link", { name: "Ou appelez le 01 84 80 17 03" })).toHaveClass(
      "text-white",
    );
    expect(screen.getByRole("link", { name: "Être rappelé(e)" })).toHaveClass("bg-action");
    expect(document.querySelector("svg.thread")).toHaveClass("text-white");
  });
});
