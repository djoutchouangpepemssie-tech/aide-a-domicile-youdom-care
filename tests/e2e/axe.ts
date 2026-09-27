import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, type TestInfo } from "@playwright/test";

/** Règles de docs/07 §4 : WCAG 2.0, 2.1 et 2.2 niveau AA, plus les bonnes pratiques d'axe. */
export const axeTags = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"];

/**
 * Seuil bloquant de docs/07 §4 : aucune violation axe « critique » ou « sérieuse ».
 * L'analyse porte sur toute la page ; elle se fait en haut de page, car l'en-tête collant
 * recouvre la bande supérieure de la fenêtre et axe compterait comme « partiellement
 * obscurcie » toute cible qui s'y trouve après un défilement.
 *
 * Avec `testInfo`, les violations modérées et mineures sont consignées en annotations du
 * rapport (type `axe-moderate`, `axe-minor`), sans faire échouer le parcours (P9.2).
 */
export async function expectNoSeriousAxeViolations(page: Page, testInfo?: TestInfo) {
  // Les apparitions (`Reveal`) en cours fausseraient `color-contrast` (couleurs à mi-transition) :
  // on attend la fin des animations lancées, une seconde et demie au plus.
  await page.evaluate(async () => {
    window.scrollTo(0, 0);
    const running = document.getAnimations().filter((a) => a.playState === "running");
    await Promise.race([
      Promise.allSettled(running.map((a) => a.finished)),
      new Promise((resolve) => setTimeout(resolve, 1500)),
    ]);
  });
  const results = await new AxeBuilder({ page }).withTags(axeTags).analyze();
  const blocking = results.violations.filter(
    (v) => v.impact === "critical" || v.impact === "serious",
  );
  if (testInfo) {
    const url = new URL(page.url()).pathname;
    for (const v of results.violations) {
      if (v.impact === "critical" || v.impact === "serious") continue;
      const targets = v.nodes
        .slice(0, 3)
        .map((node) => node.target.join(" "))
        .join(" | ");
      testInfo.annotations.push({
        type: `axe-${v.impact ?? "unknown"}`,
        description: `${url} : ${v.id} (${v.nodes.length} élément(s)) : ${v.help} ; ${targets}`,
      });
    }
  }
  expect(blocking, blocking.map((v) => `${v.id} (${v.impact}) : ${v.help}`).join("\n")).toEqual([]);
}
