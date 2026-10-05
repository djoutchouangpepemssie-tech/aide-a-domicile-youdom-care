import { expect, test } from "@playwright/test";
import siteConfig from "../../content/site.config.json";
import { expectNoSeriousAxeViolations } from "./axe";

/*
 * Professionnels (docs/03 §9, docs/01 §3 « Prescripteur », P8.1) : la page existe, un seul H1,
 * fil d'Ariane, formulaire express et téléphone accessibles, zones et modes cités, aucune
 * promesse de délai chiffrée, axe.
 */

test.describe("Professionnels (P8.1)", () => {
  test("/professionnels/ : 200, un seul H1, fil d'Ariane, liens utiles, axe", async ({ page }) => {
    const response = await page.goto("/professionnels/");
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Professionnels : une réponse claire en un appel",
    );
    await expect(page.getByRole("navigation", { name: "Fil d’Ariane" })).toBeVisible();
    const links = page.getByRole("link", { name: "J'adresse une situation" });
    await expect(links.first()).toHaveAttribute("href", /\/demande\/professionnel\/?$/);
    await expect(
      page.getByRole("link", { name: /Appelez-nous au 01.84.80.17.03/ }).first(),
    ).toHaveAttribute("href", "tel:+33184801703");
    await expect(page.getByRole("link", { name: /Comparer les deux modes/ })).toHaveAttribute(
      "href",
      /\/comment-ca-marche\/prestataire-ou-mandataire\/?$/,
    );
    await expect(
      page.getByRole("link", { name: "Comment un accompagnement démarre" }),
    ).toHaveAttribute("href", /\/comment-ca-marche\/?$/);
    await expectNoSeriousAxeViolations(page);
  });

  test("zones, services et retour sans chiffre inventé", async ({ page }) => {
    await page.goto("/professionnels/");
    const zones = page.getByRole("region", { name: "Où nous intervenons" });
    // Les deux nombres viennent de la configuration : c'est précisément ce que ce parcours
    // vérifie (« sans chiffre inventé »). Les coder en dur les avait rendus faux au passage de
    // six à deux agences, le 27/09/2026 (docs/AUDIT_GLOBAL.md §9).
    await expect(zones).toContainText(
      `Dans les ${siteConfig.zones.length} départements d'Île-de-France, Paris compris, depuis nos ${siteConfig.agences.length} agences.`,
    );
    await expect(zones.getByRole("link", { name: "Youdom Care Hauts-de-Seine" })).toHaveAttribute(
      "href",
      /\/agences\/puteaux\/?$/,
    );
    const delais = page.getByRole("region", { name: "Les délais" });
    // Aucune promesse de délai chiffrée (« sous 48 h », « en 24 heures ») : docs/01 §2, règle 6.
    await expect(delais).toContainText("Si nous ne pouvons pas, nous le disons aussi.");
    await expect(delais).not.toContainText(
      /\b(sous|en moins de|dans les|en)\s+\d+\s*(h|heures|jours)\b/,
    );
    await expect(page.getByRole("region", { name: "Adresser une situation" })).toContainText(
      "Aucune donnée nominative sur la personne accompagnée",
    );
    await expect(
      page.getByRole("link", { name: "Sortie d'hospitalisation" }).first(),
    ).toBeVisible();
  });
});
