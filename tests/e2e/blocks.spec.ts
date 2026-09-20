import { expect, test } from "@playwright/test";

test.describe("Blocs de contenu (P1.9a)", () => {
  test("la FAQ s'ouvre au clavier sans JavaScript dédié", async ({ page }) => {
    await page.goto("/styleguide/#faq");
    const details = page.locator("#faq-evaluation");
    const summary = details.locator("summary");
    await summary.focus();
    await expect(details).not.toHaveAttribute("open", "");
    await page.keyboard.press("Enter");
    await expect(details).toHaveAttribute("open", "");
    await expect(details.getByText(/évaluation gratuite à domicile/)).toBeVisible();
    await page.keyboard.press("Space");
    await expect(details).not.toHaveAttribute("open", "");
  });

  test("le suivi n'affiche que les jalons renseignés et le fil d'Ariane nomme la page", async ({
    page,
  }) => {
    await page.goto("/styleguide/#suivi");
    const items = page.locator(".follow-up-timeline li");
    await expect(items).toHaveCount(3);
    await expect(page.getByText("Première semaine")).toHaveCount(0);
    const current = page
      .getByRole("navigation", { name: "Fil d’Ariane" })
      .locator("[aria-current=page]");
    await expect(current).toHaveText("Aide à l’autonomie");
  });
});

test.describe("Blocs de contenu (P1.9b)", () => {
  test("aucune carte de prix tant que les tarifs sont vides, cartes de situation à lien unique", async ({
    page,
  }) => {
    await page.goto("/styleguide/#prix-aides");
    await expect(page.getByTestId("price-card-slot").locator("article")).toHaveCount(0);
    const situation = page.locator(".situation-card").first();
    await expect(situation.getByRole("link")).toHaveCount(1);
    await expect(situation.getByText("« Un diagnostic vient de tomber »")).toBeVisible();
    const aidLink = page.getByRole("link", { name: /impots\.gouv\.fr/ });
    await expect(aidLink).toHaveAttribute("rel", "noopener noreferrer");
    await expect(page.locator(".stage-cards li")).toHaveCount(3);
  });
});
