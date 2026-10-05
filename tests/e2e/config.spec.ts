import { expect, test } from "@playwright/test";
import { siteIndexable } from "./indexable";

test.describe("Configuration Next (P0.8)", () => {
  test("les en-têtes de sécurité de docs/07 §6 sont présents", async ({ request }) => {
    const response = await request.get("/");
    expect(response.status()).toBe(200);
    const headers = response.headers();

    expect(headers["content-security-policy"]).toContain("frame-ancestors 'none'");
    expect(headers["content-security-policy"]).toContain("default-src 'self'");
    expect(headers["strict-transport-security"]).toContain("max-age=");
    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
    expect(headers["permissions-policy"]).toContain("camera=()");
    expect(headers["x-powered-by"]).toBeUndefined();
  });

  /*
   * D-035 a inversé la règle : l'indexation est ouverte par défaut et `SITE_INDEXABLE="false"`
   * la referme. Le titre et l'attente de ce parcours ont gardé l'ancienne règle (« noindex tant
   * que ce n'est pas "true" »), ce qui le rendait incompatible avec les parcours qui vérifient
   * qu'une page est indexable : la suite ne pouvait être verte dans aucune des deux
   * configurations (docs/AUDIT_GLOBAL.md §9). Les deux états sont désormais vérifiés.
   */
  test("l'indexation suit SITE_INDEXABLE : fermée à « false », ouverte sinon", async ({
    request,
  }) => {
    const home = await request.get("/");
    const robots = await request.get("/robots.txt");
    expect(robots.status()).toBe(200);
    const body = await robots.text();

    if (siteIndexable) {
      expect(home.headers()["x-robots-tag"]).toBeUndefined();
      expect(body).toMatch(/User-Agent: \*\s+Allow: \//i);
      expect(body).toContain("Sitemap:");
      return;
    }
    expect(home.headers()["x-robots-tag"]).toBe("noindex, nofollow");
    expect(body).toMatch(/User-Agent: \*\s+Disallow: \//i);
  });

  test("les URL se terminent par une barre oblique", async ({ request }) => {
    const response = await request.get("/styleguide", { maxRedirects: 0 });
    expect([301, 308]).toContain(response.status());
    expect(response.headers()["location"]).toMatch(/\/styleguide\/$/);
  });
});
