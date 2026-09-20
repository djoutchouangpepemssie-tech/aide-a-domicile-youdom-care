import { expect, test } from "@playwright/test";
import { expectNoSeriousAxeViolations } from "./axe";

test.describe("Mode confort de lecture (P1.7)", () => {
  test("agrandit le texte, souligne les liens, blanchit les fonds et se mémorise", async ({
    page,
    isMobile,
  }) => {
    await page.goto("/styleguide/");
    const html = page.locator("html");
    const before = await html.evaluate((el) => Number.parseFloat(getComputedStyle(el).fontSize));

    // Le bouton du pied de page est présent sur tous les écrans
    const toggle = page
      .getByRole("contentinfo")
      .getByRole("button", { name: "Confort de lecture" });
    await toggle.scrollIntoViewIfNeeded();
    await expect(toggle).toHaveAttribute("aria-pressed", "false");
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-pressed", "true");
    await expect(html).toHaveAttribute("data-comfort", "on");

    const after = await html.evaluate((el) => Number.parseFloat(getComputedStyle(el).fontSize));
    expect(after / before).toBeCloseTo(1.125, 2);
    const lineHeight = await html.evaluate((el) =>
      Number.parseFloat(getComputedStyle(el).lineHeight),
    );
    expect(lineHeight / after).toBeCloseTo(1.75, 2);

    const link = page.locator("main a").first();
    expect(await link.evaluate((el) => getComputedStyle(el).textDecorationLine)).toContain(
      "underline",
    );
    const tinted = page.locator(".bg-tint-teal").first();
    expect(await tinted.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe(
      "rgb(255, 255, 255)",
    );

    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-comfort", "on");
    await expect(
      page.getByRole("contentinfo").getByRole("button", { name: "Confort de lecture" }),
    ).toHaveAttribute("aria-pressed", "true");
    await expectNoSeriousAxeViolations(page);

    if (!isMobile) {
      // Les deux boutons (en-tête et pied de page) restent synchronisés
      const headerToggle = page
        .locator("header")
        .getByRole("button", { name: "Confort de lecture" });
      await expect(headerToggle).toHaveAttribute("aria-pressed", "true");
      await headerToggle.click();
      await expect(page.locator("html")).not.toHaveAttribute("data-comfort", "on");
    }
  });
});
