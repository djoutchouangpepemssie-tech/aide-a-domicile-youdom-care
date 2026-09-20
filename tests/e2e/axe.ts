import AxeBuilder from "@axe-core/playwright";
import { expect, type Page } from "@playwright/test";

/** Seuil bloquant de docs/07 §4 : aucune violation axe « critique » ou « sérieuse ». */
export async function expectNoSeriousAxeViolations(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"])
    .analyze();
  const blocking = results.violations.filter(
    (v) => v.impact === "critical" || v.impact === "serious",
  );
  expect(blocking, blocking.map((v) => `${v.id} (${v.impact}) : ${v.help}`).join("\n")).toEqual([]);
}
