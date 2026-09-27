import type { ThreadIllustrationName } from "@/components/ui/Thread/illustrations";
import { localTitle } from "@/components/local/local-texts";
import { getInterfaceTexts, getSiteConfig } from "@/content/loader";
import { getLocalPage, listBuildableLocalPages, localPathSegments } from "@/content/local";
import type { ServicePublic } from "@/content/service-schema";
import { getServicePage, listBuildableServicePages } from "@/content/services";
import { allMagazinePages } from "@/app/magazine/data";
import { renderOgImage } from "@/lib/og/render";

/*
 * Image Open Graph des pages servies par un segment attrape-tout, /og/{chemin}/ : pages
 * services et pathologies (src/app/[...chemin]/page.tsx), pages locales
 * (src/app/aide-a-domicile/[...chemin]/page.tsx) et pages du magazine (src/app/magazine/**,
 * illustration « carnet » ; un opengraph-image.tsx sous /magazine/ s’appliquerait aussi aux
 * articles et masquerait leur image). Mêmes paramètres statiques que ces pages : une
 * image PNG par page construite, générée au build ; le H1 de la page et un tracé du fil choisi
 * par public (services) ou la maison (territoires). Un fichier opengraph-image.tsx est
 * impossible sous un segment attrape-tout, d'où ce Route Handler que la page déclare avec
 * `pageMetadata({ image: serviceOgImagePath(chemin) })` (src/lib/og/paths.ts).
 */

type ImageProps = { params: Promise<{ chemin: string[] }> };

const illustrationByPublic: Record<ServicePublic, ThreadIllustrationName> = {
  neuro: "maison",
  "personne-agee": "tasse",
  "adulte-handicap": "mains",
  "enfant-handicap": "cartable",
  aidant: "mains",
  transverse: "lune",
};

const LOCAL_PREFIX = "aide-a-domicile";
const MAGAZINE_PREFIX = "magazine";

export const dynamic = "force-static";
export const dynamicParams = false;

export async function generateStaticParams() {
  const services = (await listBuildableServicePages()).map((page) => ({
    chemin: page.meta.chemin.split("/").filter(Boolean),
  }));
  const locals = (await listBuildableLocalPages()).map((page) => ({
    chemin: [LOCAL_PREFIX, ...localPathSegments(page.chemin)],
  }));
  // Magazine « Le Fil » (P7.1) : index et pagination, rubriques, articles, fiches auteurs.
  const magazine = (await allMagazinePages()).map((page) => ({
    chemin: page.chemin.split("/").filter(Boolean),
  }));
  return [...services, ...locals, ...magazine];
}

export async function GET(_request: Request, { params }: ImageProps): Promise<Response> {
  const { chemin } = await params;
  const path = `/${chemin.join("/")}/`;
  if (chemin[0] === LOCAL_PREFIX) {
    const local = await getLocalPage(path);
    if (local) {
      return renderOgImage({
        title: localTitle(local.data, getInterfaceTexts().local),
        illustration: "maison",
      });
    }
  }
  if (chemin[0] === MAGAZINE_PREFIX) {
    const magazinePage = (await allMagazinePages()).find((page) => page.chemin === path);
    if (magazinePage) return renderOgImage({ title: magazinePage.titre, illustration: "carnet" });
  }
  const page = await getServicePage(path);
  if (!page) {
    return renderOgImage({ title: getSiteConfig().marque.description_courte });
  }
  return renderOgImage({
    title: page.meta.h1,
    illustration: illustrationByPublic[page.meta.public],
  });
}
