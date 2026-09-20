import { expect, test } from "@playwright/test";
import { expectNoSeriousAxeViolations } from "./axe";

test.describe("Formulaires détaillés (P3.6)", () => {
  test("l'aiguillage /demande/ mène aux cas disponibles", async ({ page }) => {
    await page.goto("/demande/");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Décrire votre situation");
    await expectNoSeriousAxeViolations(page);
    await page.getByRole("link", { name: /Personne âgée/ }).click();
    await expect(page).toHaveURL(/\/demande\/personne-agee\/$/);
  });

  test("nuit et 24h/24 : la semaine est préremplie sur les nuits", async ({ page }) => {
    await page.goto("/demande/nuit-et-24h/");
    const form = page.getByRole("form");
    await form.getByRole("radio", { name: "Mon père ou ma mère" }).check();
    await form.getByRole("button", { name: "Continuer" }).click();
    await form.getByRole("button", { name: "Continuer" }).click();
    await form.getByRole("button", { name: "Continuer" }).click();
    await expect(form.getByText("Étape 4 sur 5")).toBeVisible();
    await expect(form.getByRole("radio", { name: "Régulier, chaque semaine" })).toBeChecked();
    await expect(form.locator("[aria-live=polite]").first()).toContainText(
      "Environ 63 heures par semaine, dont 7 nuits.",
    );
    await expectNoSeriousAxeViolations(page);
  });

  for (const cas of ["adulte-handicap", "enfant-handicap", "relais-aidant", "nuit-et-24h"]) {
    test(`${cas} : questions de situation du cahier et axe`, async ({ page }) => {
      await page.goto(`/demande/${cas}/`);
      const form = page.getByRole("form");
      await form.getByRole("radio", { name: "Moi-même" }).check();
      await form.getByRole("button", { name: "Continuer" }).click();
      await expect(form.getByText("Étape 2 sur 5")).toBeVisible();
      await expect(form.getByRole("radio", { name: "Je préfère en parler" }).first()).toBeVisible();
      await expectNoSeriousAxeViolations(page);
      await form.getByRole("button", { name: "Continuer" }).click();
      await expect(form.getByText("Étape 3 sur 5")).toBeVisible();
      await expect(form.getByRole("checkbox", { name: "À définir ensemble" })).toBeVisible();
      await expectNoSeriousAxeViolations(page);
    });
  }

  test("parcours neuro en cinq étapes, axe à chaque étape, panne d'envoi sans perte", async ({
    page,
  }) => {
    // Panne d'envoi simulée : la route répond 503 (le succès est couvert par envoi.spec.ts).
    await page.route("**/api/lead/", (route) =>
      route.fulfill({ status: 503, contentType: "application/json", body: '{"ok":false}' }),
    );
    await page.goto("/demande/maladie-neurodegenerative/?commune=92062");
    const form = page.getByRole("form");
    await expect(form.getByText("Étape 1 sur 5")).toBeVisible();
    await expectNoSeriousAxeViolations(page);

    await form.getByRole("button", { name: "Continuer" }).click();
    await expect(form.getByRole("alert").first()).toContainText("pour qui vous cherchez");
    await form.getByRole("radio", { name: "Mon père ou ma mère" }).check();
    await form.getByRole("button", { name: "Continuer" }).click();

    await expect(form.getByText("Étape 2 sur 5")).toBeVisible();
    await expect(form.getByRole("heading", { level: 2 })).toBeFocused();
    await form.getByRole("radio", { name: "Alzheimer ou apparentée" }).check();
    await form.getByRole("checkbox", { name: "Les chutes" }).check();
    await expectNoSeriousAxeViolations(page);
    await form.getByRole("button", { name: "Continuer" }).click();

    await expect(form.getByText("Étape 3 sur 5")).toBeVisible();
    await form.getByRole("checkbox", { name: "Repas" }).check();
    await expectNoSeriousAxeViolations(page);
    await form.getByRole("button", { name: "Continuer" }).click();

    await expect(form.getByText("Étape 4 sur 5")).toBeVisible();
    await form.getByRole("radio", { name: "Régulier, chaque semaine" }).check();
    await form.getByRole("button", { name: "Tous les matins" }).click();
    await form.getByRole("radio", { name: "Dans le mois" }).check();
    await expectNoSeriousAxeViolations(page);
    await form.getByRole("button", { name: "Continuer" }).click();

    await expect(form.getByText("Étape 5 sur 5")).toBeVisible();
    await expect(
      form.getByRole("combobox", { name: "Votre commune ou votre code postal" }),
    ).toHaveValue("Puteaux");
    await form.getByLabel("Votre prénom").fill("Claire");
    await form.getByLabel("Votre nom").fill("Martin");
    await form.getByLabel("Votre téléphone").fill("06 12 34 56 78");
    await form.getByRole("button", { name: "J'envoie ma demande" }).click();
    await expect(form.getByRole("alert").first()).toContainText("Il manque votre accord");
    await form.getByRole("checkbox", { name: /J'accepte que Youdom Care utilise/ }).check();
    await expectNoSeriousAxeViolations(page);
    await form.getByRole("button", { name: "J'envoie ma demande" }).click();
    await expect(form.getByText(/L'envoi n'a pas abouti/)).toBeVisible();
    await expect(form.getByLabel("Votre prénom")).toHaveValue("Claire");
    await expect(page).toHaveURL(/\/demande\/maladie-neurodegenerative\//);

    await form.getByRole("button", { name: "Retour" }).click();
    await expect(form.getByText("Étape 4 sur 5")).toBeVisible();
    await expect(form.getByRole("radio", { name: "Régulier, chaque semaine" })).toBeChecked();
  });
});
