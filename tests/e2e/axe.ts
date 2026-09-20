import AxeBuilder from "@axe-core/playwright";
import { expect, type Page } from "@playwright/test";

/**
 * Seuil bloquant de docs/07 §4 : aucune violation axe « critique » ou « sérieuse ».
 * L'analyse porte sur toute la page ; elle se fait en haut de page, car l'en-tête collant
 * recouvre la bande supérieure de la fenêtre et axe compterait comme « partiellement
 * obscurcie » toute cible qui s'y trouve après un défilement.
 */
export async function expectNoSeriousAxeViolations(page: Page) {
  await page.evaluate(() => window.scrollTo(0, 0));
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"])
    .analyze();
  const blocking = results.violations.filter(
    (v) => v.impact === "critical" || v.impact === "serious",
  );
  expect(blocking, blocking.map((v) => `${v.id} (${v.impact}) : ${v.help}`).join("\n")).toEqual([]);
}
