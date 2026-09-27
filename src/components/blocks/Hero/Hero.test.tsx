import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PhotoFigure } from "@/components/ui/PhotoFigure/PhotoFigure";
import { Hero } from "./Hero";
import { HeroSection } from "./HeroSection";

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
    // Sans média : ni profondeur, ni fil de hero.
    expect(document.querySelector(".m-depth")).toBeNull();
    expect(document.querySelector(".hero-thread")).toBeNull();
  });

  it("garde l'action framboise à toutes les tailles ; le lien secondaire et le téléphone se retirent en compaction", () => {
    render(<Hero {...props} />);
    const primary = screen.getByRole("link", { name: "Être rappelé(e)" });
    // Le bouton principal n'est plus masqué sous 64 rem (D-032 : on doit pouvoir agir sans défiler).
    expect(primary.parentElement).toHaveAttribute("data-hero-primary");
    expect(primary.parentElement?.className).not.toContain("hidden");
    const secondary = screen.getByRole("link", { name: "Je décris ma situation" });
    expect(secondary.parentElement).toHaveClass("max-lg:hidden");
    expect(screen.getByRole("link", { name: "Ou appelez le 01 84 80 17 03" })).toHaveClass(
      "max-lg:hidden",
    );
  });

  it("porte l'interaction immédiate dans un panneau de verre, sans flou écrit à la main", () => {
    render(
      <Hero
        {...props}
        tint="framboise"
        gesture={<button type="button">Pour un parent âgé</button>}
      />,
    );
    const panel = document.querySelector("[data-hero-interaction] .hero-panel");
    expect(panel).not.toBeNull();
    // Le verre vient des classes du design system : mode confort et mouvement réduit les
    // aplatissent (src/styles/glass.css). Rien n'est flouté ici à la main.
    expect(panel).toHaveClass("glass", "glass-tint-framboise", "glass-edge", "glass-sheen");
    const hero = document.querySelector(".hero");
    expect(hero?.innerHTML).not.toMatch(/backdrop-blur|blur-|backdrop-filter/);
    expect(
      screen.getByRole("button", { name: "Pour un parent âgé" }).closest("[data-hero-interaction]"),
    ).not.toBeNull();
  });

  it("marque l'interaction dans le chapô quand elle y vit (sélecteur de lecteur)", () => {
    render(
      <Hero
        {...props}
        interaction="lead"
        lead={<button type="button">pour un proche</button>}
        gesture={null}
      />,
    );
    const zone = screen
      .getByRole("button", { name: "pour un proche" })
      .closest("[data-hero-interaction]");
    expect(zone).not.toBeNull();
    expect(zone).toHaveClass("hero-panel");
  });

  it("compacte la scène : sur-titre, photo, réassurance et note se retirent, le panneau se plafonne", () => {
    render(
      <Hero
        {...props}
        media={photo}
        gesture={<button type="button">Pour un parent âgé</button>}
        cue={{ label: "Que vivez-vous en ce moment ?", href: "#situations" }}
      />,
    );
    // Photo : à partir de 64 rem seulement, et jamais sous 42 rem de hauteur visible.
    expect(document.querySelector(".hero-media")).toHaveClass(
      "max-lg:hidden",
      "[@media(max-height:42rem)]:hidden",
    );
    expect(document.querySelector("[data-hero-surtitle]")).toHaveClass("max-lg:hidden");
    expect(document.querySelector("[data-hero-reassurance]")).toHaveClass("max-lg:hidden");
    // Panneau : plafonné et défilable quand la hauteur manque, jamais amputé de ses choix.
    const panel = document.querySelector(".hero-panel");
    expect(panel?.className).toContain("[@media(max-height:36rem)]:max-h-[22svh]");
    expect(panel).toHaveClass("overflow-y-auto");
    // Titre et chapô suivent la hauteur visible, sans redéfinir les jetons du site.
    expect(document.querySelector(".hero")?.className).toContain(
      "[@media(max-height:36rem)]:[--text-h1:1.375rem]",
    );
  });

  it("affiche le repère de défilement : une ligne qui dit ce qu'on trouve plus bas, et son ancre", () => {
    render(
      <Hero {...props} cue={{ label: "Que vivez-vous en ce moment ?", href: "#situations" }} />,
    );
    const cue = screen.getByRole("link", { name: "Que vivez-vous en ce moment ?" });
    expect(cue).toHaveAttribute("href", "#situations");
    expect(cue).toHaveAttribute("data-hero-cue");
    // La flèche ne bouge qu'au survol et au focus, et pas du tout en mouvement réduit.
    const arrow = cue.querySelector("svg");
    expect(arrow).toHaveClass("motion-reduce:transition-none");
    expect(arrow).toHaveAttribute("aria-hidden", "true");
  });

  it("pose la scène colorée et la hauteur visible sur la section du hero", () => {
    render(
      <HeroSection scene="framboise" aria-label="Aidants">
        <p>bannière</p>
      </HeroSection>,
    );
    const section = document.querySelector("[data-hero-section]");
    expect(section).toHaveAttribute("data-scene", "framboise");
    expect(section).toHaveClass("scene", "scene-framboise", "scene-soutenu");
    expect(section?.className).toContain("min-h-[calc(100svh-var(--hero-chrome))]");
    expect(section?.querySelector(".container-site")).not.toBeNull();
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

  it("avec média : fil générique et profondeur 2° par défaut, réglables ou retirés", () => {
    const { rerender } = render(<Hero {...props} media={photo} />);
    const thread = document.querySelector(".hero-media .hero-thread");
    expect(thread).toHaveAttribute("data-fil", "generique");
    expect(thread).toHaveAttribute("data-state", "idle");
    expect(thread).toHaveClass("text-teal-700");
    expect(document.querySelector(".hero-thread .m-depth")).toHaveAttribute("data-max-deg", "2");
    expect(document.querySelector(".hero-thread__knot")).toHaveStyle({ left: "50%", top: "50%" });
    expect(
      screen.getByRole("img", { name: "Une pièce claire avec une table et deux chaises" }),
    ).toBeInTheDocument();

    rerender(
      <Hero
        {...props}
        media={photo}
        tone="sombre"
        depth={2}
        thread={{ fil: "tasse", knot: "62% 48%" }}
      />,
    );
    const tasse = document.querySelector(".hero-thread");
    expect(tasse).toHaveAttribute("data-fil", "tasse");
    expect(tasse).toHaveClass("text-white");
    expect(document.querySelector(".hero-thread .m-depth")).toHaveAttribute("data-max-deg", "2");
    expect(document.querySelector(".hero-thread__knot")).toHaveStyle({ left: "62%", top: "48%" });

    rerender(<Hero {...props} media={photo} depth={0} thread={null} />);
    expect(document.querySelector(".hero-thread")).toBeNull();
    expect(document.querySelector(".hero-media .m-depth")).toHaveAttribute("data-max-deg", "0");
    expect(
      screen.getByRole("img", { name: "Une pièce claire avec une table et deux chaises" }),
    ).toBeInTheDocument();
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
