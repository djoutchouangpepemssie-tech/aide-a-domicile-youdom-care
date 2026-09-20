import type { Metadata } from "next";
import { Breadcrumb } from "@/components/blocks/Breadcrumb/Breadcrumb";
import { ProfessionalForm } from "@/components/forms/SpecialForms/ProfessionalForm";
import { Section } from "@/components/layout/Section/Section";
import { Heading } from "@/components/ui/Heading/Heading";
import { Lead } from "@/components/ui/Lead/Lead";
import {
  getInterfaceTexts,
  getNavigation,
  getRequestIndexPage,
  getSiteConfig,
  getSpecialForms,
} from "@/content/loader";
import { pageTitle } from "@/lib/seo/title";

/* /demande/professionnel/ (docs/05 §2) : les prescripteurs adressent une situation, sans donnée nominative. Page statique. */

export function generateMetadata(): Metadata {
  const page = getSpecialForms().professionnel;
  const { marque } = getSiteConfig();
  return {
    title: pageTitle(page.seo.titre, marque.nom),
    description: page.seo.description,
    alternates: { canonical: "/demande/professionnel/" },
  };
}

export default function ProfessionalPage() {
  const page = getSpecialForms().professionnel;
  const texts = getInterfaceTexts();
  const index = getRequestIndexPage();
  const { contact } = getSiteConfig();
  const navigation = getNavigation();
  const confidentialite =
    navigation.pied_de_page.legal.find((l) => /confidentialit/i.test(l.libelle))?.href ??
    "/politique-de-confidentialite/";

  return (
    <main id="contenu">
      <Section tone="paper" aria-labelledby="titre">
        <Breadcrumb
          texts={texts.fil_ariane}
          items={[{ label: index.ariane, href: "/demande/" }, { label: page.ariane }]}
          className="mb-6"
        />
        <Heading level={1} id="titre">
          {page.h1}
        </Heading>
        <Lead className="mt-5">{page.chapo}</Lead>
      </Section>
      <Section tone="white" aria-label={page.h1}>
        <div className="max-w-2xl">
          <ProfessionalForm
            texts={{
              ...texts.formulaires,
              recherche: texts.recherche_commune,
              planning: texts.planning,
            }}
            page={page}
            phone={contact.telephone_principal}
            confidentialiteHref={confidentialite}
          />
        </div>
      </Section>
    </main>
  );
}
