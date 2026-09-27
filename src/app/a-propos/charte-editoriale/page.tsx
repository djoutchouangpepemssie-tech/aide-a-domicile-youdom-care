import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumb } from "@/components/blocks/Breadcrumb/Breadcrumb";
import { Section } from "@/components/layout/Section/Section";
import { Heading } from "@/components/ui/Heading/Heading";
import { Lead } from "@/components/ui/Lead/Lead";
import { groupCards, GroupLinksBlock } from "@/components/blocks/RelatedLinks/GroupLinks";
import {
  getAbout,
  getEditorialCharter,
  getInterfaceTexts,
  getNavigation,
  getSiteConfig,
} from "@/content/loader";
import { pageMetadata } from "@/lib/seo/metadata";

/*
 * Charte éditoriale (docs/06 §4, docs/03 §1) : comment les pages sont écrites, sourcées, relues,
 * mises à jour (principes de content/pages/a-propos.json), puis la section « Le Fil » (P7.1,
 * content/pages/charte-editoriale.json) : comment un article du magazine est écrit, relu, sourcé
 * et mis à jour, et l'usage d'outils d'aide à la rédaction sous la responsabilité d'un auteur et
 * d'un relecteur nommés.
 */

export function generateMetadata(): Metadata {
  const { charte_page } = getAbout();
  return pageMetadata({
    titre: charte_page.seo.titre,
    description: charte_page.seo.description,
    chemin: "/a-propos/charte-editoriale/",
  });
}

export default async function EditorialCharterPage() {
  const { a_propos, charte_page: page } = getAbout();
  const { contact } = getSiteConfig();
  const navigation = getNavigation();
  const { fil_ariane } = getInterfaceTexts();
  const { magazine } = getEditorialCharter();

  const groupLinks = await groupCards("/a-propos/charte-editoriale/");
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

      <Section tone="white" aria-label={page.ariane}>
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

      <Section tone="paper" aria-labelledby="magazine" data-section="magazine">
        <Heading level={2} id="magazine">
          {magazine.h2}
        </Heading>
        <Lead className="mt-3">{magazine.chapo}</Lead>
        <ol className="m-0 mt-8 grid list-none gap-6 p-0 md:grid-cols-2" data-etapes>
          {magazine.etapes.map((etape, index) => (
            <li
              key={etape.titre}
              className="max-w-none rounded-card border border-line bg-white p-6 shadow-1"
            >
              <p className="m-0 flex items-start gap-3">
                <span
                  aria-hidden="true"
                  className="figure flex size-10 shrink-0 items-center justify-center rounded-full border-2 border-teal-700 bg-white text-teal-900"
                >
                  {index + 1}
                </span>
                <span className="heading-4 pt-1.5">{etape.titre}</span>
              </p>
              <p className="m-0 mt-3">{etape.texte}</p>
            </li>
          ))}
        </ol>
        <p className="m-0 mt-8">
          <Link href={magazine.lien.href} className="font-bold">
            {magazine.lien.libelle}
          </Link>
        </p>
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

      <GroupLinksBlock links={groupLinks} />
    </main>
  );
}
