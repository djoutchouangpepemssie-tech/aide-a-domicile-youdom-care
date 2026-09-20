import { expect, test } from "@playwright/test";

test.describe("Semaine type en lecture (P1.8)", () => {
  test("tableau réel sur grand écran, liste par jour sur mobile, mention visible", async ({
    page,
    isMobile,
  }) => {
    await page.goto("/styleguide/#semaine");
    const block = page.locator('.week-planner[data-variant="display"]').first();
    // Le tableau et la liste mobile portent chacun la mention : on prend celle qui est affichée.
    await expect(block.getByText("Exemple illustratif").filter({ visible: true })).toHaveCount(1);

    if (isMobile) {
      await expect(block.getByRole("table")).toBeHidden();
      await expect(block.getByText("Lundi").filter({ visible: true })).toHaveCount(1);
    } else {
      const table = block.getByRole("table");
      await expect(table).toBeVisible();
      await expect(table.getByRole("columnheader", { name: "Mercredi" })).toBeVisible();
      await expect(table.getByRole("rowheader", { name: /Après-midi/ })).toBeVisible();
      await expect(table.getByText("Sortie, courses").first()).toBeVisible();
    }
    await expect(block.getByText(/Environ \d+ heures par semaine/)).toBeVisible();
  });
});
