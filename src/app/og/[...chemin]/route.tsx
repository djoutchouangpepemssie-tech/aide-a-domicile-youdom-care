import type { ThreadIllustrationName } from "@/components/ui/Thread/illustrations";
import { getSiteConfig } from "@/content/loader";
import type { ServicePublic } from "@/content/service-schema";
import { getServicePage, listBuildableServicePages } from "@/content/services";
import { renderOgImage } from "@/lib/og/render";

/*
 * Image Open Graph des pages services et pathologies, /og/{chemin}/ : le H1 de la page et un
 * tracé du fil choisi par public. Mêmes paramètres statiques que la page
 * (src/app/[...chemin]/page.tsx) : une image PNG par page construite, générée au build. Un
 * fichier opengraph-image.tsx est impossible sous un segment attrape-tout, d'où ce Route Handler
 * que la page déclare avec `pageMetadata({ image: serviceOgImagePath(chemin) })` (src/lib/og/paths.ts).
 */

type ServiceImageProps = { params: Promise<{ chemin: string[] }> };

const illustrationByPublic: Record<ServicePublic, ThreadIllustrationName> = {
  neuro: "maison",
  "personne-agee": "tasse",
  "adulte-handicap": "mains",
  "enfant-handicap": "cartable",
  aidant: "mains",
  transverse: "lune",
};

export const dynamic = "force-static";
export const dynamicParams = false;

export async function generateStaticParams() {
  const pages = await listBuildableServicePages();
  return pages.map((page) => ({ chemin: page.meta.chemin.split("/").filter(Boolean) }));
}

export async function GET(_request: Request, { params }: ServiceImageProps): Promise<Response> {
  const { chemin } = await params;
  const page = await getServicePage(`/${chemin.join("/")}/`);
  if (!page) {
    return renderOgImage({ title: getSiteConfig().marque.description_courte });
  }
  return renderOgImage({
    title: page.meta.h1,
    illustration: illustrationByPublic[page.meta.public],
  });
}
