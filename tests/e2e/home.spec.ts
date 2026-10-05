import { expect, test } from "@playwright/test";
import siteConfig from "../../content/site.config.json";
import communes from "../../data/idf-communes.json";
import { expectNoSeriousAxeViolations } from "./axe";

test.describe("Accueil (P2.1)", () => {
  test("blocs 1 à 4 : textes de docs/01, six situations, engagements, neuro, axe", async ({
    page,
    isMobile,
  }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Vivre chez soi, bien accompagné. Même quand la maladie ou le handicap compliquent tout.",
    );
    // Le surtitre est `max-lg:hidden` par conception (Hero.tsx, et son test unitaire) : sous
    // 64 rem, la hauteur visible va au titre et à l'action. Ce parcours l'exigeait visible sur
    // mobile aussi, donc à tort (docs/AUDIT_GLOBAL.md §10).
    const surtitre = page.getByText("Aide et accompagnement à domicile · Paris et Île-de-France");
    if (isMobile) {
      await expect(surtitre).toBeHidden();
    } else {
      await expect(surtitre).toBeVisible();
    }

    const situations = page.getByRole("region", { name: "Que vivez-vous en ce moment ?" });
    await expect(situations.locator(".situation-card")).toHaveCount(6);
    await expect(situations.getByRole("link")).toHaveCount(6);

    const engagements = page.getByRole("region", { name: "Ce qui change avec Youdom Care" });
    await expect(engagements.locator("li[data-engagement]")).toHaveCount(4);

    await expect(page.locator(".stage-cards li")).toHaveCount(3);
    await expectNoSeriousAxeViolations(page);
  });

  test("les fonds alternent sans deux fonds teintés à la suite", async ({ page }) => {
    await page.goto("/");
    const tones = await page
      .locator("main > section")
      .evaluateAll((sections) => sections.map((s) => getComputedStyle(s).backgroundColor));
    const paper = "rgb(251, 248, 243)";
    const white = "rgb(255, 255, 255)";
    for (let i = 1; i < tones.length; i += 1) {
      const tinted = (c: string) => c !== paper && c !== white;
      expect(tinted(tones[i] as string) && tinted(tones[i - 1] as string)).toBe(false);
    }
  });
});

test.describe("Accueil (P2.2)", () => {
  test("blocs 5 à 8 : sélecteur d'exemples au clavier, étapes, prix masqué, proches, axe", async ({
    page,
  }) => {
    await page.goto("/#semaine");
    const selector = page.getByRole("group", { name: "Choisir un exemple" });
    const buttons = selector.getByRole("button");
    await expect(buttons).toHaveCount(3);
    await expect(buttons.first()).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator("[data-example=madeleine]")).toBeVisible();
    await buttons.first().focus();
    await page.keyboard.press("Tab");
    await expect(buttons.nth(1)).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(buttons.nth(1)).toHaveAttribute("aria-pressed", "true");
    await expect(buttons.first()).toHaveAttribute("aria-pressed", "false");
    const panel = page.locator("[data-example=noe]");
    await expect(panel).toBeVisible();
    await expect(panel.getByText("Exemple illustratif").filter({ visible: true })).toHaveCount(1);
    await expect(
      panel.getByAltText(
        "Les mains d'un enfant, vu de haut, alignent des cubes de bois colorés sur un plancher",
      ),
    ).toBeVisible();

    await expect(page.locator(".steps-timeline li")).toHaveCount(4);
    await expect(page.locator('.steps-timeline [data-icon="telephone"]')).toHaveCount(1);
    await expect(page.locator("[data-block=tarifs]")).toHaveCount(0);
    await expect(page.getByRole("article", { name: "Les aides possibles" })).toBeVisible();
    await expect(page.getByRole("link", { name: "J'ai besoin de relais" })).toBeVisible();
    await expectNoSeriousAxeViolations(page);
  });
});

test.describe("Accueil (P2.3)", () => {
  test("blocs 9 à 12 : recherche de commune au clavier, appel final, recrutement, axe", async ({
    page,
  }) => {
    await page.goto("/#territoire");
    const input = page.getByRole("combobox", { name: "Votre commune ou votre code postal" });
    await input.fill("Vitry");
    const options = page.getByRole("option");
    await expect(options.first()).toContainText("Vitry-sur-Seine");
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");
    // L'agence la plus proche vient des données (data/idf-communes.json, recalculé le 05/10/2026
    // après le passage à deux agences) : la nommer en dur avait figé « Youdom Care Val-de-Marne »,
    // une agence retirée depuis (docs/AUDIT_GLOBAL.md §9).
    const vitry = communes.communes.find((c) => c.nom === "Vitry-sur-Seine");
    const agenceVitry = siteConfig.agences.find((a) => a.id === vitry?.agence);
    await expect(page.locator("[data-result=oui]")).toHaveText(
      `Oui, nous intervenons à Vitry-sur-Seine. Votre agence la plus proche : ${agenceVitry?.nom}.`,
    );

    await input.fill("Marseille");
    await page.getByRole("button", { name: "Vérifier" }).click();
    await expect(page.locator("[data-result=hors]")).toContainText(
      "Nous intervenons à Paris et en Île-de-France.",
    );

    await expect(page.getByRole("region", { name: "Parlons de votre situation." })).toBeVisible();
    await expect(page.getByRole("link", { name: "Voir les offres" })).toBeVisible();
    await expectNoSeriousAxeViolations(page);
  });
});

test.describe("Accueil (P4b.3 parcours « Pour qui cherchez-vous de l'aide ? »)", () => {
  test("au clavier : « Pour un parent âgé » ouvre le panneau, titre, liens, focus, axe", async ({
    page,
  }) => {
    await page.goto("/");
    const picker = page.getByRole("group", { name: "Pour qui cherchez-vous de l'aide ?" });
    await expect(picker.getByRole("button")).toHaveCount(5);
    const undecided = picker.getByRole("link", { name: "Je ne sais pas encore" });
    await expect(undecided).toHaveAttribute("href", /^\/etre-rappele\/\?motif=inconnu$/);

    const parent = picker.getByRole("button", { name: "Pour un parent âgé" });
    await parent.focus();
    await page.keyboard.press("Enter");
    await expect(parent).toHaveAttribute("aria-pressed", "true");

    const title = page.getByRole("heading", {
      level: 2,
      name: "Vous cherchez de l'aide pour votre parent. Que vivez-vous ?",
    });
    await expect(title).toBeVisible();
    await expect(title).toBeFocused();
    await expect(title).toBeInViewport();

    const region = page.getByRole("region", {
      name: "Vous cherchez de l'aide pour votre parent. Que vivez-vous ?",
    });
    const panel = region.locator("[data-panel=personne-agee]");
    await expect(panel).toBeVisible();
    const links = panel.getByRole("link");
    const count = await links.count();
    expect(count).toBeGreaterThanOrEqual(4);
    expect(count).toBeLessThanOrEqual(6);
    await expect(links.first()).toHaveText("« Elle est tombée deux fois ce mois-ci. »");
    await expect(links.first()).toHaveAttribute("href", /^\/personnes-agees\/?#situations$/);
    // Une situation avec sa destination propre (`href` de l'en-tête) y mène directement.
    await expect(panel.getByRole("link", { name: /je n'y arrive plus/ })).toHaveAttribute(
      "href",
      /^\/aidants\/?$/,
    );
    await expect(links.last()).toHaveText("Autre chose : je décris ma situation");
    await expect(links.last()).toHaveAttribute("href", /^\/demande\/?$/);
    await expect(region.locator("[data-panel=aidant]")).toBeHidden();

    // Les six cartes restent, repliées sous « Toutes les situations ».
    const details = region.locator("details");
    await expect(details.locator("summary")).toHaveText("Toutes les situations");
    await expect(details.locator(".situation-card")).toHaveCount(6);
    await expect(details.locator(".situation-card").first()).toBeHidden();
    await details.locator("summary").click();
    await expect(details.locator(".situation-card").first()).toBeVisible();

    // Tab depuis le titre : le premier lien du panneau vient juste après.
    await title.focus();
    await page.keyboard.press("Tab");
    await expect(links.first()).toBeFocused();

    await expectNoSeriousAxeViolations(page);
  });

  test("en mouvement réduit, la page reste entièrement lisible et immobile", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    // Aucune révélation n'est armée : rien n'est caché, même sous le pli.
    await expect(page.locator(".m-reveal[data-reveal]")).toHaveCount(0);
    const cards = page.locator(".situation-card");
    await expect(cards).toHaveCount(6);
    for (const card of await cards.all()) {
      await expect(card).toHaveCSS("opacity", "1");
    }
    await expect(page.getByRole("region", { name: "Comment ça commence" })).toBeVisible();
    await expect(
      page.getByRole("region", { name: "Et vous, qui prend soin de vous ?" }),
    ).toBeVisible();
    await expect(page.getByRole("region", { name: "Parlons de votre situation." })).toBeVisible();

    // Le choix fait défiler sans animation et déplace le focus.
    await page.getByRole("button", { name: "Pour mon enfant" }).click();
    const title = page.getByRole("heading", {
      level: 2,
      name: "Vous cherchez de l'aide pour votre enfant. Que vivez-vous ?",
    });
    await expect(title).toBeFocused();
    await expect(title).toBeInViewport();
  });
});

test.describe("Accueil (P4b.3 sans JavaScript)", () => {
  test.use({ javaScriptEnabled: false });

  test("le parcours est six liens et toutes les situations restent visibles", async ({ page }) => {
    await page.goto("/");
    const picker = page.getByRole("group", { name: "Pour qui cherchez-vous de l'aide ?" });
    await expect(picker.getByRole("button")).toHaveCount(0);
    const links = picker.getByRole("link");
    await expect(links).toHaveCount(6);
    await expect(links.first()).toHaveAttribute("href", /^\/personnes-agees\/?$/);
    await expect(links.last()).toHaveAttribute("href", /^\/etre-rappele\/\?motif=inconnu$/);
    const situations = page.getByRole("region", { name: "Que vivez-vous en ce moment ?" });
    await expect(situations.locator(".situation-card")).toHaveCount(6);
    await expect(situations.locator(".situation-card").first()).toBeVisible();
    await expect(situations.locator("[data-panel]")).toHaveCount(5);
    await expect(situations.locator("[data-panel]").first()).toBeHidden();
  });
});
