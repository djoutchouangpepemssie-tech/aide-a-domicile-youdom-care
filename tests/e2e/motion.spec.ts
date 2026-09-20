import { expect, test, type Page } from "@playwright/test";
import { expectNoSeriousAxeViolations } from "./axe";

/*
 * Lot 3 de l'expérience (docs/design/CONCEPT.md §6, docs/design/MOUVEMENT.md) : profondeur du
 * hero, fil du hero, fil conducteur, bouton framboise du hero masqué sur mobile. Deux pages
 * témoins : l'accueil et /personnes-agees/ (photo qui suit le sélecteur de lecteur).
 */

const pages = ["/", "/personnes-agees/"] as const;

/**
 * Collecte les erreurs de console et les exceptions de page. Les 404 de préchargement des entrées
 * de navigation dont la page n'existe pas encore (/aide-a-domicile/, /magazine/) sont hors du lot.
 */
function watchConsole(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error" && !/status of 404/.test(message.text())) {
      errors.push(message.text());
    }
  });
  page.on("pageerror", (error) => errors.push(error.message));
  return errors;
}

const dashOffset = (page: Page, selector: string) =>
  page
    .locator(selector)
    .first()
    .evaluate((path) => Number.parseFloat(getComputedStyle(path).strokeDashoffset));

for (const path of pages) {
  test.describe(`Mouvement et profondeur sur ${path}`, () => {
    test("en mouvement réduit : tout est visible, immobile, fil complet, axe", async ({
      page,
      isMobile,
    }) => {
      const errors = watchConsole(page);
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.goto(path);

      const thread = page.locator(".hero-thread");
      await expect(thread).toHaveCount(1);
      await expect(thread).toHaveAttribute("data-state", "idle");
      await expect(thread.locator("svg[aria-hidden=true]")).toHaveCount(3);
      expect(await dashOffset(page, ".hero-thread__fil path")).toBe(0);
      expect(await dashOffset(page, ".hero-thread__knot path")).toBe(0);

      // Aucune transformation ni perspective sur la scène, même la souris dessus.
      const scene = page.locator(".hero-thread .m-depth");
      const stage = scene.locator(".m-depth__stage");
      if (!isMobile) {
        const box = await scene.boundingBox();
        if (box) await page.mouse.move(box.x + box.width * 0.9, box.y + box.height * 0.1);
      }
      await expect(stage).toHaveCSS("transform", "none");
      await expect(scene).toHaveCSS("perspective", "none");
      await expect(page.locator(".m-depth__stage[data-depth]")).toHaveCount(0);

      if (!isMobile) {
        // Fil conducteur : trait complet (aucune animation), un nœud par H2 visible.
        const conductor = page.locator(".m-pthread");
        await expect(conductor).toHaveCount(1);
        await expect(conductor).toHaveAttribute("aria-hidden", "true");
        const line = conductor.locator(".m-pthread__line");
        await expect(line).toHaveCSS("animation-name", "none");
        await expect(line).toHaveCSS("clip-path", "none");
        const knots = conductor.locator(".m-pthread__knot");
        const headings = await page
          .locator("main h2")
          .evaluateAll((all) => all.filter((h) => h.getBoundingClientRect().height > 2).length);
        await expect(knots).toHaveCount(headings);
        expect(headings).toBeGreaterThan(2);
        expect(await dashOffset(page, ".m-pthread__knot path")).toBe(0);
      }

      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await expectNoSeriousAxeViolations(page);
      expect(errors).toEqual([]);
    });

    test("sans mouvement réduit : le fil du hero se trace après la photo, sans erreur", async ({
      page,
      isMobile,
    }) => {
      const errors = watchConsole(page);
      await page.goto(path);
      await expect(page.locator("html")).toHaveAttribute("data-js", "");
      const thread = page.locator(".hero-thread");
      await expect(thread).toHaveAttribute("data-state", "drawn", { timeout: 10_000 });
      // Le trait du H1 a été mesuré : il commence à gauche (ordinateur) ou au-dessus (mobile).
      const reach = await thread.locator(".hero-thread__reach path").getAttribute("d");
      expect(reach).toMatch(/^M-?[\d.]+ -?[\d.]+H/);
      // Fin du tracé : contour et nœud complets (1 200 ms au plus).
      await expect
        .poll(() => dashOffset(page, ".hero-thread__fil path"), { timeout: 5000 })
        .toBe(0);
      await expect
        .poll(() => dashOffset(page, ".hero-thread__knot path"), { timeout: 5000 })
        .toBe(0);

      if (!isMobile) {
        // Profondeur : la scène pivote vers la souris puis revient.
        const scene = page.locator(".hero-thread .m-depth");
        const stage = scene.locator(".m-depth__stage");
        await expect(scene).toHaveAttribute("data-max-deg", "4");
        const box = await scene.boundingBox();
        if (!box) throw new Error("scène introuvable");
        await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.5);
        await page.mouse.move(box.x + box.width * 0.95, box.y + box.height * 0.05);
        await expect(stage).toHaveAttribute("data-depth", "active");
        await expect
          .poll(() => stage.evaluate((el) => el.style.getPropertyValue("--ry")))
          .toMatch(/^3\.[4-7]\d?deg$/);
        await page.mouse.move(0, 0);
        await expect(stage).not.toHaveAttribute("data-depth", /.*/);

        // Fil conducteur présent, un nœud par H2 visible.
        const conductor = page.locator(".m-pthread");
        await expect(conductor).toHaveCount(1);
        expect(Number(await conductor.getAttribute("data-knots"))).toBeGreaterThan(2);
      } else {
        // Mobile : ni fil conducteur, ni profondeur.
        await expect(page.locator(".m-pthread")).toHaveCount(0);
        await expect(page.locator(".hero-thread .m-depth__stage")).toHaveCSS("transform", "none");
      }
      expect(errors).toEqual([]);
    });

    test("mobile : le bouton framboise du hero est absent, la barre basse le porte", async ({
      page,
      isMobile,
    }) => {
      test.skip(!isMobile, "petits écrans seulement");
      await page.goto(path);
      const hero = page.locator(".hero");
      const primary = hero.locator("[data-hero-primary] a");
      await expect(primary).toHaveCount(1);
      await expect(primary).toBeHidden();
      // Le bouton de contour et le téléphone restent visibles.
      await expect(hero.locator("a.border-2").first()).toBeVisible();
      await expect(hero.getByRole("link", { name: /^Ou appelez le|^0\d/ })).toBeVisible();
      const bar = page.getByRole("navigation", { name: "Actions rapides" });
      await expect(bar).toBeVisible();
      await expect(bar.getByRole("link", { name: "Être rappelé(e)" })).toBeVisible();
    });

    test("ordinateur : le bouton framboise du hero est visible", async ({ page, isMobile }) => {
      test.skip(isMobile, "grands écrans seulement");
      await page.goto(path);
      await expect(page.locator(".hero [data-hero-primary] a")).toBeVisible();
    });
  });
}

test.describe("Fil conducteur : exclusions", () => {
  for (const path of ["/etre-rappele/", "/demande/", "/contact/", "/styleguide/"]) {
    test(`absent sur ${path}`, async ({ page, isMobile }) => {
      test.skip(isMobile, "le fil conducteur n'existe qu'à partir de 64 rem");
      await page.goto(path);
      await expect(page.locator("main")).toBeVisible();
      await expect(page.locator(".m-pthread")).toHaveCount(0);
    });
  }
});
