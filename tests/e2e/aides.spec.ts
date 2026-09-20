import { expect, test } from "@playwright/test";
import { expectNoSeriousAxeViolations } from "./axe";

const pages = [
  {
    path: "/tarifs-et-aides/credit-d-impot-et-avance-immediate/",
    h1: /Crédit d'impôt/,
    amount: "12 000 €",
  },
  { path: "/tarifs-et-aides/apa/", h1: /APA à domicile/, amount: "811,52 € par mois" },
  { path: "/tarifs-et-aides/pch/", h1: /PCH/, amount: "25,00 € l'heure" },
  { path: "/tarifs-et-aides/aeeh/", h1: /AEEH/, amount: "153,01 € par mois" },
  { path: "/tarifs-et-aides/cesu/", h1: /CESU préfinancé/, amount: "2 591 € par an" },
  {
    path: "/tarifs-et-aides/aides-apres-hospitalisation/",
    h1: /Aides après une hospitalisation/,
    amount: /3 mois au plus/,
  },
];

test.describe("Pages par aide (P2.7)", () => {
  for (const page of pages) {
    test(`${page.path} : un H1, montants sourcés, sources datées, axe`, async ({ page: p }) => {
      const response = await p.goto(page.path);
      expect(response?.status()).toBe(200);
      await expect(p.getByRole("heading", { level: 1 })).toHaveCount(1);
      await expect(p.getByRole("heading", { level: 1 })).toHaveText(page.h1);
      const amount =
        typeof page.amount === "string"
          ? p.getByText(page.amount, { exact: true })
          : p.getByText(page.amount);
      await expect(amount.first()).toBeVisible();
      await expect(p.getByText(/vérifiée le \d+ \w+ 2026/).first()).toBeVisible();
      await expect(p.getByRole("link", { name: "Toutes les aides" })).toHaveAttribute(
        "href",
        "/tarifs-et-aides/",
      );
      await expectNoSeriousAxeViolations(p);
    });
  }

  test("une aide inconnue renvoie 404", async ({ page }) => {
    const response = await page.goto("/tarifs-et-aides/inconnue/");
    expect(response?.status()).toBe(404);
  });
});
