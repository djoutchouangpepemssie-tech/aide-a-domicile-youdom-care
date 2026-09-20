import { buildSitemapIndex } from "@/lib/seo/sitemaps";

/*
 * Index des plans de site (docs/04 §2) : liste les segments non vides servis par
 * src/app/sitemap/[segment]/route.ts. Statique, comme le reste du site.
 */

export const dynamic = "force-static";

export async function GET(): Promise<Response> {
  return new Response(await buildSitemapIndex(), {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=0, must-revalidate",
    },
  });
}
