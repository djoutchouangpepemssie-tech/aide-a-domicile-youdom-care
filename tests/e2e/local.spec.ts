import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { expectNoSeriousAxeViolations } from "./axe";

/*
 * Référencement local (P6.5, P6.6) : carte régionale, index et page d'agence, et, quand le
 * dépôt contient au moins un territoire rédigé (data/local + content/local, produits par le
 * pipeline et la rédaction), une page locale de bout en bout. Aucun territoire fictif n'est
 * ajouté au dépôt pour ces parcours : sans donnée réelle, le test de la page locale est ignoré
 * et le gabarit reste couvert par ses tests unitaires (tests/fixtures/local-exemple.ts).
 */

const localSections = [
  "Vivre à domicile",
  "Les ressources près de chez vous",
  "Nos accompagnements",
  "Les aides du département",
  "Questions locales",
  "Être rappelé(e)",
];

async function jsonLdNodes(page: Page) {
  const blocks = await page
    .locator('script[type="application/ld+json"]')
    .evaluateAll((scripts) => scripts.map((s) => s.textContent ?? ""));
  return { blocks, nodes: blocks.map((block) => JSON.parse(block) as Record<string, unknown>) };
}

/** Premier territoire du dépôt qui a ses deux fichiers (hors région) ; null sinon. */
async function firstLocalPage(): Promise<{ chemin: string; statut: string } | null> {
  const root = process.cwd();
  let files: string[];
  try {
    files = (await readdir(path.join(root, "content", "local"))).filter(
      (name) => name.endsWith(".json") && !name.startsWith("_"),
    );
  } catch {
    return null;
  }
  for (const name of files.sort()) {
    try {
      const data = JSON.parse(await readFile(path.join(root, "data", "local", name), "utf8")) as {
        chemin?: string;
        kind?: string;
      };
      const editorial = JSON.parse(
        await readFile(path.join(root, "content", "local", name), "utf8"),
      ) as { statut?: string };
      if (data.kind !== "region" && data.chemin && editorial.statut) {
        return { chemin: data.chemin, statut: editorial.statut };
      }
    } catch {
      continue;
    }
  }
  return null;
}

test.describe("Carte régionale /aide-a-domicile/ (P6.5)", () => {
  test("carte accessible, liste équivalente, recherche de commune, agences, axe", async ({
    page,
  }) => {
    const response = await page.goto("/aide-a-domicile/");
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Aide à domicile à Paris et en Île-de-France",
    );
    const map = page.getByRole("img", { name: "Carte des huit départements d'Île-de-France" });
    await expect(map).toBeVisible();
    await expect(map.locator("[data-departement]")).toHaveCount(8);
    await expect(map.locator("a")).toHaveCount(0);
    const list = page.getByRole("navigation", { name: "Les huit départements" });
    await expect(list.getByRole("listitem")).toHaveCount(8);
    await expect(list.getByText("Hauts-de-Seine", { exact: false })).toBeVisible();
    // Chaque lien de la liste mène à une page construite (200), jamais à une page à venir.
    for (const href of await list
      .getByRole("link")
      .evaluateAll((links) => links.map((link) => link.getAttribute("href") ?? ""))) {
      const check = await page.request.get(href);
      expect(check.status(), href).toBe(200);
    }

    const input = page.getByRole("combobox", { name: "Votre commune ou votre code postal" });
    await input.fill("Puteaux");
    await expect(page.getByRole("option", { name: /Puteaux/ })).toBeVisible();
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");
    await expect(page.locator("[data-result=oui]")).toContainText(
      "Oui, nous intervenons à Puteaux.",
    );

    await expect(page.locator("[data-agences] [data-agence]")).toHaveCount(6);
    await expect(
      page.locator("[data-agences]").getByRole("link", { name: /Voir l'agence Youdom Care Paris/ }),
    ).toHaveAttribute("href", "/agences/paris-12/");
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
    await expectNoSeriousAxeViolations(page);
  });

  test("un territoire inconnu renvoie 404", async ({ page }) => {
    const response = await page.goto("/aide-a-domicile/territoire-inconnu/commune-inconnue/");
    expect(response?.status()).toBe(404);
  });
});

test.describe("Agences (P6.6)", () => {
  test("/agences/ : six cartes d'agences réelles, sans champ inventé, axe", async ({ page }) => {
    const response = await page.goto("/agences/");
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Nos agences en Île-de-France",
    );
    const cards = page.locator("[data-agences] [data-agence]");
    await expect(cards).toHaveCount(6);
    // Téléphone et horaires des agences sont null : jamais affichés ; le standard, oui.
    await expect(page.getByText("Téléphone de l'agence")).toHaveCount(0);
    await expect(page.getByText("Horaires", { exact: true })).toHaveCount(0);
    await expect(page.locator("[data-agences]").getByText("Standard")).toHaveCount(6);
    await expect(page.locator("[data-agences] [data-agence-itineraire]")).toHaveCount(6);
    await expect(
      page
        .locator("[data-agences]")
        .getByRole("link", { name: "Voir l'agence Youdom Care Yvelines" }),
    ).toHaveAttribute("href", "/agences/versailles/");
    await expectNoSeriousAxeViolations(page);
  });

  test("/agences/puteaux/ : faits de site.config.json, itinéraire, JSON-LD LocalBusiness, axe", async ({
    page,
  }) => {
    const response = await page.goto("/agences/puteaux/");
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Youdom Care Hauts-de-Seine");
    await expect(page.locator("main")).toHaveAttribute("data-agence-page", "puteaux");
    await expect(page.getByText("49-51 quai de Dion-Bouton, 92800 Puteaux").first()).toBeVisible();
    await expect(page.locator("[data-agence-horaires]")).toHaveCount(0);
    const route = page.getByRole("link", { name: /Itinéraire vers l'agence/ });
    await expect(route).toHaveAttribute(
      "href",
      /^https:\/\/www\.openstreetmap\.org\/search\?query=49-51/,
    );
    await expect(page.getByRole("form")).toBeVisible();
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      "https://www.youdom-care.com/agences/puteaux/",
    );

    const { blocks, nodes } = await jsonLdNodes(page);
    const types = nodes.map((node) => node["@type"]);
    expect(types.filter((t) => t === "Organization")).toHaveLength(1);
    expect(types).toEqual(expect.arrayContaining(["BreadcrumbList", "LocalBusiness"]));
    expect(blocks.join("\n")).not.toMatch(/"(Review|AggregateRating)"|null|""|\[\]|\{\}/);
    const business = nodes.find((node) => node["@type"] === "LocalBusiness");
    expect(business).toMatchObject({
      name: "Youdom Care Hauts-de-Seine",
      address: { "@type": "PostalAddress", postalCode: "92800", addressLocality: "Puteaux" },
      geo: { "@type": "GeoCoordinates" },
      parentOrganization: { "@id": "https://www.youdom-care.com/#organization" },
      areaServed: { "@type": "AdministrativeArea", name: "Hauts-de-Seine" },
    });
    expect(business).not.toHaveProperty("openingHoursSpecification");
    await expectNoSeriousAxeViolations(page);
  });

  test("une agence inconnue renvoie 404", async ({ page }) => {
    const response = await page.goto("/agences/agence-inconnue/");
    expect(response?.status()).toBe(404);
  });
});

test.describe("Page locale (P6.5, données réelles du dépôt)", () => {
  test("les dix blocs, les faits sourcés et l'agence la plus proche", async ({ page }) => {
    const local = await firstLocalPage();
    test.skip(local === null, "aucun territoire rédigé dans data/local et content/local");
    if (!local) return;
    const response = await page.goto(local.chemin);
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(/^Aide à domicile /);
    await expect(page.locator("main")).toHaveAttribute("data-local", local.chemin);
    for (const title of localSections) {
      await expect(
        page
          .locator("main section")
          .getByRole("heading", { level: 2, name: new RegExp(`^${title}`) }),
      ).toHaveCount(1);
    }
    await expect(
      page
        .locator("main section")
        .getByRole("heading", { level: 2, name: /^Oui, nous intervenons / }),
    ).toHaveCount(1);
    await expect(page.locator("[data-local-agence]")).toHaveCount(1);
    await expect(page.locator("[data-local-facts]").first()).toBeVisible();
    await expect(page.locator("[data-fact-source]").first()).toContainText(
      /Source : .+, consulté le/,
    );
    await expect(page.locator("[data-local-editorial]")).toBeVisible();
    await expect(page.getByRole("form")).toBeVisible();
    if (local.statut === "a_relire") {
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
    }
    const { blocks, nodes } = await jsonLdNodes(page);
    expect(nodes.map((node) => node["@type"])).toEqual(
      expect.arrayContaining(["BreadcrumbList", "WebPage", "FAQPage"]),
    );
    expect(blocks.join("\n")).not.toMatch(/null|""|\[\]|\{\}/);
    await expectNoSeriousAxeViolations(page);
  });
});
