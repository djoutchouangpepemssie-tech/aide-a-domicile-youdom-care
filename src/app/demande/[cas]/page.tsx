import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Breadcrumb } from "@/components/blocks/Breadcrumb/Breadcrumb";
import { DetailedForm } from "@/components/forms/DetailedForm/DetailedForm";
import { Section } from "@/components/layout/Section/Section";
import { Heading } from "@/components/ui/Heading/Heading";
import { Lead } from "@/components/ui/Lead/Lead";
import { getFormDefinitionBySlug, listFormDefinitions } from "@/content/form-definitions";
import {
  getInterfaceTexts,
  getNavigation,
  getPricing,
  getRequestIndexPage,
  getSiteConfig,
} from "@/content/loader";
import { budgetBasis } from "@/lib/pricing/pricing";
import { pageMetadata } from "@/lib/seo/metadata";

/*
 * /demande/{cas}/ (docs/05 §2) : un formulaire détaillé par cas, défini dans
 * content/formulaires/{id}.json. Page statique : `?commune=92062` (code INSEE) est lu par le
 * champ commune côté client ; jamais de donnée de santé dans l'adresse.
 */

type RequestPageProps = { params: Promise<{ cas: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return listFormDefinitions().map((definition) => ({ cas: definition.slug }));
}

export async function generateMetadata({ params }: RequestPageProps): Promise<Metadata> {
  const { cas } = await params;
  const definition = getFormDefinitionBySlug(cas);
  if (!definition) return {};
  return pageMetadata({
    titre: definition.seo.titre,
    description: definition.seo.description,
    chemin: `/demande/${cas}/`,
  });
}

export default async function RequestPage({ params }: RequestPageProps) {
  const { cas } = await params;
  const definition = getFormDefinitionBySlug(cas);
  if (!definition) notFound();
  const texts = getInterfaceTexts();
  const index = getRequestIndexPage();
  const { contact } = getSiteConfig();
  const navigation = getNavigation();
  const pricing = getPricing();
  const confidentialite =
    navigation.pied_de_page.legal.find((l) => /confidentialit/i.test(l.libelle))?.href ??
    "/politique-de-confidentialite/";

  return (
    <main id="contenu" data-famille="formulaire">
      <Section tone="paper" aria-labelledby="titre">
        <Breadcrumb
          texts={texts.fil_ariane}
          items={[{ label: index.ariane, href: "/demande/" }, { label: definition.ariane }]}
          className="mb-6"
        />
        <Heading level={1} id="titre">
          {definition.h1}
        </Heading>
        <Lead className="mt-5">{definition.chapo}</Lead>
      </Section>

      {/* Région nommée par le libellé court, distinct du H1 de la région d'en-tête (RGAA 12.6, R-1). */}
      <Section tone="white" aria-label={definition.ariane}>
        <div className="max-w-3xl">
          <DetailedForm
            definition={definition}
            texts={{
              ...texts.formulaires,
              recherche: texts.recherche_commune,
              planningTexts: {
                semaine_type: texts.semaine_type,
                formulaires: texts.formulaires,
                planning: texts.planning,
              },
            }}
            phone={contact.telephone_principal}
            confidentialiteHref={confidentialite}
            budget={budgetBasis(pricing.prestations, pricing.credit_impot_taux)}
          />
        </div>
      </Section>
    </main>
  );
}
