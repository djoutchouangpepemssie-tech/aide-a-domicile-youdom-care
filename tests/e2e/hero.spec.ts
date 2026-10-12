import { expect, test, type Locator, type Page } from "@playwright/test";
import { expectNoSeriousAxeViolations } from "./axe";

/*
 * Contrat des heros (décision D-032, brief docs/design/BRIEF_LIQUID_GLASS.md §4) : à l'arrivée, sans
 * défiler, le visiteur comprend où il est et peut agir.
 *
 * Six gabarits (accueil, pilier, page service, page locale, page d'agence, article) × quatre tailles
 * (320×568, 390×844, 768×1024, 1440×900). Sur chacun :
 *  - le H1 est dans la fenêtre visible, sans aucun défilement, sur **toutes** les tailles ;
 *  - **le visiteur peut agir sans défiler.** Qui porte cette action dépend de la taille, et c'est
 *    une décision de conception, pas un relâchement (D-076, dette DP.3) :
 *      · au-dessus de 64 rem, le hero porte l'action principale framboise (`[data-hero-primary]`)
 *        et la première commande de l'interaction immédiate (`[data-hero-interaction]`) : les deux
 *        doivent tenir dans la fenêtre ;
 *      · en dessous, la **barre d'action mobile** (`[data-mobile-action-bar]`), fixée en bas et donc
 *        visible en permanence, porte « Ma demande ». C'est elle qui est mesurée. Le hero reste
 *        conçu pour la compaction maximale (D-058), mais sous 64 rem la hauteur visible d'un
 *        téléphone ne peut pas porter le titre, la promesse, l'interaction, l'action et le repère :
 *        les trois leviers possibles étaient tous des décisions du commanditaire (docs/PLAN.md
 *        DP.3), et celui retenu le 12/10/2026 est celui-ci.
 *    La garantie ne baisse donc pas — une action reste atteignable sans défiler — c'est la
 *    responsabilité qui change de composant ;
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

        /*
         * Qui porte l'action dépend de la largeur (D-076). La barre d'action mobile n'existe que
         * sous 64 rem ; sa présence est donc le critère, et non une constante écrite ici — si elle
         * disparaissait un jour sur téléphone, ce parcours échouerait, ce qui est le but.
         */
        const bar = page.getByRole("navigation", { name: "Actions rapides" });
        if (await bar.isVisible()) {
          const action = bar.getByRole("link", { name: "Ma demande" });
          await expect(action, "barre d'action mobile : « Ma demande » absente").toBeVisible();
          const box = await action.boundingBox();
          expect(box, "barre d'action mobile : sans boîte").not.toBeNull();
          // La barre est fixe, en bas : son action tient dans la fenêtre, par construction.
          expect(
            box ? Math.round(box.y + box.height) : 0,
            "barre d'action mobile : hors de la fenêtre",
          ).toBeLessThanOrEqual(height + 1);
        } else {
          await expectInViewport(
            page.locator("[data-hero-primary] a, [data-hero-primary] button").first(),
            limit,
            "action principale",
          );
          await expectInViewport(interaction(page), limit, "interaction immédiate");
        }

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

  test("page d'agence : l'appel est atteignable au clavier, sans itinéraire externe", async ({
    page,
  }) => {
    await page.goto(AGENCY);
    // D-036 : le panneau du hero ne garde que l'adresse et l'appel.
    await expect(page.locator("[data-hero-interaction] [data-agence-itineraire]")).toHaveCount(0);
    const call = page.locator('[data-hero-interaction] a[href^="tel:"]');
    await expect(call).toHaveCount(1);
    await call.focus();
    await expect(call).toBeFocused();
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
