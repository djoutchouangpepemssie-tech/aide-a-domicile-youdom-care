import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumb } from "@/components/blocks/Breadcrumb/Breadcrumb";
import { TerritorySearch } from "@/components/blocks/TerritorySearch/TerritorySearch";
import { Section } from "@/components/layout/Section/Section";
import { AgencyCard } from "@/components/local/AgencyCard";
import { IdfMap } from "@/components/local/IdfMap";
import { Reveal } from "@/components/motion/Reveal/Reveal";
import { Button } from "@/components/ui/Button/Button";
import { Heading } from "@/components/ui/Heading/Heading";
import { Lead } from "@/components/ui/Lead/Lead";
import { themeBlocks, ThemeLinksBlock } from "@/components/blocks/RelatedLinks/ThemeLinks";
import { getInterfaceTexts, getNavigation, getRegionPage, getSiteConfig } from "@/content/loader";
import { mapDepartments } from "@/content/local-site";
import { formatFrenchPhone, toTelHref } from "@/lib/phone";
import { pageMetadata } from "@/lib/seo/metadata";

/*
 * Carte régionale /aide-a-domicile/ (docs/04 §4, P6.5) : carte d'Île-de-France accessible
 * (SVG schématique en `role="img"` et liste équivalente de liens vers les pages de département
 * construites), recherche par commune (`TerritorySearch`), les agences réelles
 * (site.config.json), appel. Contenu : content/pages/aide-a-domicile.json.
 */

export function generateMetadata(): Metadata {
  const { seo } = getRegionPage();
  return pageMetadata({
    titre: seo.titre,
    description: seo.description,
    chemin: "/aide-a-domicile/",
  });
}

export default async function RegionPage() {
  const page = getRegionPage();
  const { contact, agences } = getSiteConfig();
  const navigation = getNavigation();
  const texts = getInterfaceTexts();
  const departments = await mapDepartments();
  const phone = contact.telephone_principal;
  const telHref = phone ? toTelHref(phone) : null;
  const searchTexts = { ...texts.recherche_commune, hors: texts.formulaires.hors_idf };
  const agencyCount = new Intl.NumberFormat("fr-FR").format(agences.length);

  const themes = await themeBlocks("/aide-a-domicile/");
  return (
    <main id="contenu" data-page="aide-a-domicile" data-famille="local">
      <Section tone="paper" aria-labelledby="titre">
        <Breadcrumb texts={texts.fil_ariane} items={[{ label: page.ariane }]} className="mb-6" />
        <Heading level={1} id="titre">
          {page.h1}
        </Heading>
        <Lead className="mt-5 max-w-3xl">{page.chapo}</Lead>
      </Section>

      <Section tone="white" aria-labelledby="carte">
        <Heading level={2} id="carte">
          {page.carte_h2}
        </Heading>
        <Lead className="mt-3 max-w-3xl">{page.carte_texte}</Lead>
        <IdfMap className="mt-8" departments={departments} texts={texts.local.carte} />
      </Section>

      <Section tone="teal" aria-labelledby="recherche">
        <Heading level={2} id="recherche">
          {page.recherche_h2}
        </Heading>
        <Lead className="mt-3">{page.recherche_texte}</Lead>
        <TerritorySearch
          className="mt-8 max-w-2xl"
          texts={searchTexts}
          agencies={Object.fromEntries(agences.map((a) => [a.id, a.nom]))}
        />
      </Section>

      {agences.length > 0 ? (
        <Section tone="white" aria-labelledby="agences">
          <Heading level={2} id="agences">
            {page.agences_h2}
          </Heading>
          <Lead className="mt-3">{page.agences_texte.replace("{agences}", agencyCount)}</Lead>
          <Reveal
            as="ul"
            variant="stagger"
            className="m-0 mt-8 grid list-none gap-6 p-0 md:grid-cols-2 xl:grid-cols-3"
            data-agences
          >
            {agences.map((agency) => (
              <li key={agency.id} className="max-w-none">
                <AgencyCard
                  className="h-full"
                  agency={agency}
                  texts={texts.local.agence}
                  href={`/agences/${agency.id}/`}
                  standardPhone={phone}
                />
              </li>
            ))}
          </Reveal>
          <p className="m-0 mt-8">
            <Link href="/agences/" className="inline-flex min-h-12 items-center font-bold">
              {page.agences_lien}
            </Link>
          </p>
        </Section>
      ) : null}

      <Section tone="paper" aria-labelledby="appel">
        <Heading level={2} id="appel">
          {page.appel_h2}
        </Heading>
        <Lead className="mt-3">{page.appel_texte}</Lead>
        <div className="mt-8 flex flex-wrap items-center gap-4">
          <Button href={navigation.rappel_href}>{texts.boutons.rappel}</Button>
          {phone && telHref ? (
            <Button href={telHref} variant="link" className="tabular-figures">
              {texts.en_tete.appeler.replace("{téléphone}", formatFrenchPhone(phone))}
            </Button>
          ) : null}
        </div>
      </Section>

      <ThemeLinksBlock blocks={themes} section="paper" />
    </main>
  );
}
