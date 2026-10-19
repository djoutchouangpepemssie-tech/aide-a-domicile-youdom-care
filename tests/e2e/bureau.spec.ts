import { expect, test, type Page, type Route } from "@playwright/test";
import { expectNoSeriousAxeViolations } from "./axe";

/*
 * Le back-office, de bout en bout, **sans API réelle** : les appels sont interceptés par le
 * navigateur de test. C'est le bon niveau pour cet écran — ce qu'on veut éprouver ici, c'est
 * l'écran (parcours, clavier, accessibilité, ce qui est dit à l'utilisateur), pas l'API, qui a
 * ses propres 263 tests dans `apps/api`.
 *
 * Les corps de réponse reproduisent ceux des routes réelles. S'ils divergent un jour, c'est ici
 * qu'il faudra les remettre d'accord — un client généré depuis l'API viendra plus tard.
 */

/*
 * Les en-têtes CORS de la fausse API. Sans eux, le navigateur **bloque** la réponse : les écrans
 * appellent une autre origine que celle de la page (c'est tout le principe de l'architecture —
 * Vercel sert les fichiers, l'API certifiée sert les données), et la vraie API les pose elle-même
 * (`apps/api/src/http/app.ts`, liste fermée d'origines autorisées). Ce détail a coûté dix
 * exécutions rouges avant d'être vu : le message à l'écran disait « vérifiez votre connexion »,
 * ce qui était exact et inutile.
 */
const CORS = {
  "content-type": "application/json",
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "authorization,content-type",
  "access-control-allow-methods": "GET,POST,PATCH,DELETE,OPTIONS",
};

/** Répond à la place de l'API, en gérant la requête préalable du navigateur. */
async function repondre(route: Route, status: number, body: unknown): Promise<void> {
  if (route.request().method() === "OPTIONS") {
    await route.fulfill({ status: 204, headers: CORS });
    return;
  }
  await route.fulfill({ status, headers: CORS, body: JSON.stringify(body) });
}

const AGENCE = "a".repeat(24);
const SERIE = "b".repeat(24);
const FOYER = "c".repeat(24);
const FATIMA = "d".repeat(24);

const occurrence = (over: Record<string, unknown> = {}) => ({
  serieId: SERIE,
  householdId: FOYER,
  date: "2026-10-19",
  slotIndex: 0,
  start: "09:00",
  end: "11:00",
  endDate: "2026-10-19",
  kind: "jour",
  workerId: FATIMA,
  origine: "serie",
  motif: null,
  ...over,
});

async function stubApi(page: Page, options: { me?: number; planning?: unknown } = {}) {
  await page.route("**/auth/v1/challenges", (route) =>
    repondre(route, 202, { challengeId: "defi-1", expiresIn: 600 }),
  );
  await page.route("**/auth/v1/sessions", (route) =>
    repondre(route, 201, { token: "jeton-de-test", expiresAt: "2026-11-19T00:00:00.000Z" }),
  );
  await page.route("**/admin/v1/me", (route) =>
    options.me && options.me !== 200
      ? repondre(route, options.me, { code: "non_authentifie", message: "Session expirée." })
      : repondre(route, 200, {
          membre: { id: "e".repeat(24), nom: "Arcel" },
          role: "responsable_agence",
          agences: [{ agencyId: AGENCE, foyers: ["AGENCE-01"] }],
          secondFacteur: false,
        }),
  );
  await page.route("**/admin/v1/planning?**", (route) =>
    repondre(
      route,
      200,
      options.planning ?? {
        occurrences: [
          occurrence(),
          occurrence({ slotIndex: 1, start: "14:00", end: "16:00", workerId: null }),
          occurrence({
            date: "2026-10-22",
            start: "21:00",
            end: "07:00",
            endDate: "2026-10-23",
            kind: "nuit_calme",
          }),
        ],
        aPourvoir: 1,
        signalements: [
          {
            regle: "amplitude_quotidienne",
            severite: "avertissement",
            message: "amplitude de 14 h le 2026-10-19, maximum 13 h",
            visites: [`${SERIE}#2026-10-19#0`],
          },
        ],
        fenetreJugee: { from: "2026-10-19", to: "2026-11-15" },
        aucuneRegleSaisie: false,
      },
    ),
  );
  await page.route("**/admin/v1/workers?**", (route) =>
    repondre(route, 200, {
      intervenants: [
        { id: FATIMA, prenom: "Fatima", initiale: "B", photo: null, qualifications: [] },
      ],
    }),
  );
}

/** Ouvre une session comme le ferait une coordinatrice, par l'écran de connexion. */
async function seConnecter(page: Page) {
  await page.goto("/bureau/connexion/");
  // Si cette assertion tombe, l'adresse de l'API manquait au build :
  // NEXT_PUBLIC_API_BASE_URL doit être posée avant `pnpm build` (voir apps/api/README.md).
  await expect(page.getByText(/adresse de l’API n’est pas configurée/)).toHaveCount(0);

  await page.getByLabel(/adresse e-mail ou votre numéro/).fill("arcel@exemple.fr");
  await page.getByRole("button", { name: "Recevoir mon accès" }).click();
  await page.getByLabel(/secret du lien/).fill("secret-du-lien-de-test");
  await page.getByRole("button", { name: "Ouvrir ma session" }).click();
  await expect(page).toHaveURL(/\/bureau\/semaine\//);
}

test.describe("Bureau (back-office)", () => {
  test("la connexion mène à la semaine, qui montre ce qui manque et ce qui cloche", async ({
    page,
  }) => {
    await stubApi(page);
    await seConnecter(page);

    // Ce qui manque, compté et écrit.
    await expect(page.getByText("1 créneau à pourvoir")).toBeVisible();
    await expect(page.getByText("À pourvoir", { exact: true })).toBeVisible();

    // Ce qui cloche, avec sa sévérité en mots.
    // Deux fois à l'écran, et c'est voulu : le récapitulatif de la période jugée, puis la visite
    // concernée elle-même — on ne fait pas chercher.
    await expect(page.getByText(/amplitude de 14 h/).first()).toBeVisible();
    await expect(page.getByText(/amplitude de 14 h/)).toHaveCount(2);
    await expect(page.getByText("À regarder").first()).toBeVisible();

    // La semaine, jour par jour, et l'intervenante par son prénom et son initiale.
    await expect(page.getByRole("heading", { name: /lundi 19 octobre/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /dimanche 25 octobre/i })).toBeVisible();
    await expect(page.getByText("Fatima B.").first()).toBeVisible();
    await expect(page.getByText("nuit calme")).toBeVisible();

    // L'habillage public n'a rien à faire ici.
    await expect(page.getByRole("link", { name: /Être rappelé/i })).toHaveCount(0);
    await expect(page.getByRole("navigation", { name: "Bureau" })).toBeVisible();

    await expectNoSeriousAxeViolations(page);
  });

  test("on change de semaine au clavier, et le titre suit", async ({ page }) => {
    await stubApi(page);
    await seConnecter(page);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("du 19 au 25 octobre");

    const suivante = page.getByRole("button", { name: "Semaine suivante" });
    await suivante.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("du 26 octobre au 1");

    await page.getByRole("button", { name: "Semaine précédente" }).click();
    await expect(page.getByRole("heading", { level: 1 })).toContainText("du 19 au 25 octobre");
  });

  test("une session expirée ramène à la connexion sans message cryptique", async ({ page }) => {
    await stubApi(page);
    await seConnecter(page);
    await stubApi(page, { me: 401 });
    await page.getByRole("button", { name: "Semaine suivante" }).click();
    await expect(page).toHaveURL(/\/bureau\/connexion\//);
    await expect(page.getByRole("heading", { name: "Se connecter" })).toBeVisible();
  });

  test("quand aucune règle n'est saisie, l'écran le dit au lieu de laisser croire", async ({
    page,
  }) => {
    await stubApi(page, {
      planning: {
        occurrences: [occurrence()],
        aPourvoir: 0,
        signalements: [],
        fenetreJugee: { from: "2026-10-19", to: "2026-11-15" },
        aucuneRegleSaisie: true,
      },
    });
    await seConnecter(page);
    await expect(page.getByText(/Aucune règle de planification n’est saisie/)).toBeVisible();
    await expect(page.getByText("Tous les créneaux sont pourvus")).toBeVisible();
    await expectNoSeriousAxeViolations(page);
  });

  test("une semaine vide se dit, jour par jour", async ({ page }) => {
    await stubApi(page, {
      planning: {
        occurrences: [],
        aPourvoir: 0,
        signalements: [],
        fenetreJugee: { from: "2026-10-19", to: "2026-11-15" },
        aucuneRegleSaisie: false,
      },
    });
    await seConnecter(page);
    await expect(page.getByText("Aucune visite prévue.")).toHaveCount(7);
    await expect(page.getByText("0 visite prévue")).toBeVisible();
  });

  test("la politique de sécurité de contenu laisse joindre l'API", async ({ request }) => {
    // La cause des dix premières exécutions rouges : `connect-src 'self'` interdisait l'origine de
    // l'API, et l'écran disait seulement « vérifiez votre connexion ». L'origine est déclarée dans
    // next.config.ts à partir de NEXT_PUBLIC_API_BASE_URL ; sans elle, le bureau est muet.
    const reponse = await request.get("/bureau/connexion/");
    const csp = reponse.headers()["content-security-policy"] ?? "";
    expect(csp).toContain("connect-src 'self' https://api.test.local");
  });

  test("le bureau reste hors des moteurs de recherche", async ({ page }) => {
    await stubApi(page);
    await page.goto("/bureau/");
    const robots = page.locator('head meta[name="robots"]');
    await expect(robots).toHaveAttribute("content", /noindex/);
  });
});
