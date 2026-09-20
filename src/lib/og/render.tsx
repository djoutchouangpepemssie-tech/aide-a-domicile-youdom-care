import { ImageResponse } from "next/og";
import type { ThreadIllustrationName } from "@/components/ui/Thread/illustrations";
import { getSiteConfig } from "@/content/loader";
import { loadOgFonts, OG_FONT_FAMILY } from "./fonts";
import { OgCard } from "./OgCard";

/*
 * Rendu des images Open Graph (P5.4). Chaque route `opengraph-image.tsx` appelle `renderOgImage`
 * avec le H1 de sa page ; Next détecte ces fichiers et ajoute lui-même `og:image`,
 * `og:image:width/height` et `og:image:alt` à la page et à ses descendantes (une image de
 * fichier a priorité sur `metadata.openGraph.images`). Images générées au build, en PNG.
 */

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = "image/png";

/** Texte alternatif : la marque puis le titre de la page. */
export function ogAlt(title: string): string {
  return `${getSiteConfig().marque.nom} — ${title}`;
}

export async function renderOgImage(props: {
  title: string;
  illustration?: ThreadIllustrationName;
}): Promise<ImageResponse> {
  const { marque } = getSiteConfig();
  const fonts = await loadOgFonts();
  return new ImageResponse(
    <OgCard
      title={props.title}
      illustration={props.illustration}
      brand={marque.nom}
      signature={marque.signature}
      fontFamily={fonts.length > 0 ? OG_FONT_FAMILY : "sans-serif"}
    />,
    { ...OG_SIZE, ...(fonts.length > 0 ? { fonts } : {}) },
  );
}
