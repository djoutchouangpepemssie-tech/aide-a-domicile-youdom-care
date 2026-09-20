import { expect, test, type Locator, type Page } from "@playwright/test";
import { expectNoSeriousAxeViolations } from "./axe";
import { readMails, type StoredMail } from "./smtp";

/*
 * Parcours de bout en bout (P3.10, docs/05 §6-§8) : chaque formulaire au clavier jusqu'à la page
 * merci, e-mails reçus par le serveur SMTP simulé, accusé de réception sans aucun détail,
 * panne d'envoi sans perte de saisie, axe à chaque étape. Les parcours d'un même projet
 * s'exécutent en série ; les deux projets partagent le dossier des e-mails, chaque test ne lit
 * donc que les messages reçus après son propre départ.
 */

test.describe.configure({ mode: "serial" });

async function pressContinue(page: Page, form: Locator) {
  const button = form.getByRole("button", { name: /Continuer|J'envoie ma demande/ });
  if ((await button.textContent())?.includes("J'envoie")) {
    // La route refuse un remplissage de moins de trois secondes (anti-robots).
    await page.waitForTimeout(3_100);
  }
  await button.focus();
  await page.keyboard.press("Enter");
}

async function checkByKeyboard(
  form: Locator,
  page: Page,
  role: "radio" | "checkbox",
  name: string | RegExp,
) {
  await form.getByRole(role, { name }).first().focus();
  await page.keyboard.press("Space");
}

async function pickCommuneByKeyboard(form: Locator, page: Page, label: string) {
  const box = form.getByRole("combobox", { name: label });
  await box.focus();
  await page.keyboard.type("Puteaux");
  await expect(form.getByRole("option", { name: /Puteaux/ })).toBeVisible();
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await expect(box).toHaveValue("Puteaux");
}

async function fillIdentityByKeyboard(form: Locator, page: Page, email?: string) {
  await form.getByLabel("Votre prénom").focus();
  await page.keyboard.type("Claire");
  await page.keyboard.press("Tab");
  await page.keyboard.type("Martin");
  await page.keyboard.press("Tab");
  await page.keyboard.type("06 12 34 56 78");
  if (email) {
    await form.getByLabel("Votre e-mail").focus();
    await page.keyboard.type(email);
  }
}

/** Messages reçus depuis `since` (ISO), pour ignorer ceux de l'autre projet ou des tests précédents. */
async function mailsSince(since: string): Promise<StoredMail[]> {
  return (await readMails()).filter((m) => m.receivedAt >= since);
}

async function waitForMail(since: string, predicate: (m: StoredMail) => boolean) {
  await expect
    .poll(async () => (await mailsSince(since)).filter(predicate).length, { timeout: 15_000 })
    .toBeGreaterThanOrEqual(1);
  const mail = (await mailsSince(since)).find(predicate);
  if (!mail) throw new Error("message attendu introuvable");
  return mail;
}

test("rappel au clavier jusqu'à la page merci ; l'équipe reçoit l'alerte", async ({ page }) => {
  const since = new Date().toISOString();
  await page.goto("/etre-rappele/");
  const form = page.getByRole("form");
  await fillIdentityByKeyboard(form, page);
  await pickCommuneByKeyboard(form, page, "Votre commune ou votre code postal");
  await form.getByLabel(/Quand préférez-vous être rappelé/).selectOption("Le matin");
  await pressContinue(page, form);
  await expect(page).toHaveURL(/\/merci\/rappel\/$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Merci. Votre demande est arrivée.",
  );
  await expectNoSeriousAxeViolations(page);
  const team = await waitForMail(since, (m) => m.subject.startsWith("Nouvelle demande — Rappel"));
  expect(team.to).toEqual(["equipe@test.local"]);
  expect(team.subject).toBe("Nouvelle demande — Rappel — Puteaux — Dès que possible (sous 48 h)");
  expect(team.text).toContain("Claire Martin");
  expect(team.text).toContain("Le matin");
});

test("demande personne âgée au clavier : cinq étapes, axe, alerte et accusé sans aucun détail", async ({
  page,
}) => {
  const since = new Date().toISOString();
  await page.goto("/demande/personne-agee/?commune=92062");
  const form = page.getByRole("form");
  await expectNoSeriousAxeViolations(page);
  await checkByKeyboard(form, page, "radio", "Mon père ou ma mère");
  await pressContinue(page, form);
  await expect(form.getByText("Étape 2 sur 5")).toBeVisible();
  await checkByKeyboard(form, page, "radio", "80 à 89 ans");
  await checkByKeyboard(form, page, "radio", "Une chute");
  await expectNoSeriousAxeViolations(page);
  await pressContinue(page, form);
  await expect(form.getByText("Étape 3 sur 5")).toBeVisible();
  await checkByKeyboard(form, page, "checkbox", "Toilette");
  await checkByKeyboard(form, page, "checkbox", "Nuits");
  await expectNoSeriousAxeViolations(page);
  await pressContinue(page, form);
  await expect(form.getByText("Étape 4 sur 5")).toBeVisible();
  await checkByKeyboard(form, page, "radio", "Régulier, chaque semaine");
  await form.getByRole("button", { name: "Toutes les nuits" }).focus();
  await page.keyboard.press("Enter");
  await checkByKeyboard(form, page, "radio", /^Nuit calme/);
  await checkByKeyboard(form, page, "radio", "Dans la semaine");
  await expectNoSeriousAxeViolations(page);
  await pressContinue(page, form);
  await expect(form.getByText("Étape 5 sur 5")).toBeVisible();
  await expect(
    form.getByRole("combobox", { name: "Votre commune ou votre code postal" }),
  ).toHaveValue("Puteaux");
  await fillIdentityByKeyboard(form, page, "claire@test.local");
  await checkByKeyboard(form, page, "checkbox", /J'accepte que Youdom Care utilise/);
  await expectNoSeriousAxeViolations(page);
  await pressContinue(page, form);
  await expect(page).toHaveURL(/\/merci\/personne-agee\/$/);
  const team = await waitForMail(since, (m) =>
    m.subject.startsWith("Nouvelle demande — Personne âgée"),
  );
  expect(team.subject).toBe("Nouvelle demande — Personne âgée — Puteaux — Dans la semaine");
  expect(team.replyTo).toBe("claire@test.local");
  expect(team.text).toContain("80 à 89 ans");
  expect(team.text).toContain("environ 63 heures par semaine");
  const ack = await waitForMail(
    since,
    (m) => m.subject === "Nous avons bien reçu votre demande — Youdom Care",
  );
  expect(ack.to).toEqual(["claire@test.local"]);
  expect(ack.text).toContain("Bonjour Claire");
  for (const forbidden of ["Puteaux", "80 à 89", "chute", "Toilette", "Nuits", "Martin"]) {
    expect(ack.text).not.toContain(forbidden);
  }
});

test("panne d'envoi : la saisie reste à l'écran et le téléphone est proposé", async ({ page }) => {
  await page.route("**/api/lead/", (route) =>
    route.fulfill({ status: 503, contentType: "application/json", body: '{"ok":false}' }),
  );
  await page.goto("/contact/");
  const form = page.getByRole("form");
  await fillIdentityByKeyboard(form, page);
  await form.getByRole("textbox", { name: /^Votre message/ }).focus();
  await page.keyboard.type("Une question sur vos horaires.");
  await pressContinue(page, form);
  await expect(form.getByText(/L'envoi n'a pas abouti/)).toBeVisible();
  await expect(form.getByRole("link", { name: /01.84.80.17.03/ })).toBeVisible();
  await expect(form.getByLabel("Votre prénom")).toHaveValue("Claire");
  await expect(page).toHaveURL(/\/contact\/$/);
  await expectNoSeriousAxeViolations(page);
});

for (const cas of [
  "maladie-neurodegenerative",
  "adulte-handicap",
  "enfant-handicap",
  "relais-aidant",
  "nuit-et-24h",
]) {
  test(`${cas} : parcours au clavier jusqu'à l'envoi`, async ({ page }) => {
    const since = new Date().toISOString();
    await page.goto(`/demande/${cas}/`);
    const form = page.getByRole("form");
    await checkByKeyboard(form, page, "radio", "Moi-même");
    await pressContinue(page, form);
    await expect(form.getByText("Étape 2 sur 5")).toBeVisible();
    await checkByKeyboard(form, page, "radio", /Je préfère en parler/);
    await pressContinue(page, form);
    await expect(form.getByText("Étape 3 sur 5")).toBeVisible();
    await checkByKeyboard(form, page, "checkbox", "À définir ensemble");
    await pressContinue(page, form);
    await expect(form.getByText("Étape 4 sur 5")).toBeVisible();
    if (cas !== "nuit-et-24h") {
      await checkByKeyboard(form, page, "radio", "Je ne sais pas encore");
    }
    await checkByKeyboard(form, page, "radio", "Je me renseigne pour plus tard");
    await expectNoSeriousAxeViolations(page);
    await pressContinue(page, form);
    await expect(form.getByText("Étape 5 sur 5")).toBeVisible();
    await fillIdentityByKeyboard(form, page);
    await pickCommuneByKeyboard(form, page, "Votre commune ou votre code postal");
    await checkByKeyboard(form, page, "checkbox", /J'accepte que Youdom Care utilise/);
    await pressContinue(page, form);
    await expect(page).toHaveURL(/\/merci\//);
    await waitForMail(since, (m) => m.subject.startsWith("Nouvelle demande"));
  });
}

test("sortie d'hospitalisation et professionnel : envoi réel", async ({ page }) => {
  const since = new Date().toISOString();
  await page.goto("/demande/sortie-d-hospitalisation/?commune=92062");
  let form = page.getByRole("form");
  await pressContinue(page, form);
  await expect(form.getByText("Étape 2 sur 4")).toBeVisible();
  await expect(form.getByRole("combobox", { name: "Commune de retour" })).toHaveValue("Puteaux");
  await pressContinue(page, form);
  await expect(form.getByText("Étape 3 sur 4")).toBeVisible();
  await checkByKeyboard(form, page, "checkbox", "Repas");
  await pressContinue(page, form);
  await expect(form.getByText("Étape 4 sur 4")).toBeVisible();
  await checkByKeyboard(form, page, "radio", "Un proche");
  await fillIdentityByKeyboard(form, page);
  await checkByKeyboard(form, page, "checkbox", /J'accepte que Youdom Care utilise/);
  await pressContinue(page, form);
  await expect(page).toHaveURL(/\/merci\/sortie-hospitalisation\/$/);
  await waitForMail(
    since,
    (m) => m.subject === "Nouvelle demande — Sortie d'hospitalisation — Puteaux — Dans la semaine",
  );

  await page.goto("/demande/professionnel/");
  form = page.getByRole("form");
  await form.getByLabel("Votre structure").focus();
  await page.keyboard.type("Service social");
  await form.getByLabel("Votre prénom").focus();
  await page.keyboard.type("Paul");
  await page.keyboard.press("Tab");
  await page.keyboard.type("Durand");
  await page.keyboard.press("Tab");
  await page.keyboard.type("01 84 80 17 03");
  await pressContinue(page, form);
  await expect(form.getByText("Étape 2 sur 2")).toBeVisible();
  await pickCommuneByKeyboard(form, page, "Commune de la personne");
  await checkByKeyboard(form, page, "radio", "Dans le mois");
  await pressContinue(page, form);
  await expect(page).toHaveURL(/\/merci\/professionnel\/$/);
  await waitForMail(
    since,
    (m) => m.subject === "Nouvelle demande — Professionnel — Puteaux — Dans le mois",
  );
});
