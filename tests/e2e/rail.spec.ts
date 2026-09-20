import { expect, test } from "@playwright/test";
import { expectNoSeriousAxeViolations } from "./axe";

test.describe("Rail de conversion (démonstration /styleguide/rail/)", () => {
  test("sur ordinateur : collant, complet, retiré devant le formulaire, passe axe", async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, "rail réservé aux grands écrans");
    await page.goto("/styleguide/rail/");
    const rail = page.getByRole("complementary", { name: "Nous joindre" });
    await expect(rail).toBeVisible();
    await expect(rail).toHaveAttribute("data-state", "visible");
    await expect(rail.getByRole("link", { name: "Appeler le 01 84 80 17 03" })).toHaveAttribute(
      "href",
      "tel:+33184801703",
    );
    await expect(rail.getByRole("link", { name: "Être rappelé(e)" })).toHaveAttribute(
      "href",
      "/etre-rappele/",
    );
    await expect(rail.getByRole("link", { name: "Je décris ma situation" })).toHaveAttribute(
      "href",
      "#formulaire",
    );
    await expect(rail.getByText("Évaluation à domicile gratuite, sans engagement.")).toBeVisible();
    expect(await rail.evaluate((el) => getComputedStyle(el).position)).toBe("sticky");
    await expectNoSeriousAxeViolations(page);

    // Le formulaire entre dans l'écran : le rail s'efface et sort du focus (`inert`).
    await page.locator("#formulaire").scrollIntoViewIfNeeded();
    await expect(rail).toHaveAttribute("data-state", "hidden");
    await expect(rail).toHaveAttribute("inert", "");

    await page.evaluate(() => window.scrollTo(0, 0));
    await expect(rail).toHaveAttribute("data-state", "visible");
  });

  test("sur mobile : absent, la barre basse porte les mêmes actions", async ({
    page,
    isMobile,
  }) => {
    test.skip(!isMobile, "petits écrans seulement");
    await page.goto("/styleguide/rail/");
    await expect(page.locator('aside[aria-labelledby="rail-conversion-titre"]')).toBeHidden();
    const bar = page.locator('nav[aria-label="Actions rapides"]');
    await expect(bar.getByRole("link", { name: "Être rappelé(e)" })).toBeVisible();
  });
});
