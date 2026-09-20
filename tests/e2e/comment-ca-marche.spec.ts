import { expect, test } from "@playwright/test";
import { expectNoSeriousAxeViolations } from "./axe";

test.describe("Comment ça marche (P2.4)", () => {
  test("la page répond, a un seul H1, ses repères, et passe axe", async ({ page }) => {
    const response = await page.goto("/comment-ca-marche/");
    expect(response?.status()).toBe(200);
    await expect(page).toHaveTitle(/Comment ça marche/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    await expect(page.getByRole("navigation", { name: "Fil d’Ariane" })).toBeVisible();
    await expect(page.locator(".steps-timeline li")).toHaveCount(4);
    await expect(page.locator(".follow-up-timeline li")).toHaveCount(3);
    await expect(
      page.getByRole("region", { name: "Questions fréquentes" }).locator("details"),
    ).toHaveCount(5);
    await expectNoSeriousAxeViolations(page);
  });
});
