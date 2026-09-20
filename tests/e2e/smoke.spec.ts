import { expect, test } from "@playwright/test";
import { expectNoSeriousAxeViolations } from "./axe";

test.describe("Fumée", () => {
  test("l'accueil répond, est en français et passe axe", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("lang", "fr");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Youdom Care");
    await expectNoSeriousAxeViolations(page);
  });

  test("le guide de styles est en noindex et passe axe", async ({ page }) => {
    await page.goto("/styleguide/");
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Guide de styles");
    await expectNoSeriousAxeViolations(page);
  });
});
