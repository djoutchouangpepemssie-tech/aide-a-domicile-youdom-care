import { render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import EditorialCharterPage, {
  generateMetadata as charterMetadata,
} from "./charte-editoriale/page";
import CommitmentsPage, { generateMetadata as commitmentsMetadata } from "./nos-engagements/page";
import AboutPage, { generateMetadata as aboutMetadata } from "./page";

function expectSeo(metadata: { title?: unknown; description?: unknown }) {
  expect(String(metadata.title).length).toBeGreaterThanOrEqual(50);
  expect(String(metadata.title).length).toBeLessThanOrEqual(60);
  expect(String(metadata.description).length).toBeGreaterThanOrEqual(140);
  expect(String(metadata.description).length).toBeLessThanOrEqual(155);
}

describe("À propos", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("les trois pages ont des balises SEO aux longueurs de docs/01 §8", async () => {
    expectSeo(aboutMetadata());
    expectSeo(commitmentsMetadata());
    expectSeo(charterMetadata());
  });

  it("rend le manifeste, les engagements, le territoire et masque histoire et équipe", async () => {
    render(await AboutPage());
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Ce que nous croyons");
    const manifeste = screen.getByRole("region", { name: "Notre manifeste" });
    expect(manifeste).toHaveTextContent("Nous croyons que personne ne devrait avoir à choisir");
    expect(manifeste).toHaveTextContent("Vous, chez vous. Nous, à vos côtés.");
    expect(
      within(screen.getByRole("region", { name: "Nos engagements" })).getAllByRole("listitem"),
    ).toHaveLength(4);
    expect(screen.queryByRole("region", { name: /histoire/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("region", { name: /équipe/i })).not.toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Où nous intervenons" })).toHaveTextContent(
      "6 agences",
    );
    expect(screen.queryByText("Labels et adhésions")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Lire notre charte éditoriale" })).toHaveAttribute(
      "href",
      expect.stringMatching(/^\/a-propos\/charte-editoriale\/?$/),
    );
  });

  it("nos engagements : quatre en prévisualisation, le seul validé en production", async () => {
    const { unmount } = render(await CommitmentsPage());
    expect(document.querySelectorAll("[data-engagement]")).toHaveLength(4);
    expect(
      screen.getByRole("region", { name: "Le suivi que vous pouvez lire" }),
    ).toBeInTheDocument();
    unmount();

    // E2 est validé depuis le 27/09/2026 : c'est le seul engagement affiché en production.
    vi.stubEnv("VERCEL_ENV", "production");
    render(await CommitmentsPage());
    const shown = document.querySelectorAll("[data-engagement]");
    expect(shown).toHaveLength(1);
    expect(shown[0]).toHaveTextContent("Si l'intervenant ne convient pas, nous changeons");
  });

  it("charte éditoriale : huit principes et un moyen de contact", async () => {
    render(await EditorialCharterPage());
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("informer, jamais soigner");
    expect(document.querySelectorAll("[data-principes] > li")).toHaveLength(8);
    expect(screen.getByRole("link", { name: "contact@youdom-care.com" })).toHaveAttribute(
      "href",
      "mailto:contact@youdom-care.com",
    );
  });
});
