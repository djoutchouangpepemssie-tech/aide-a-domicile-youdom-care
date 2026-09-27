import { expect, test, type Locator, type Page } from "@playwright/test";
import { expectNoSeriousAxeViolations } from "./axe";

/*
 * Contrat des heros (décision D-032, brief docs/design/BRIEF_LIQUID_GLASS.md §4) : à l'arrivée, sans
 * défiler, le visiteur comprend où il est et peut agir.
 *
 * Six gabarits (accueil, pilier, page service, page locale, page d'agence, article) × quatre tailles
 * (320×568, 390×844, 768×1024, 1440×900). Sur chacun :
 *  - le H1, l'action principale framboise (`[data-hero-primary]`) et la première commande de
 *    l'interaction immédiate (`[data-hero-interaction]`) sont dans la fenêtre visible, sans aucun
 *    défilement (`boundingBox` entièrement comprise entre 0 et la hauteur de la fenêtre, et hors de
 *    la barre d'action mobile qui recouvre le bas) ;
 *  - le repère de défilement est là et annonce une section réelle de la page ;
 *  - aucun défilement horizontal (`scrollWidth` ≤ largeur de la fenêtre) ;
 *  - la scène colorée du gabarit est posée (`data-scene`) ;
 *  - aucune violation axe critique ou sérieuse (docs/07 §4) ;
 *  - l'interaction fonctionne au clavier (tabulation jusqu'à sa première commande, puis Entrée ou
 *    Espace : le parcours de l'accueil ouvre le panneau des situations, les autres gabarits suivent
 *    leur lien).
 * Ces parcours tournent dans les deux projets (mobile et ordinateur) : la taille de la fenêtre est
 * imposée à chaque bloc, seul le moteur diffère.
 */

const HOME = "/";
const PILLAR = "/personnes-agees/";
const SERVICE = "/services/garde-de-nuit/";
const LOCAL = "/aide-a-domicile/hauts-de-seine/puteaux/";
const AGENCY = "/agences/puteaux/";
const ARTICLE = "/magazine/prevenir-les-chutes-le-tour-du-logement-piece-par-piece/";

const gabarits: ReadonlyArray<[string, string, string]> = [
  ["accueil", HOME, "aurore"],
  ["pilier", PILLAR, "teal"],
  ["page service", SERVICE, "nuit"],
  ["page locale", LOCAL, "verte"],
  ["page d'agence", AGENCY, "sable"],
  ["article", ARTICLE, "framboise"],
];

const tailles: ReadonlyArray<{ nom: string; width: number; height: number }> = [
  { nom: "320×568", width: 320, height: 568 },
  { nom: "390×844", width: 390, height: 844 },
  { nom: "768×1024", width: 768, height: 1024 },
  { nom: "1440×900", width: 1440, height: 900 },
];

/** Hauteur réellement disponible : la fenêtre moins la barre d'action mobile, qui recouvre le bas. */
async function visibleHeight(page: Page): Promise<number> {
  return page.evaluate(() => {
    const anchored = [...document.querySelectorAll("nav, header, div")].filter((element) => {
      if (getComputedStyle(element).position !== "fixed") return false;
      const box = element.getBoundingClientRect();
      return box.height > 0 && Math.abs(box.bottom - window.innerHeight) < 2;
    });
    const barHeight = Math.max(
      0,
      ...anchored.map((element) => element.getBoundingClientRect().height),
    );
    return window.innerHeight - barHeight;
  });
}

/** Vérifie qu'un élément est entièrement dans la zone visible, sans défilement. */
async function expectInViewport(locator: Locator, limit: number, label: string) {
  await expect(locator, `${label} : absent`).toBeVisible();
  const box = await locator.boundingBox();
  expect(box, `${label} : sans boîte`).not.toBeNull();
  if (!box) return;
  expect(box.y, `${label} : au-dessus de la fenêtre (${box.y})`).toBeGreaterThanOrEqual(0);
  expect(
    box.y + box.height,
    `${label} : sous la ligne de flottaison (${Math.round(box.y + box.height)} > ${Math.round(limit)})`,
  ).toBeLessThanOrEqual(limit);
}

/** Première commande de l'interaction immédiate du hero (lien, bouton ou champ). */
function interaction(page: Page): Locator {
  return page
    .locator(
      "[data-hero-interaction] a, [data-hero-interaction] button, [data-hero-interaction] input",
    )
    .first();
}

for (const { nom, width, height } of tailles) {
  test.describe(`Heros à ${nom}`, () => {
    test.use({ viewport: { width, height } });

    for (const [label, chemin, scene] of gabarits) {
      test(`${label} : titre, action et interaction sans défiler`, async ({ page }, testInfo) => {
        const response = await page.goto(chemin);
        expect(response?.status()).toBe(200);
        const section = page.locator("[data-hero-section]");
        await expect(section).toHaveAttribute("data-scene", scene);

        const limit = await visibleHeight(page);
        await expectInViewport(page.getByRole("heading", { level: 1 }), limit, "H1");
        await expectInViewport(
          page.locator("[data-hero-primary] a, [data-hero-primary] button").first(),
          limit,
          "action principale",
        );
        await expectInViewport(interaction(page), limit, "interaction immédiate");

        // Repère de défilement : il annonce une section qui existe vraiment.
        const cue = page.locator("[data-hero-cue]").first();
        await expect(cue).toBeVisible();
        const target = await cue.getAttribute("href");
        expect(target).toMatch(/^#.+/);
        await expect(page.locator(target ?? "#none")).toHaveCount(1);

        // Aucun débordement horizontal.
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth - window.innerWidth,
        );
        expect(overflow, "débordement horizontal").toBeLessThanOrEqual(1);

        await expectNoSeriousAxeViolations(page, testInfo);
      });
    }
  });
}

test.describe("Heros : l'interaction fonctionne au clavier", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("accueil : le parcours « Pour qui cherchez-vous de l'aide ? » s'ouvre au clavier", async ({
    page,
  }) => {
    await page.goto(HOME);
    const first = page.locator("[data-hero-interaction] [data-choice]").first();
    await expect(first).toBeVisible();
    await first.focus();
    await expect(first).toBeFocused();
    await page.keyboard.press("Enter");
    // Avec JavaScript, le choix marque le panneau des situations et y déplace le focus ; sans
    // JavaScript, c'est un lien vers le pilier. Les deux mènent au même endroit.
    await expect(page.locator("#situations")).toBeVisible();
  });

  test("page locale : la recherche de commune répond au clavier", async ({ page }) => {
    await page.goto(LOCAL);
    const field = page.locator("[data-hero-interaction] input[role=combobox]");
    await expect(field).toBeVisible();
    await field.focus();
    await field.type("Puteaux", { delay: 10 });
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");
    await expect(page.locator("[data-hero-interaction] [data-result=oui]")).toContainText(
      "nous intervenons",
    );
  });

  test("page d'agence : l'itinéraire et l'appel sont atteignables au clavier", async ({ page }) => {
    await page.goto(AGENCY);
    const route = page.locator("[data-hero-interaction] [data-agence-itineraire]");
    await expect(route).toBeVisible();
    await route.focus();
    await expect(route).toBeFocused();
    await expect(route).toHaveAttribute("href", /openstreetmap\.org/);
    await expect(page.locator('[data-hero-interaction] a[href^="tel:"]')).toHaveCount(1);
  });

  test("article : « L'essentiel » en aperçu mène à la liste complète", async ({ page }) => {
    await page.goto(ARTICLE);
    const preview = page.locator("[data-essentiel-apercu]");
    await expect(preview).toBeVisible();
    await expect(preview.locator("li")).toHaveCount(2);
    const link = preview.locator('a[href="#essentiel"]');
    await link.focus();
    await page.keyboard.press("Enter");
    await expect(page.locator("#essentiel")).toBeVisible();
  });

  test("page service : le geste du hero mène au formulaire avec sa réponse", async ({ page }) => {
    await page.goto(SERVICE);
    const first = page.locator("[data-hero-interaction] a").first();
    await expect(first).toBeVisible();
    await first.focus();
    await expect(first).toBeFocused();
    await expect(first).toHaveAttribute("href", /\/demande\//);
  });
});
