import { expect, test, type Page } from "@playwright/test";
import { expectNoSeriousAxeViolations } from "./axe";

/* Maillage (docs/04 §2, P5.5) : plan du site, page 404 utile, blocs « À lire aussi ». */

const servicePaths = [
  "/maladies-neurodegeneratives/",
  "/maladies-neurodegeneratives/alzheimer/",
  "/maladies-neurodegeneratives/parkinson/",
  "/maladies-neurodegeneratives/sclerose-en-plaques/",
  "/maladies-neurodegeneratives/corps-de-lewy/",
  "/maladies-neurodegeneratives/degenerescence-fronto-temporale/",
  "/maladies-neurodegeneratives/maladie-de-charcot/",
  "/maladies-neurodegeneratives/maladie-de-huntington/",
  "/personnes-agees/",
  "/personnes-agees/aide-a-l-autonomie/",
  "/personnes-agees/vie-quotidienne/",
  "/personnes-agees/compagnie-et-stimulation/",
  "/adultes-en-situation-de-handicap/",
  "/enfants-en-situation-de-handicap/",
  "/enfants-en-situation-de-handicap/autisme/",
  "/enfants-en-situation-de-handicap/polyhandicap/",
  "/enfants-en-situation-de-handicap/handicap-moteur/",
  "/enfants-en-situation-de-handicap/deficience-intellectuelle/",
  "/aidants/",
  "/aidants/solutions-de-repit/",
  "/services/garde-de-nuit/",
  "/services/presence-24h-24/",
  "/services/sortie-d-hospitalisation/",
  "/services/garde-malade/",
  "/services/accompagnement-en-vacances/",
  "/services/remplacement-d-auxiliaire-de-vie/",
];

/** Vrai si `a` précède `b` dans le document. */
async function precedes(page: Page, a: string, b: string): Promise<boolean> {
  return page.evaluate(
    ([first, second]) => {
      const x = document.querySelector(first ?? "");
      const y = document.querySelector(second ?? "");
      if (!x || !y) return false;
      return Boolean(x.compareDocumentPosition(y) & Node.DOCUMENT_POSITION_FOLLOWING);
    },
    [a, b],
  );
}

test.describe("Maillage (P5.5)", () => {
  test("/plan-du-site/ : groupes, piliers puis sous-pages en retrait, liens vers les 26 pages services, axe", async ({
    page,
  }) => {
    const response = await page.goto("/plan-du-site/");
    expect(response?.status()).toBe(200);
    await expect(page).toHaveTitle(/Plan du site/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    await expect(page.getByRole("navigation", { name: "Fil d’Ariane" })).toBeVisible();
    for (const title of [
      "Accueil et fonctionnement",
      "Pour qui ?",
      "Nos services",
      "Aidants",
      "Décrire votre situation",
      "À propos",
    ]) {
      await expect(page.locator("main").getByRole("navigation", { name: title })).toBeVisible();
    }
    // Phase 8 : les pages légales sont construites, le groupe existe désormais.
    await expect(
      page.locator("main").getByRole("navigation", { name: "Pages légales" }),
    ).toBeVisible();
    const plan = page.locator("[data-plan-du-site]");
    for (const chemin of servicePaths) {
      await expect(plan.locator(`a[href="${chemin}"]`), chemin).toHaveCount(1);
    }
    // Sous-pages en retrait : liste imbriquée sous le pilier.
    const pourQui = page.locator("main").getByRole("navigation", { name: "Pour qui ?" });
    await expect(pourQui.locator('li:has(> a[href="/personnes-agees/"]) > ul a')).toHaveCount(3);
    await expect(
      pourQui.locator('li:has(> a[href="/maladies-neurodegeneratives/"]) > ul a'),
    ).toHaveCount(7);
    // Aidants : le pilier, le répit, « Où en êtes-vous ? ».
    const aidants = page.locator("main").getByRole("navigation", { name: "Aidants" });
    await expect(aidants.locator('a[href="/aidants/ou-en-etes-vous/"]')).toHaveCount(1);
    // Formulaires et pages de fonctionnement.
    for (const href of [
      "/demande/",
      "/demande/personne-agee/",
      "/demande/sortie-d-hospitalisation/",
      "/demande/professionnel/",
      "/etre-rappele/",
      "/contact/",
      "/comment-ca-marche/prestataire-ou-mandataire/",
      "/tarifs-et-aides/apa/",
      "/a-propos/charte-editoriale/",
    ]) {
      await expect(plan.locator(`a[href="${href}"]`), href).toHaveCount(1);
    }
    // Jamais les pages non indexées.
    await expect(plan.locator('a[href^="/merci/"], a[href^="/styleguide/"]')).toHaveCount(0);
    await expectNoSeriousAxeViolations(page);
  });

  test("404 : statut 404 sans redirection, noindex, un H1, recherche de commune, téléphone, cinq piliers, plan du site, rappel, axe", async ({
    page,
  }) => {
    const response = await page.goto("/cette-page-n-existe-pas/");
    expect(response?.status()).toBe(404);
    expect(response?.request().redirectedFrom()).toBeNull();
    await expect(page).toHaveTitle(/Page introuvable/);
    await expect(page.locator('meta[name="robots"]').first()).toHaveAttribute("content", /noindex/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Cette page n'existe pas, ou plus",
    );
    const main = page.locator("main[data-page='404']");
    await expect(
      main.getByRole("combobox", { name: "Votre commune ou votre code postal" }),
    ).toBeVisible();
    await expect(main.locator('a[href="tel:+33184801703"]').first()).toBeVisible();
    const piliers = main.locator("[data-piliers] a");
    await expect(piliers).toHaveCount(5);
    await expect(main.locator("[data-piliers] a [data-icon]")).toHaveCount(5);
    await expect(piliers.nth(0)).toHaveAttribute("href", "/maladies-neurodegeneratives/");
    await expect(piliers.nth(4)).toHaveAttribute("href", "/aidants/");
    await expect(main.getByRole("link", { name: "Voir le plan du site" })).toHaveAttribute(
      "href",
      "/plan-du-site/",
    );
    await expect(main.getByRole("link", { name: "Être rappelé(e)" })).toHaveAttribute(
      "href",
      "/etre-rappele/",
    );
    await expectNoSeriousAxeViolations(page);
    // La recherche de commune fonctionne depuis la 404.
    const input = main.getByRole("combobox", { name: "Votre commune ou votre code postal" });
    await input.fill("Puteaux");
    await input.press("Enter");
    await expect(main.locator("[data-result='oui']")).toContainText("Puteaux");
  });

  for (const chemin of [
    "/maladies-neurodegeneratives/alzheimer/",
    "/personnes-agees/",
    "/services/garde-de-nuit/",
    "/aidants/solutions-de-repit/",
  ]) {
    test(`${chemin} : « À lire aussi » avant le formulaire, 3 à 6 liens vers des pages existantes, sans la page elle-même`, async ({
      page,
    }) => {
      await page.goto(chemin);
      const nav = page.getByRole("navigation", { name: "À lire aussi" });
      await expect(nav).toHaveCount(1);
      const links = nav.getByRole("link");
      const count = await links.count();
      expect(count).toBeGreaterThanOrEqual(3);
      expect(count).toBeLessThanOrEqual(6);
      const hrefs = await links.evaluateAll((elements) =>
        elements.map((element) => element.getAttribute("href") ?? ""),
      );
      expect(new Set(hrefs).size).toBe(hrefs.length);
      expect(hrefs).not.toContain(chemin);
      for (const href of hrefs) {
        expect(href, href).toMatch(/^\/[a-z0-9-]+(?:\/[a-z0-9-]+)*\/$/);
        const target = await page.request.get(href);
        expect(target.status(), href).toBe(200);
      }
      // Titres non vides, icônes sur les cartes, révélations sans rien de caché.
      for (let i = 0; i < count; i += 1) {
        expect((await links.nth(i).innerText()).trim().length).toBeGreaterThan(0);
      }
      expect(await nav.locator("[data-icon]").count()).toBeGreaterThanOrEqual(3);
      await expect(page.locator('[data-reveal="pending"]:not(:visible)')).toHaveCount(0);
      expect(await precedes(page, "#faq", "#a-lire-aussi")).toBe(true);
      expect(await precedes(page, "#a-lire-aussi", "#formulaire")).toBe(true);
      // « Pages proches » ne répète pas les sœurs : retour au pilier et commune seulement.
      const proches = page.getByRole("navigation", { name: "Pages proches" });
      const prochesHrefs = await proches
        .getByRole("link")
        .evaluateAll((elements) => elements.map((element) => element.getAttribute("href") ?? ""));
      for (const href of prochesHrefs) expect(hrefs, href).not.toContain(href);
      expect(prochesHrefs).toContain("/aide-a-domicile/");
    });
  }

  test("les sœurs déclarées sont dans « À lire aussi » (sclérose en plaques → Parkinson et adultes en situation de handicap)", async ({
    page,
  }) => {
    await page.goto("/maladies-neurodegeneratives/sclerose-en-plaques/");
    const nav = page.getByRole("navigation", { name: "À lire aussi" });
    await expect(nav.locator('a[href="/maladies-neurodegeneratives/parkinson/"]')).toHaveCount(1);
    await expect(nav.locator('a[href="/adultes-en-situation-de-handicap/"]')).toHaveCount(1);
    await expect(nav.locator("a")).toHaveCount(6);
  });
});
