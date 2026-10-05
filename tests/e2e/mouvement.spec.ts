import { expect, test, type Page } from "@playwright/test";

/*
 * Contrat du mouvement (docs/design/BRIEF_LIQUID_GLASS.md §5, D-032), vérifié sur trois pages
 * témoins : l'accueil, un pilier et un article du magazine.
 *
 * - En mouvement réduit : tout est visible d'emblée, rien n'est en attente, `getAnimations()` est
 *   vide (aucune transition, aucune animation liée au défilement).
 * - Sans mouvement réduit : aucune animation de plus de 600 ms (délai compris), aucune animation
 *   infinie, aucun décalage de mise en page imputable au mouvement.
 * - Au clavier : rien ne s'incline, rien ne reflète, la navigation reste utilisable.
 * - Entre deux pages : le fondu ne touche que le contenu principal, et dure moins de 600 ms.
 *
 * Complète `motion.spec.ts` (fil du hero, profondeur, fil conducteur) : ici on mesure le mouvement,
 * là on vérifie le dessin.
 */

const pages = [
  "/",
  "/personnes-agees/",
  "/magazine/apa-qui-y-a-droit-combien-comment-la-demander/",
];

/** Classes du mouvement : un décalage de mise en page ne doit jamais venir de l'une d'elles. */
const MOTION_CLASSES =
  /\b(m-reveal|m-parallax|m-depth|m-count|m-tilt|m-scene|m-sheen|m-pthread|m-press|hero-thread|thread|t-rail|t-connector|t-knot)\b/;

interface TimedAnimation {
  name: string;
  duration: number;
  delay: number;
  endDelay: number;
  infinite: boolean;
  progressDriven: boolean;
  target: string;
}

/** Toutes les animations en cours, avec leur durée effective. */
async function animations(page: Page): Promise<TimedAnimation[]> {
  return page.evaluate(() =>
    document.getAnimations().map((animation) => {
      const effect = animation.effect;
      const timing = effect?.getComputedTiming();
      const target = effect && "target" in effect ? effect.target : null;
      const asNumber = (value: unknown) => (typeof value === "number" ? value : 0);
      return {
        name: "animationName" in animation ? String(animation.animationName) : animation.id,
        duration: asNumber(timing?.duration),
        delay: asNumber(timing?.delay),
        endDelay: asNumber(timing?.endDelay),
        infinite: !Number.isFinite(timing?.iterations ?? 1),
        progressDriven: animation.timeline !== document.timeline,
        target: target instanceof Element ? `${target.tagName}.${target.className}` : "?",
      };
    }),
  );
}

/** Descend la page par paliers, comme un lecteur, pour déclencher toutes les révélations. */
async function scrollThrough(page: Page): Promise<void> {
  const steps = await page.evaluate(() =>
    Math.min(12, Math.ceil(document.body.scrollHeight / window.innerHeight)),
  );
  for (let step = 0; step <= steps; step += 1) {
    await page.evaluate((index) => window.scrollTo(0, index * window.innerHeight * 0.9), step);
    await page.waitForTimeout(120);
  }
}

/** Somme des décalages de mise en page et classes des éléments qui ont bougé. */
async function layoutShifts(page: Page): Promise<{ total: number; sources: string[] }> {
  return page.evaluate(
    () =>
      (window as unknown as { __shifts?: { total: number; sources: string[] } }).__shifts ?? {
        total: 0,
        sources: [],
      },
  );
}

/** Observe les décalages de mise en page, avant le premier script de la page. */
async function watchPage(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const store = { total: 0, sources: [] as string[] };
    (window as unknown as { __shifts: typeof store }).__shifts = store;
    try {
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const shift = entry as PerformanceEntry & {
            value: number;
            hadRecentInput: boolean;
            sources?: { node?: Node }[];
          };
          if (shift.hadRecentInput) continue;
          store.total += shift.value;
          for (const source of shift.sources ?? []) {
            const node = source.node;
            if (node instanceof Element) store.sources.push(`${node.tagName}.${node.className}`);
          }
        }
      }).observe({ type: "layout-shift", buffered: true });
    } catch {
      // Navigateur sans `layout-shift` : la mesure reste à zéro.
    }
  });
}

for (const path of pages) {
  test.describe(`Mouvement sur ${path}`, () => {
    test("en mouvement réduit : tout est visible d'emblée, aucune animation", async ({ page }) => {
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await scrollThrough(page);

      // Rien n'a été mis en attente : aucune île ne cache quoi que ce soit.
      await expect(page.locator('[data-reveal="pending"]')).toHaveCount(0);
      await expect(page.locator('[data-reveal="in"]')).toHaveCount(0);
      await expect(page.locator('.thread[data-state="pending"]')).toHaveCount(0);
      await expect(page.locator('.hero-thread:not([data-state="idle"])')).toHaveCount(0);

      // Les blocs qui se révèlent d'ordinaire sont pleinement opaques.
      const opacities = await page
        .locator(".m-reveal")
        .evaluateAll((all) => all.map((node) => getComputedStyle(node).opacity));
      for (const opacity of opacities) expect(opacity).toBe("1");

      // Et rien ne bouge : pas une seule animation, y compris liée au défilement.
      expect(await animations(page)).toEqual([]);
    });

    test("sans mouvement réduit : rien au-delà de 600 ms, aucune boucle, aucun décalage", async ({
      page,
    }) => {
      await watchPage(page);
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

      const seen: TimedAnimation[] = [];
      const collect = async () => seen.push(...(await animations(page)));
      await collect();
      await scrollThrough(page);
      await collect();

      for (const animation of seen) {
        const where = `${animation.name} sur ${animation.target}`;
        // Aucune animation infinie, même liée au défilement : une boucle finirait par se voir.
        expect(animation.infinite, where).toBe(false);
        // Une animation liée au défilement n'a pas de durée en millisecondes : elle suit le doigt.
        if (animation.progressDriven) continue;
        expect(
          animation.delay + animation.duration + animation.endDelay,
          where,
        ).toBeLessThanOrEqual(600);
      }

      const shifts = await layoutShifts(page);
      for (const source of shifts.sources) expect(source).not.toMatch(MOTION_CLASSES);
      expect(shifts.total).toBeLessThanOrEqual(0.05);
    });

    test("au clavier : rien ne s'incline, rien ne reflète, la navigation reste utilisable", async ({
      page,
    }) => {
      await page.goto(path);
      for (let step = 0; step < 12; step += 1) await page.keyboard.press("Tab");
      const focused = page.locator(":focus");
      await expect(focused).toHaveCount(1);
      await expect(page.locator("[data-tilt]")).toHaveCount(0);
      await expect(page.locator("[data-sheen]")).toHaveCount(0);
      await expect(page.locator("[data-depth]")).toHaveCount(0);
      // Le focus reste dans l'écran : aucune animation ne l'emporte ailleurs.
      expect(
        await focused.evaluate((node) => {
          const rect = node.getBoundingClientRect();
          return rect.top >= -1 && rect.bottom <= window.innerHeight + 1;
        }),
      ).toBe(true);
    });
  });
}

test.describe("Fondu entre deux pages", () => {
  test("ne touche que le contenu principal, moins de 600 ms", async ({ page }) => {
    await page.goto("/");
    const link = page.locator("main a[href^='/']").first();
    await link.waitFor();
    await Promise.all([page.waitForURL((url) => url.pathname !== "/"), link.click()]);

    /*
     * Pendant le fondu : seule l'opacité de `main` est animée, et le fondu ne touche pas
     * l'en-tête. Ce parcours exigeait **zéro** animation sur l'en-tête, ce qui comptait aussi
     * ses propres transitions de compaction (fond, ombre, hauteur, logo — 200 ms,
     * `--duration-base`), relancées à l'arrivée sur la nouvelle page parce que le défilement
     * repart de zéro. Mesuré : quatre transitions CSS, toutes de compaction, aucune d'opacité.
     * Ce qu'il faut vérifier est donc que rien dans l'en-tête ne joue le fondu
     * (docs/AUDIT_GLOBAL.md §10).
     */
    const compaction = ["background-color", "box-shadow", "height", "max-height"];
    const during = await page.evaluate(() => {
      const main = document.querySelector("main");
      const header = document.querySelector("header");
      return {
        main: (main?.getAnimations() ?? []).map((animation) => ({
          duration: Number(animation.effect?.getComputedTiming().duration ?? 0),
          properties: Object.keys(
            (animation.effect as KeyframeEffect | null)?.getKeyframes()[0] ?? {},
          ),
        })),
        header: (header?.getAnimations({ subtree: true }) ?? []).map((animation) => ({
          property: (animation as unknown as { transitionProperty?: string }).transitionProperty,
          duration: Number(animation.effect?.getComputedTiming().duration ?? 0),
        })),
      };
    });
    for (const animation of during.header) {
      expect(compaction, `en-tête : ${animation.property}`).toContain(animation.property);
      expect(animation.duration, `en-tête : ${animation.property}`).toBeLessThanOrEqual(600);
    }
    for (const animation of during.main) {
      expect(animation.duration).toBeLessThanOrEqual(600);
    }

    // Après le fondu, `main` est pleinement visible et ne garde aucun style en ligne d'opacité.
    await expect
      .poll(() => page.locator("main").evaluate((main) => getComputedStyle(main).opacity))
      .toBe("1");
    expect(await page.locator("main").evaluate((main) => main.style.opacity)).toBe("");
  });

  test("aucun fondu en mouvement réduit", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    const link = page.locator("main a[href^='/']").first();
    await link.waitFor();
    await Promise.all([page.waitForURL((url) => url.pathname !== "/"), link.click()]);
    expect(await animations(page)).toEqual([]);
    expect(await page.locator("main").evaluate((main) => main.style.opacity)).toBe("");
  });
});

/*
 * Saut de défilement (27/09/2026). Une ancre, la touche « Fin », un `scrollTo` ou une molette
 * rapide font passer un bloc de dessous le pli à au-dessus sans qu'aucune entrée d'observateur ne
 * soit émise. Sans le filet de `src/lib/motion/viewport.ts`, le bloc reste à `pending`, donc à
 * opacité zéro : le visiteur voit une page trouée, définitivement. Rien ne doit rester en attente.
 */
test.describe("Saut de défilement", () => {
  for (const path of pages) {
    test(`${path} : aucun bloc ne reste invisible après un saut jusqu'en bas`, async ({ page }) => {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await expect.poll(() => page.locator('[data-reveal="pending"]').count()).toBe(0);

      // Et au retour en haut, plus rien n'est caché non plus.
      await page.evaluate(() => window.scrollTo(0, 0));
      await expect(page.locator('[data-reveal="pending"]')).toHaveCount(0);
      // Le temps que les dernières transitions d'entrée s'achèvent.
      await expect
        .poll(() =>
          page
            .locator(".m-reveal")
            .evaluateAll((all) =>
              all.every((node) => Number(getComputedStyle(node).opacity) > 0.99),
            ),
        )
        .toBe(true);
    });
  }
});
