import { getToolPage, getToolsPage, listToolPages } from "@/content/tool-pages";
import { OG_CONTENT_TYPE, OG_SIZE, ogAlt, renderOgImage } from "@/lib/og/render";

/* Une image par outil à imprimer : son H1, le tracé du carnet (docs/04 §2). */

type ToolImageProps = { params: Promise<{ outil: string }> };

export const alt = ogAlt(getToolsPage().h1);
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export function generateStaticParams() {
  return listToolPages().map((tool) => ({ outil: tool.id }));
}

export default async function Image({ params }: ToolImageProps) {
  const { outil } = await params;
  const tool = getToolPage(outil);
  return renderOgImage({ title: tool?.h1 ?? getToolsPage().h1, illustration: "carnet" });
}
