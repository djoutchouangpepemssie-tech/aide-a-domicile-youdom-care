import { expect, test, type Page } from "@playwright/test";
import { expectNoSeriousAxeViolations } from "./axe";

const sections = [
  "Vous vous reconnaissez ?",
  "Ce que nous faisons, concrètement",
  "Un accompagnement qui évolue",
  "Exemple de semaine",
  "Le suivi",
  "Et pour vous, les proches",
  "Qui intervient ?",
  "Ce que nous ne faisons pas",
  "Combien ça coûte, quelles aides ?",
  "Questions fréquentes",
  "Décrire votre situation",
  "Sources et relecture",
];

/** Vrai si l'élément est, au moins en partie, dans la fenêtre. */
async function isInViewport(page: Page, selector: string): Promise<boolean> {
  return page.locator(selector).evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return rect.bottom > 0 && rect.top < window.innerHeight;
  });
}

test.describe("Pages services (P4)", () => {
  for (const chemin of [
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
  ]) {
    test(`${chemin} : 13 sections, bandeau de relecture, noindex tant que non relue, axe`, async ({
      page,
    }) => {
      const response = await page.goto(chemin);
      expect(response?.status()).toBe(200);
      await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
      // D-034 et D-035 : aucun bandeau d'attente, et la page est indexable.
      await expect(page.locator('meta[name="robots"]')).toHaveCount(0);
      await expect(page.getByText(/attend sa relecture/)).toHaveCount(0);
      for (const title of sections) {
        await expect(
          page.locator("main section").getByRole("heading", { level: 2, name: title, exact: true }),
        ).toHaveCount(1);
      }
      await expect(
        page.getByText("Exemple illustratif").filter({ visible: true }).first(),
      ).toBeVisible();
      await expect(page.getByRole("form")).toBeVisible();
      // Icônes des quatre rubriques d'action (section 3) et rien de caché par les révélations.
      for (const icon of [
        "action-gestes",
        "action-presence",
        "action-lien",
        "action-coordination",
      ]) {
        await expect(page.locator(`[data-rubrique] [data-icon="${icon}"]`)).toHaveCount(1);
      }
      await expect(page.locator('[data-reveal="pending"]:not(:visible)')).toHaveCount(0);
      // Section 9 en encart frontière (une décision, pas une alerte) ; section 13 avec la carte
      // de relecture qui dit que la page attend son relecteur.
      const frontiere = page.locator('[data-section="ne-faisons-pas"][data-variant="frontiere"]');
      await expect(frontiere).toHaveCount(1);
      await expect(frontiere).toContainText("Et avec qui nous travaillons pour cela.");
      await expect(frontiere).toContainText(
        "Nous nous coordonnons avec ces acteurs ; nous ne les remplaçons pas.",
      );
      const review = page.locator(".sources-review");
      await expect(review).toContainText("Écrit par");
      await expect(review).toContainText("En attente de relecture par un professionnel.");
      await expect(review).toContainText("Mise à jour le");
      await expectNoSeriousAxeViolations(page);
    });
  }

  test("/personnes-agees/ : l'encart frontière a deux colonnes quand un relais est nommé, et une situation-lien", async ({
    page,
    isMobile,
  }) => {
    await page.goto("/personnes-agees/");
    const frontiere = page.locator('[data-section="ne-faisons-pas"][data-variant="frontiere"]');
    await frontiere.scrollIntoViewIfNeeded();
    // Le relais reste lisible (« → les professionnels de santé… ») ; l'en-tête des colonnes
    // n'apparaît qu'à partir de 48 rem.
    await expect(
      frontiere.getByText(/les professionnels de santé et le service de soins/),
    ).toBeVisible();
    if (isMobile) {
      await expect(frontiere.getByText("Qui le fait", { exact: true })).toBeHidden();
    } else {
      await expect(frontiere.getByText("Qui le fait", { exact: true })).toBeVisible();
      await expect(frontiere.getByText("Nous ne faisons pas", { exact: true })).toBeVisible();
    }
    // La ligne de fin n'est portée que par l'encart : le corps MDX ne la répète pas.
    await expect(
      page.getByText("Nous nous coordonnons avec ces acteurs ; nous ne les remplaçons pas."),
    ).toHaveCount(1);
    // Section 2 : l'aidant épuisé mène à l'espace Aidants, la sortie d'hôpital au formulaire
    // express (relecture 4b) ; les autres situations restent des cartes.
    const situationLinks = page.locator("[data-situation] a");
    await expect(situationLinks).toHaveCount(2);
    await expect(situationLinks.first()).toHaveAttribute("href", "/aidants/");
    await expect(situationLinks.last()).toHaveAttribute(
      "href",
      "/demande/sortie-d-hospitalisation/",
    );
    // Section 4 : les stades portent leurs icônes selon le public.
    await expect(page.locator('#stade-1 [data-icon="lever"]')).toHaveCount(1);
    await expect(page.locator('#stade-3 [data-icon="nuit"]')).toHaveCount(1);
    await expectNoSeriousAxeViolations(page);
  });

  test("/personnes-agees/ : le sélecteur de lecteur (56 px) bascule le chapô et la photo", async ({
    page,
  }) => {
    await page.goto("/personnes-agees/");
    const group = page.getByRole("group", { name: "Vous cherchez de l’aide" });
    const proche = group.getByRole("button", { name: "pour un proche" });
    const soi = group.getByRole("button", { name: "pour vous-même" });
    await expect(proche).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator("[data-reader=proche]")).toBeVisible();
    expect((await soi.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(56);
    await soi.click();
    await expect(soi).toHaveAttribute("aria-pressed", "true");
    await expect(proche).toHaveAttribute("aria-pressed", "false");
    await expect(page.locator("[data-reader=soi]")).toContainText("rester chez vous");
    await expect(page.locator("[data-reader-photo=soi]")).toHaveCount(1);
    await expectNoSeriousAxeViolations(page);
  });

  test("/maladies-neurodegeneratives/ : « Où en est la maladie ? » au clavier, sept liens-icônes", async ({
    page,
  }) => {
    await page.goto("/maladies-neurodegeneratives/");
    const group = page.getByRole("group", { name: "Où en est la maladie ?" });
    await expect(group).toHaveAttribute("data-enhanced", "true");
    const choices = group.getByRole("button");
    await expect(choices).toHaveCount(3);
    await expect(group.getByRole("link")).toHaveCount(0);
    expect((await choices.nth(0).boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(56);

    // Clavier : focus sur le deuxième choix, Entrée.
    await choices.nth(1).focus();
    await page.keyboard.press("Enter");
    await expect(choices.nth(1)).toHaveAttribute("aria-pressed", "true");
    await expect(choices.nth(0)).toHaveAttribute("aria-pressed", "false");
    await expect(page.locator("#stade-2")).toHaveAttribute("data-active", "true");
    await expect(page.locator("#stade-1")).not.toHaveAttribute("data-active", /.*/);
    await expect.poll(() => isInViewport(page, "#stade-2")).toBe(true);

    // Espace sur le troisième : la marque change de carte.
    await choices.nth(2).focus();
    await page.keyboard.press("Space");
    await expect(choices.nth(2)).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator("#stade-3")).toHaveAttribute("data-active", "true");
    await expect(page.locator("#stade-2")).not.toHaveAttribute("data-active", /.*/);

    const nav = page.getByRole("navigation", { name: "Aller à la page qui vous concerne" });
    await expect(nav.getByRole("link")).toHaveCount(7);
    await expect(nav.getByRole("link", { name: "Parkinson" })).toHaveAttribute(
      "href",
      "/maladies-neurodegeneratives/parkinson/",
    );
    await expect(nav.locator("[data-icon]")).toHaveCount(7);
    await expectNoSeriousAxeViolations(page);
  });

  test("/maladies-neurodegeneratives/alzheimer/ : le geste en mouvement réduit défile sans animation", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/maladies-neurodegeneratives/alzheimer/");
    const group = page.getByRole("group", { name: "Où en est la maladie ?" });
    await group.getByRole("button").nth(2).click();
    await expect(page.locator("#stade-3")).toHaveAttribute("data-active", "true");
    await expect.poll(() => isInViewport(page, "#stade-3")).toBe(true);
    await expect(page.locator("[data-reveal]")).toHaveCount(0);
    await expectNoSeriousAxeViolations(page);
  });

  test("/adultes-en-situation-de-handicap/ : « Quand voulez-vous de l'aide ? » mène au formulaire avec ?planning=", async ({
    page,
  }) => {
    await page.goto("/adultes-en-situation-de-handicap/");
    const group = page.getByRole("group", { name: "Quand voulez-vous de l'aide ?" });
    const links = group.getByRole("link");
    await expect(links).toHaveCount(4);
    await expect(links.nth(0)).toHaveAttribute(
      "href",
      "/demande/adulte-handicap/?planning=matin-soir",
    );
    await expect(links.nth(3)).toHaveAttribute("href", "/demande/adulte-handicap/?planning=24h");
    expect((await links.nth(0).boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(56);
    await expectNoSeriousAxeViolations(page);
    await links.nth(1).focus();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/demande\/adulte-handicap\/\?planning=semaine$/);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("/enfants-en-situation-de-handicap/ : la fiche de vie se retourne, quatre liens-icônes", async ({
    page,
    isMobile,
  }) => {
    await page.goto("/enfants-en-situation-de-handicap/");
    const card = page.locator('[data-gesture="fiche-de-vie"]');
    await expect(card).not.toHaveAttribute("data-stacked", /.*/);
    const front = card.locator('[data-face="recto"]');
    const back = card.locator('[data-face="verso"]');
    await expect(back).toHaveAttribute("inert", "");
    const box = await front.boundingBox();
    expect(box?.width).toBeLessThanOrEqual(320);
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(200);

    const flip = card.getByRole("button", { name: "Voir ce qu'elle contient" });
    await flip.focus();
    await page.keyboard.press("Enter");
    await expect(flip).toHaveAttribute("aria-pressed", "true");
    await expect(card).toHaveAttribute("data-flipped", "true");
    await expect(front).toHaveAttribute("inert", "");
    await expect(back).not.toHaveAttribute("inert", /.*/);
    await expect(back).toBeFocused();
    await expect(back.getByText("Ses protocoles")).toBeVisible();
    await back.getByRole("button", { name: "Revenir au recto" }).click();
    await expect(card).not.toHaveAttribute("data-flipped", /.*/);
    await expect(front).toBeFocused();

    // Le lien sous la carte n'existe que sous 64 rem : au-dessus, le bouton principal du hero
    // porte le même appel (relecture 4b).
    const sheetLink = card.locator("a", { hasText: "Je décris les besoins de mon enfant" });
    await expect(sheetLink).toHaveCount(1);
    await expect(sheetLink).toHaveAttribute("href", "/demande/enfant-handicap/");
    if (isMobile) await expect(sheetLink).toBeVisible();
    else await expect(sheetLink).toBeHidden();
    const nav = page.getByRole("navigation", { name: "Aller à la page qui vous concerne" });
    await expect(nav.getByRole("link")).toHaveCount(4);
    await expect(nav.getByRole("link", { name: "Autisme" })).toHaveAttribute(
      "href",
      "/enfants-en-situation-de-handicap/autisme/",
    );
    await expectNoSeriousAxeViolations(page);
  });

  test("/enfants-en-situation-de-handicap/ : en mouvement réduit, les deux faces sont empilées", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/enfants-en-situation-de-handicap/");
    const card = page.locator('[data-gesture="fiche-de-vie"]');
    await expect(card).toHaveAttribute("data-stacked", "true");
    await expect(card.locator("[inert]")).toHaveCount(0);
    await expect(card.getByText("La fiche de vie de votre enfant")).toBeVisible();
    await expect(card.getByText("Ce qu'il aime")).toBeVisible();
    await expect(card.getByText("Ses protocoles")).toBeVisible();
    await expect(card.getByRole("button", { name: "Revenir au recto" })).toHaveCount(0);
    await card.getByRole("button", { name: "Voir ce qu'elle contient" }).click();
    await expect(card.locator('[data-face="verso"]')).toBeFocused();
    await expect(card).not.toHaveAttribute("data-flipped", /.*/);
    await expectNoSeriousAxeViolations(page);
  });

  test("/aidants/ : la première question du questionnaire mène à la page avec ?q1=", async ({
    page,
  }) => {
    await page.goto("/aidants/");
    const group = page.locator('[data-gesture="questionnaire"]');
    await expect(group).toContainText("Vous réveillez-vous fatigué");
    await expect(group.getByText("Pas un test médical. Rien n'est conservé.")).toBeVisible();
    const links = group.getByRole("link");
    await expect(links).toHaveCount(3);
    await expect(links.nth(0)).toHaveAttribute("href", "/aidants/ou-en-etes-vous/?q1=0");
    await expect(links.nth(2)).toHaveAttribute("href", "/aidants/ou-en-etes-vous/?q1=2");
    // Le bouton principal du hero est visible à toutes les tailles (D-032 : agir sans défiler).
    const primary = page.locator(".hero [data-hero-primary] a", {
      hasText: "J'ai besoin de relais",
    });
    await expect(primary).toHaveCount(1);
    await expect(primary).toBeVisible();
    await expectNoSeriousAxeViolations(page);
    await links.nth(1).focus();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/aidants\/ou-en-etes-vous\/\?q1=1$/);
    await expect(page.getByRole("heading", { level: 1, name: "Où en êtes-vous ?" })).toBeVisible();
  });

  test("/services/garde-de-nuit/ : nuit calme ou nuit active, sur fond sombre", async ({
    page,
  }) => {
    await page.goto("/services/garde-de-nuit/");
    await expect(page.locator('[data-hero-tone="sombre"]')).toHaveCount(1);
    const group = page.getByRole("group", { name: "Nuit calme ou nuit active ?" });
    await expect(
      group.getByText("L'intervenant dort sur place et se lève au besoin."),
    ).toBeVisible();
    await expect(group.getByText("L'intervenant veille, éveillé.")).toBeVisible();
    await expect(group.getByRole("link", { name: "Nuit calme" })).toHaveAttribute(
      "href",
      "/demande/nuit-et-24h/?nuit=calme",
    );
    await expect(group.getByRole("link", { name: "Nuit active" })).toHaveAttribute(
      "href",
      "/demande/nuit-et-24h/?nuit=active",
    );
    await expectNoSeriousAxeViolations(page);
    await group.getByRole("link", { name: "Nuit active" }).focus();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/demande\/nuit-et-24h\/\?nuit=active$/);
  });

  test("/services/presence-24h-24/ : « Combien de temps ? » avec ?duree=", async ({ page }) => {
    await page.goto("/services/presence-24h-24/");
    const group = page.getByRole("group", { name: "Combien de temps ?" });
    const links = group.getByRole("link");
    await expect(links).toHaveCount(3);
    await expect(links.nth(0)).toHaveAttribute("href", "/demande/nuit-et-24h/?duree=jours");
    await expect(links.nth(2)).toHaveAttribute("href", "/demande/nuit-et-24h/?duree=durable");
    await expect(page.getByRole("group", { name: "Nuit calme ou nuit active ?" })).toHaveCount(0);
    await expectNoSeriousAxeViolations(page);
  });

  test("/services/sortie-d-hospitalisation/ : « Quand est la sortie ? » sans délai promis", async ({
    page,
  }) => {
    await page.goto("/services/sortie-d-hospitalisation/");
    const group = page.getByRole("group", { name: "Quand est la sortie ?" });
    const links = group.getByRole("link");
    await expect(links).toHaveCount(3);
    await expect(links.nth(0)).toHaveAttribute(
      "href",
      "/demande/sortie-d-hospitalisation/?sortie=demain",
    );
    await expect(links.nth(2)).toHaveAttribute(
      "href",
      "/demande/sortie-d-hospitalisation/?sortie=a-confirmer",
    );
    await expect(group).not.toContainText(/48 ?h|délai/i);
    // Idem : le bouton principal du hero est visible à toutes les tailles (D-032).
    const primary = page.locator(".hero [data-hero-primary] a", {
      hasText: "Je prépare un retour à domicile",
    });
    await expect(primary).toHaveCount(1);
    await expect(primary).toBeVisible();
    await expectNoSeriousAxeViolations(page);
    await links.nth(2).focus();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/demande\/sortie-d-hospitalisation\/\?sortie=a-confirmer$/);
  });

  test("sans JavaScript : les gestes restent des liens et rien n'est caché", async ({
    browser,
  }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    try {
      await page.goto("/maladies-neurodegeneratives/");
      const group = page.getByRole("group", { name: "Où en est la maladie ?" });
      await expect(
        group.getByRole("link", { name: "Elle avance, il faut sécuriser" }),
      ).toHaveAttribute("href", "#stade-2");
      await expect(group.getByRole("button")).toHaveCount(0);
      await expect(page.locator("#stade-2")).toHaveCount(1);
      await expect(page.locator("[data-situation]").first()).toBeVisible();
      await expect(page.locator("[data-reveal]")).toHaveCount(0);

      await page.goto("/enfants-en-situation-de-handicap/");
      const card = page.locator('[data-gesture="fiche-de-vie"]');
      await expect(card).toHaveAttribute("data-stacked", "true");
      await expect(card.getByText("Comment il communique")).toBeVisible();
      await expect(card.locator("[inert]")).toHaveCount(0);
    } finally {
      await context.close();
    }
  });

  test("le rail de conversion accompagne les sections 2 à 11 sans chevaucher le hero ni les cartes", async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, "rail réservé aux grands écrans");
    await page.goto("/personnes-agees/");
    const rail = page.getByRole("complementary", { name: "Nous joindre" });
    // En haut de page, le rail attend sous le hero : hors de l'écran, jamais dessus.
    const viewport = page.viewportSize();
    const atTop = await rail.boundingBox();
    expect(atTop).not.toBeNull();
    if (atTop && viewport) expect(atTop.y).toBeGreaterThanOrEqual(viewport.height);
    await page.locator("#situations").scrollIntoViewIfNeeded();
    await expect(rail).toBeVisible();
    await expect(rail).toHaveAttribute("data-state", "visible");
    await expect(rail.getByRole("link", { name: "Je décris ma situation" })).toHaveAttribute(
      "href",
      "#formulaire",
    );
    const railBox = await rail.boundingBox();
    const switchBox = await page
      .getByRole("group", { name: "Vous cherchez de l’aide" })
      .boundingBox();
    expect(railBox).not.toBeNull();
    expect(switchBox).not.toBeNull();
    if (railBox && switchBox) expect(switchBox.y + switchBox.height).toBeLessThan(railBox.y);
    const cards = page.locator("[data-situation]");
    for (let i = 0; i < (await cards.count()); i += 1) {
      const box = await cards.nth(i).boundingBox();
      if (box && railBox) expect(box.x + box.width).toBeLessThanOrEqual(railBox.x + 1);
    }
    await page.locator("#formulaire").scrollIntoViewIfNeeded();
    await expect(rail).toHaveAttribute("data-state", "hidden");
    // Après le formulaire (section 13), le rail est resté dans sa zone : au-dessus de l'écran.
    await page.locator("#sources").scrollIntoViewIfNeeded();
    const atEnd = await rail.boundingBox();
    if (atEnd) expect(atEnd.y + atEnd.height).toBeLessThanOrEqual(0);
  });

  test("/maladies-neurodegeneratives/alzheimer/ : JSON-LD Organization, BreadcrumbList, Service, WebPage et FAQPage (P5.2)", async ({
    page,
  }) => {
    await page.goto("/maladies-neurodegeneratives/alzheimer/");
    const blocks = await page
      .locator('script[type="application/ld+json"]')
      .evaluateAll((scripts) => scripts.map((s) => s.textContent ?? ""));
    const nodes = blocks.map((block) => JSON.parse(block) as Record<string, unknown>);
    const types = nodes.map((node) => node["@type"]);
    expect(types.filter((t) => t === "Organization")).toHaveLength(1);
    expect(types).toEqual(
      expect.arrayContaining(["BreadcrumbList", "Service", "WebPage", "FAQPage"]),
    );
    // Page non relue : jamais de MedicalWebPage ; aucun type interdit, aucune valeur vide.
    expect(types).not.toContain("MedicalWebPage");
    expect(blocks.join("\n")).not.toMatch(/"(Review|AggregateRating)"|null|""|\[\]|\{\}/);
    const breadcrumb = nodes.find((node) => node["@type"] === "BreadcrumbList");
    const items = breadcrumb?.itemListElement as { position: number; item?: string }[];
    expect(items.map((item) => item.position)).toEqual([1, 2, 3]);
    expect(items[0]?.item).toMatch(/^https:\/\//);
    expect(items[1]?.item).toMatch(/^https:\/\/.+\/maladies-neurodegeneratives\/$/);
  });

  test("/personnes-agees/ : « À lire aussi » entre la FAQ et le formulaire, sœurs et services conseillés (P5.5)", async ({
    page,
  }) => {
    await page.goto("/personnes-agees/");
    const nav = page.getByRole("navigation", { name: "À lire aussi" });
    await expect(nav).toBeVisible();
    const hrefs = await nav
      .getByRole("link")
      .evaluateAll((elements) => elements.map((element) => element.getAttribute("href") ?? ""));
    expect(hrefs.length).toBeGreaterThanOrEqual(3);
    expect(hrefs.length).toBeLessThanOrEqual(6);
    // Sous-pages d'abord, puis les sœurs déclarées (neuro, aidants), puis un service conseillé.
    expect(hrefs.slice(0, 3)).toEqual([
      "/personnes-agees/aide-a-l-autonomie/",
      "/personnes-agees/vie-quotidienne/",
      "/personnes-agees/compagnie-et-stimulation/",
    ]);
    expect(hrefs).toContain("/maladies-neurodegeneratives/");
    expect(hrefs).toContain("/aidants/");
    expect(hrefs).toContain("/services/garde-de-nuit/");
    await expect(nav.locator('a[href="/services/garde-de-nuit/"]')).toContainText("Nos services");
    await expect(nav.locator("a [data-icon]")).toHaveCount(hrefs.length);
    const order = await page.evaluate(() => {
      const ids = ["faq", "a-lire-aussi", "formulaire"].map((id) => document.getElementById(id));
      return ids.every((element, index) => {
        const previous = ids[index - 1];
        if (element === null) return false;
        if (index === 0 || !previous) return index === 0;
        return Boolean(
          previous.compareDocumentPosition(element) & Node.DOCUMENT_POSITION_FOLLOWING,
        );
      });
    });
    expect(order).toBe(true);
    await expectNoSeriousAxeViolations(page);
  });

  test("un chemin inconnu renvoie 404", async ({ page }) => {
    const response = await page.goto("/maladies-neurodegeneratives/inconnue/");
    expect(response?.status()).toBe(404);
  });
});
