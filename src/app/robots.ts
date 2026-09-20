import type { MetadataRoute } from "next";
import { isIndexable, neverIndexedPaths } from "@/lib/seo/indexable";
import { sitemapIndexUrl } from "@/lib/seo/sitemaps";

/*
 * robots.txt (docs/04 §2) : tout est permis sauf /api/, /merci/ et /styleguide/, et l'index des
 * plans de site est déclaré. Tant que SITE_INDEXABLE ne vaut pas « true », tout est interdit :
 * les plans de site existent quand même, prêts pour l'ouverture par Arcel (docs/07 §8).
 */

export default function robots(): MetadataRoute.Robots {
  if (!isIndexable()) {
    return { rules: { userAgent: "*", disallow: "/" } };
  }

  return {
    rules: { userAgent: "*", allow: "/", disallow: [...neverIndexedPaths] },
    sitemap: sitemapIndexUrl(),
  };
}
