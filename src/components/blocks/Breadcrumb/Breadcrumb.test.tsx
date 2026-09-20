import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Breadcrumb } from "./Breadcrumb";

const texts = { nom: "Fil d’Ariane", accueil: "Accueil" };

describe("Breadcrumb", () => {
  it("rend une navigation nommée, l'accueil en tête et la page courante sans lien", () => {
    render(
      <Breadcrumb
        texts={texts}
        items={[
          { label: "Personnes âgées", href: "/personnes-agees/" },
          { label: "Aide à l’autonomie" },
        ]}
      />,
    );
    const nav = screen.getByRole("navigation", { name: "Fil d’Ariane" });
    const items = within(nav).getAllByRole("listitem");
    expect(items).toHaveLength(3);
    expect(within(nav).getByRole("link", { name: "Accueil" })).toHaveAttribute("href", "/");
    expect(within(nav).getByRole("link", { name: "Personnes âgées" })).toHaveAttribute(
      "href",
      expect.stringMatching(/^\/personnes-agees\/?$/),
    );
    const current = within(nav).getByText("Aide à l’autonomie");
    expect(current).toHaveAttribute("aria-current", "page");
    expect(current.tagName).toBe("SPAN");
  });

  it("émet un BreadcrumbList JSON-LD aux adresses absolues, page courante sans adresse", () => {
    const { container } = render(
      <Breadcrumb
        texts={texts}
        items={[
          { label: "Personnes âgées", href: "/personnes-agees/" },
          { label: "Aide à l’autonomie" },
        ]}
      />,
    );
    const script = container.querySelector('script[type="application/ld+json"]');
    expect(script).not.toBeNull();
    expect(JSON.parse(script?.textContent ?? "")).toEqual({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Accueil", item: "https://www.youdom-care.com/" },
        {
          "@type": "ListItem",
          position: 2,
          name: "Personnes âgées",
          item: "https://www.youdom-care.com/personnes-agees/",
        },
        { "@type": "ListItem", position: 3, name: "Aide à l’autonomie" },
      ],
    });
  });

  it("construit les adresses sur `siteUrl` quand il est donné", () => {
    const { container } = render(
      <Breadcrumb
        texts={texts}
        siteUrl="https://preview.example.org/"
        items={[{ label: "Contact", href: "/contact/" }]}
      />,
    );
    const script = container.querySelector('script[type="application/ld+json"]');
    expect(script?.textContent).toContain("https://preview.example.org/contact/");
    expect(script?.textContent).not.toContain("youdom-care.com");
  });
});
