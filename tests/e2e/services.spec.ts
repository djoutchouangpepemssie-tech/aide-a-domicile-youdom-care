import { expect, test } from "@playwright/test";
import { expectNoSeriousAxeViolations } from "./axe";

const sections = [
  "Vous vous reconnaissez ?",
  "Ce que nous faisons, concrètement",
  "Un accompagnement qui évolue",
  "Exemple de semaine",
  "Le suivi",
  "Et pour vous, les proches",
  "Qui intervient ?",
  "Ce que nous ne faisons pas",
  "Combien ça coûte, quelles aides ?",
  "Questions fréquentes",
  "Décrire votre situation",
  "Sources et relecture",
];

test.describe("Pages services (P4)", () => {
  for (const chemin of [
    "/maladies-neurodegeneratives/",
    "/maladies-neurodegeneratives/alzheimer/",
    "/maladies-neurodegeneratives/parkinson/",
    "/maladies-neurodegeneratives/sclerose-en-plaques/",
    "/maladies-neurodegeneratives/corps-de-lewy/",
    "/maladies-neurodegeneratives/degenerescence-fronto-temporale/",
    "/maladies-neurodegeneratives/maladie-de-charcot/",
    "/maladies-neurodegeneratives/maladie-de-huntington/",
    "/personnes-agees/",
    "/personnes-agees/aide-a-l-autonomie/",
    "/personnes-agees/vie-quotidienne/",
    "/personnes-agees/compagnie-et-stimulation/",
    "/adultes-en-situation-de-handicap/",
    "/enfants-en-situation-de-handicap/",
    "/enfants-en-situation-de-handicap/autisme/",
    "/enfants-en-situation-de-handicap/polyhandicap/",
    "/enfants-en-situation-de-handicap/handicap-moteur/",
    "/enfants-en-situation-de-handicap/deficience-intellectuelle/",
    "/aidants/",
    "/aidants/solutions-de-repit/",
    "/services/garde-de-nuit/",
    "/services/presence-24h-24/",
    "/services/sortie-d-hospitalisation/",
    "/services/garde-malade/",
    "/services/accompagnement-en-vacances/",
    "/services/remplacement-d-auxiliaire-de-vie/",
  ]) {
    test(`${chemin} : 13 sections, bandeau de relecture, noindex tant que non relue, axe`, async ({
      page,
    }) => {
      const response = await page.goto(chemin);
      expect(response?.status()).toBe(200);
      await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
      await expect(page.getByText(/attend sa relecture/)).toBeVisible();
      for (const title of sections) {
        await expect(
          page
            .locator("main > section")
            .getByRole("heading", { level: 2, name: title, exact: true }),
        ).toHaveCount(1);
      }
      await expect(
        page.getByText("Exemple illustratif").filter({ visible: true }).first(),
      ).toBeVisible();
      await expect(page.getByRole("form")).toBeVisible();
      await expectNoSeriousAxeViolations(page);
    });
  }

  test("/personnes-agees/ : le sélecteur de lecteur bascule le chapô (docs/03 §4)", async ({
    page,
  }) => {
    await page.goto("/personnes-agees/");
    const group = page.getByRole("group", { name: "Vous cherchez de l’aide" });
    const proche = group.getByRole("button", { name: "pour un proche" });
    const soi = group.getByRole("button", { name: "pour vous-même" });
    await expect(proche).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator("[data-reader=proche]")).toBeVisible();
    await soi.click();
    await expect(soi).toHaveAttribute("aria-pressed", "true");
    await expect(proche).toHaveAttribute("aria-pressed", "false");
    await expect(page.locator("[data-reader=soi]")).toContainText("rester chez vous");
    await expectNoSeriousAxeViolations(page);
  });

  test("un chemin inconnu renvoie 404", async ({ page }) => {
    const response = await page.goto("/maladies-neurodegeneratives/inconnue/");
    expect(response?.status()).toBe(404);
  });
});
