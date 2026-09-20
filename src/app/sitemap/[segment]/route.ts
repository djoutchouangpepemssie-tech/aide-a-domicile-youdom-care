import { listPopulatedSegments, renderUrlset, segmentEntries } from "@/lib/seo/sitemaps";

/*
 * Segments des plans de site : /sitemap/{id}.xml, un par segment non vide de
 * src/lib/seo/sitemaps.ts, générés au build. L'index /sitemap.xml qui les liste est
 * src/app/sitemap.xml/route.ts. Les chemins à extension échappent à `trailingSlash`.
 */

type SegmentRouteProps = { params: Promise<{ segment: string }> };

export const dynamic = "force-static";
export const dynamicParams = false;

export async function generateStaticParams() {
  const segments = await listPopulatedSegments();
  return segments.map(({ id }) => ({ segment: `${id}.xml` }));
}

export async function GET(_request: Request, { params }: SegmentRouteProps): Promise<Response> {
  const { segment } = await params;
  const entries = segment.endsWith(".xml") ? await segmentEntries(segment.slice(0, -4)) : null;
  if (!entries || entries.length === 0) {
    return new Response("Not Found", { status: 404 });
  }
  return new Response(renderUrlset(entries), {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=0, must-revalidate",
    },
  });
}
