import { expect, test } from "@playwright/test";
import { expectNoSeriousAxeViolations } from "./axe";

test.describe("Formulaires sortie d'hospitalisation, professionnel et contact (P3.8b)", () => {
  test("sortie d'hospitalisation : bandeau 48 h, quatre écrans, axe", async ({ page }) => {
    await page.goto("/demande/sortie-d-hospitalisation/?commune=92062");
    const form = page.getByRole("form");
    await expect(form.getByText("Étape 1 sur 4")).toBeVisible();
    await expect(form.getByText("Sortie dans moins de 48 h ?")).toBeVisible();
    await expectNoSeriousAxeViolations(page);
    await form.getByRole("button", { name: "Continuer" }).click();
    await expect(form.getByText("Étape 2 sur 4")).toBeVisible();
    await expect(form.getByRole("combobox", { name: "Commune de retour" })).toHaveValue("Puteaux");
    await form.getByRole("button", { name: "Continuer" }).click();
    await expect(form.getByText("Étape 3 sur 4")).toBeVisible();
    await form.getByRole("checkbox", { name: "Nuits" }).check();
    await expectNoSeriousAxeViolations(page);
    await form.getByRole("button", { name: "Continuer" }).click();
    await expect(form.getByText("Étape 4 sur 4")).toBeVisible();
    await form.getByRole("button", { name: "J'envoie ma demande" }).click();
    await expect(form.getByRole("alert").first()).toContainText("Il manque quelques informations");
    await expectNoSeriousAxeViolations(page);
  });

  test("professionnel : mention d'anonymat, pas de consentement santé, axe", async ({ page }) => {
    await page.goto("/demande/professionnel/");
    const form = page.getByRole("form");
    await expect(form.getByText("Étape 1 sur 2")).toBeVisible();
    await form.getByLabel("Votre structure").fill("Service social");
    await form.getByLabel("Votre prénom").fill("Paul");
    await form.getByLabel("Votre nom").fill("Durand");
    await form.getByLabel("Votre téléphone direct").fill("01 84 80 17 03");
    await form.getByRole("button", { name: "Continuer" }).click();
    await expect(form.getByText("Étape 2 sur 2")).toBeVisible();
    await expect(
      form.getByText(/ni nom ni information permettant d'identifier/).first(),
    ).toBeVisible();
    await expect(
      form.getByRole("checkbox", { name: /J'accepte que Youdom Care utilise/ }),
    ).toHaveCount(0);
    await expectNoSeriousAxeViolations(page);
  });

  test("contact : accessible depuis le pied de page, message obligatoire, axe", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(
      page.getByRole("contentinfo").getByRole("link", { name: "Contact", exact: true }).first(),
    ).toHaveAttribute("href", /\/contact\/$/);
    await page.goto("/contact/");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Nous écrire");
    const form = page.getByRole("form");
    await form.getByLabel("Votre prénom").fill("Paul");
    await form.getByLabel("Votre nom").fill("Durand");
    await form.getByLabel("Votre téléphone").fill("01 84 80 17 03");
    await form.getByRole("button", { name: "J'envoie ma demande" }).click();
    await expect(form.getByRole("alert").first()).toContainText("Il manque votre message");
    await expectNoSeriousAxeViolations(page);
  });

  test("l'aiguillage /demande/ liste les deux formulaires spéciaux", async ({ page }) => {
    await page.goto("/demande/");
    const main = page.getByRole("main");
    await expect(main.getByRole("link", { name: /Sortie d'hospitalisation/ })).toHaveAttribute(
      "href",
      /\/demande\/sortie-d-hospitalisation\/$/,
    );
    await expect(main.getByRole("link", { name: /Vous êtes un professionnel/ })).toHaveAttribute(
      "href",
      /\/demande\/professionnel\/$/,
    );
  });
});
