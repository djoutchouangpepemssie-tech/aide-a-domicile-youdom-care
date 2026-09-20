import { expect, test } from "@playwright/test";

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

  test("le site est en noindex tant que SITE_INDEXABLE n'est pas « true »", async ({ request }) => {
    const home = await request.get("/");
    expect(home.headers()["x-robots-tag"]).toBe("noindex, nofollow");

    const robots = await request.get("/robots.txt");
    expect(robots.status()).toBe(200);
    expect(await robots.text()).toMatch(/User-Agent: \*\s+Disallow: \//i);
  });

  test("les URL se terminent par une barre oblique", async ({ request }) => {
    const response = await request.get("/styleguide", { maxRedirects: 0 });
    expect([301, 308]).toContain(response.status());
    expect(response.headers()["location"]).toMatch(/\/styleguide\/$/);
  });
});
