import { expect, test, type Page } from "@playwright/test";

/*
 * Sécurité (docs/07 §6, D-013, D-029) : les en-têtes sur trois pages de gabarits différents
 * (accueil, formulaire détaillé, page locale), aucune violation de la politique de sécurité de
 * contenu ni directive inconnue dans la console, les images Open Graph et les PDF servis sous la
 * même politique, la route de mesure fermée à tout ce qui n'est pas un événement de la liste.
 */

const pages = ["/", "/demande/personne-agee/", "/aide-a-domicile/hauts-de-seine/puteaux/"];

async function collectPolicyErrors(page: Page, path: string): Promise<string[]> {
  const errors: string[] = [];
  page.on("console", (message) => {
    const text = message.text();
    if (
      /Content[- ]Security[- ]Policy|Refused to|Permissions-Policy|Origin-Agent-Cluster/i.test(text)
    )
      errors.push(text);
  });
  await page.goto(path);
  await page.waitForLoadState("networkidle");
  return errors;
}

test.describe("Sécurité (P8.5)", () => {
  for (const path of pages) {
    test(`les en-têtes de docs/07 §6 sont présents sur ${path}`, async ({ request }) => {
      const response = await request.get(path);
      expect(response.status()).toBe(200);
      const headers = response.headers();
      const csp = headers["content-security-policy"] ?? "";
      expect(csp).toContain("default-src 'self'");
      expect(csp).toContain("frame-ancestors 'none'");
      expect(csp).toContain("form-action 'self'");
      expect(csp).toContain("connect-src 'self'");
      expect(csp).toContain("object-src 'none'");
      expect(csp).toContain("base-uri 'self'");
      // Aucun script tiers : ni domaine, ni schéma ouvert dans script-src.
      expect(csp).not.toMatch(/script-src[^;]*(https?:|\*)/);
      expect(headers["strict-transport-security"]).toBe(
        "max-age=63072000; includeSubDomains; preload",
      );
      expect(headers["x-content-type-options"]).toBe("nosniff");
      expect(headers["x-frame-options"]).toBe("DENY");
      expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
      expect(headers["cross-origin-opener-policy"]).toBe("same-origin");
      for (const directive of ["camera=()", "microphone=()", "geolocation=()", "payment=()"]) {
        expect(headers["permissions-policy"]).toContain(directive);
      }
      expect(headers["permissions-policy"]).not.toContain("interest-cohort");
      expect(headers["x-powered-by"]).toBeUndefined();
    });

    test(`aucune violation de la politique de sécurité de contenu sur ${path}`, async ({
      page,
    }) => {
      const errors = await collectPolicyErrors(page, path);
      expect(errors).toEqual([]);
    });
  }

  test("les images Open Graph et les PDF des outils sont servis sous la même politique", async ({
    request,
  }) => {
    const og = await request.get("/a-propos/opengraph-image");
    expect(og.status()).toBe(200);
    expect(og.headers()["content-type"]).toMatch(/^image\//);
    expect(og.headers()["x-content-type-options"]).toBe("nosniff");

    const pdf = await request.get("/outils/tour-du-logement-anti-chutes.pdf");
    expect(pdf.status()).toBe(200);
    expect(pdf.headers()["content-type"]).toContain("application/pdf");
    expect(pdf.headers()["x-content-type-options"]).toBe("nosniff");
    expect(pdf.headers()["content-security-policy"]).toContain("frame-ancestors 'none'");
  });

  test("la route de mesure ne prend que des événements de la liste, en POST, depuis le site", async ({
    request,
    baseURL,
  }) => {
    const origin = baseURL ?? "";
    const valid = { event: "appel_clic", props: { emplacement: "en-tete" }, page: "/" };

    const get = await request.get("/api/mesure/");
    expect(get.status()).toBe(405);

    const foreign = await request.post("/api/mesure/", {
      data: valid,
      headers: { origin: "https://autre.example" },
    });
    expect(foreign.status()).toBe(403);
    expect(await foreign.text()).toBe("");

    const ok = await request.post("/api/mesure/", { data: valid, headers: { origin } });
    expect(ok.status()).toBe(204);
    expect(await ok.text()).toBe("");

    const unknown = await request.post("/api/mesure/", {
      data: { event: "page_vue", props: {}, page: "/" },
      headers: { origin },
    });
    expect(unknown.status()).toBe(400);

    const leak = await request.post("/api/mesure/", {
      data: {
        event: "demande_envoyee",
        props: { formulaire: "neuro", commune: "Puteaux" },
        page: "/",
      },
      headers: { origin },
    });
    expect(leak.status()).toBe(400);
    expect(await leak.text()).toBe("");

    const big = await request.post("/api/mesure/", {
      data: { ...valid, page: `/${"a".repeat(2100)}` },
      headers: { origin },
    });
    expect(big.status()).toBe(413);
  });

  test("sans variable d'activation, aucune requête de mesure ne part", async ({ page }) => {
    const calls: string[] = [];
    page.on("request", (req) => {
      if (req.url().includes("/api/mesure")) calls.push(req.url());
    });
    await page.goto("/demande/personne-agee/");
    await page.waitForLoadState("networkidle");
    // Un clic sur un numéro (sans suivre le lien tel:) ne doit rien envoyer non plus.
    await page.evaluate(() => {
      const link = document.querySelector("a[href^='tel:'][data-mesure]");
      link?.addEventListener("click", (event) => event.preventDefault(), { once: true });
      link?.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    });
    await page.waitForTimeout(200);
    expect(calls).toEqual([]);
  });
});
