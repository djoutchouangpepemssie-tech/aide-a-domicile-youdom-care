import type { MetadataRoute } from "next";
import { getSiteConfig } from "@/content/loader";
import { isIndexable, neverIndexedPaths } from "@/lib/seo/indexable";

export default function robots(): MetadataRoute.Robots {
  const { marque } = getSiteConfig();

  if (!isIndexable()) {
    return { rules: { userAgent: "*", disallow: "/" } };
  }

  return {
    rules: { userAgent: "*", allow: "/", disallow: [...neverIndexedPaths] },
    sitemap: `${marque.url}/sitemap.xml`,
  };
}
