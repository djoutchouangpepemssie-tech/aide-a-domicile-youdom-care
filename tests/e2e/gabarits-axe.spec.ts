import { expect, test } from "@playwright/test";
import { expectNoSeriousAxeViolations } from "./axe";

/*
 * Seuil bloquant de docs/07 §4 sur les pages témoins : accueil, un pilier, une page pathologie,
 * un formulaire à chaque étape (et en état d'erreur), une page locale, un article, la page
 * tarifs. Aucune violation axe « critique » ou « sérieuse », sur mobile comme sur ordinateur.
 * Le parcours du formulaire vérifie aussi le focus après une erreur (audit P8.4, RGAA 11.10).
 */

const pagesTemoins: ReadonlyArray<[string, string]> = [
  ["accueil", "/"],
  ["pilier", "/personnes-agees/"],
  ["pathologie", "/maladies-neurodegeneratives/alzheimer/"],
  ["page locale", "/aide-a-domicile/hauts-de-seine/puteaux/"],
  ["article", "/magazine/prevenir-les-chutes-le-tour-du-logement-piece-par-piece/"],
  ["tarifs", "/tarifs-et-aides/"],
  ["déclaration d'accessibilité", "/accessibilite/"],
];

test.describe("Pages témoins : 0 violation axe critique ou sérieuse (docs/07 §4)", () => {
  for (const [label, chemin] of pagesTemoins) {
    test(`${label} : ${chemin}`, async ({ page }) => {
      const response = await page.goto(chemin);
      expect(response?.status()).toBe(200);
      await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
      await expectNoSeriousAxeViolations(page);
    });
  }

  test("formulaire personne âgée : chaque étape, l'état d'erreur et le focus sur la première erreur", async ({
    page,
  }) => {
    await page.goto("/demande/personne-agee/");
    const form = page.getByRole("form");
    const next = () => form.getByRole("button", { name: /Continuer|J'envoie ma demande/ });

    await expect(form.getByText("Étape 1 sur 5")).toBeVisible();
    await expectNoSeriousAxeViolations(page);
    // Groupe obligatoire vide : résumé annoncé, focus sur le premier bouton radio du groupe.
    await next().click();
    await expect(form.getByRole("alert").first()).toContainText("pour qui vous cherchez");
    await expect(form.getByRole("radio").first()).toBeFocused();
    await expectNoSeriousAxeViolations(page);
    await form.getByRole("radio", { name: "Mon père ou ma mère" }).check();
    await next().click();

    await expect(form.getByText("Étape 2 sur 5")).toBeVisible();
    await expect(form.getByRole("heading", { level: 2 })).toBeFocused();
    await expectNoSeriousAxeViolations(page);
    await next().click();

    await expect(form.getByText("Étape 3 sur 5")).toBeVisible();
    await expectNoSeriousAxeViolations(page);
    await next().click();

    await expect(form.getByText("Étape 4 sur 5")).toBeVisible();
    await form.getByRole("radio", { name: "Régulier, chaque semaine" }).check();
    await form.getByRole("button", { name: "Tous les matins" }).click();
    await form.getByRole("radio", { name: "Dans le mois" }).check();
    await expectNoSeriousAxeViolations(page);
    await next().click();

    await expect(form.getByText("Étape 5 sur 5")).toBeVisible();
    await expectNoSeriousAxeViolations(page);
    // Coordonnées vides : erreurs liées aux champs, focus sur le premier champ en erreur.
    await next().click();
    await expect(form.getByRole("alert").first()).toContainText("Il manque votre prénom");
    const prenom = form.getByLabel("Votre prénom");
    await expect(prenom).toBeFocused();
    await expect(prenom).toHaveAttribute("aria-invalid", "true");
    await expect(prenom).toHaveAccessibleDescription(/Il manque votre prénom/);
    await expectNoSeriousAxeViolations(page);
  });
});
