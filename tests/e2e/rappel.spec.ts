import { expect, test } from "@playwright/test";
import { expectNoSeriousAxeViolations } from "./axe";

test.describe("Formulaire de rappel (P3.5)", () => {
  test("accessible depuis l'en-tête ou la barre mobile", async ({ page, isMobile }) => {
    await page.goto("/");
    const link = isMobile
      ? page.getByRole("link", { name: "Être rappelé(e)" }).last()
      : page.getByRole("banner").getByRole("link", { name: "Être rappelé(e)" });
    await link.click();
    await expect(page).toHaveURL(/\/etre-rappele\/$/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("trente secondes");
  });

  test("valide au clavier, présélectionne la commune, conserve la saisie quand l'envoi échoue", async ({
    page,
  }) => {
    // Panne d'envoi simulée : la route répond 503 (le succès est couvert par envoi.spec.ts).
    await page.route("**/api/lead/", (route) =>
      route.fulfill({ status: 503, contentType: "application/json", body: '{"ok":false}' }),
    );
    await page.goto("/etre-rappele/?commune=92062");
    const form = page.getByRole("form");
    await expect(form.getByText("Étape 1 sur 1")).toBeVisible();
    await expect(
      form.getByRole("combobox", { name: "Votre commune ou votre code postal" }),
    ).toHaveValue("Puteaux");
    await expectNoSeriousAxeViolations(page);

    await form.getByRole("button", { name: "J'envoie ma demande" }).click();
    const alert = form.getByRole("alert").first();
    await expect(alert).toContainText("Il manque quelques informations");
    await expect(form.getByLabel("Votre prénom")).toBeFocused();
    await expectNoSeriousAxeViolations(page);

    await page.keyboard.type("Claire");
    await page.keyboard.press("Tab");
    await page.keyboard.type("Martin");
    await page.keyboard.press("Tab");
    await page.keyboard.type("06 12 34 56 78");
    await form.getByRole("button", { name: "J'envoie ma demande" }).click();
    await expect(form.getByText(/L'envoi n'a pas abouti/)).toBeVisible();
    await expect(form.getByRole("link", { name: /01.84.80.17.03/ })).toHaveAttribute(
      "href",
      "tel:+33184801703",
    );
    await expect(form.getByLabel("Votre prénom")).toHaveValue("Claire");
    await expect(page).toHaveURL(/\/etre-rappele\//);
  });

  test("« Je ne sais pas encore » : le message du motif s'affiche au-dessus du formulaire, et seulement là", async ({
    page,
  }) => {
    await page.goto("/etre-rappele/?motif=inconnu");
    const notice = page.locator("[data-motif=inconnu]");
    await expect(notice).toHaveText(
      "Vous ne savez pas encore de quoi vous avez besoin ? C'est normal : l'évaluation à domicile, gratuite, sert à cela.",
    );
    await expect(notice).toBeVisible();
    const form = page.getByRole("form");
    const noticeBox = await notice.boundingBox();
    const formBox = await form.boundingBox();
    expect(noticeBox).not.toBeNull();
    expect(formBox).not.toBeNull();
    if (noticeBox && formBox) expect(noticeBox.y + noticeBox.height).toBeLessThanOrEqual(formBox.y);
    await expectNoSeriousAxeViolations(page);

    await page.goto("/etre-rappele/");
    await expect(page.locator("[data-motif]")).toHaveCount(0);
    await page.goto("/etre-rappele/?motif=autre");
    await expect(page.locator("[data-motif]")).toHaveCount(0);
  });

  test("sans JavaScript, aucun message de motif et la page reste complète", async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    try {
      await page.goto("/etre-rappele/?motif=inconnu");
      await expect(page.getByRole("heading", { level: 1 })).toContainText("trente secondes");
      await expect(page.getByRole("form")).toBeVisible();
      await expect(page.locator("[data-motif]")).toHaveCount(0);
      await expect(page.getByText(/C'est normal/)).toHaveCount(0);
    } finally {
      await context.close();
    }
  });

  test("une commune hors Île-de-France bloque l'envoi", async ({ page }) => {
    await page.goto("/etre-rappele/");
    const form = page.getByRole("form");
    await form.getByLabel("Votre prénom").fill("Paul");
    await form.getByLabel("Votre nom").fill("Durand");
    await form.getByLabel("Votre téléphone").fill("01 84 80 17 03");
    await form.getByRole("combobox", { name: "Votre commune ou votre code postal" }).fill("Lyon");
    await form.getByRole("button", { name: "J'envoie ma demande" }).click();
    await expect(form.getByRole("alert").first()).toContainText(
      "Nous intervenons à Paris et en Île-de-France",
    );
  });
});
