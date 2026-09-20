import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ServiceTemplate, type ServiceTemplateData } from "@/components/service/ServiceTemplate";
import { listFormDefinitions } from "@/content/form-definitions";
import {
  getAids,
  getCommitments,
  getInterfaceTexts,
  getNavigation,
  getPricing,
  getSiteConfig,
  getSpecialForms,
  getWeekExamples,
} from "@/content/loader";
import { getServicePage, listBuildableServicePages, listServicePages } from "@/content/services";
import { budgetBasis } from "@/lib/pricing/pricing";
import { pageTitle } from "@/lib/seo/title";

/*
 * Pages services et pathologies (docs/00 §5, docs/03) : une route par fichier
 * content/services/**\/*.mdx, construite au build. Un chemin inconnu renvoie 404 ; en
 * production, une page `a_relire` n'est pas construite (docs/03 §1).
 */

type ServiceRouteProps = { params: Promise<{ chemin: string[] }> };

export const dynamicParams = false;

function toPath(segments: string[]): string {
  return `/${segments.join("/")}/`;
}

export async function generateStaticParams() {
  const pages = await listBuildableServicePages();
  return pages.map((page) => ({ chemin: page.meta.chemin.split("/").filter(Boolean) }));
}

export async function generateMetadata({ params }: ServiceRouteProps): Promise<Metadata> {
  const { chemin } = await params;
  const page = await getServicePage(toPath(chemin));
  if (!page) return {};
  const { marque } = getSiteConfig();
  return {
    title: pageTitle(page.meta.titre, marque.nom),
    description: page.meta.description,
    alternates: { canonical: page.meta.chemin },
    ...(page.meta.statut === "a_relire" ? { robots: { index: false, follow: false } } : {}),
  };
}

export async function buildServiceData(chemin: string): Promise<ServiceTemplateData | null> {
  const page = await getServicePage(chemin);
  if (!page) return null;
  const texts = getInterfaceTexts();
  const navigation = getNavigation();
  const { contact } = getSiteConfig();
  const pricing = getPricing();
  const all = await listServicePages();
  const linkedTitles = Object.fromEntries(all.map((p) => [p.meta.chemin, p.meta.h1]));
  const confidentialite =
    navigation.pied_de_page.legal.find((l) => /confidentialit/i.test(l.libelle))?.href ??
    "/politique-de-confidentialite/";
  return {
    page: page.meta,
    Body: page.Body,
    texts,
    navigation,
    phone: contact.telephone_principal,
    weekExample:
      getWeekExamples().exemples.find((e) => e.id === page.meta.semaine_type.exemple) ?? null,
    commitments: getCommitments(),
    aids: getAids().aides,
    pricing,
    definition: listFormDefinitions().find((d) => d.id === page.meta.formulaire) ?? null,
    specialForms: getSpecialForms(),
    budget: budgetBasis(pricing.prestations, pricing.credit_impot_taux),
    linkedTitles,
    confidentialiteHref: confidentialite,
    tarifsHref:
      navigation.principale.find((item) => item.href?.includes("tarifs"))?.href ??
      "/tarifs-et-aides/",
  };
}

export default async function ServiceRoute({ params }: ServiceRouteProps) {
  const { chemin } = await params;
  const data = await buildServiceData(toPath(chemin));
  if (!data) notFound();
  return <ServiceTemplate data={data} />;
}
