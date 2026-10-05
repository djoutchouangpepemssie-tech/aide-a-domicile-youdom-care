import { expect, test } from "@playwright/test";
import { expectNoSeriousAxeViolations } from "./axe";

/*
 * Magazine « Le Fil » (P7.1) : index, rubrique, un article s'il en existe un de construit,
 * charte éditoriale ; un seul H1, fil d'Ariane, aucune violation axe sérieuse.
 */

test.describe("Magazine « Le Fil » (P7.1)", () => {
  test("/magazine/ : index, six rubriques, charte, axe", async ({ page }) => {
    const response = await page.goto("/magazine/");
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    await expect(page.getByRole("navigation", { name: "Fil d’Ariane" })).toBeVisible();
    const rubriques = page.getByRole("region", { name: "Les rubriques" });
    await expect(rubriques.getByRole("link")).toHaveCount(6);
    await expect(page.getByRole("link", { name: "Lire notre charte éditoriale" })).toBeVisible();
    await expectNoSeriousAxeViolations(page);
  });

  test("/magazine/categorie/comprendre/ : rubrique, navigation des rubriques, axe", async ({
    page,
  }) => {
    const response = await page.goto("/magazine/categorie/comprendre/");
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Comprendre");
    const nav = page.getByRole("navigation", { name: "Les rubriques" });
    await expect(nav.getByRole("link")).toHaveCount(6);
    await expect(nav.locator("[aria-current='page']")).toHaveText("Comprendre");
    await expectNoSeriousAxeViolations(page);
  });

  test("un article construit : dix blocs, un seul encart d'appel, sommaire, partage, axe", async ({
    page,
  }) => {
    await page.goto("/magazine/");
    const first = page.locator("[data-article-card] h3 a").first();
    test.skip((await first.count()) === 0, "aucun article construit");
    const href = await first.getAttribute("href");
    if (!href) throw new Error("carte sans lien");
    const response = await page.goto(href);
    expect(response?.status()).toBe(200);

    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    /*
     * Reste rouge volontairement sous 64 rem (DP.5) : le fil d'Ariane de l'article est placé
     * dans un conteneur `heroOnlyWide` (`max-lg:hidden`) depuis la compaction du 27/09/2026, donc
     * absent sur téléphone — alors que `docs/00 §5` l'exige sur toutes les pages sauf l'accueil.
     * Ce parcours dit la règle écrite ; on ne le réécrit pas pour épouser l'écart
     * (docs/AUDIT_GLOBAL.md §10).
     */
    await expect(page.getByRole("navigation", { name: "Fil d’Ariane" })).toBeVisible();
    await expect(page.locator("[data-confiance]")).toBeVisible();
    await expect(page.getByRole("region", { name: "L'essentiel" })).toBeVisible();
    const toc = page.getByRole("navigation", { name: "Sommaire" });
    const tocLinks = toc.getByRole("link");
    const headings = page.locator("[data-article-body] h2");
    expect(await tocLinks.count()).toBe(await headings.count());
    // Chaque ancre du sommaire vise un intertitre du corps.
    for (const anchor of await tocLinks.evaluateAll((links) =>
      links.map((l) => l.getAttribute("href") ?? ""),
    )) {
      await expect(page.locator(`[data-article-body] h2${anchor}`)).toHaveCount(1);
    }
    await expect(page.locator("[data-demain] li")).toHaveCount(3);
    // docs/06 §8 : un seul encart d'appel contextuel.
    await expect(page.locator('[data-encart="appel"]')).toHaveCount(1);
    /*
     * Deux boutons framboise dans le contenu, et seulement deux : l'action du hero
     * (`[data-hero-primary]`, invariant du design system que hero.spec vérifie sur tous les
     * gabarits) et celui de l'encart. Ce parcours n'en attendait qu'un, d'avant que le hero
     * d'article porte une action, et échouait depuis (docs/AUDIT_GLOBAL.md §10). La règle
     * utile est qu'aucun troisième n'apparaisse dans le corps de l'article.
     */
    const actions = page.locator("#contenu a.bg-action, #contenu button.bg-action");
    await expect(actions).toHaveCount(2);
    await expect(page.locator("[data-hero-primary] a.bg-action")).toHaveCount(1);
    await expect(page.locator('[data-encart="appel"] a.bg-action')).toHaveCount(1);
    await expect(
      page.locator("[data-article-body] a.bg-action, [data-article-body] button.bg-action"),
    ).toHaveCount(0);
    await expect(page.getByRole("region", { name: "Sources" }).locator("ol li")).not.toHaveCount(0);
    const share = page.getByRole("region", { name: "Partager cet article" });
    await expect(share.getByRole("link", { name: "Envoyer par e-mail" })).toHaveAttribute(
      "href",
      /^mailto:/,
    );
    await expect(share.getByRole("button", { name: "Copier le lien" })).toBeVisible();
    await expect(share.getByRole("button", { name: "Version imprimable" })).toBeVisible();
    // JSON-LD Article présent.
    const jsonLd = await page.locator('script[type="application/ld+json"]').allTextContents();
    expect(jsonLd.some((block) => block.includes('"@type":"Article"'))).toBe(true);
    // Le fil d'Ariane visuel disparaît sous 64 rem (compaction du 27/09) : le BreadcrumbList,
    // lui, reste là quelle que soit la largeur, pour les moteurs et les assistants.
    expect(jsonLd.some((block) => block.includes('"@type":"BreadcrumbList"'))).toBe(true);
    await expectNoSeriousAxeViolations(page);
  });

  test("/a-propos/charte-editoriale/ : la section du magazine, axe", async ({ page }) => {
    const response = await page.goto("/a-propos/charte-editoriale/");
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    const section = page.getByRole("region", { name: "Le Fil : comment un article est fabriqué" });
    await expect(section.locator("[data-etapes] li")).toHaveCount(6);
    await expect(section.getByRole("link", { name: "Découvrir le magazine" })).toBeVisible();
    await expectNoSeriousAxeViolations(page);
  });
});
