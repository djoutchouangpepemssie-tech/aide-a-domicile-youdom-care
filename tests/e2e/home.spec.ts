import { expect, test } from "@playwright/test";
import { expectNoSeriousAxeViolations } from "./axe";

test.describe("Accueil (P2.1)", () => {
  test("blocs 1 à 4 : textes de docs/01, six situations, engagements, neuro, axe", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Vivre chez soi, bien accompagné. Même quand la maladie ou le handicap compliquent tout.",
    );
    await expect(
      page.getByText("Aide et accompagnement à domicile · Paris et Île-de-France"),
    ).toBeVisible();

    const situations = page.getByRole("region", { name: "Que vivez-vous en ce moment ?" });
    await expect(situations.locator(".situation-card")).toHaveCount(6);
    await expect(situations.getByRole("link")).toHaveCount(6);

    const engagements = page.getByRole("region", { name: "Ce qui change avec Youdom Care" });
    await expect(engagements.locator("li[data-engagement]")).toHaveCount(4);

    await expect(page.locator(".stage-cards li")).toHaveCount(3);
    await expectNoSeriousAxeViolations(page);
  });

  test("les fonds alternent sans deux fonds teintés à la suite", async ({ page }) => {
    await page.goto("/");
    const tones = await page
      .locator("main > section")
      .evaluateAll((sections) => sections.map((s) => getComputedStyle(s).backgroundColor));
    const paper = "rgb(251, 248, 243)";
    const white = "rgb(255, 255, 255)";
    for (let i = 1; i < tones.length; i += 1) {
      const tinted = (c: string) => c !== paper && c !== white;
      expect(tinted(tones[i] as string) && tinted(tones[i - 1] as string)).toBe(false);
    }
  });
});

test.describe("Accueil (P2.2)", () => {
  test("blocs 5 à 8 : onglets au clavier, étapes, prix masqué, proches, axe", async ({ page }) => {
    await page.goto("/#semaine");
    const tablist = page.getByRole("tablist", { name: "Exemples de semaines" });
    const tabs = tablist.getByRole("tab");
    await expect(tabs).toHaveCount(3);
    await tabs.first().focus();
    await page.keyboard.press("ArrowRight");
    await expect(tabs.nth(1)).toBeFocused();
    await expect(tabs.nth(1)).toHaveAttribute("aria-selected", "true");
    const panel = page.getByRole("tabpanel");
    await expect(panel).toHaveAccessibleName("Noé, 8 ans, autisme");
    await expect(panel.getByText("Exemple illustratif").filter({ visible: true })).toHaveCount(1);

    await expect(page.locator(".steps-timeline li")).toHaveCount(4);
    await expect(page.locator("[data-block=tarifs]")).toHaveCount(0);
    await expect(page.getByRole("article", { name: "Les aides possibles" })).toBeVisible();
    await expect(page.getByRole("link", { name: "J'ai besoin de relais" })).toBeVisible();
    await expectNoSeriousAxeViolations(page);
  });
});

test.describe("Accueil (P2.3)", () => {
  test("blocs 9 à 12 : recherche de commune au clavier, appel final, recrutement, axe", async ({
    page,
  }) => {
    await page.goto("/#territoire");
    const input = page.getByRole("combobox", { name: "Votre commune ou votre code postal" });
    await input.fill("Vitry");
    const options = page.getByRole("option");
    await expect(options.first()).toContainText("Vitry-sur-Seine");
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");
    await expect(page.locator("[data-result=oui]")).toHaveText(
      "Oui, nous intervenons à Vitry-sur-Seine. Votre agence la plus proche : Youdom Care Val-de-Marne.",
    );

    await input.fill("Marseille");
    await page.getByRole("button", { name: "Vérifier" }).click();
    await expect(page.locator("[data-result=hors]")).toContainText(
      "Nous intervenons à Paris et en Île-de-France.",
    );

    await expect(page.getByRole("region", { name: "Parlons de votre situation." })).toBeVisible();
    await expect(page.getByRole("link", { name: "Voir les offres" })).toBeVisible();
    await expectNoSeriousAxeViolations(page);
  });
});
