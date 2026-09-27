import { expect, test } from "@playwright/test";
import { expectNoSeriousAxeViolations } from "./axe";

/*
 * Pages légales (docs/07 §2, P8.3) : les quatre pages répondent 200 avec un seul H1, un fil
 * d'Ariane et aucune violation axe sérieuse ; le pied de page les lie toutes ; les faits null de
 * site.config.json ne laissent aucune trace ; la mention mandataire accompagne son bloc.
 */

const pages = [
  { path: "/mentions-legales/", h1: "Mentions légales" },
  { path: "/politique-de-confidentialite/", h1: "Politique de confidentialité" },
  { path: "/cookies/", h1: "Cookies et traceurs : rien à accepter" },
  { path: "/conditions-generales/", h1: "Conditions générales" },
];

test.describe("Pages légales (P8.3)", () => {
  for (const { path, h1 } of pages) {
    test(`${path} : 200, un seul H1, fil d'Ariane, date de révision, axe`, async ({ page }) => {
      const response = await page.goto(path);
      expect(response?.status()).toBe(200);
      await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(h1);
      await expect(page.getByRole("navigation", { name: "Fil d’Ariane" })).toBeVisible();
      await expect(page.locator("[data-maj] time")).toHaveAttribute(
        "datetime",
        /^\d{4}-\d{2}-\d{2}$/,
      );
      const body = await page.locator("main").innerText();
      expect(body).not.toMatch(/à compl[ée]ter|\bnull\b|\bundefined\b/i);
      await expectNoSeriousAxeViolations(page);
    });
  }

  test("le pied de page lie les six pages obligatoires", async ({ page }) => {
    await page.goto("/");
    const footer = page.getByRole("contentinfo");
    for (const [name, href] of [
      ["Mentions légales", "/mentions-legales/"],
      ["Politique de confidentialité", "/politique-de-confidentialite/"],
      ["Cookies", "/cookies/"],
      ["Conditions générales", "/conditions-generales/"],
      ["Accessibilité", "/accessibilite/"],
      ["Plan du site", "/plan-du-site/"],
    ] as const) {
      await expect(footer.getByRole("link", { name, exact: true })).toHaveAttribute("href", href);
    }
  });

  test("mentions légales : SIRET et hébergeur affichés, champs inconnus absents, crédits présents", async ({
    page,
  }) => {
    await page.goto("/mentions-legales/");
    const editeur = page.getByRole("region", { name: "Éditeur du site" });
    await expect(editeur.getByText("918 366 600 00016")).toBeVisible();
    await expect(editeur.getByText("Raison sociale")).toHaveCount(0);
    await expect(editeur.getByText("Directeur de la publication")).toHaveCount(0);
    await expect(page.getByRole("region", { name: "Hébergement" })).toContainText("Vercel Inc.");
    await expect(page.getByRole("region", { name: "Médiation de la consommation" })).toHaveCount(0);
    await expect(page.getByRole("region", { name: "Services à la personne" })).toContainText(
      "SAP918366600",
    );
    expect(await page.locator("[data-credits] > li").count()).toBeGreaterThanOrEqual(30);
    await expect(page.locator("[data-donnees-ouvertes] > li")).toHaveCount(7);
  });

  test("politique : contact et CNIL ; cookies : aucun traceur ; conditions : mention mandataire", async ({
    page,
  }) => {
    await page.goto("/politique-de-confidentialite/");
    await expect(page.locator("[data-exercice]").getByRole("link")).toHaveAttribute(
      "href",
      "mailto:contact@youdom-care.com",
    );
    await expect(page.getByRole("link", { name: /cnil\.fr/i })).toHaveAttribute(
      "href",
      "https://www.cnil.fr/fr/plaintes",
    );
    await expect(page.locator("[data-finalites] tbody tr")).toHaveCount(6);

    await page.goto("/cookies/");
    await expect(page.locator('[data-traceurs="0"]')).toBeVisible();
    await expect(page.locator("table")).toHaveCount(0);
    expect(await page.evaluate(() => document.cookie)).toBe("");

    await page.goto("/conditions-generales/");
    await expect(page.locator('[data-documents="0"]')).toBeVisible();
    await expect(page.locator('[data-mode="mandataire"] [data-notice="mandataire"]')).toBeVisible();
  });
});
