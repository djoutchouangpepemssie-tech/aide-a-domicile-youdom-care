import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AgencyTemplate, type AgencyTemplateData } from "@/components/local/AgencyTemplate";
import { getAgenciesPage, getInterfaceTexts, getSiteConfig } from "@/content/loader";
import { agencyCoordinates } from "@/content/local";
import {
  agencyCommunes,
  confidentialiteHref,
  departementHref,
  departementPlace,
} from "@/content/local-site";
import { JsonLd } from "@/lib/jsonld/JsonLd";
import { agencyPath, localBusiness } from "@/lib/jsonld/local-business";
import { pageMetadata } from "@/lib/seo/metadata";

/*
 * Page d'une agence réelle /agences/{id}/ (docs/00 §5, docs/04 §2, P6.6) : une route par agence
 * de site.config.json, construite au build ; un identifiant inconnu renvoie 404. Le JSON-LD
 * `LocalBusiness` reçoit les coordonnées géocodées de data/agences.geo.json ;
 * `Organization` vient du pied de page, `BreadcrumbList` du fil d'Ariane.
 */

type AgencyRouteProps = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return getSiteConfig().agences.map((agency) => ({ slug: agency.id }));
}

export async function generateMetadata({ params }: AgencyRouteProps): Promise<Metadata> {
  const { slug } = await params;
  const agency = getSiteConfig().agences.find((a) => a.id === slug);
  const seo = getAgenciesPage().agences[slug]?.seo;
  if (!agency || !seo) return {};
  return pageMetadata({
    titre: seo.titre,
    description: seo.description,
    chemin: agencyPath(agency),
  });
}

export async function buildAgencyData(slug: string): Promise<AgencyTemplateData | null> {
  const config = getSiteConfig();
  const agency = config.agences.find((a) => a.id === slug);
  if (!agency) return null;
  const { index, page } = getAgenciesPage();
  return {
    agency,
    texts: getInterfaceTexts(),
    page,
    indexLabel: index.ariane,
    phone: config.contact.telephone_principal,
    lieu: departementPlace(agency.departement),
    departementHref: await departementHref(agency.departement),
    communes: await agencyCommunes(agency),
    confidentialiteHref: confidentialiteHref(),
  };
}

export default async function AgencyRoute({ params }: AgencyRouteProps) {
  const { slug } = await params;
  const data = await buildAgencyData(slug);
  if (!data) notFound();
  const jsonLd = localBusiness(data.agency, getSiteConfig(), {
    geo: agencyCoordinates(data.agency.id),
  });
  return (
    <>
      <JsonLd data={jsonLd} />
      <AgencyTemplate data={data} />
    </>
  );
}
