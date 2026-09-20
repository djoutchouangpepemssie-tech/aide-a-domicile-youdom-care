import { expect, test } from "@playwright/test";
import { expectNoSeriousAxeViolations } from "./axe";

test.describe("Fumée", () => {
  test("l'accueil répond, est en français et passe axe", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("lang", "fr-FR");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Vivre chez soi");
    await expectNoSeriousAxeViolations(page);
  });

  test("l'accueil porte titre, description, canonique absolue et Open Graph (P5.1)", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page).toHaveTitle("Aide à domicile spécialisée à Paris et en Île-de-France");
    await expect(page.locator('meta[name="description"]')).toHaveAttribute(
      "content",
      /Alzheimer, Parkinson, handicap, grand âge/,
    );
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      "https://www.youdom-care.com/",
    );
    await expect(page.locator('meta[property="og:locale"]')).toHaveAttribute("content", "fr_FR");
    await expect(page.locator('meta[property="og:url"]')).toHaveAttribute(
      "content",
      "https://www.youdom-care.com/",
    );
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
      "content",
      "Aide à domicile spécialisée à Paris et en Île-de-France",
    );
  });

  test("/llms.txt répond en texte brut et résume le site (P5.6)", async ({ request }) => {
    const response = await request.get("/llms.txt");
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toMatch(/^text\/plain; charset=utf-8/);
    const body = await response.text();
    expect(body.startsWith("# Youdom Care")).toBe(true);
    expect(body).toContain("https://www.youdom-care.com/comment-ca-marche/");
    expect(body).not.toContain("/merci/");
    expect(body).not.toContain("/styleguide/");
  });

  test("le guide de styles est en noindex et passe axe", async ({ page }) => {
    await page.goto("/styleguide/");
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Guide de styles");
    await expectNoSeriousAxeViolations(page);
  });
});
