import { expect, test } from "@playwright/test";

test.describe("Le fil (P1.4)", () => {
  test("se dessine à l'entrée dans l'écran, une seule fois", async ({ page }) => {
    await page.goto("/styleguide/");
    const thread = page.locator(
      'section[aria-labelledby="fil"] svg.thread[data-illustration="maison"]',
    );
    await thread.scrollIntoViewIfNeeded();
    await expect(thread).toHaveAttribute("data-state", "drawn");
    await expect(thread).toHaveAttribute("aria-hidden", "true");
    await expect(thread.locator("path.thread-knot")).toHaveCount(1);

    // Le tracé dure --thread-duration (800 ms) : on attend la fin de la transition.
    await expect
      .poll(
        () =>
          thread
            .locator("path")
            .first()
            .evaluate((path) => Number.parseFloat(getComputedStyle(path).strokeDashoffset)),
        { timeout: 3000 },
      )
      .toBe(0);
  });

  test("est affiché d'emblée avec prefers-reduced-motion", async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: "reduce" });
    const page = await context.newPage();
    await page.goto("/styleguide/");
    const thread = page.locator(
      'section[aria-labelledby="fil"] svg.thread[data-illustration="maison"]',
    );
    await expect(thread).toHaveAttribute("data-state", "idle");
    const offset = await thread
      .locator("path")
      .first()
      .evaluate((path) => getComputedStyle(path).strokeDashoffset);
    expect(Number.parseFloat(offset)).toBe(0);
    await context.close();
  });
});
