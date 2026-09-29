import type { Metadata } from "next";
import { Breadcrumb } from "@/components/blocks/Breadcrumb/Breadcrumb";
import { HospitalDischargeForm } from "@/components/forms/SpecialForms/HospitalDischargeForm";
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
import { pageMetadata } from "@/lib/seo/metadata";

/* /demande/sortie-d-hospitalisation/ (docs/05 §2) : le parcours express en quatre écrans. Page statique. */

export function generateMetadata(): Metadata {
  const page = getSpecialForms().sortie_hospitalisation;
  return pageMetadata({
    titre: page.seo.titre,
    description: page.seo.description,
    chemin: "/demande/sortie-d-hospitalisation/",
  });
}

export default function HospitalDischargePage() {
  const page = getSpecialForms().sortie_hospitalisation;
  const texts = getInterfaceTexts();
  const index = getRequestIndexPage();
  const { contact } = getSiteConfig();
  const navigation = getNavigation();
  const confidentialite =
    navigation.pied_de_page.legal.find((l) => /confidentialit/i.test(l.libelle))?.href ??
    "/politique-de-confidentialite/";

  return (
    <main id="contenu" data-famille="formulaire">
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
      <Section tone="white" aria-label={page.ariane}>
        <div className="max-w-2xl">
          <HospitalDischargeForm
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
