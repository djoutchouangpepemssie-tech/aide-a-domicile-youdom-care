import { expect, test, type APIRequestContext } from "@playwright/test";

/*
 * SEO technique (P5.3, P5.4) : index et segments des plans de site, robots.txt, images Open
 * Graph. Le build de test est en noindex (SITE_INDEXABLE absent) : robots.txt ferme tout, mais
 * les plans de site et les images existent déjà.
 */

const SITE = "https://www.youdom-care.com";

/** Largeur et hauteur d'un PNG : bloc IHDR après la signature de 8 octets. */
function pngSize(buffer: Buffer): { width: number; height: number } {
  expect(buffer.subarray(1, 4).toString("ascii")).toBe("PNG");
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

/** Chemin local d'une adresse absolue rendue avec `metadataBase` (le domaine de production). */
function localPath(url: string): string {
  const parsed = new URL(url, SITE);
  return `${parsed.pathname}${parsed.search}`;
}

async function expectOgPng(request: APIRequestContext, url: string) {
  const response = await request.get(localPath(url));
  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toContain("image/png");
  expect(pngSize(await response.body())).toEqual({ width: 1200, height: 630 });
}

test.describe("SEO technique", () => {
  test("l'index des plans de site est en XML et liste les segments non vides", async ({
    request,
  }) => {
    const response = await request.get("/sitemap.xml");
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("xml");
    const body = await response.text();
    expect(body).toContain("<sitemapindex");
    expect(body).toContain(`<loc>${SITE}/sitemap/pages.xml</loc>`);
    expect(body).toMatch(/<lastmod>\d{4}-\d{2}-\d{2}<\/lastmod>/);
    // Le segment du magazine n'existait pas quand ce parcours a été écrit : il était attendu
    // absent. Depuis la phase 7, « Le Fil » a des articles, donc le segment est peuplé et doit
    // figurer dans l'index. Ce qui compte est l'invariant « aucun segment vide »
    // (docs/AUDIT_GLOBAL.md §9).
    expect(body).toContain(`<loc>${SITE}/sitemap/magazine.xml</loc>`);
  });

  test("le segment pages liste les adresses indexables, absolues, avec barre finale", async ({
    request,
  }) => {
    const response = await request.get("/sitemap/pages.xml");
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("xml");
    const body = await response.text();
    expect(body).toContain("<urlset");
    expect(body).toContain(`<loc>${SITE}/comment-ca-marche/</loc>`);
    expect(body).toContain(`<loc>${SITE}/tarifs-et-aides/apa/</loc>`);
    expect(body).toMatch(/<lastmod>\d{4}-\d{2}-\d{2}/);
    for (const loc of body.match(/<loc>[^<]+<\/loc>/g) ?? []) {
      expect(loc).toMatch(new RegExp(`^<loc>${SITE}/(?:[a-z0-9-]+/)*</loc>$`));
    }
    expect(body).not.toContain("/merci/");
    expect(body).not.toContain("/styleguide/");
    expect(body).not.toContain("/api/");
  });

  test("robots.txt est servi et cohérent avec l'état d'indexation", async ({ request }) => {
    const response = await request.get("/robots.txt");
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("text/plain");
    const body = await response.text();
    expect(body).toContain("User-Agent: *");
    if (body.includes("Sitemap:")) {
      expect(body).toContain(`Sitemap: ${SITE}/sitemap.xml`);
      expect(body).toContain("Disallow: /api/");
      expect(body).toContain("Disallow: /merci/");
      expect(body).toContain("Disallow: /styleguide/");
    } else {
      expect(body).toContain("Disallow: /");
    }
  });

  test("l'accueil déclare une image Open Graph PNG de 1200 × 630 avec un texte alternatif", async ({
    page,
    request,
  }) => {
    await page.goto("/");
    const image = await page.locator('meta[property="og:image"]').first().getAttribute("content");
    expect(image).toMatch(/\/opengraph-image/);
    await expect(page.locator('meta[property="og:image:alt"]').first()).toHaveAttribute(
      "content",
      /Youdom Care/,
    );
    await expectOgPng(request, image ?? "");
  });

  test("une page service a une image Open Graph, rendue par /og/{chemin}/", async ({
    page,
    request,
  }) => {
    // L'image propre à la page (src/app/og/[...chemin]/route.tsx) est un PNG 1200 × 630.
    await expectOgPng(request, "/og/maladies-neurodegeneratives/alzheimer/");
    // La page déclare une image valide : la sienne, ou l'image de repli de l'accueil.
    await page.goto("/maladies-neurodegeneratives/alzheimer/");
    const image = await page.locator('meta[property="og:image"]').first().getAttribute("content");
    expect(image).toMatch(/\/(og\/maladies-neurodegeneratives\/alzheimer\/|opengraph-image)/);
    await expectOgPng(request, image ?? "");
  });

  test("une page enfant a sa propre image Open Graph malgré `openGraph` de la page", async ({
    page,
    request,
  }) => {
    // Une page qui définit `openGraph` perd l'image héritée du segment parent : chaque page a la sienne.
    await page.goto("/comment-ca-marche/prestataire-ou-mandataire/");
    const image = await page.locator('meta[property="og:image"]').first().getAttribute("content");
    expect(image).toContain("/comment-ca-marche/prestataire-ou-mandataire/opengraph-image");
    await expectOgPng(request, image ?? "");
  });

  test("une page statique principale a sa propre image Open Graph", async ({ page, request }) => {
    await page.goto("/comment-ca-marche/");
    const image = await page.locator('meta[property="og:image"]').first().getAttribute("content");
    expect(image).toContain("/comment-ca-marche/opengraph-image");
    await expect(page.locator('meta[property="og:image:alt"]').first()).toHaveAttribute(
      "content",
      /Comment ça marche/,
    );
    await expectOgPng(request, image ?? "");
  });
});
