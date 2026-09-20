import type { Metadata } from "next";
import { Breadcrumb } from "@/components/blocks/Breadcrumb/Breadcrumb";
import { ContactForm } from "@/components/forms/SpecialForms/ContactForm";
import { Section } from "@/components/layout/Section/Section";
import { Button } from "@/components/ui/Button/Button";
import { Heading } from "@/components/ui/Heading/Heading";
import { Lead } from "@/components/ui/Lead/Lead";
import { getInterfaceTexts, getNavigation, getSiteConfig, getSpecialForms } from "@/content/loader";
import { formatFrenchPhone, toTelHref } from "@/lib/phone";
import { pageTitle } from "@/lib/seo/title";

/* /contact/ (docs/05 §2, « autres demandes ») : un message, les coordonnées, l'aiguillage vers la demande. */

export function generateMetadata(): Metadata {
  const page = getSpecialForms().contact;
  const { marque } = getSiteConfig();
  return {
    title: pageTitle(page.seo.titre, marque.nom),
    description: page.seo.description,
    alternates: { canonical: "/contact/" },
  };
}

export default function ContactPage() {
  const page = getSpecialForms().contact;
  const texts = getInterfaceTexts();
  const { contact } = getSiteConfig();
  const navigation = getNavigation();
  const phone = contact.telephone_principal;
  const telHref = phone ? toTelHref(phone) : null;
  const confidentialite =
    navigation.pied_de_page.legal.find((l) => /confidentialit/i.test(l.libelle))?.href ??
    "/politique-de-confidentialite/";

  return (
    <main id="contenu">
      <Section tone="paper" aria-labelledby="titre">
        <Breadcrumb texts={texts.fil_ariane} items={[{ label: page.ariane }]} className="mb-6" />
        <Heading level={1} id="titre">
          {page.h1}
        </Heading>
        <Lead className="mt-5">{page.chapo}</Lead>
        {phone && telHref ? (
          <p className="mt-4">
            <a href={telHref} className="font-bold">
              {formatFrenchPhone(phone)}
            </a>
            {contact.email ? (
              <>
                {" · "}
                <a href={`mailto:${contact.email}`} className="font-bold">
                  {contact.email}
                </a>
              </>
            ) : null}
          </p>
        ) : null}
      </Section>
      <Section tone="white" aria-label={page.h1}>
        <div className="max-w-2xl">
          <ContactForm
            texts={{
              ...texts.formulaires,
              recherche: texts.recherche_commune,
              planning: texts.planning,
            }}
            page={page}
            phone={phone}
            confidentialiteHref={confidentialite}
          />
        </div>
      </Section>
      <Section tone="teal" aria-labelledby="demande">
        <Heading level={2} id="demande">
          {page.demande_h2}
        </Heading>
        <Lead className="mt-3">{page.demande_texte}</Lead>
        <div className="mt-6">
          <Button href={navigation.demande_href} variant="outline">
            {page.demande_lien}
          </Button>
        </div>
      </Section>
    </main>
  );
}
