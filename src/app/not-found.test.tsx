import { render, screen, within } from "@testing-library/react";
import { beforeAll, describe, expect, it } from "vitest";
import NotFound, { generateMetadata } from "./not-found";

/* La page est asynchrone : les piliers viennent des en-têtes MDX construits. */
let notFound: Awaited<ReturnType<typeof NotFound>>;

beforeAll(async () => {
  notFound = await NotFound();
}, 60_000);

describe("Page introuvable (404)", () => {
  it("a un titre et une description aux bonnes longueurs, et n'est jamais indexée", () => {
    const metadata = generateMetadata();
    const title = String(metadata.title);
    expect(title.length).toBeGreaterThanOrEqual(50);
    expect(title.length).toBeLessThanOrEqual(60);
    expect(String(metadata.description).length).toBeGreaterThanOrEqual(140);
    expect(String(metadata.description).length).toBeLessThanOrEqual(155);
    expect(metadata.robots).toEqual({ index: false, follow: false });
    expect(metadata.alternates).toBeUndefined();
  });

  it("rend un seul H1 dans la voix, la recherche de commune, le téléphone, les cinq piliers avec icônes, le plan du site et le rappel", () => {
    render(notFound);
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Cette page n'existe pas, ou plus",
    );
    expect(
      screen.getByRole("navigation", { name: "Fil d’Ariane" }).querySelector("[aria-current=page]"),
    ).toHaveTextContent("Page introuvable");
    expect(
      screen.getByRole("combobox", { name: "Votre commune ou votre code postal" }),
    ).toBeInTheDocument();
    const tel = screen.getAllByRole("link", { name: /01.84.80.17.03/ });
    expect(tel.length).toBeGreaterThanOrEqual(2);
    for (const link of tel) expect(link).toHaveAttribute("href", "tel:+33184801703");

    const piliers = screen.getByRole("region", { name: "Pour qui cherchez-vous de l'aide ?" });
    const links = within(piliers).getAllByRole("link");
    expect(links.map((link) => link.textContent)).toEqual([
      "Maladies neurodégénératives",
      "Personnes âgées",
      "Adultes en situation de handicap",
      "Enfants en situation de handicap",
      "Aidants",
    ]);
    expect(links[0]).toHaveAttribute(
      "href",
      expect.stringMatching(/^\/maladies-neurodegeneratives\/?$/),
    );
    expect(piliers.querySelectorAll("a [data-icon]")).toHaveLength(5);
    expect(piliers.querySelector('[data-icon="public-aidants"]')).not.toBeNull();

    expect(screen.getByRole("link", { name: "Voir le plan du site" })).toHaveAttribute(
      "href",
      expect.stringMatching(/^\/plan-du-site\/?$/),
    );
    expect(screen.getByRole("link", { name: "Retour à l'accueil" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: "Être rappelé(e)" })).toHaveAttribute(
      "href",
      expect.stringMatching(/^\/etre-rappele\/?$/),
    );
    // Rien de caché au rendu (révélations), aucun jeton non remplacé.
    expect(document.querySelectorAll("[data-reveal]")).toHaveLength(0);
    expect(document.body.textContent).not.toMatch(/\{téléphone\}/);
  });
});
