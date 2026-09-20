import { expect, test } from "@playwright/test";
import { expectNoSeriousAxeViolations } from "./axe";

test.describe("Espace Aidants — « Où en êtes-vous ? » (P4.14)", () => {
  test("avertissement en tête, huit questions, résultat calculé sans requête ni stockage, appel au relais, axe", async ({
    page,
  }) => {
    const requests: string[] = [];
    page.on("request", (request) => {
      if (request.method() !== "GET") requests.push(`${request.method()} ${request.url()}`);
    });

    const response = await page.goto("/aidants/ou-en-etes-vous/");
    expect(response?.status()).toBe(200);
    await expect(page).toHaveTitle(/Où en êtes-vous/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    await expect(page.getByText("Ce n'est pas un test médical")).toBeVisible();

    const groups = page.getByRole("group");
    await expect(groups).toHaveCount(8);

    // Incomplet : le bouton signale ce qui manque au lieu de calculer.
    await page.getByRole("button", { name: "Voir où j'en suis" }).click();
    const form = page.getByRole("form", { name: "Où en êtes-vous ?" });
    await expect(form.getByRole("alert")).toContainText("8 question(s)");

    for (let i = 0; i < 8; i += 1) {
      await groups.nth(i).getByRole("radio", { name: "Souvent" }).check();
    }
    await page.getByRole("button", { name: "Voir où j'en suis" }).click();
    await expect(page.getByRole("heading", { level: 2, name: "Où vous en êtes" })).toBeVisible();
    await expect(page.getByText("Vous avez besoin de relais, maintenant")).toBeVisible();
    await expect(page.getByRole("link", { name: "J'ai besoin de relais" })).toHaveAttribute(
      "href",
      "/demande/relais-aidant/",
    );

    expect(requests).toEqual([]);
    const stored = await page.evaluate(() => localStorage.length + sessionStorage.length);
    expect(stored).toBe(0);

    await expectNoSeriousAxeViolations(page);

    await page.getByRole("button", { name: "Recommencer" }).click();
    await expect(page.getByText("Vous avez besoin de relais, maintenant")).toHaveCount(0);
  });
});
