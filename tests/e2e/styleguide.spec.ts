import { expect, test } from "@playwright/test";
import { expectNoSeriousAxeViolations } from "./axe";

test.describe("Guide de styles (P1.10)", () => {
  test("le sommaire mène à chaque section", async ({ page }) => {
    await page.goto("/styleguide/");
    const toc = page.getByRole("navigation", { name: "Sommaire" });
    const links = toc.getByRole("link");
    const count = await links.count();
    expect(count).toBeGreaterThanOrEqual(12);
    for (let i = 0; i < count; i += 1) {
      const href = await links.nth(i).getAttribute("href");
      expect(href).toMatch(/^#[a-z-]+$/);
      await expect(page.locator(href as string)).toHaveCount(1);
    }
  });

  test("tient dans 320 px sans débordement horizontal et passe axe", async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 320, height: 640 } });
    const page = await context.newPage();
    await page.goto("/styleguide/");
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    const overflow = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      wide: Array.from(document.querySelectorAll("body *"))
        .filter((el) => el.getBoundingClientRect().right > 321)
        .slice(0, 5)
        .map(
          (el) =>
            `${el.tagName.toLowerCase()}.${String(el.className).split(" ")[0]} (${Math.round(
              el.getBoundingClientRect().right,
            )}px) « ${(el.textContent ?? "").trim().slice(0, 40)} »`,
        ),
    }));
    expect(overflow.wide, "éléments dépassant 320 px").toEqual([]);
    expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth);
    await page.screenshot({ path: "test-results/styleguide-320.png", fullPage: true });
    await expectNoSeriousAxeViolations(page);
    await context.close();
  });
});
