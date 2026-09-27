import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumb } from "@/components/blocks/Breadcrumb/Breadcrumb";
import { Section } from "@/components/layout/Section/Section";
import { AgencyCard } from "@/components/local/AgencyCard";
import { Reveal } from "@/components/motion/Reveal/Reveal";
import { Heading } from "@/components/ui/Heading/Heading";
import { Lead } from "@/components/ui/Lead/Lead";
import { getAgenciesPage, getInterfaceTexts, getSiteConfig } from "@/content/loader";
import { pageMetadata } from "@/lib/seo/metadata";

/*
 * Index des agences /agences/ (docs/00 §5, P6.6) : une carte par agence réelle de
 * site.config.json (nom, adresse, téléphone et horaires s'ils sont renseignés),
 * lien vers la carte des territoires. Contenu : content/pages/agences.json > index.
 */

export function generateMetadata(): Metadata {
  const { index } = getAgenciesPage();
  return pageMetadata({
    titre: index.seo.titre,
    description: index.seo.description,
    chemin: "/agences/",
  });
}

export default function AgenciesIndexPage() {
  const { index } = getAgenciesPage();
  const { contact, agences } = getSiteConfig();
  const texts = getInterfaceTexts();
  const agencyCount = new Intl.NumberFormat("fr-FR").format(agences.length);

  return (
    <main id="contenu" data-page="agences">
      <Section tone="paper" aria-labelledby="titre">
        <Breadcrumb texts={texts.fil_ariane} items={[{ label: index.ariane }]} className="mb-6" />
        <Heading level={1} id="titre">
          {index.h1}
        </Heading>
        <Lead className="mt-5 max-w-3xl">{index.chapo.replace("{agences}", agencyCount)}</Lead>
      </Section>

      {/* Sans nom de région : « Nos agences » est déjà celui de la section du pied de page, et le
          H1 nomme la région d'en-tête (RGAA 12.6, R-1). */}
      <Section tone="white">
        <Reveal
          as="ul"
          variant="stagger"
          className="m-0 grid list-none gap-6 p-0 md:grid-cols-2 xl:grid-cols-3"
          data-agences
        >
          {agences.map((agency) => (
            <li key={agency.id} className="max-w-none">
              <AgencyCard
                className="h-full"
                agency={agency}
                texts={texts.local.agence}
                href={`/agences/${agency.id}/`}
                standardPhone={contact.telephone_principal}
                headingLevel={2}
              />
            </li>
          ))}
        </Reveal>
      </Section>

      <Section tone="teal" aria-labelledby="territoires">
        <Heading level={2} id="territoires">
          {index.territoires_texte}
        </Heading>
        <p className="m-0 mt-6">
          <Link href="/aide-a-domicile/" className="inline-flex min-h-12 items-center font-bold">
            {index.territoires_lien}
          </Link>
        </p>
      </Section>
    </main>
  );
}
