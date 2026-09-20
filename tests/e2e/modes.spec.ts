import { expect, test } from "@playwright/test";
import { expectNoSeriousAxeViolations } from "./axe";

test.describe("Prestataire ou mandataire (P2.5)", () => {
  test("tableau réel, mention mandataire, un seul H1, axe", async ({ page }) => {
    const response = await page.goto("/comment-ca-marche/prestataire-ou-mandataire/");
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    const table = page.getByRole("table");
    await expect(table.getByRole("columnheader")).toHaveCount(3);
    await expect(table.getByRole("rowheader")).toHaveCount(7);
    await expect(page.locator("[data-notice=mandataire]")).toBeVisible();
    await expect(page.locator("[data-mode=mandataire]")).toBeVisible();
    await expectNoSeriousAxeViolations(page);
  });
});
