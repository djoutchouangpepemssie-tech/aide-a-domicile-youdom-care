import { expect, test } from "@playwright/test";
import { expectNoSeriousAxeViolations } from "./axe";

/*
 * Outils à imprimer (docs/06 §7, P7.7) : l'index, une page d'outil, la version impression et
 * le PDF balisé servi depuis public/outils/. Aucun formulaire, aucune saisie : rien n'est collecté.
 */

const TOOL = "tour-du-logement-anti-chutes";

test.describe("Outils à imprimer (P7.7)", () => {
  test("/outils/ : un H1, cinq outils avec page et PDF, aucun formulaire, axe", async ({
    page,
  }) => {
    const response = await page.goto("/outils/");
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    const list = page.getByRole("region", { name: "Les cinq outils" });
    await expect(list.getByRole("listitem")).toHaveCount(5);
    await expect(list.getByRole("link", { name: /^Voir l'outil/ })).toHaveCount(5);
    await expect(list.getByRole("link", { name: /^Je télécharge le PDF/ })).toHaveCount(5);
    await expect(page.locator("form, input, textarea")).toHaveCount(0);
    await expectNoSeriousAxeViolations(page);
  });

  test(`/outils/${TOOL}/ : bouton Imprimer, lien PDF, cases carrées, axe`, async ({ page }) => {
    const response = await page.goto(`/outils/${TOOL}/`);
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Le tour du logement anti-chutes",
    );
    await expect(page.getByRole("button", { name: "J'imprime cet outil" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Je télécharge le PDF" })).toHaveAttribute(
      "href",
      `/outils/${TOOL}.pdf`,
    );
    expect(await page.locator(".tool-box").count()).toBeGreaterThanOrEqual(30);
    await expect(page.getByRole("note", { name: "Prudence" })).toContainText("pharmacien");
    await expect(page.locator("form, input, textarea")).toHaveCount(0);
    await expectNoSeriousAxeViolations(page);
  });

  test("la version impression ne montre que le document : ni en-tête, ni fil d'Ariane, ni boutons", async ({
    page,
  }) => {
    await page.goto(`/outils/${TOOL}/`);
    await page.emulateMedia({ media: "print" });
    await expect(page.locator("body > header")).toBeHidden();
    await expect(page.getByRole("navigation", { name: "Fil d’Ariane" })).toBeHidden();
    await expect(page.getByRole("button", { name: "J'imprime cet outil" })).toBeHidden();
    await expect(page.locator("footer[data-print='hide']")).toBeHidden();
    await expect(page.locator(".tool-sheet")).toBeVisible();
    await expect(page.locator(".tool-sheet footer")).toContainText(
      "Document gratuit, sans contrepartie",
    );
  });

  test("le PDF balisé répond 200 en application/pdf", async ({ request }) => {
    const response = await request.get(`/outils/${TOOL}.pdf`);
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("application/pdf");
    const body = await response.body();
    expect(body.byteLength).toBeGreaterThan(10_000);
    expect(body.byteLength).toBeLessThan(500 * 1024);
    expect(body.subarray(0, 5).toString("latin1")).toBe("%PDF-");
  });

  test("un outil inconnu renvoie 404", async ({ page }) => {
    const response = await page.goto("/outils/inconnu/");
    expect(response?.status()).toBe(404);
  });
});
