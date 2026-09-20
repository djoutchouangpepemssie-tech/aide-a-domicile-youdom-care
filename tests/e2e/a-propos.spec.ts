import { expect, test } from "@playwright/test";
import { expectNoSeriousAxeViolations } from "./axe";

const pages = ["/a-propos/", "/a-propos/nos-engagements/", "/a-propos/charte-editoriale/"];

test.describe("À propos (P2.9)", () => {
  for (const path of pages) {
    test(`${path} : 200, un seul H1, fil d'Ariane, axe`, async ({ page }) => {
      const response = await page.goto(path);
      expect(response?.status()).toBe(200);
      await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
      await expect(page.getByRole("navigation", { name: "Fil d’Ariane" })).toBeVisible();
      await expectNoSeriousAxeViolations(page);
    });
  }

  test("le manifeste est repris mot pour mot et les blocs sans contenu sont absents", async ({
    page,
  }) => {
    await page.goto("/a-propos/");
    await expect(
      page.getByText(
        "Nous croyons que personne ne devrait avoir à choisir entre rester chez soi et être bien accompagné.",
      ),
    ).toBeVisible();
    await expect(page.getByRole("region", { name: /histoire/i })).toHaveCount(0);
    await expect(page.getByRole("region", { name: /équipe/i })).toHaveCount(0);
  });
});
