import { expect, test } from "@playwright/test";
import { expectNoSeriousAxeViolations } from "./axe";

test.describe("Grille de planning en saisie (P3.2, P3.3)", () => {
  test("raccourcis, résumé annoncé, question sur la nuit, date de début et axe", async ({
    page,
  }) => {
    await page.goto("/styleguide/#planning");
    const section = page.locator("#planning").locator("xpath=ancestor::section");
    await section.getByRole("radio", { name: "Régulier, chaque semaine" }).check();
    const live = section.locator("[aria-live=polite]");
    await expect(live).toHaveText("Aucun créneau choisi pour l'instant.");
    await expect(
      section.getByRole("radiogroup", { name: "Comment se passent les nuits ?" }),
    ).toHaveCount(0);
    await section.getByRole("button", { name: "Toutes les nuits" }).click();
    await expect(live).toContainText("Environ 63 heures par semaine, dont 7 nuits.");
    await section.getByRole("radio", { name: /^Nuit calme/ }).check();
    await section.getByRole("radio", { name: "Dans la semaine" }).check();
    await expectNoSeriousAxeViolations(page);
    await section.getByRole("button", { name: "Tout effacer" }).click();
    await expect(live).toHaveText("Aucun créneau choisi pour l'instant.");
    await expect(
      section.getByRole("radiogroup", { name: "Comment se passent les nuits ?" }),
    ).toHaveCount(0);
  });

  test("saisie complète au clavier dans le tableau, puis horaires précis", async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, "le tableau est remplacé par un accordéon sur mobile");
    await page.goto("/styleguide/#planning");
    const section = page.locator("#planning").locator("xpath=ancestor::section");
    await section.getByRole("radio", { name: "Régulier, chaque semaine" }).check();
    const table = section.getByRole("table", { name: "Vos créneaux de la semaine" });
    await expect(table).toBeVisible();
    await table.getByRole("checkbox", { name: "Lundi, tôt le matin, 6h à 8h" }).focus();
    await page.keyboard.press("ArrowRight");
    await expect(
      table.getByRole("checkbox", { name: "Mardi, tôt le matin, 6h à 8h" }),
    ).toBeFocused();
    await page.keyboard.press("Space");
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Space");
    await expect(table.getByRole("checkbox", { name: "Mardi, matin, 8h à 12h" })).toBeChecked();
    const live = section.locator("[aria-live=polite]");
    await expect(live).toContainText("Environ 6 heures par semaine.");

    await section
      .getByRole("checkbox", { name: "Je préfère indiquer des horaires précis" })
      .check();
    const mardi = section.getByRole("group", { name: "Mardi, plage 1" });
    await expect(mardi.getByRole("combobox", { name: "De" })).toHaveValue("06:00");
    await expect(mardi.getByRole("combobox", { name: "À" })).toHaveValue("12:00");
    await mardi.getByRole("combobox", { name: "De" }).selectOption("22:00");
    await mardi.getByRole("combobox", { name: "À" }).selectOption("07:00");
    await expect(live).toContainText("Environ 9 heures par semaine, dont une nuit.");
    await expect(
      section.getByRole("radiogroup", { name: "Comment se passent les nuits ?" }),
    ).toBeVisible();
    await expectNoSeriousAxeViolations(page);
  });

  test("dates ponctuelles et présence 24h/24", async ({ page }) => {
    await page.goto("/styleguide/#planning");
    const section = page.locator("#planning").locator("xpath=ancestor::section");
    await section.getByRole("radio", { name: "Ponctuel, à des dates précises" }).check();
    await section.getByLabel("Ou une période, du").fill("2026-10-10");
    await section.getByLabel("au", { exact: true }).fill("2026-10-12");
    await section.getByRole("button", { name: "Ajouter la période" }).click();
    await expect(section.getByText("3 date(s) choisie(s)")).toBeVisible();
    await section
      .getByRole("group", { name: "À quels moments, ces jours-là ?" })
      .getByLabel(/^Après-midi/)
      .check();
    await expect(section.locator("[aria-live=polite]").last()).toContainText(
      "Environ 12 heures au total sur 3 date(s).",
    );
    await expectNoSeriousAxeViolations(page);

    await section.getByRole("radio", { name: "Présence continue 24h/24" }).check();
    await section.getByRole("radio", { name: "Oui, 7 jours sur 7" }).check();
    await expect(section.locator("[aria-live=polite]").first()).toContainText(
      "Environ 168 heures par semaine, dont 7 nuits.",
    );
    await section.getByLabel("Date de début souhaitée").fill("2026-10-01");
    await section.getByRole("radio", { name: "Durablement" }).check();
    await expectNoSeriousAxeViolations(page);
  });

  test("accordéon par jour sur mobile", async ({ page, isMobile }) => {
    test.skip(!isMobile, "l'accordéon n'existe que sous 48 rem");
    await page.goto("/styleguide/#planning");
    const section = page.locator("#planning").locator("xpath=ancestor::section");
    await section.getByRole("radio", { name: "Régulier, chaque semaine" }).check();
    await expect(section.getByRole("table")).toBeHidden();
    const lundi = section.locator("details").first();
    await lundi.locator("summary").click();
    await lundi.getByRole("checkbox", { name: "Lundi, matin, 8h à 12h" }).check();
    await expect(lundi.locator("summary")).toContainText("1 créneau");
    await expect(section.locator("[aria-live=polite]")).toContainText("Environ 4 heures");
    await expectNoSeriousAxeViolations(page);
  });
});
