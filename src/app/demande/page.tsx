import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumb } from "@/components/blocks/Breadcrumb/Breadcrumb";
import { Section } from "@/components/layout/Section/Section";
import { Button } from "@/components/ui/Button/Button";
import { Heading } from "@/components/ui/Heading/Heading";
import { Lead } from "@/components/ui/Lead/Lead";
import { listFormDefinitions } from "@/content/form-definitions";
import { getInterfaceTexts, getNavigation, getRequestIndexPage } from "@/content/loader";
import { formPaths } from "@/lib/lead/forms";
import { pageMetadata } from "@/lib/seo/metadata";

/* /demande/ : aiguillage vers le formulaire de chaque cas (docs/00 §5). Seuls les cas existants sont listés. */

export function generateMetadata(): Metadata {
  const page = getRequestIndexPage();
  return pageMetadata({
    titre: page.seo.titre,
    description: page.seo.description,
    chemin: "/demande/",
  });
}

export default function RequestIndexPage() {
  const page = getRequestIndexPage();
  const { fil_ariane, boutons } = getInterfaceTexts();
  const navigation = getNavigation();
  const definitions = listFormDefinitions();

  return (
    <main id="contenu" data-famille="formulaire">
      <Section tone="paper" aria-labelledby="titre">
        <Breadcrumb texts={fil_ariane} items={[{ label: page.ariane }]} className="mb-6" />
        <Heading level={1} id="titre">
          {page.h1}
        </Heading>
        <Lead className="mt-5">{page.chapo}</Lead>
      </Section>

      <Section tone="white" aria-label={page.ariane}>
        <ul className="m-0 grid list-none gap-4 p-0 sm:grid-cols-2">
          {definitions.map((definition) => (
            <li key={definition.id} className="max-w-none">
              <Link
                href={`/demande/${definition.slug}/`}
                className="block rounded-card border border-line bg-white p-5 no-underline shadow-1 hover:shadow-2"
              >
                <span className="heading-4 block text-teal-900">{definition.ariane}</span>
                <span className="mt-2 block text-ink">{definition.seo.description}</span>
              </Link>
            </li>
          ))}
          {page.autres.map((autre) => (
            <li key={autre.id} className="max-w-none">
              <Link
                href={formPaths[autre.id]}
                className="block rounded-card border border-line bg-white p-5 no-underline shadow-1 hover:shadow-2"
              >
                <span className="heading-4 block text-teal-900">{autre.libelle}</span>
                <span className="mt-2 block text-ink">{autre.texte}</span>
              </Link>
            </li>
          ))}
        </ul>
      </Section>

      <Section tone="teal" aria-labelledby="presse">
        <Heading level={2} id="presse">
          {page.presse_h2}
        </Heading>
        <Lead className="mt-3">{page.presse_texte}</Lead>
        <div className="mt-6">
          <Button href={navigation.rappel_href}>{boutons.rappel}</Button>
        </div>
      </Section>
    </main>
  );
}
