import { expect, test } from "@playwright/test";
import { expectNoSeriousAxeViolations } from "./axe";

test.describe("Tarifs et aides (P2.6)", () => {
  test("sans tarif : aucun prix affiché, devis gratuit, six aides, axe", async ({ page }) => {
    const response = await page.goto("/tarifs-et-aides/");
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    await expect(page.locator("[data-block=tarifs]")).toHaveCount(0);
    await expect(page.locator("main")).not.toContainText("€");
    await expect(page.getByRole("note", { name: "Un devis gratuit et détaillé" })).toBeVisible();
    await expect(
      page.getByRole("region", { name: /Les aides qui réduisent/ }).locator("article"),
    ).toHaveCount(6);
    await expectNoSeriousAxeViolations(page);
  });
});
