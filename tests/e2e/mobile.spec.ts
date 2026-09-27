import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page } from "@playwright/test";
import { axeTags } from "./axe";

/*
 * P9.6 — contrat mobile de D-032 §6 (docs/design/BRIEF_LIQUID_GLASS.md) et docs/07 §4.
 * Chaque gabarit est contrôlé à 320, 390, 430 et 768 px de large en portrait, et en paysage
 * (740 × 360). Sur chaque page et à chaque largeur :
 *
 * 1. aucun défilement horizontal (`scrollWidth <= clientWidth`) ;
 * 2. toutes les cibles interactives visibles font 44 × 44 px au moins ;
 * 3. l'espacement du texte de WCAG 1.4.12 ne provoque aucun débordement horizontal ;
 * 4. la barre d'action mobile et le pied de page sont atteignables (la barre ne recouvre pas la
 *    dernière ligne utile du pied) ;
 * 5. aucune violation axe critique ou sérieuse.
 *
 * Le parcours ne dépend pas du projet Playwright (« mobile » ou « ordinateur ») : il pose
 * lui-même la taille de la fenêtre. Il tourne donc une seule fois par projet, avec les mêmes
 * mesures, ce qui ne coûte qu'un doublon de vérification.
 *
 * Exception de WCAG 2.5.8 appliquée au point 2, « en ligne » : un lien de rendu en ligne posé dans
 * du texte courant — un paragraphe, un élément de liste, une définition, une légende qui contient
 * autre chose que le lien — n'a pas de taille minimale, sa hauteur étant fixée par l'interligne du
 * texte qui l'entoure. C'est la seule exception retenue : un lien seul dans son paragraphe, dans
 * une cellule d'en-tête ou dans une liste de navigation doit faire 44 px. Une case à cocher ou un
 * bouton radio est mesuré par son étiquette, un lien étiré par un pseudo-élément par la carte
 * qu'il recouvre.
 */

/*
 * Le parcours pose lui-même la taille de la fenêtre : le faire tourner sur les deux projets
 * doublerait la durée sans rien mesurer de plus. Il ne tourne donc que sur « desktop ».
 */
test.beforeEach(({}, testInfo) => {
  test.skip(
    testInfo.project.name !== "desktop",
    "Le parcours pose ses propres fenêtres : une seule exécution suffit.",
  );
});

/** Portrait, plus le paysage court du contrat (§6 : 667 px de haut, ici 740 × 360). */
const viewports = [
  { label: "320 px", width: 320, height: 640 },
  { label: "390 px", width: 390, height: 844 },
  { label: "430 px", width: 430, height: 932 },
  { label: "768 px", width: 768, height: 1024 },
  { label: "paysage 740 × 360", width: 740, height: 360 },
] as const;

/** Un gabarit par entrée ; la liste suit celle de `tous-gabarits-axe.spec.ts`. */
const gabarits: ReadonlyArray<[string, string]> = [
  ["accueil", "/"],
  ["pilier personnes âgées", "/personnes-agees/"],
  ["pilier aidants", "/aidants/"],
  ["page pathologie", "/maladies-neurodegeneratives/alzheimer/"],
  ["page service", "/services/garde-malade/"],
  ["rappel", "/etre-rappele/"],
  ["index des formulaires", "/demande/"],
  ["carte régionale", "/aide-a-domicile/"],
  ["page département", "/aide-a-domicile/hauts-de-seine/"],
  ["page commune", "/aide-a-domicile/hauts-de-seine/puteaux/"],
  ["agences (index)", "/agences/"],
  ["page agence", "/agences/puteaux/"],
  ["magazine (index)", "/magazine/"],
  ["article", "/magazine/prevenir-les-chutes-le-tour-du-logement-piece-par-piece/"],
  ["lexique (index)", "/lexique/"],
  ["lexique (terme)", "/lexique/apa/"],
  ["outils (index)", "/outils/"],
  ["outil à imprimer", "/outils/tour-du-logement-anti-chutes/"],
  ["tarifs et aides", "/tarifs-et-aides/"],
  ["page d'aide", "/tarifs-et-aides/apa/"],
  ["plan du site", "/plan-du-site/"],
  ["mentions légales", "/mentions-legales/"],
  ["politique de confidentialité", "/politique-de-confidentialite/"],
  ["cookies", "/cookies/"],
  ["professionnels", "/professionnels/"],
  ["recrutement", "/recrutement/"],
  ["contact", "/contact/"],
  ["prestataire ou mandataire", "/comment-ca-marche/prestataire-ou-mandataire/"],
];

/** Feuille de style de WCAG 1.4.12 (docs/07 §4), injectée pour le contrôle d'espacement. */
const TEXT_SPACING = [
  "*{line-height:1.5 !important;letter-spacing:0.12em !important;word-spacing:0.16em !important}",
  "p{margin-block-end:2em !important}",
].join("");

export interface SmallTarget {
  selecteur: string;
  nom: string;
  largeur: number;
  hauteur: number;
}

/**
 * Cibles interactives visibles dont la surface utile fait moins de 44 px dans une direction.
 * Exécuté dans la page : une seule traversée du DOM, aucun aller-retour par élément.
 */
async function smallTargets(page: Page): Promise<SmallTarget[]> {
  return page.evaluate(() => {
    const vw = document.documentElement.clientWidth;
    const MIN = 43.5; // 44 px moins l'arrondi de mise en page
    const describe = (el: Element): string => {
      const parts: string[] = [];
      let node: Element | null = el;
      for (let i = 0; i < 3 && node !== null; i += 1) {
        let part = node.tagName.toLowerCase();
        if (node.id !== "") part += `#${node.id}`;
        else if (typeof node.className === "string" && node.className.trim() !== "")
          part += `.${node.className.trim().split(/\s+/).slice(0, 4).join(".")}`;
        parts.unshift(part);
        node = node.parentElement;
      }
      return parts.join(" > ");
    };
    /** Lien dont un pseudo-élément couvre la carte entière : la carte est la vraie cible. */
    const isStretched = (el: Element): boolean =>
      ["::after", "::before"].some((pseudo) => {
        const cs = getComputedStyle(el, pseudo);
        if (cs.content === "none" || cs.position !== "absolute") return false;
        return [cs.top, cs.right, cs.bottom, cs.left].every((value) => value === "0px");
      });
    /* Éléments de texte courant : l'interligne du texte qui les remplit contraint la hauteur des
       liens qu'ils contiennent (exception « en ligne » de WCAG 2.5.8). */
    const running = new Set([
      "P",
      "LI",
      "DD",
      "DT",
      "FIGCAPTION",
      "BLOCKQUOTE",
      "CAPTION",
      "LEGEND",
      "SMALL",
      "ADDRESS",
    ]);
    /** Le lien est-il posé dans du texte courant qui contient autre chose que lui ? */
    const inRunningText = (el: Element): boolean => {
      const own = (el.textContent ?? "").trim();
      if (own === "") return false;
      let node = el.parentElement;
      while (node !== null && node !== document.body) {
        if (running.has(node.tagName))
          return (node.textContent ?? "").trim().length > own.length + 1;
        node = node.parentElement;
      }
      return false;
    };

    const found: { selecteur: string; nom: string; largeur: number; hauteur: number }[] = [];
    const controls = document.querySelectorAll(
      "a[href], button:not([disabled]), input:not([type=hidden]):not([disabled])," +
        " select:not([disabled]), textarea:not([disabled]), summary, [role=button]," +
        ' [tabindex]:not([tabindex="-1"])',
    );
    for (const el of controls) {
      if (el.closest("[hidden], [inert], [aria-hidden=true]") !== null) continue;
      if (el.classList.contains("sr-only")) continue;
      const cs = getComputedStyle(el);
      if (cs.visibility === "hidden" || cs.display === "none") continue;
      let rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) continue;
      // Hors de la fenêtre en largeur : champ piège anti-spam, lien d'évitement replié.
      if (rect.right <= 0 || rect.left >= vw) continue;
      if (/^(INPUT|SELECT|TEXTAREA)$/.test(el.tagName)) {
        const label = el.closest("label");
        if (label !== null) rect = label.getBoundingClientRect();
      }
      if (isStretched(el)) {
        let positioned = el.parentElement;
        while (positioned !== null && getComputedStyle(positioned).position === "static")
          positioned = positioned.parentElement;
        if (positioned !== null) rect = positioned.getBoundingClientRect();
      }
      if (rect.width >= MIN && rect.height >= MIN) continue;
      // Exception « en ligne » de WCAG 2.5.8.
      if (cs.display.startsWith("inline") && inRunningText(el)) continue;
      const own = (el.textContent ?? "").trim();
      found.push({
        selecteur: describe(el),
        nom: (el.getAttribute("aria-label") ?? own).slice(0, 60),
        largeur: Math.round(rect.width),
        hauteur: Math.round(rect.height),
      });
    }
    return found;
  });
}

async function horizontalOverflow(page: Page): Promise<number> {
  return page.evaluate(() => {
    const de = document.documentElement;
    return de.scrollWidth - de.clientWidth;
  });
}

/** Largeur des éléments qui dépassent, pour nommer le fautif dans le message d'échec. */
async function overflowCulprits(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const vw = document.documentElement.clientWidth;
    const out: string[] = [];
    for (const el of document.body.querySelectorAll("*")) {
      const cs = getComputedStyle(el);
      if (cs.position === "fixed" || cs.display === "none" || cs.visibility === "hidden") continue;
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) continue;
      if (rect.right <= vw + 1) continue;
      const cls = typeof el.className === "string" ? el.className.slice(0, 80) : "";
      out.push(`${el.tagName.toLowerCase()}.${cls} → ${Math.round(rect.right - vw)} px`);
      if (out.length >= 6) break;
    }
    return out;
  });
}

async function expectNoSeriousAxe(page: Page, where: string) {
  const results = await new AxeBuilder({ page }).withTags(axeTags).analyze();
  const blocking = results.violations.filter(
    (v) => v.impact === "critical" || v.impact === "serious",
  );
  expect(
    blocking,
    `${where} : ${blocking.map((v) => `${v.id} (${v.impact}) ${v.help}`).join(" | ")}`,
  ).toEqual([]);
}

test.describe("Contrat mobile : aucun débordement, cibles de 44 px, espacement du texte", () => {
  for (const [label, chemin] of gabarits) {
    test(`${label} (${chemin})`, async ({ page }) => {
      for (const vp of viewports) {
        await page.setViewportSize({ width: vp.width, height: vp.height });
        const response = await page.goto(chemin);
        expect(response?.status(), `${chemin} @${vp.label}`).toBe(200);
        // Les apparitions en cours décalent les mesures : on attend la fin des animations.
        await page.evaluate(async () => {
          const running = document.getAnimations().filter((a) => a.playState === "running");
          await Promise.race([
            Promise.allSettled(running.map((a) => a.finished)),
            new Promise((resolve) => setTimeout(resolve, 1200)),
          ]);
        });

        const overflow = await horizontalOverflow(page);
        if (overflow > 0) {
          const culprits = await overflowCulprits(page);
          expect(
            overflow,
            `${chemin} @${vp.label} : défilement horizontal de ${overflow} px ; ${culprits.join(" ; ")}`,
          ).toBeLessThanOrEqual(0);
        }

        const small = await smallTargets(page);
        expect(
          small,
          `${chemin} @${vp.label} : cibles sous 44 px : ${small
            .map((t) => `« ${t.nom} » ${t.largeur}×${t.hauteur} (${t.selecteur})`)
            .join(" | ")}`,
        ).toEqual([]);

        // WCAG 1.4.12 : l'espacement forcé ne fait pas déborder la page.
        await page.addStyleTag({ content: TEXT_SPACING });
        const spaced = await horizontalOverflow(page);
        if (spaced > 0) {
          const culprits = await overflowCulprits(page);
          expect(
            spaced,
            `${chemin} @${vp.label} : espacement du texte, débordement de ${spaced} px ; ${culprits.join(" ; ")}`,
          ).toBeLessThanOrEqual(0);
        }
      }
    });
  }
});

test.describe("Barre d'action mobile et pied de page atteignables", () => {
  /** La barre est fixe : elle ne doit jamais recouvrir la dernière ligne utile du pied. */
  for (const vp of viewports) {
    test(`accueil @${vp.label} : le pied de page passe sous la barre d'action`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto("/");
      const bar = page.getByRole("navigation", { name: "Actions rapides" });
      // À partir de 64 rem le rail de conversion prend le relais : la barre disparaît.
      const barVisible = vp.width < 1024;
      if (!barVisible) {
        await expect(bar).toBeHidden();
        return;
      }
      await expect(bar).toBeVisible();

      // Les trois voies de contact restent des cibles de 44 px.
      for (const item of await bar.getByRole("link").all()) {
        const box = await item.boundingBox();
        expect(box, "la barre d'action doit être mesurable").not.toBeNull();
        expect(box?.height ?? 0).toBeGreaterThanOrEqual(43.5);
        expect(box?.width ?? 0).toBeGreaterThanOrEqual(43.5);
      }

      // En bas de page, le dernier lien légal est visible et cliquable, pas sous la barre.
      const legal = page.getByRole("navigation", { name: "Pied de page" }).getByRole("link").last();
      await legal.scrollIntoViewIfNeeded();
      await expect(legal).toBeVisible();
      const gap = await page.evaluate(() => {
        const nav = document.querySelector('nav[aria-label="Pied de page"]');
        const barEl = document.querySelector('nav[aria-label="Actions rapides"]');
        if (nav === null || barEl === null) return null;
        return barEl.getBoundingClientRect().top - nav.getBoundingClientRect().bottom;
      });
      expect(gap, "le pied de page doit pouvoir défiler au-dessus de la barre").not.toBeNull();
      expect(gap ?? -1).toBeGreaterThanOrEqual(0);
    });
  }

  test("la barre s'efface pendant la saisie et ne masque aucun champ", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/etre-rappele/");
    const bar = page.getByRole("navigation", { name: "Actions rapides" });
    await expect(bar).toHaveAttribute("data-field-active", "false");
    await page.getByRole("form").getByLabel("Votre prénom").focus();
    await expect(bar).toHaveAttribute("data-field-active", "true");
  });
});

test.describe("En-tête utilisable d'une main", () => {
  for (const width of [320, 390, 430, 768]) {
    test(`menu à ${width} px : ouverture, cibles, aucun débordement`, async ({ page }) => {
      await page.setViewportSize({ width, height: 700 });
      await page.goto("/");
      const menu = page.getByRole("button", { name: "Menu" });
      await expect(menu).toBeVisible();
      const box = await menu.boundingBox();
      expect(box?.height ?? 0).toBeGreaterThanOrEqual(43.5);
      expect(box?.width ?? 0).toBeGreaterThanOrEqual(43.5);
      await menu.click();
      await expect(page.getByRole("button", { name: "Fermer le menu" })).toBeVisible();
      expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
      const small = await smallTargets(page);
      expect(
        small,
        `menu ouvert à ${width} px : ${small.map((t) => `« ${t.nom} » ${t.largeur}×${t.hauteur}`).join(" | ")}`,
      ).toEqual([]);
      await expectNoSeriousAxe(page, `menu ouvert à ${width} px`);
    });
  }

  test("l'en-tête se densifie au défilement (verre glass-strong)", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    const header = page.locator("header").first();
    await expect(header).toHaveAttribute("data-compact", "false");
    await page.evaluate(() => window.scrollTo(0, 400));
    await expect(header).toHaveAttribute("data-compact", "true");
    await expect(header).toHaveClass(/glass-strong/);
  });
});

test.describe("Tableaux : une liste par ligne sous 48 rem", () => {
  test("semaine type : liste par jour sous 64 rem, tableau réel au-delà", async ({ page }) => {
    for (const width of [320, 390, 430, 768]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/personnes-agees/");
      const planner = page.locator('.week-planner[data-variant="display"]').first();
      await expect(planner.getByRole("table")).toBeHidden();
      await expect(planner.getByText("Lundi").filter({ visible: true })).toHaveCount(1);
      expect(await horizontalOverflow(page), `semaine type à ${width} px`).toBeLessThanOrEqual(0);
    }
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/personnes-agees/");
    const planner = page.locator('.week-planner[data-variant="display"]').first();
    await expect(planner.getByRole("table")).toBeVisible();
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
  });

  test("la grille de saisie de la semaine tient dans la page à chaque largeur", async ({
    page,
  }) => {
    for (const width of [320, 390, 430, 768]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/demande/personne-agee/");
      const form = page.getByRole("form");
      await form.getByRole("radio").first().check();
      for (let step = 0; step < 3; step += 1) {
        await form.getByRole("button", { name: /^(Continuer|J'envoie)/ }).click();
      }
      await expect(form.getByText("Étape 4 sur 5")).toBeVisible();
      expect(await horizontalOverflow(page), `semaine saisie à ${width} px`).toBeLessThanOrEqual(0);
      const small = await smallTargets(page);
      expect(
        small,
        `semaine saisie à ${width} px : ${small.map((t) => `« ${t.nom} » ${t.largeur}×${t.hauteur} (${t.selecteur})`).join(" | ")}`,
      ).toEqual([]);
    }
  });
});

test.describe("Formulaires au pouce : chaque étape à chaque largeur", () => {
  /** Avance d'une étape en remplissant le minimum demandé. */
  async function next(form: Locator) {
    await form.getByRole("button", { name: /^(Continuer|J'envoie)/ }).click();
  }

  for (const width of [320, 390, 430, 768]) {
    test(`demande personne âgée à ${width} px : cinq étapes`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await page.goto("/demande/personne-agee/");
      const form = page.getByRole("form");
      for (let step = 1; step <= 5; step += 1) {
        await expect(form.getByText(`Étape ${step} sur 5`)).toBeVisible();
        expect(
          await horizontalOverflow(page),
          `demande, étape ${step} à ${width} px`,
        ).toBeLessThanOrEqual(0);
        const small = await smallTargets(page);
        expect(
          small,
          `demande, étape ${step} à ${width} px : ${small
            .map((t) => `« ${t.nom} » ${t.largeur}×${t.hauteur} (${t.selecteur})`)
            .join(" | ")}`,
        ).toEqual([]);
        // Chaque champ de saisie occupe toute la largeur de la colonne du formulaire.
        const narrow = await page.evaluate(() => {
          const out: string[] = [];
          for (const field of document.querySelectorAll<
            HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
          >(
            'input[type="text"], input[type="tel"], input[type="email"], input[type="date"], select, textarea',
          )) {
            const parent = field.parentElement;
            if (parent === null) continue;
            const fw = field.getBoundingClientRect().width;
            const pw = parent.getBoundingClientRect().width;
            if (pw > 0 && fw < pw - 2)
              out.push(`${field.name || field.id} ${Math.round(fw)}/${Math.round(pw)}`);
          }
          return out;
        });
        expect(narrow, `champs plus étroits que leur colonne à ${width} px`).toEqual([]);
        if (step === 1) await form.getByRole("radio").first().check();
        if (step === 4) {
          await form.getByRole("radio", { name: "Régulier, chaque semaine" }).check();
          await form.getByRole("radio", { name: "Dans le mois" }).check();
        }
        if (step < 5) await next(form);
      }
      // Les boutons de navigation restent des cibles confortables au pouce.
      for (const name of ["Retour", "J'envoie ma demande"]) {
        const button = form.getByRole("button", { name: new RegExp(`^${name}`) });
        if ((await button.count()) === 0) continue;
        const box = await button.first().boundingBox();
        expect(box?.height ?? 0, `bouton « ${name} » à ${width} px`).toBeGreaterThanOrEqual(43.5);
      }
    });
  }
});

test.describe("Carte d'Île-de-France utilisable au doigt", () => {
  test("la liste des départements passe devant la carte sous 64 rem", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/aide-a-domicile/");
    const map = page.locator("[data-idf-map]");
    const list = page.locator("[data-idf-list]");
    await expect(map).toBeVisible();
    await expect(list).toBeVisible();
    const [mapTop, listTop] = await Promise.all([
      map.evaluate((el) => el.getBoundingClientRect().top),
      list.evaluate((el) => el.getBoundingClientRect().top),
    ]);
    expect(listTop, "la liste équivalente est au-dessus de la carte sur téléphone").toBeLessThan(
      mapTop,
    );
    // Chaque lien de la liste est une cible de 44 px.
    for (const link of await list.getByRole("link").all()) {
      const box = await link.boundingBox();
      expect(box?.height ?? 0).toBeGreaterThanOrEqual(43.5);
    }
  });
});

test.describe("Aucune violation axe critique ou sérieuse à 320 px", () => {
  for (const [label, chemin] of gabarits) {
    test(`${label} à 320 px`, async ({ page }) => {
      await page.setViewportSize({ width: 320, height: 640 });
      await page.goto(chemin);
      await page.evaluate(() => window.scrollTo(0, 0));
      await expectNoSeriousAxe(page, `${chemin} à 320 px`);
    });
  }
});
