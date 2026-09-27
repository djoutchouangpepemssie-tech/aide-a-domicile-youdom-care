import { expect, test } from "@playwright/test";
import { expectNoSeriousAxeViolations } from "./axe";

test.describe("Lexique (P7.2)", () => {
  test("/lexique/ : index alphabétique, lettres ancrées, filtrage, axe", async ({ page }) => {
    const response = await page.goto("/lexique/");
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    const letters = page.getByRole("navigation", { name: "Aller à une lettre" });
    await expect(letters.getByRole("link", { name: "A", exact: true })).toHaveAttribute(
      "href",
      "#lettre-a",
    );
    const items = page.locator("[data-lexique-item]");
    expect(await items.count()).toBeGreaterThanOrEqual(20);
    await expect(page.locator('[data-lexique-item="apa"] a')).toHaveAttribute(
      "href",
      "/lexique/apa/",
    );
    // Filtrage côté client : un mot sans accent retrouve le terme accentué, le compte est annoncé.
    const search = page.getByRole("searchbox", { name: "Chercher un terme" });
    await search.fill("education speciale");
    await expect(page.getByRole("status")).toHaveText("1 terme affiché");
    await expect(page.locator('[data-lexique-item="sessad"]')).toBeVisible();
    await expect(page.locator('[data-lexique-item="apa"]')).toHaveCount(0);
    await search.fill("zzzz");
    await expect(page.getByRole("status")).toContainText("Aucun terme ne correspond");
    await search.fill("");
    expect(await items.count()).toBeGreaterThanOrEqual(20);
    await expectNoSeriousAxeViolations(page);
  });

  test("/lexique/apa/ : H1, définition, texte officiel daté, pages liées, voisins, JSON-LD, axe", async ({
    page,
  }) => {
    const response = await page.goto("/lexique/apa/");
    expect(response?.status()).toBe(200);
    const h1 = page.getByRole("heading", { level: 1 });
    await expect(h1).toHaveCount(1);
    await expect(h1).toContainText("APA");
    await expect(h1).toContainText("Allocation personnalisée d'autonomie");
    await expect(page.locator("[data-definition]")).toContainText("L'APA est une aide");
    await expect(page.getByText(/Définition mise à jour le \d+ \w+ 2026/)).toBeVisible();
    const official = page.getByRole("region", { name: "Le texte officiel" });
    await expect(official.getByRole("link", { name: /service-public/ })).toHaveAttribute(
      "href",
      /service-public\.gouv\.fr/,
    );
    await expect(official).toContainText(/consultée le \d+ \w+ 2026/);
    await expect(
      page.getByRole("navigation", { name: "Sur ce site" }).getByRole("link"),
    ).toHaveCount(4);
    await expect(
      page.getByRole("navigation", { name: "Termes voisins" }).getByRole("link"),
    ).toHaveCount(4);
    // L'explication lie les autres termes une fois chacun, jamais l'APA elle-même.
    const explication = page.locator("[data-explication]");
    await expect(explication.locator('a[data-lexique="gir-et-grille-aggir"]')).toHaveCount(1);
    await expect(explication.locator('a[data-lexique="apa"]')).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Tout le lexique" })).toHaveAttribute(
      "href",
      "/lexique/",
    );

    const blocks = await page
      .locator('script[type="application/ld+json"]')
      .evaluateAll((scripts) => scripts.map((s) => s.textContent ?? ""));
    const nodes = blocks.map((block) => JSON.parse(block) as Record<string, unknown>);
    const types = nodes.map((node) => node["@type"]);
    expect(types).toEqual(expect.arrayContaining(["DefinedTerm", "WebPage", "BreadcrumbList"]));
    expect(types.filter((t) => t === "Organization")).toHaveLength(1);
    const term = nodes.find((node) => node["@type"] === "DefinedTerm");
    expect(term?.name).toBe("APA");
    expect((term?.inDefinedTermSet as { name: string }).name).toBe("Lexique du Fil");
    expect(blocks.join("\n")).not.toMatch(/"(Review|AggregateRating)"|null|""|\[\]|\{\}/);
    await expectNoSeriousAxeViolations(page);
  });

  test("le rail de conversation accompagne la définition sur grand écran", async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, "rail réservé aux grands écrans");
    await page.goto("/lexique/pch/");
    const rail = page.getByRole("complementary", { name: "Nous joindre" });
    await expect(rail).toBeVisible();
    await expect(rail.getByRole("link", { name: "Je décris ma situation" })).toHaveAttribute(
      "href",
      "/demande/",
    );
    await expect(page.getByRole("form")).toHaveCount(0);
  });

  test("/personnes-agees/ : la première occurrence d'un sigle du corps renvoie au lexique, une fois", async ({
    page,
  }) => {
    await page.goto("/personnes-agees/");
    const apa = page.locator('a[data-lexique="apa"]');
    await expect(apa).toHaveCount(1);
    await expect(apa).toHaveAttribute("href", "/lexique/apa/");
    // Le corps écrit « allocation personnalisée d'autonomie (APA) » : c'est la variante qui vient
    // en premier qui porte le lien, une seule fois.
    await expect(apa).toHaveText(/^(APA|allocation personnalisée d['’]autonomie)$/);
    const slugs = await page
      .locator("a[data-lexique]")
      .evaluateAll((links) => links.map((link) => link.getAttribute("data-lexique") ?? ""));
    expect(slugs.length).toBeGreaterThanOrEqual(2);
    expect(new Set(slugs).size).toBe(slugs.length);
    // Jamais dans un titre.
    await expect(
      page.locator("h1 a[data-lexique], h2 a[data-lexique], h3 a[data-lexique]"),
    ).toHaveCount(0);
  });

  test("un terme inconnu renvoie 404", async ({ page }) => {
    const response = await page.goto("/lexique/inconnu/");
    expect(response?.status()).toBe(404);
  });
});
