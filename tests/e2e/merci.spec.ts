import { expect, test } from "@playwright/test";
import { expectNoSeriousAxeViolations } from "./axe";

test.describe("Page merci (P3.4)", () => {
  test("répond, reste en noindex, propose le téléphone et passe axe", async ({ page }) => {
    const response = await page.goto("/merci/rappel/");
    expect(response?.status()).toBe(200);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Merci. Votre demande est arrivée.",
    );
    await expect(page.getByRole("link", { name: "01 84 80 17 03" }).first()).toBeVisible();
    await expect(page.getByRole("region", { name: "Ce qui va se passer" })).toBeVisible();
    await expectNoSeriousAxeViolations(page);
  });

  test("un formulaire inconnu renvoie 404", async ({ page }) => {
    const response = await page.goto("/merci/inconnu/");
    expect(response?.status()).toBe(404);
  });
});
