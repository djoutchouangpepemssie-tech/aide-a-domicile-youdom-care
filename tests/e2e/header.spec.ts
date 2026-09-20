import { expect, test } from "@playwright/test";
import { expectNoSeriousAxeViolations } from "./axe";

test.describe("En-tête (P1.5)", () => {
  test("le lien d'évitement mène au contenu et l'en-tête passe axe", async ({ page }) => {
    await page.goto("/");
    await page.keyboard.press("Tab");
    const skip = page.getByRole("link", { name: "Aller au contenu" });
    await expect(skip).toBeFocused();
    await expect(skip).toBeVisible();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/#contenu$/);
    await expect(page.locator("main#contenu")).toBeVisible();
    await expectNoSeriousAxeViolations(page);
  });

  test("le menu déroulant se pilote au clavier", async ({ page, isMobile }) => {
    test.skip(isMobile, "menu déroulant réservé aux grands écrans");
    await page.goto("/");
    const nav = page.getByRole("navigation", { name: "Navigation principale" }).first();
    const button = nav.getByRole("button", { name: "Pour qui ?" });
    await button.focus();
    await page.keyboard.press("Enter");
    await expect(button).toHaveAttribute("aria-expanded", "true");

    await page.keyboard.press("Tab");
    await expect(nav.getByRole("link", { name: /Maladies neurodégénératives/ })).toBeFocused();

    await page.keyboard.press("Escape");
    await expect(button).toHaveAttribute("aria-expanded", "false");
    await expect(button).toBeFocused();

    // Le focus qui quitte le menu le ferme
    await page.keyboard.press("Enter");
    await expect(button).toHaveAttribute("aria-expanded", "true");
    await page.getByRole("link", { name: "Tarifs et aides" }).first().focus();
    await expect(button).toHaveAttribute("aria-expanded", "false");
  });

  test("le menu mobile s'ouvre et se ferme", async ({ page, isMobile }) => {
    test.skip(!isMobile, "menu mobile réservé aux petits écrans");
    await page.goto("/");
    const toggle = page.getByRole("button", { name: "Menu" });
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
    const panel = page.locator("#menu-mobile");
    await expect(panel).toBeVisible();
    await panel.getByText("Pour qui ?").click();
    await expect(panel.getByRole("link", { name: /Personnes âgées/ })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await expectNoSeriousAxeViolations(page);
  });

  test("les entrées tiennent sur une ligne, libellés courts affichés, complets annoncés", async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, "barre de navigation réservée aux grands écrans");
    await page.goto("/");
    const nav = page.getByRole("navigation", { name: "Navigation principale" }).first();
    const tarifs = nav.getByRole("link", { name: "Tarifs et aides" });
    await expect(tarifs).toHaveText("Tarifs");
    await expect(nav.getByRole("button", { name: "Nos services" })).toHaveText("Services");

    // Aucune entrée repliée : chaque cible tient sur une ligne (docs/design/CONCEPT.md §1, point 9).
    const entries = nav.locator(":scope > ul > li > :first-child");
    const heights = await entries.evaluateAll((nodes) =>
      nodes.map((node) => node.getBoundingClientRect().height),
    );
    expect(heights.length).toBe(6);
    for (const height of heights) expect(height).toBeLessThanOrEqual(60);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(overflow).toBe(false);
  });

  test("l'en-tête devient compact au défilement", async ({ page }) => {
    await page.goto("/styleguide/");
    const header = page.locator("header").first();
    await expect(header).toHaveAttribute("data-compact", "false");
    await page.mouse.wheel(0, 600);
    await expect(header).toHaveAttribute("data-compact", "true");
  });
});
