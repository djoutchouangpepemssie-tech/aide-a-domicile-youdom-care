import { expect, test } from "@playwright/test";
import { expectNoSeriousAxeViolations } from "./axe";

test.describe("Pied de page et barre mobile (P1.6)", () => {
  test("le pied de page expose coordonnées, agences et mentions, et passe axe", async ({
    page,
  }) => {
    await page.goto("/");
    const footer = page.getByRole("contentinfo");
    await expect(footer).toBeVisible();
    await expect(footer.getByRole("link", { name: "01 84 80 17 03" })).toHaveAttribute(
      "href",
      "tel:+33184801703",
    );
    await expect(footer.getByRole("heading", { name: "Nos agences" })).toBeVisible();
    await expect(
      footer.getByRole("link", { name: /Voir l’agence Youdom Care Paris/ }),
    ).toHaveAttribute("href", "/agences/paris-12/");
    await expect(footer.getByRole("link", { name: "Mentions légales" })).toBeVisible();
    await expect(footer.getByText("Vous, chez vous. Nous, à vos côtés.")).toBeVisible();
    await expect(footer.getByText("Labels et adhésions")).toHaveCount(0);
    await expectNoSeriousAxeViolations(page);
  });

  test("la barre mobile est visible sur petit écran et se retire sur un champ actif", async ({
    page,
    isMobile,
  }) => {
    test.skip(!isMobile, "barre réservée aux petits écrans");
    await page.goto("/styleguide/");
    // Sélecteur CSS : une fois `inert`, la barre sort de l'arbre d'accessibilité (plus de rôle).
    const bar = page.locator('nav[aria-label="Actions rapides"]');
    await expect(bar).toBeVisible();
    await expect(bar.getByRole("link", { name: "Appeler" })).toHaveAttribute(
      "href",
      "tel:+33184801703",
    );
    await page.getByLabel("Votre prénom").focus();
    await expect(bar).toHaveAttribute("data-field-active", "true");
    await expect(bar).toHaveAttribute("inert", "");
    await page.getByLabel("Votre prénom").blur();
    await expect(bar).toHaveAttribute("data-field-active", "false");
    await expect(bar.getByRole("link", { name: "Ma demande" })).toBeVisible();
  });

  test("la barre mobile est absente sur grand écran", async ({ page, isMobile }) => {
    test.skip(isMobile, "grands écrans seulement");
    await page.goto("/");
    await expect(page.getByRole("navigation", { name: "Actions rapides" })).toBeHidden();
  });
});
