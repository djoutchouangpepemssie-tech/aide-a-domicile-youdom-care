import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumb } from "@/components/blocks/Breadcrumb/Breadcrumb";
import { Section } from "@/components/layout/Section/Section";
import { Heading } from "@/components/ui/Heading/Heading";
import { Lead } from "@/components/ui/Lead/Lead";
import { getAbout, getInterfaceTexts, getNavigation, getSiteConfig } from "@/content/loader";
import { pageTitle } from "@/lib/seo/title";

/* Charte éditoriale (docs/06 §4, docs/03 §1) : comment les pages sont écrites, sourcées, relues, mises à jour. */

export function generateMetadata(): Metadata {
  const { charte_page } = getAbout();
  const { marque } = getSiteConfig();
  return {
    title: pageTitle(charte_page.seo.titre, marque.nom),
    description: charte_page.seo.description,
    alternates: { canonical: "/a-propos/charte-editoriale/" },
  };
}

export default function EditorialCharterPage() {
  const { a_propos, charte_page: page } = getAbout();
  const { contact } = getSiteConfig();
  const navigation = getNavigation();
  const { fil_ariane } = getInterfaceTexts();

  return (
    <main id="contenu">
      <Section tone="paper" aria-labelledby="titre">
        <Breadcrumb
          texts={fil_ariane}
          items={[{ label: a_propos.ariane, href: "/a-propos/" }, { label: page.ariane }]}
          className="mb-6"
        />
        <Heading level={1} id="titre">
          {page.h1}
        </Heading>
        <Lead className="mt-5">{page.chapo}</Lead>
      </Section>

      <Section tone="white" aria-label={page.h1}>
        <ol className="m-0 grid list-none gap-6 p-0 md:grid-cols-2" data-principes>
          {page.principes.map((principe, index) => (
            <li
              key={principe.titre}
              className="max-w-none rounded-card border border-line bg-white p-6 shadow-1"
            >
              <p className="m-0 flex items-start gap-3">
                <span
                  aria-hidden="true"
                  className="figure flex size-10 shrink-0 items-center justify-center rounded-full border-2 border-teal-700 bg-white text-teal-900"
                >
                  {index + 1}
                </span>
                <span className="heading-4 pt-1.5">{principe.titre}</span>
              </p>
              <p className="m-0 mt-3">{principe.texte}</p>
            </li>
          ))}
        </ol>
      </Section>

      <Section tone="teal" aria-labelledby="contact">
        <Heading level={2} id="contact">
          {page.contact.h2}
        </Heading>
        <Lead className="mt-3">{page.contact.texte}</Lead>
        <p className="m-0 mt-6 flex flex-wrap gap-4">
          {contact.email ? (
            <a href={`mailto:${contact.email}`} className="font-bold">
              {contact.email}
            </a>
          ) : null}
          <Link href={navigation.contact_href} className="font-bold">
            {navigation.pied_de_page.entreprise.find((l) => l.href === navigation.contact_href)
              ?.libelle ?? "Contact"}
          </Link>
        </p>
      </Section>
    </main>
  );
}
