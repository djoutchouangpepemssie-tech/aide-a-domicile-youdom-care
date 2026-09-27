import { expect, test } from "@playwright/test";
import { expectNoSeriousAxeViolations } from "./axe";

test.describe("Déclaration d'accessibilité (P8.4)", () => {
  test("/accessibilite/ : titre, H1, fil d'Ariane, sections du modèle RGAA, recours, axe", async ({
    page,
  }) => {
    const response = await page.goto("/accessibilite/");
    expect(response?.status()).toBe(200);
    await expect(page).toHaveTitle(/Accessibilité/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Déclaration d'accessibilité");
    await expect(page.getByRole("navigation", { name: "Fil d’Ariane" })).toBeVisible();
    for (const name of [
      "État de conformité",
      "Résultats des tests",
      "Contenus non accessibles",
      "Établissement de cette déclaration",
      "Retour d'information et contact",
      "Voies de recours",
    ]) {
      await expect(page.getByRole("heading", { level: 2, name })).toBeVisible();
    }
    await expect(page.locator("[data-statut]")).toHaveAttribute("data-statut", "non_conforme");
    await expect(page.locator("[data-statut]")).toContainText("non conforme");
    await expect(
      page.getByRole("link", { name: /Écrire au Défenseur des droits en ligne/ }),
    ).toHaveAttribute("href", /defenseurdesdroits\.fr/);
    // JSON-LD BreadcrumbList et canonique.
    const jsonLd = await page.locator('script[type="application/ld+json"]').allTextContents();
    expect(jsonLd.some((s) => s.includes('"BreadcrumbList"'))).toBe(true);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      /\/accessibilite\/$/,
    );
    await expectNoSeriousAxeViolations(page);
  });

  test("le pied de page et le plan du site mènent à la déclaration ; le lien d'évitement fonctionne au clavier", async ({
    page,
  }) => {
    await page.goto("/plan-du-site/");
    const footerLink = page
      .getByRole("contentinfo")
      .getByRole("link", { name: "Accessibilité", exact: true });
    await expect(footerLink).toHaveAttribute("href", /\/accessibilite\/?$/);
    const planLink = page
      .getByRole("main")
      .getByRole("link", { name: "Accessibilité", exact: true });
    await expect(planLink).toHaveAttribute("href", /\/accessibilite\/?$/);

    await page.goto("/accessibilite/");
    await page.keyboard.press("Tab");
    const skip = page.getByRole("link", { name: "Aller au contenu" });
    await expect(skip).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/#contenu$/);
    await page.keyboard.press("Tab");
    await expect(
      page.getByRole("navigation", { name: "Fil d’Ariane" }).getByRole("link", { name: "Accueil" }),
    ).toBeFocused();
  });
});
