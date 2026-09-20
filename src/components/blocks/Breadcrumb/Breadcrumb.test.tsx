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
});
