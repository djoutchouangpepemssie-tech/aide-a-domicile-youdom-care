import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import ThanksPage, { generateMetadata, generateStaticParams, successText } from "./page";

const params = (formulaire: string) => ({ params: Promise.resolve({ formulaire }) });

describe("Page merci", () => {
  it("existe pour les onze formulaires, en noindex, avec des balises SEO aux bonnes longueurs", async () => {
    expect(generateStaticParams()).toHaveLength(11);
    const metadata = await generateMetadata(params("rappel"));
    expect(metadata.robots).toEqual({ index: false, follow: false });
    expect(String(metadata.title).length).toBeLessThanOrEqual(60);
    expect(String(metadata.description).length).toBeGreaterThanOrEqual(140);
    expect(String(metadata.description).length).toBeLessThanOrEqual(155);
    expect(await generateMetadata(params("inconnu"))).toEqual({});
  });

  it("ne promet aucun délai tant qu'il n'est pas renseigné", () => {
    expect(successText()).toBe(
      "Merci. Votre demande est arrivée. Un conseiller vous rappelle dès que possible.",
    );
  });

  it("rend ce qui va se passer, le téléphone et deux lectures, sans détail de la demande", async () => {
    render(await ThanksPage(params("rappel")));
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Merci. Votre demande est arrivée.",
    );
    expect(screen.getByRole("link", { name: /01.84.80.17.03/ })).toHaveAttribute(
      "href",
      "tel:+33184801703",
    );
    expect(screen.getByRole("region", { name: "Ce qui va se passer" })).toBeInTheDocument();
    const lectures = screen.getByRole("region", { name: "En attendant notre appel" });
    expect(lectures.querySelectorAll("li")).toHaveLength(2);
    expect(document.body.textContent).not.toMatch(/maladie|diagnostic/i);
  });

  it("adapte le titre pour une candidature et n'affiche pas les étapes", async () => {
    render(await ThanksPage(params("candidature")));
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Votre candidature");
    expect(screen.queryByRole("region", { name: "Ce qui va se passer" })).toBeNull();
  });
});
