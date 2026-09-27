import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LocalTemplate, type LocalTemplateData } from "@/components/local/LocalTemplate";
import { localTitle } from "@/components/local/local-texts";
import {
  getAids,
  getInterfaceTexts,
  getNavigation,
  getSiteConfig,
  getWeekExamples,
} from "@/content/loader";
import { getLocalPage, listBuildableLocalPages, localPathSegments } from "@/content/local";
import {
  accompagnementLinks,
  confidentialiteHref,
  departementCodeOf,
  departementHref,
  departementPages,
  localCrumbs,
  neighbourPaths,
} from "@/content/local-site";
import { JsonLd } from "@/lib/jsonld/JsonLd";
import { localPageJsonLd } from "@/lib/jsonld/local-page";
import { serviceOgImagePath } from "@/lib/og/paths";
import { pageMetadata } from "@/lib/seo/metadata";

/*
 * Pages locales (docs/04 §4, P6.5) : /aide-a-domicile/{departement}/, /{departement}/{commune}/,
 * /paris/{arrondissement}/ et /paris/{arrondissement}/{quartier}/, une route par territoire
 * constructible (data/local + content/local, src/content/local.ts), construite au build. Un
 * chemin inconnu renvoie 404 ; en production, une page `a_relire` n'est pas construite.
 * Données structurées : `WebPage` et `FAQPage` (src/lib/jsonld/local-page.ts) ; `Organization`
 * vient du pied de page, `BreadcrumbList` du fil d'Ariane. L'image Open Graph est rendue par
 * /og/{chemin}/ (segment attrape-tout : pas d'opengraph-image.tsx possible ici).
 */

type LocalRouteProps = { params: Promise<{ chemin: string[] }> };

export const dynamicParams = false;

function toPath(segments: string[]): string {
  return `/aide-a-domicile/${segments.join("/")}/`;
}

export async function generateStaticParams() {
  const pages = await listBuildableLocalPages();
  return pages.map((page) => ({ chemin: localPathSegments(page.chemin) }));
}

export async function generateMetadata({ params }: LocalRouteProps): Promise<Metadata> {
  const { chemin } = await params;
  const page = await getLocalPage(toPath(chemin));
  if (!page) return {};
  return pageMetadata({
    titre: page.editorial.seo.titre,
    description: page.editorial.seo.description,
    chemin: page.chemin,
    noindex: page.editorial.statut === "a_relire",
    image: serviceOgImagePath(page.chemin),
  });
}

/** Aides présentées dans le bloc 7 (content/aides.json). */
const departementAids = ["apa", "pch"];

export async function buildLocalData(chemin: string): Promise<LocalTemplateData | null> {
  const page = await getLocalPage(chemin);
  if (!page) return null;
  const { data, editorial } = page;
  const texts = getInterfaceTexts();
  const navigation = getNavigation();
  const { contact, agences, disponibilite } = getSiteConfig();
  const agency = data.agence_proche
    ? (agences.find((a) => a.id === data.agence_proche?.id) ?? null)
    : null;
  const aids = getAids().aides.filter((aid) => departementAids.includes(aid.id));
  const reassurance = [
    texts.rail_conversion.reassurance,
    ...(disponibilite.sept_jours_sur_sept === true ? [texts.local.reassurance_7j7] : []),
    ...(disponibilite.vingt_quatre_heures === true ? [texts.local.reassurance_24h] : []),
  ];
  const departement = departementCodeOf(page);
  return {
    data,
    editorial,
    texts,
    navigation,
    phone: contact.telephone_principal,
    agency,
    weekExample: getWeekExamples().exemples.find((e) => e.id === editorial.semaine_type) ?? null,
    aids,
    accompagnements: await accompagnementLinks(),
    crumbs: await localCrumbs(page),
    neighbourPaths: await neighbourPaths(page),
    departementPages: await departementPages(page),
    departementHref: data.kind === "departement" ? null : await departementHref(departement),
    confidentialiteHref: confidentialiteHref(),
    tarifsHref:
      navigation.principale.find((item) => item.href?.includes("tarifs"))?.href ??
      "/tarifs-et-aides/",
    reassurance,
  };
}

export default async function LocalRoute({ params }: LocalRouteProps) {
  const { chemin } = await params;
  const data = await buildLocalData(toPath(chemin));
  if (!data) notFound();
  const jsonLd = localPageJsonLd(
    data.data,
    data.editorial,
    localTitle(data.data, data.texts.local),
    getSiteConfig(),
  );
  return (
    <>
      <JsonLd data={jsonLd} />
      <LocalTemplate data={data} />
    </>
  );
}
