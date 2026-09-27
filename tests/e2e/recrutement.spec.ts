import { expect, test, type Locator, type Page } from "@playwright/test";
import { expectNoSeriousAxeViolations } from "./axe";
import { readMails, type StoredMail } from "./smtp";

/*
 * Recrutement (docs/03 §9, docs/05 §2 `candidature`, P8.2) : la page sans offre inventée, la
 * candidature au clavier avec un PDF généré à la volée, l'e-mail reçu par le serveur SMTP simulé
 * avec le CV en pièce jointe, l'accusé sans aucun détail, les refus de fichier côté navigateur,
 * axe à chaque écran. Les deux projets partagent le dossier des e-mails : chaque test ne lit que
 * les messages reçus après son départ.
 */

test.describe.configure({ mode: "serial" });

const PDF = Buffer.from(
  "%PDF-1.4\n1 0 obj << /Type /Catalog >> endobj\ntrailer << /Root 1 0 R >>\n%%EOF\n",
);

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

async function fillCandidate(form: Locator, page: Page) {
  await form.getByLabel("Votre prénom").focus();
  await page.keyboard.type("Claire");
  await page.keyboard.press("Tab");
  await page.keyboard.type("Martin");
  await page.keyboard.press("Tab");
  await page.keyboard.type("06 12 34 56 78");
  await page.keyboard.press("Tab");
  await page.keyboard.type("claire@test.local");
  await form.getByLabel(/Département souhaité/).selectOption("92");
  await form.getByRole("radio", { name: "Dès maintenant" }).focus();
  await page.keyboard.press("Space");
}

async function submit(form: Locator, page: Page) {
  // La route refuse un remplissage de moins de trois secondes (anti-robots).
  await page.waitForTimeout(3_100);
  await form.getByRole("button", { name: "J'envoie ma candidature" }).focus();
  await page.keyboard.press("Enter");
}

test("/recrutement/ : 200, un seul H1, aucune offre inventée, candidature spontanée, axe", async ({
  page,
}) => {
  const response = await page.goto("/recrutement/");
  expect(response?.status()).toBe(200);
  await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Auxiliaire de vie, aide à domicile : rejoignez Youdom Care",
  );
  await expect(page.getByRole("navigation", { name: "Fil d’Ariane" })).toBeVisible();
  await expect(page.getByTestId("aucune-offre")).toHaveText("Aucune offre publiée pour le moment.");
  await expect(page.getByRole("link", { name: "Je postule" }).first()).toHaveAttribute(
    "href",
    /\/recrutement\/postuler\/?$/,
  );
  // Aucun avantage promis : le bloc « Ce que nous vous proposons » n'annonce ni salaire ni planning.
  const proposons = page.getByRole("region", { name: "Ce que nous vous proposons" });
  await expect(proposons).toContainText("tout se discute de vive voix");
  await expect(proposons).not.toContainText(/€|salaire|planning garanti/i);
  await expectNoSeriousAxeViolations(page);
});

test("une offre inexistante renvoie 404", async ({ page }) => {
  const response = await page.goto("/recrutement/offre/offre-inexistante/");
  expect(response?.status()).toBe(404);
});

test("candidature au clavier avec un PDF : page merci, alerte avec le CV joint, accusé sans détail", async ({
  page,
}) => {
  const since = new Date().toISOString();
  await page.goto("/recrutement/postuler/");
  const form = page.getByRole("form");
  await expectNoSeriousAxeViolations(page);
  await fillCandidate(form, page);
  await form
    .getByLabel("Votre CV")
    .setInputFiles({ name: "CV Claire Martin.pdf", mimeType: "application/pdf", buffer: PDF });
  await expect(form.getByText("Fichier choisi : CV Claire Martin.pdf")).toBeVisible();
  await form.getByRole("checkbox", { name: /J'accepte que Youdom Care utilise/ }).focus();
  await page.keyboard.press("Space");
  await expectNoSeriousAxeViolations(page);
  await submit(form, page);
  await expect(page).toHaveURL(/\/merci\/candidature\/$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Merci. Votre candidature est arrivée.",
  );
  await expectNoSeriousAxeViolations(page);

  const team = await waitForMail(
    since,
    (m) => m.subject === "Nouvelle candidature — Hauts-de-Seine",
  );
  expect(team.to).toEqual(["equipe@test.local"]);
  expect(team.replyTo).toBe("claire@test.local");
  expect(team.text).toContain("Claire Martin");
  expect(team.text).toContain("Dès maintenant");
  expect(team.text).toContain("Candidature spontanée");
  expect(team.attachments).toHaveLength(1);
  expect(team.attachments[0]).toMatchObject({
    filename: "CV-Claire-Martin.pdf",
    contentType: "application/pdf",
    size: PDF.length,
    head: "25504446",
  });

  const ack = await waitForMail(
    since,
    (m) => m.subject === "Nous avons bien reçu votre candidature — Youdom Care",
  );
  expect(ack.to).toEqual(["claire@test.local"]);
  expect(ack.text).toContain("Bonjour Claire");
  expect(ack.attachments).toEqual([]);
  for (const forbidden of ["Martin", "Hauts-de-Seine", "CV-Claire", "Dès maintenant"]) {
    expect(ack.text).not.toContain(forbidden);
  }
});

test("le navigateur refuse un fichier renommé, un fichier trop lourd, et exige un CV", async ({
  page,
}) => {
  await page.goto("/recrutement/postuler/?offre=offre-inexistante");
  const form = page.getByRole("form");
  await expect(form.getByText(/Cette offre n'est plus publiée/)).toBeVisible();
  await fillCandidate(form, page);
  await form.getByRole("checkbox", { name: /J'accepte que Youdom Care utilise/ }).check();

  await form.getByRole("button", { name: "J'envoie ma candidature" }).click();
  await expect(form.getByRole("alert")).toContainText("Il manque votre CV");
  await expect(page).toHaveURL(/\/recrutement\/postuler\//);

  const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  await form
    .getByLabel("Votre CV")
    .setInputFiles({ name: "cv.pdf", mimeType: "application/pdf", buffer: png });
  await form.getByRole("button", { name: "J'envoie ma candidature" }).click();
  await expect(form.getByRole("alert")).toContainText("Ce format n'est pas accepté");

  const heavy = Buffer.concat([PDF, Buffer.alloc(5 * 1024 * 1024)]);
  await form
    .getByLabel("Votre CV")
    .setInputFiles({ name: "cv.pdf", mimeType: "application/pdf", buffer: heavy });
  await form.getByRole("button", { name: "J'envoie ma candidature" }).click();
  await expect(form.getByRole("alert")).toContainText("Ce fichier dépasse 5 Mo");
  await expect(form.getByLabel("Votre prénom")).toHaveValue("Claire");
  await expectNoSeriousAxeViolations(page);
});
