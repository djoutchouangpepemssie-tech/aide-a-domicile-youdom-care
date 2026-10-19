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

async function stubApi(
  page: Page,
  options: { planning?: unknown; mode?: "prestataire" | "mandataire" } = {},
) {
  await page.route("**/auth/v1/challenges", (route) =>
    repondre(route, 202, { challengeId: "defi-1", expiresIn: 600 }),
  );
  await page.route("**/auth/v1/sessions", (route) =>
    repondre(route, 201, { token: "jeton-de-test", expiresAt: "2026-11-19T00:00:00.000Z" }),
  );
  await page.route("**/admin/v1/me", (route) =>
    repondre(route, 200, {
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
  await page.route("**/admin/v1/households?**", (route) =>
    repondre(route, 200, {
      foyers: [
        {
          id: FOYER,
          code: "FOY-0001",
          mode: options.mode ?? "prestataire",
          statut: "actif",
          ville: "Paris",
          codePostal: "75011",
          gele: false,
          technique: false,
        },
        // Le foyer technique de l'agence : l'écran doit l'écarter, pas le compter.
        {
          id: "f".repeat(24),
          code: "AGENCE-01",
          mode: "prestataire",
          statut: "actif",
          ville: "Paris",
          codePostal: "75000",
          gele: false,
          technique: true,
        },
      ],
    }),
  );
  await page.route(`**/admin/v1/households/${FOYER}`, (route) =>
    repondre(route, 200, {
      foyer: {
        id: FOYER,
        code: "FOY-0001",
        agencyId: AGENCE,
        mode: options.mode ?? "prestataire",
        statut: "actif",
        gele: false,
        adresse: { ligne1: "12 rue des Lilas", ligne2: null, codePostal: "75011", ville: "Paris" },
      },
      membres: [
        {
          id: "1".repeat(24),
          nom: "Nadia",
          role: "proche_referent",
          statut: "actif",
          droits: [{ id: "d1", module: "planning", actions: ["voir"] }],
        },
        {
          id: "2".repeat(24),
          nom: "Claire",
          role: "beneficiaire",
          statut: "actif",
          droits: [],
        },
      ],
      protections: [
        {
          memberId: "2".repeat(24),
          type: "curatelle",
          portee: ["biens"],
          representation: "assistance",
          verifiee: true,
        },
      ],
    }),
  );
  await page.route(`**/admin/v1/households/${FOYER}/series`, (route) =>
    repondre(route, 200, {
      series: [
        {
          id: SERIE,
          libelle: "Matins en semaine",
          du: "2026-10-01",
          au: null,
          rythme: 1,
          creneaux: 5,
          statut: "active",
          version: 1,
          remplaceePar: null,
        },
      ],
    }),
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
  /*
   * On attend que la semaine soit **affichée**, pas seulement que l'adresse ait changé : le
   * premier chargement est encore en vol au moment où l'adresse bascule. Sans cette attente, un
   * test qui change une interception juste après la connexion la voit s'appliquer au chargement
   * initial — c'est ce qui rendait le test de la session expirée instable (1 échec sur 12).
   */
  await expect(page.getByRole("heading", { name: /lundi/i })).toBeVisible();
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

    /*
     * On remplace l'interception de `me` au lieu d'en empiler une seconde : l'ordre de priorité
     * entre deux interceptions qui visent la même adresse est un détail d'implémentation, et s'y
     * fier rendait ce test instable (il est tombé une fois sur douze exécutions).
     */
    await page.unroute("**/admin/v1/me");
    await page.route("**/admin/v1/me", (route) =>
      repondre(route, 401, { code: "non_authentifie", message: "Session expirée." }),
    );

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

  test("les foyers se listent, et l'agence elle-même n'y est pas comptée", async ({ page }) => {
    await stubApi(page);
    await seConnecter(page);
    await page.getByRole("link", { name: "Les foyers" }).click();
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Les foyers");

    // Un seul foyer accompagné : le foyer technique de l'agence est écarté et annoncé.
    await expect(page.getByText("1 foyer accompagné")).toBeVisible();
    await expect(page.getByText(/foyer technique de l’agence n’est pas compté/)).toBeVisible();
    await expect(page.getByRole("link", { name: "FOY-0001" })).toBeVisible();
    await expect(page.getByText("AGENCE-01")).toHaveCount(0);

    await expectNoSeriousAxeViolations(page);
  });

  test("un foyer dit qui en fait partie et ce que chacun voit", async ({ page }) => {
    await stubApi(page);
    await seConnecter(page);
    await page.goto(`/bureau/foyers/${FOYER}/`);

    await expect(page.getByRole("heading", { level: 1 })).toContainText("FOY-0001");
    await expect(page.getByText("12 rue des Lilas")).toBeVisible();

    // Le rôle ne suffit pas : ce sont les droits effectifs qui sont écrits.
    await expect(page.getByText("proche référent")).toBeVisible();
    await expect(page.getByText(/ne voit rien de ce foyer/)).toBeVisible();
    await expect(page.getByText(/curatelle \(biens, assistance\)/)).toBeVisible();

    await expect(page.getByText("Matins en semaine")).toBeVisible();
    await expect(page.getByText(/5 créneaux par semaine/)).toBeVisible();

    // En prestataire, pas de mention mandataire.
    await expect(page.getByText(/le consommateur est l’employeur/)).toHaveCount(0);

    await expectNoSeriousAxeViolations(page);
  });

  test("en mandataire, la mention légale accompagne le foyer", async ({ page }) => {
    await stubApi(page, { mode: "mandataire" });
    await seConnecter(page);
    await page.goto(`/bureau/foyers/${FOYER}/`);
    await expect(page.getByText("Mode mandataire")).toBeVisible();
    await expect(page.getByText(/le consommateur est l'employeur/)).toBeVisible();
  });

  test("un foyer hors de votre portée ne dit pas s'il existe", async ({ page }) => {
    await stubApi(page);
    await seConnecter(page);
    const ailleurs = "9".repeat(24);
    await page.route(`**/admin/v1/households/${ailleurs}**`, (route) =>
      repondre(route, 404, { code: "introuvable", message: "Introuvable." }),
    );
    await page.goto(`/bureau/foyers/${ailleurs}/`);
    await expect(page.getByText("Foyer introuvable")).toBeVisible();
    await expect(page.getByText(/Les deux se répondent pareil/)).toBeVisible();
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
