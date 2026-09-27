import { afterEach, describe, expect, it, vi } from "vitest";
import { sitemapIndexUrl } from "@/lib/seo/sitemaps";
import robots from "./robots";

describe("robots.txt", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("n'interdit tout que si SITE_INDEXABLE vaut « false » (D-035)", () => {
    vi.stubEnv("SITE_INDEXABLE", "false");
    expect(robots()).toEqual({ rules: { userAgent: "*", disallow: "/" } });

    expect(robots().sitemap).toBeUndefined();

    // Sans variable, le site est ouvert : c'est le défaut depuis D-035.
    vi.stubEnv("SITE_INDEXABLE", "");
    expect(robots().sitemap).toBeDefined();
  });

  it("ouvre le site sauf les chemins techniques", () => {
    vi.stubEnv("SITE_INDEXABLE", "true");
    const result = robots();
    expect(result.rules).toEqual({
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/merci/", "/styleguide/"],
    });
  });

  it("déclare l'index des plans de site, en adresse absolue", () => {
    vi.stubEnv("SITE_INDEXABLE", "true");
    const result = robots();
    expect(result.sitemap).toBe("https://www.youdom-care.com/sitemap.xml");
    expect(result.sitemap).toBe(sitemapIndexUrl());
  });
});
