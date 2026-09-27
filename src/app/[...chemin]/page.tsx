import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ServiceTemplate, type ServiceTemplateData } from "@/components/service/ServiceTemplate";
import { listFormDefinitions } from "@/content/form-definitions";
import {
  getAids,
  getCaregiverCheckPage,
  getCommitments,
  getInterfaceTexts,
  getNavigation,
  getPricing,
  getSiteConfig,
  getSpecialForms,
  getWeekExamples,
} from "@/content/loader";
import { getServicePage, listBuildableServicePages, listServicePages } from "@/content/services";
import { JsonLd } from "@/lib/jsonld/JsonLd";
import { servicePageJsonLd } from "@/lib/jsonld/service-page";
import { budgetBasis } from "@/lib/pricing/pricing";
import { pageMetadata } from "@/lib/seo/metadata";
import { serviceOgImagePath } from "@/lib/og/paths";

/*
 * Pages services et pathologies (docs/00 §5, docs/03) : une route par fichier
 * content/services/**\/*.mdx, construite au build. Un chemin inconnu renvoie 404 ; en
 * production, une page `a_relire` n'est pas construite (docs/03 §1).
 *
 * Données structurées (docs/04 §2, P5.2) : `Service`, `MedicalWebPage` (pathologie relue) ou
 * `WebPage`, et `FAQPage` avec les questions de la section 11 ; `Organization` vient du pied
 * de page, `BreadcrumbList` du fil d'Ariane.
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
  // docs/04 §2 : canonique absolue, Open Graph et Twitter par pageMetadata ; une page a_relire
  // reste noindex ; l'image Open Graph est rendue par la route /og/{chemin}/ (segment
  // attrape-tout : pas d'opengraph-image.tsx possible ici).
  return pageMetadata({
    titre: page.meta.titre,
    description: page.meta.description,
    chemin: page.meta.chemin,
    // D-035 : les pages services et pathologies sont indexables sans attendre la relecture.
    noindex: false,
    image: serviceOgImagePath(page.meta.chemin),
  });
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
  const linkedIcons = Object.fromEntries(all.map((p) => [p.meta.chemin, p.meta.icone]));
  // Sous-pages d'un pilier (liens-icônes sous le hero) : par `ordre`, puis par chemin.
  const sousPages = all
    .filter((p) => p.meta.pilier === page.meta.chemin)
    .sort(
      (a, b) =>
        (a.meta.ordre ?? Number.MAX_SAFE_INTEGER) - (b.meta.ordre ?? Number.MAX_SAFE_INTEGER) ||
        a.meta.chemin.localeCompare(b.meta.chemin, "fr"),
    )
    .map((p) => ({
      chemin: p.meta.chemin,
      libelle: p.meta.libelle_court ?? p.meta.h1,
      ...(p.meta.icone ? { icone: p.meta.icone } : {}),
    }));
  // Première question de « Où en êtes-vous ? », posée dans le hero du pilier Aidants.
  const caregiverCheck = getCaregiverCheckPage();
  const firstQuestion = caregiverCheck.questions[0];
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
    linkedIcons,
    sousPages,
    caregiverQuestion: firstQuestion
      ? {
          question: firstQuestion.texte,
          reponses: caregiverCheck.reponses,
          href: "/aidants/ou-en-etes-vous/",
        }
      : null,
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
  const jsonLd = servicePageJsonLd(
    data.page,
    getSiteConfig(),
    data.texts.service.publics[data.page.public],
  );
  return (
    <>
      <JsonLd data={jsonLd} />
      <ServiceTemplate data={data} />
    </>
  );
}
