import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumb } from "@/components/blocks/Breadcrumb/Breadcrumb";
import { Commitments } from "@/components/blocks/Commitments/Commitments";
import { Section } from "@/components/layout/Section/Section";
import { OfferCard } from "@/components/recrutement/OfferCard";
import { Button } from "@/components/ui/Button/Button";
import { Card } from "@/components/ui/Card/Card";
import { Heading } from "@/components/ui/Heading/Heading";
import { Icon } from "@/components/ui/Icon/Icon";
import type { IconName } from "@/components/ui/Icon/icons";
import { Lead } from "@/components/ui/Lead/Lead";
import { Thread } from "@/components/ui/Thread/Thread";
import { groupCards, GroupLinksBlock } from "@/components/blocks/RelatedLinks/GroupLinks";
import {
  getCommitments,
  getInterfaceTexts,
  getNavigation,
  getRecruitmentPage,
  getSiteConfig,
} from "@/content/loader";
import { APPLY_PATH, listLiveOffers, RECRUITMENT_PATH } from "@/content/offres";
import { toIconName } from "@/components/service/service-icons";
import { listBuildableServicePages } from "@/content/services";
import { JsonLd } from "@/lib/jsonld/JsonLd";
import { staticWebPage } from "@/lib/jsonld/static-web-page";
import { pageMetadata } from "@/lib/seo/metadata";
import { declaredLastmod } from "@/lib/seo/sitemaps";

/*
 * /recrutement/ (docs/03 §9, docs/00 §3 « le candidat », P8.2) : le métier tel que les pages
 * services le décrivent, les personnes accompagnées et les accompagnements (pages construites
 * seulement), les secteurs (départements et agences de site.config.json), « Ce que nous vous
 * proposons » entièrement conditionné par content/engagements.json (rien en production tant que
 * rien n'est validé), les offres réelles de content/offres (aucune aujourd'hui) et la candidature
 * spontanée en deux minutes. Aucun avantage, aucun chiffre qui ne vienne de content/.
 */

export function generateMetadata(): Metadata {
  const { seo } = getRecruitmentPage();
  return pageMetadata({ titre: seo.titre, description: seo.description, chemin: RECRUITMENT_PATH });
}

const count = (n: number) => new Intl.NumberFormat("fr-FR").format(n);

export default async function RecruitmentPage() {
  const page = getRecruitmentPage();
  const siteConfig = getSiteConfig();
  const { zones, agences } = siteConfig;
  const navigation = getNavigation();
  const texts = getInterfaceTexts();
  const { fil_ariane, boutons, recrutement: t } = texts;
  const { engagements } = getCommitments();
  const services = (await listBuildableServicePages()).map((p) => p.meta);
  const offers = await listLiveOffers();
  const crumbLabel =
    navigation.pied_de_page.entreprise.find((l) => l.href === RECRUITMENT_PATH)?.libelle ??
    page.ariane;

  const linksFor = (chemins: readonly string[]) =>
    chemins.flatMap((chemin) => {
      const service = services.find((s) => s.chemin === chemin);
      if (!service) return [];
      const label =
        service.type === "pilier"
          ? texts.service.publics[service.public]
          : (service.libelle_court ?? service.h1);
      return [{ href: chemin, label, icone: toIconName(service.icone) }];
    });
  const publicsLinks = linksFor(page.metier.publics);
  const servicesLinks = linksFor(page.metier.services);

  const secteursText = page.secteurs.texte
    .replace("{departements}", count(zones.length))
    .replace("{agences}", count(agences.length));

  const jsonLd = staticWebPage(
    {
      titre: page.seo.titre,
      description: page.seo.description,
      chemin: RECRUITMENT_PATH,
      h1: page.h1,
      maj: declaredLastmod[RECRUITMENT_PATH],
    },
    siteConfig,
  );

  const linkList = (items: { href: string; label: string; icone?: IconName | undefined }[]) => (
    <ul className="m-0 mt-4 grid list-none gap-3 p-0 sm:grid-cols-2">
      {items.map((item) => (
        <li key={item.href} className="max-w-none">
          <Link
            href={item.href}
            className="flex min-h-12 items-center gap-3 rounded-card border border-line bg-white px-4 py-3 font-bold no-underline shadow-1 hover:underline"
          >
            {item.icone ? <Icon name={item.icone} size="sm" /> : null}
            {item.label}
          </Link>
        </li>
      ))}
    </ul>
  );

  const groupLinks = await groupCards("/recrutement/");
  return (
    // D-032 : scène de la famille « entreprise ».
    <main id="contenu" data-famille="entreprise">
      <JsonLd data={jsonLd} />
      <Section tone="paper" aria-labelledby="titre" className="scene scene-soutenu">
        <Breadcrumb texts={fil_ariane} items={[{ label: crumbLabel }]} className="mb-6" />
        <div className="grid items-center gap-10 lg:grid-cols-[3fr_2fr]">
          <div>
            <Heading level={1} id="titre">
              {page.h1}
            </Heading>
            <Lead className="mt-5">{page.chapo}</Lead>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Button href={APPLY_PATH}>{boutons.candidat}</Button>
              <Button href="#offres" variant="outline">
                {t.toutes_les_offres}
              </Button>
            </div>
          </div>
          <Thread illustration="carnet" className="mx-auto w-full max-w-xs lg:max-w-none" />
        </div>
      </Section>

      <Section tone="white" aria-labelledby="metier">
        <Heading level={2} id="metier">
          {page.metier.h2}
        </Heading>
        <Lead className="mt-3">{page.metier.texte}</Lead>
        <ul className="m-0 mt-8 grid list-none gap-6 p-0 sm:grid-cols-2 lg:grid-cols-3">
          {page.metier.missions.map((mission) => (
            <Card as="li" key={mission.titre} className="max-w-none">
              <Heading level={3} visual={4}>
                {mission.titre}
              </Heading>
              <p className="m-0 mt-3">{mission.texte}</p>
            </Card>
          ))}
        </ul>
        <div className="mt-10 grid gap-10 lg:grid-cols-2">
          {publicsLinks.length > 0 ? (
            <div>
              <Heading level={3} visual={4}>
                {page.metier.publics_h3}
              </Heading>
              {linkList(publicsLinks)}
            </div>
          ) : null}
          {servicesLinks.length > 0 ? (
            <div>
              <Heading level={3} visual={4}>
                {page.metier.services_h3}
              </Heading>
              {linkList(servicesLinks)}
            </div>
          ) : null}
        </div>
      </Section>

      <Section tone="paper" aria-labelledby="secteurs">
        <Heading level={2} id="secteurs">
          {page.secteurs.h2}
        </Heading>
        <Lead className="mt-3">{secteursText}</Lead>
        <ul className="m-0 mt-6 flex list-none flex-wrap gap-2 p-0">
          {zones.map((zone) => (
            <li
              key={zone.code}
              className="max-w-none rounded-full bg-white px-3 py-1 text-small font-bold shadow-1"
            >
              {zone.nom} ({zone.code})
            </li>
          ))}
        </ul>
        <ul className="m-0 mt-6 grid list-none gap-2 p-0 sm:grid-cols-2 lg:grid-cols-3">
          {agences.map((agency) => (
            <li key={agency.id} className="max-w-none">
              <Link
                href={`/agences/${agency.id}/`}
                className="inline-flex min-h-11 items-center font-bold"
              >
                {agency.nom}
              </Link>
              <span className="text-text-soft">
                {" "}
                · {agency.code_postal} {agency.commune}
              </span>
            </li>
          ))}
        </ul>
      </Section>

      <Section tone="teal" aria-labelledby="proposons">
        <Heading level={2} id="proposons">
          {page.proposons.h2}
        </Heading>
        <Lead className="mt-3 max-w-3xl">{page.proposons.texte}</Lead>
        <Commitments
          aria-labelledby="proposons"
          className="mt-8"
          items={page.proposons.items}
          commitments={engagements}
        />
      </Section>

      <Section tone="white" aria-labelledby="offres">
        <Heading level={2} id="offres">
          {page.offres.h2}
        </Heading>
        <Lead className="mt-3">{page.offres.texte}</Lead>
        {offers.length > 0 ? (
          <ul className="m-0 mt-8 grid list-none gap-6 p-0 md:grid-cols-2">
            {offers.map((entry) => (
              <OfferCard key={entry.offer.slug} entry={entry} texts={t} />
            ))}
          </ul>
        ) : (
          <p className="mt-6 font-bold" data-testid="aucune-offre">
            {t.aucune_offre}
          </p>
        )}
        <div className="mt-10 max-w-3xl">
          <Heading level={3} visual={4}>
            {page.offres.spontanee_h3}
          </Heading>
          <p className="mt-3">{page.offres.spontanee_texte}</p>
          <div className="mt-6">
            <Button href={APPLY_PATH}>{boutons.candidat}</Button>
          </div>
        </div>
      </Section>

      <GroupLinksBlock links={groupLinks} />
    </main>
  );
}
