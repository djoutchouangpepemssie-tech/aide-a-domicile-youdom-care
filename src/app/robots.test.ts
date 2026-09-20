import { afterEach, describe, expect, it, vi } from "vitest";
import { sitemapIndexUrl } from "@/lib/seo/sitemaps";
import robots from "./robots";

describe("robots.txt", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("interdit tout tant que SITE_INDEXABLE ne vaut pas « true »", () => {
    vi.stubEnv("SITE_INDEXABLE", "");
    expect(robots()).toEqual({ rules: { userAgent: "*", disallow: "/" } });

    vi.stubEnv("SITE_INDEXABLE", "false");
    expect(robots().rules).toEqual({ userAgent: "*", disallow: "/" });
    expect(robots().sitemap).toBeUndefined();
  });

  it("ouvre le site sauf les chemins techniques une fois SITE_INDEXABLE à « true »", () => {
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
