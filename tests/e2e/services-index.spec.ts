import { expect, test } from "@playwright/test";
import { expectNoSeriousAxeViolations } from "./axe";

/*
 * Index /services/ (D-064). Les 26 pages services elles-mêmes sont couvertes par
 * `services.spec.ts` ; ce fichier ne concerne que leur page d'index. : la page qui manquait au site — « Nos services » était un menu
 * déroulant sans page d'atterrissage. Ce qui est vérifié ici est ce qui lui était demandé : que
 * le visiteur VOIE tous les services, groupés, et puisse les atteindre au clavier.
 */

test.describe("/services/", () => {
  test("répond 200, un seul H1, le fil d'Ariane, trois groupes, axe", async ({ page }) => {
    const response = await page.goto("/services/");
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    await expect(
      page.getByRole("navigation", { name: /Fil d.Ariane/ }).locator("[aria-current=page]"),
    ).toHaveText("Nos services");

    // Les trois groupes de content/pages/services.json, chacun une région nommée par son H2.
    for (const h2 of [
      "L'aide régulière, semaine après semaine",
      "Une présence renforcée, le jour et la nuit",
      "Un moment particulier à passer",
    ]) {
      await expect(page.getByRole("region", { name: h2 })).toBeVisible();
    }
    await expect(page.locator("[data-services]")).toHaveCount(3);

    // Les neuf cartes, et les deux prestations sans page à elles, nommées (Q-OFFRE-7).
    await expect(page.getByRole("article")).toHaveCount(9);
    // Dans la carte, pas dans la description du menu qui emploie les mêmes mots.
    const quotidien = page.getByRole("article").filter({ hasText: "Aide à la vie quotidienne" });
    await expect(
      quotidien.getByText("Aide pour les repas et les courses", { exact: true }),
    ).toBeVisible();
    await expect(quotidien.getByText("Entretien du cadre de vie", { exact: true })).toBeVisible();

    await expectNoSeriousAxeViolations(page);
  });

  test("chaque carte mène à sa page, et le lien est atteignable au clavier", async ({ page }) => {
    await page.goto("/services/");
    const cards = page.getByRole("article");
    const count = await cards.count();
    expect(count).toBe(9);

    for (let index = 0; index < count; index += 1) {
      const link = cards.nth(index).getByRole("link").first();
      const href = await link.getAttribute("href");
      expect(href, `carte ${index}`).toMatch(/^\/[a-z0-9-]+\/[a-z0-9-]+\/$/);
      // Le lien reçoit le focus : il est dans l'ordre de tabulation, pas seulement cliquable.
      await link.focus();
      await expect(link).toBeFocused();
    }

    // Et il navigue réellement : on suit la première carte jusqu'à sa page.
    const first = cards.first().getByRole("link").first();
    const target = await first.getAttribute("href");
    await first.click();
    await expect(page).toHaveURL(new RegExp(`${target}$`));
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
  });

  test("le menu « Nos services » mène à l'index, et chaque page service en revient", async ({
    page,
  }) => {
    await page.goto("/services/garde-de-nuit/");
    // Le retour vers l'index depuis une page service (le lien qui donne à l'index ses liens
    // entrants contextuels, et qui sort le visiteur d'une prestation unique).
    const back = page.getByRole("link", { name: "Voir tous nos services" });
    await expect(back).toBeVisible();
    await back.click();
    await expect(page).toHaveURL(/\/services\/$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Nos services d'aide et d'accompagnement à domicile",
    );
  });
});
