import { expect, test, type Locator, type Page, type TestInfo } from "@playwright/test";
import { expectNoSeriousAxeViolations } from "./axe";

/*
 * P9.2 : axe sur tous les gabarits du site (une page par gabarit), sur mobile (Pixel 7) et sur
 * ordinateur, avec les règles WCAG 2.0, 2.1 et 2.2 niveau AA et les bonnes pratiques d'axe.
 * Seuil bloquant : 0 violation critique ou sérieuse (docs/07 §4). Les violations modérées et
 * mineures sont consignées en annotations du rapport (`axe-moderate`, `axe-minor`) sans faire
 * échouer le parcours. Les formulaires sont analysés à chaque étape et en état d'erreur ; aucune
 * demande n'est envoyée (les formulaires sont soumis vides ou interrompus avant la dernière
 * étape ; la panne d'envoi est simulée par une route 503). Données fictives : « Test Essai ».
 *
 * Le parcours vérifie aussi les corrections de l'audit P8.4 reprises en phase 9 : R-1 régions et
 * navigations aux noms uniques, R-2 annonce du sélecteur de lecteur, R-3 taille des liens légaux
 * du pied de page, R-4 focus sur l'alerte de panne d'envoi, 10.12 espacement du texte.
 */

const introuvable = "/cette-page-n-existe-pas/";

/** Une page par gabarit (docs/07 §4 élargi en P9.2). */
const gabarits: ReadonlyArray<[string, string]> = [
  ["accueil", "/"],
  ["pilier personnes âgées (sélecteur de lecteur)", "/personnes-agees/"],
  ["pilier aidants", "/aidants/"],
  ["page pathologie", "/maladies-neurodegeneratives/alzheimer/"],
  ["sous-page de pilier", "/personnes-agees/aide-a-l-autonomie/"],
  ["page service", "/services/garde-malade/"],
  ["où en êtes-vous ? (aidants)", "/aidants/ou-en-etes-vous/"],
  ["index des formulaires", "/demande/"],
  ["merci (demande détaillée)", "/merci/personne-agee/"],
  ["merci (rappel)", "/merci/rappel/"],
  ["carte régionale", "/aide-a-domicile/"],
  ["page département", "/aide-a-domicile/hauts-de-seine/"],
  ["page commune", "/aide-a-domicile/hauts-de-seine/puteaux/"],
  ["page arrondissement", "/aide-a-domicile/paris/12e-arrondissement/"],
  ["agences (index)", "/agences/"],
  ["page agence", "/agences/puteaux/"],
  ["magazine (index)", "/magazine/"],
  ["magazine (page 2)", "/magazine/page/2/"],
  ["magazine (rubrique)", "/magazine/categorie/comprendre/"],
  ["article", "/magazine/prevenir-les-chutes-le-tour-du-logement-piece-par-piece/"],
  ["lexique (index)", "/lexique/"],
  ["lexique (terme)", "/lexique/apa/"],
  ["outils (index)", "/outils/"],
  ["outil à imprimer", "/outils/tour-du-logement-anti-chutes/"],
  ["tarifs et aides", "/tarifs-et-aides/"],
  ["page d'aide", "/tarifs-et-aides/apa/"],
  ["comment ça marche", "/comment-ca-marche/"],
  ["prestataire ou mandataire", "/comment-ca-marche/prestataire-ou-mandataire/"],
  ["à propos", "/a-propos/"],
  ["nos engagements", "/a-propos/nos-engagements/"],
  ["charte éditoriale", "/a-propos/charte-editoriale/"],
  ["professionnels", "/professionnels/"],
  ["recrutement", "/recrutement/"],
  ["mentions légales", "/mentions-legales/"],
  ["politique de confidentialité", "/politique-de-confidentialite/"],
  ["conditions générales", "/conditions-generales/"],
  ["cookies", "/cookies/"],
  ["déclaration d'accessibilité", "/accessibilite/"],
  ["plan du site", "/plan-du-site/"],
  ["page introuvable (404)", introuvable],
  ["styleguide", "/styleguide/"],
  ["styleguide : blocs", "/styleguide/blocs/"],
  ["styleguide : icônes", "/styleguide/icones/"],
  ["styleguide : mouvement", "/styleguide/mouvement/"],
  ["styleguide : rail", "/styleguide/rail/"],
];

/** Les six formulaires détaillés de la fabrique (content/formulaires). */
const formulairesDetailles = [
  "/demande/personne-agee/",
  "/demande/maladie-neurodegenerative/",
  "/demande/adulte-handicap/",
  "/demande/enfant-handicap/",
  "/demande/relais-aidant/",
  "/demande/nuit-et-24h/",
];

function nextButton(form: Locator) {
  return form.getByRole("button", { name: /^(Continuer|J'envoie)/ });
}

/** Soumet l'étape en l'état et attend le résumé d'erreurs (l'étape doit être invalide). */
async function submitInvalid(form: Locator) {
  await nextButton(form).click();
  await expect(form.getByRole("alert").first()).toBeVisible();
}

async function expectStep(form: Locator, n: number, total: number) {
  await expect(form.getByText(`Étape ${n} sur ${total}`)).toBeVisible();
}

test.describe("Tous les gabarits : 0 violation axe critique ou sérieuse", () => {
  for (const [label, chemin] of gabarits) {
    test(`${label} : ${chemin}`, async ({ page }, testInfo) => {
      const response = await page.goto(chemin);
      expect(response?.status()).toBe(chemin === introuvable ? 404 : 200);
      await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
      await expectNoSeriousAxeViolations(page, testInfo);
    });
  }
});

test.describe("Formulaires : chaque étape et l'état d'erreur", () => {
  for (const chemin of formulairesDetailles) {
    test(`formulaire détaillé ${chemin}`, async ({ page }, testInfo) => {
      await page.goto(chemin);
      const form = page.getByRole("form");
      const audit = () => expectNoSeriousAxeViolations(page, testInfo);

      await expectStep(form, 1, 5);
      await audit();
      await submitInvalid(form);
      await audit();
      await form.getByRole("radio").first().check();
      await nextButton(form).click();

      await expectStep(form, 2, 5);
      await audit();
      await nextButton(form).click();

      await expectStep(form, 3, 5);
      await audit();
      await nextButton(form).click();

      await expectStep(form, 4, 5);
      await audit();
      // Date de début toujours manquante à ce stade (le rythme peut être prérempli, nuit et 24h).
      await submitInvalid(form);
      await audit();
      await form.getByRole("radio", { name: "Régulier, chaque semaine" }).check();
      await form.getByRole("radio", { name: "Dans le mois" }).check();
      await nextButton(form).click();

      await expectStep(form, 5, 5);
      await audit();
      await submitInvalid(form);
      await audit();
    });
  }

  test("rappel : étape unique, vide", async ({ page }, testInfo) => {
    await page.goto("/etre-rappele/");
    const form = page.getByRole("form");
    await expectNoSeriousAxeViolations(page, testInfo);
    await submitInvalid(form);
    await expectNoSeriousAxeViolations(page, testInfo);
  });

  test("professionnel : deux étapes, chacune en erreur", async ({ page }, testInfo) => {
    await page.goto("/demande/professionnel/");
    const form = page.getByRole("form");
    await expectStep(form, 1, 2);
    await expectNoSeriousAxeViolations(page, testInfo);
    await submitInvalid(form);
    await expectNoSeriousAxeViolations(page, testInfo);
    await form.getByLabel("Votre structure").fill("Service test");
    await form.getByLabel("Votre prénom").fill("Test");
    await form.getByLabel("Votre nom").fill("Essai");
    await form.getByLabel("Votre téléphone direct").fill("06 00 00 00 00");
    await nextButton(form).click();
    await expectStep(form, 2, 2);
    await expectNoSeriousAxeViolations(page, testInfo);
    await submitInvalid(form);
    await expectNoSeriousAxeViolations(page, testInfo);
  });

  test("sortie d'hospitalisation : chaque étape, l'erreur de commune et les coordonnées vides", async ({
    page,
  }, testInfo) => {
    await page.goto("/demande/sortie-d-hospitalisation/");
    const form = page.getByRole("form");
    const audit = () => expectNoSeriousAxeViolations(page, testInfo);
    await expectStep(form, 1, 4);
    await audit();
    await nextButton(form).click();
    await expectStep(form, 2, 4);
    await audit();
    await submitInvalid(form);
    await audit();
    // Commune préremplie par l'adresse (code Insee de Puteaux), comme depuis une page locale.
    await page.goto("/demande/sortie-d-hospitalisation/?commune=92062");
    await expect(form.getByRole("combobox", { name: "Commune de retour" })).toHaveValue("Puteaux");
    await nextButton(form).click();
    await expectStep(form, 3, 4);
    await audit();
    await nextButton(form).click();
    await expectStep(form, 4, 4);
    await audit();
    await submitInvalid(form);
    await audit();
  });

  test("contact : étape unique, vide", async ({ page }, testInfo) => {
    await page.goto("/contact/");
    const form = page.getByRole("form");
    await expectNoSeriousAxeViolations(page, testInfo);
    await submitInvalid(form);
    await expectNoSeriousAxeViolations(page, testInfo);
  });

  test("candidature : étape unique, vide", async ({ page }, testInfo) => {
    await page.goto("/recrutement/postuler/");
    const form = page.getByRole("form");
    await expectNoSeriousAxeViolations(page, testInfo);
    await submitInvalid(form);
    await expectNoSeriousAxeViolations(page, testInfo);
  });
});

test.describe("Corrections de l'audit P8.4 reprises en phase 9", () => {
  test("R-1 : régions et navigations aux noms uniques sur les gabarits concernés", async ({
    page,
  }) => {
    for (const chemin of [
      "/demande/personne-agee/",
      "/etre-rappele/",
      "/magazine/prevenir-les-chutes-le-tour-du-logement-piece-par-piece/",
      "/plan-du-site/",
      "/contact/",
      "/agences/",
      "/agences/puteaux/",
    ]) {
      await page.goto(chemin);
      const doublons = await page.evaluate(() => {
        const seen = new Map<string, number>();
        // Repères : régions nommées, navigations, formulaires nommés, compléments (un `aside`
        // en `role="note"`, encart « À retenir », n'est pas un repère).
        const landmarks = document.querySelectorAll<HTMLElement>(
          "section[aria-label], section[aria-labelledby], nav, form[aria-label], form[aria-labelledby], aside:not([role])",
        );
        for (const el of landmarks) {
          // Comme axe : les repères non rendus (menu mobile replié) ne comptent pas.
          if (el.getClientRects().length === 0) continue;
          const labelledBy = el.getAttribute("aria-labelledby");
          const name =
            el.getAttribute("aria-label") ??
            (labelledBy ? document.getElementById(labelledBy)?.textContent?.trim() : null);
          if (!name) continue;
          const key = `${el.tagName.toLowerCase()} « ${name} »`;
          seen.set(key, (seen.get(key) ?? 0) + 1);
        }
        return [...seen.entries()].filter(([, n]) => n > 1).map(([key]) => key);
      });
      expect(doublons, chemin).toEqual([]);
    }
    // Plan du site : les groupes ne portent plus le nom des navigations du pied de page.
    await page.goto("/plan-du-site/");
    await expect(
      page.locator("main").getByRole("navigation", { name: "Plan du site : Pour qui ?" }),
    ).toBeVisible();
  });

  test("R-2 : le sélecteur de lecteur annonce la version affichée", async ({ page }) => {
    await page.goto("/personnes-agees/");
    const status = page.getByRole("status").filter({ hasText: /Vous cherchez de l.aide/ });
    await expect(status).toHaveCount(0);
    await page.getByRole("button", { name: "pour vous-même" }).click();
    await expect(page.getByRole("status")).toContainText("Vous cherchez de l’aide pour vous-même");
    await page.getByRole("button", { name: "pour un proche" }).focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("status")).toContainText("Vous cherchez de l’aide pour un proche");
  });

  test("R-3 : les liens légaux du pied de page mesurent au moins 44 px de haut", async ({
    page,
  }) => {
    await page.goto("/");
    const links = page.getByRole("contentinfo").getByRole("navigation", { name: "Pied de page" });
    const boxes = await links
      .getByRole("link")
      .evaluateAll((els) => els.map((el) => Math.round(el.getBoundingClientRect().height)));
    expect(boxes.length).toBeGreaterThan(0);
    for (const height of boxes) expect(height).toBeGreaterThanOrEqual(44);
  });

  test("R-4 : la panne d'envoi reçoit le focus et conserve la saisie", async ({ page }) => {
    // Route en panne : rien ne part, la saisie reste à l'écran (données fictives).
    await page.route("**/api/lead/", (route) =>
      route.fulfill({ status: 503, contentType: "application/json", body: '{"ok":false}' }),
    );
    await page.goto("/etre-rappele/?commune=92062");
    const form = page.getByRole("form");
    await form.getByLabel("Votre prénom").fill("Test");
    await form.getByLabel("Votre nom").fill("Essai");
    await form.getByLabel("Votre téléphone").fill("06 00 00 00 00");
    await expect(
      form.getByRole("combobox", { name: "Votre commune ou votre code postal" }),
    ).toHaveValue("Puteaux");
    await nextButton(form).click();
    const alert = form.getByRole("alert").filter({ hasText: "L'envoi n'a pas abouti" });
    await expect(alert).toBeVisible();
    await expect(alert).toBeFocused();
    await expect(form.getByLabel("Votre prénom")).toHaveValue("Test");
  });
});

/*
 * RGAA 10.12 (WCAG 1.4.12) : espacement du texte imposé par feuille de style, à 320 px de large.
 * Aucun texte tronqué, aucun défilement horizontal. Une seule fois (projet mobile).
 */
const espacement = `
  * { line-height: 1.5 !important; letter-spacing: 0.12em !important; word-spacing: 0.16em !important; }
  p { margin-bottom: 2em !important; }
`;

const gabaritsEspacement = [
  "/",
  "/personnes-agees/",
  "/demande/personne-agee/",
  "/etre-rappele/",
  "/aide-a-domicile/hauts-de-seine/puteaux/",
  "/agences/puteaux/",
  "/magazine/prevenir-les-chutes-le-tour-du-logement-piece-par-piece/",
  "/tarifs-et-aides/",
  "/lexique/",
  "/outils/tour-du-logement-anti-chutes/",
  "/plan-du-site/",
  "/accessibilite/",
];

async function overflowAt320(page: Page, chemin: string) {
  await page.goto(chemin);
  await page.addStyleTag({ content: espacement });
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  return page.evaluate(() => {
    const width = document.documentElement.clientWidth;
    const wide = Array.from(document.querySelectorAll<HTMLElement>("body *"))
      .filter((el) => {
        const rect = el.getBoundingClientRect();
        return rect.width > 0 && rect.right > width + 1;
      })
      .slice(0, 5)
      .map((el) => `${el.tagName.toLowerCase()}.${el.className.toString().split(" ")[0] ?? ""}`);
    return { overflow: document.documentElement.scrollWidth - width, wide };
  });
}

test.describe("RGAA 10.12 : espacement du texte à 320 px", () => {
  for (const chemin of gabaritsEspacement) {
    test(`${chemin} ne déborde pas`, async ({ browser }, testInfo: TestInfo) => {
      test.skip(testInfo.project.name !== "mobile", "fenêtre de 320 px : une seule fois");
      const context = await browser.newContext({ viewport: { width: 320, height: 640 } });
      const page = await context.newPage();
      const result = await overflowAt320(page, chemin);
      if (result.overflow > 0) {
        testInfo.annotations.push({
          type: "espacement-texte",
          description: `${chemin} : ${result.overflow} px de débordement ; ${result.wide.join(", ")}`,
        });
      }
      expect(result.overflow, result.wide.join(", ")).toBeLessThanOrEqual(0);
      await context.close();
    });
  }
});
