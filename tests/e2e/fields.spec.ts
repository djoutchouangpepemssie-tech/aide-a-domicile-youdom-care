import { expect, test } from "@playwright/test";

test.describe("Champs de formulaire (P1.3b)", () => {
  test("se parcourent et se remplissent au clavier", async ({ page }) => {
    await page.goto("/styleguide/#champs");
    const prenom = page.getByLabel("Votre prénom");
    await prenom.focus();
    await page.keyboard.type("Camille");
    await expect(prenom).toHaveValue("Camille");

    await page.keyboard.press("Tab");
    await expect(page.getByLabel("Votre téléphone")).toBeFocused();

    await page.keyboard.press("Tab");
    const select = page.getByLabel("APA ou PCH");
    await expect(select).toBeFocused();
    await select.selectOption("en-cours");
    await expect(select).toHaveValue("en-cours");

    await page.keyboard.press("Tab");
    await expect(page.getByLabel(/Ce que vous souhaitez nous dire/)).toBeFocused();

    // Groupe radio : un seul arrêt de tabulation, les flèches changent le choix
    await page.keyboard.press("Tab");
    const parent = page.getByLabel(/Un parent âgé/);
    await expect(parent).toBeFocused();
    await page.keyboard.press("ArrowDown");
    await expect(page.getByLabel(/Mon enfant/)).toBeChecked();

    // Cases à cocher : Espace coche, chaque case est un arrêt
    await page.keyboard.press("Tab");
    const lever = page.getByLabel(/Aide au lever/);
    await expect(lever).toBeFocused();
    await page.keyboard.press("Space");
    await expect(lever).toBeChecked();
  });

  test("le champ en erreur est décrit par son message", async ({ page }) => {
    await page.goto("/styleguide/#champs");
    const tel = page.getByLabel("Votre téléphone");
    await expect(tel).toHaveAttribute("aria-invalid", "true");
    await expect(tel).toHaveAccessibleDescription(/Ce numéro semble incomplet/);
  });
});
