import { expect, test, type Page, type Route } from "@playwright/test";
import { expectNoSeriousAxeViolations } from "./axe";

/*
 * L'application de l'intervenante, de bout en bout, sans API réelle : les appels sont interceptés
 * dans le navigateur de test (même principe que `bureau.spec.ts`, mêmes en-têtes CORS — sans eux
 * le navigateur refuse une réponse venue d'une autre origine).
 *
 * Ce qui est éprouvé ici et qui compte plus que le reste : **un pointage ne se perd pas**. Quand
 * l'API est injoignable, il attend dans le téléphone avec l'heure du geste, l'écran le dit, et il
 * repart dès que ça remarche.
 */

const CORS = {
  "content-type": "application/json",
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "authorization,content-type",
  "access-control-allow-methods": "GET,POST,PATCH,DELETE,OPTIONS",
};

async function repondre(route: Route, status: number, body: unknown): Promise<void> {
  if (route.request().method() === "OPTIONS") {
    await route.fulfill({ status: 204, headers: CORS });
    return;
  }
  await route.fulfill({ status, headers: CORS, body: JSON.stringify(body) });
}

const VISITE = "a".repeat(24);

/* Ce que l'écran a envoyé, et dans quel état est la fausse API. */
const etat: {
  pointages: { type: string; source: string; at: string; reason?: string }[];
  reseau: boolean;
} = { pointages: [], reseau: true };

const visiteDuJour = (pointages: { type: string; source: string; at: string }[]) => ({
  id: VISITE,
  foyer: { id: "b".repeat(24), code: "FOY-0001" },
  adresse: { line1: "12 rue des Lilas", postalCode: "75011", city: "Paris" },
  debut: "2026-10-20T07:00:00.000Z",
  fin: "2026-10-20T09:00:00.000Z",
  nature: "jour",
  statut: pointages.length > 0 ? "en_cours" : "prevue",
  pointages,
});

async function stubApi(page: Page, options: { vide?: true } = {}) {
  etat.pointages = [];
  etat.reseau = true;

  await page.route("**/auth/v1/challenges", (route) =>
    repondre(route, 202, { challengeId: "defi-1", expiresIn: 600 }),
  );
  await page.route("**/auth/v1/sessions", (route) =>
    repondre(route, 201, { token: "jeton-de-test", expiresAt: "2026-11-20T00:00:00.000Z" }),
  );
  await page.route("**/field/v1/visits/today", (route) =>
    repondre(route, 200, {
      visites: options.vide ? [] : [visiteDuJour(etat.pointages)],
    }),
  );
  await page.route(`**/field/v1/visits/${VISITE}/punch`, async (route) => {
    if (route.request().method() === "OPTIONS") {
      await route.fulfill({ status: 204, headers: CORS });
      return;
    }
    // Réseau coupé : on échoue comme le ferait un sous-sol, pas comme une API qui refuse.
    if (!etat.reseau) {
      await route.abort("internetdisconnected");
      return;
    }
    const recu = route.request().postDataJSON() as {
      type: string;
      source: string;
      at: string;
      reason?: string;
    };
    etat.pointages.push(recu);
    await repondre(route, 201, {
      enregistre: true,
      at: recu.at,
      recordedAt: recu.at,
      statut: "en_cours",
    });
  });
}

/** Se connecte comme une intervenante : un numéro, puis le code reçu. */
async function seConnecter(page: Page) {
  await page.goto("/terrain/connexion/");
  await page.getByLabel(/adresse e-mail ou votre numéro/).fill("0622222222");
  await page.getByRole("button", { name: "Recevoir mon accès" }).click();
  await page.getByLabel(/code reçu/).fill("123456");
  await page.getByRole("button", { name: "Ouvrir ma session" }).click();
  await expect(page).toHaveURL(/\/terrain\/?$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Ma tournée");
}

test.describe("Terrain (application intervenante)", () => {
  test("la tournée se lit d'un coup d'œil : l'heure, le foyer, l'adresse", async ({ page }) => {
    await stubApi(page);
    await seConnecter(page);

    await expect(page.getByText("1 visite aujourd’hui.")).toBeVisible();
    await expect(page.getByText("9 h 00 – 11 h 00")).toBeVisible();
    await expect(page.getByText("FOY-0001")).toBeVisible();
    await expect(page.getByText("12 rue des Lilas")).toBeVisible();

    await expectNoSeriousAxeViolations(page);
  });

  test("un pointage manuel demande son motif et part avec l'heure du geste", async ({ page }) => {
    await stubApi(page);
    await seConnecter(page);

    await page.getByRole("button", { name: /Je suis en route/ }).click();
    await page.getByLabel(/Pourquoi un pointage manuel/).fill("badge illisible");
    await page.getByRole("button", { name: /Je suis en route/ }).click();

    await expect(page.getByText(/en route à /)).toBeVisible();
    expect(etat.pointages).toHaveLength(1);
    expect(etat.pointages[0]).toMatchObject({
      type: "en_route",
      source: "manuel",
      reason: "badge illisible",
    });
    // L'heure part en ISO : c'est l'heure du geste, pas celle de l'envoi.
    expect(etat.pointages[0]?.at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  test("sans réseau, le pointage attend dans le téléphone et repart ensuite", async ({ page }) => {
    await stubApi(page);
    await seConnecter(page);

    etat.reseau = false;
    await page.getByRole("button", { name: /Je suis en route/ }).click();
    await page.getByLabel(/Pourquoi un pointage manuel/).fill("sous-sol sans réseau");
    await page.getByRole("button", { name: /Je suis en route/ }).click();

    // Rien n'est perdu, et l'écran ne fait pas semblant que c'est envoyé.
    await expect(page.getByText("Des pointages attendent d’être envoyés")).toBeVisible();
    await expect(page.getByText("en attente d’envoi")).toBeVisible();
    expect(etat.pointages).toHaveLength(0);

    // Le geste suivant proposé tient compte du pointage en attente.
    await expect(page.getByRole("button", { name: /Je suis arrivée/ })).toBeVisible();

    etat.reseau = true;
    await page.getByRole("button", { name: "Essayer maintenant" }).click();
    await expect(page.getByText("Des pointages attendent d’être envoyés")).toHaveCount(0);
    expect(etat.pointages).toHaveLength(1);
    expect(etat.pointages[0]).toMatchObject({ type: "en_route", reason: "sous-sol sans réseau" });
  });

  test("un pointage en attente survit au rechargement de la page", async ({ page }) => {
    await stubApi(page);
    await seConnecter(page);

    etat.reseau = false;
    await page.getByRole("button", { name: /Je suis en route/ }).click();
    await page.getByLabel(/Pourquoi un pointage manuel/).fill("ascenseur");
    await page.getByRole("button", { name: /Je suis en route/ }).click();
    await expect(page.getByText("en attente d’envoi")).toBeVisible();

    await page.reload();
    await expect(page.getByText("Des pointages attendent d’être envoyés")).toBeVisible();

    etat.reseau = true;
    await page.getByRole("button", { name: "Essayer maintenant" }).click();
    await expect(page.getByText("Des pointages attendent d’être envoyés")).toHaveCount(0);
    expect(etat.pointages).toHaveLength(1);
  });

  test("une journée sans visite le dit, au lieu d'une page vide", async ({ page }) => {
    await stubApi(page, { vide: true });
    await seConnecter(page);
    await expect(page.getByText("Aucune visite aujourd’hui")).toBeVisible();
    await expectNoSeriousAxeViolations(page);
  });

  test("l'application reste hors des moteurs de recherche", async ({ page }) => {
    await stubApi(page);
    await page.goto("/terrain/connexion/");
    await expect(page.locator('head meta[name="robots"]')).toHaveAttribute("content", /noindex/);
    // Aucun habillage public : pas de bouton d'appel, pas de pied de page commercial.
    await expect(page.getByRole("link", { name: /Être rappelé/i })).toHaveCount(0);
  });
});
