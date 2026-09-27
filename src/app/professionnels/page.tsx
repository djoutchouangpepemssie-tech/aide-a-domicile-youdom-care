import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumb } from "@/components/blocks/Breadcrumb/Breadcrumb";
import { Section } from "@/components/layout/Section/Section";
import { Button } from "@/components/ui/Button/Button";
import { Callout } from "@/components/ui/Callout/Callout";
import { Card } from "@/components/ui/Card/Card";
import { Heading } from "@/components/ui/Heading/Heading";
import { Icon } from "@/components/ui/Icon/Icon";
import { Lead } from "@/components/ui/Lead/Lead";
import { Thread } from "@/components/ui/Thread/Thread";
import { groupCards, GroupLinksBlock } from "@/components/blocks/RelatedLinks/GroupLinks";
import {
  getCommitments,
  getInterfaceTexts,
  getModesPage,
  getNavigation,
  getProfessionalsPage,
  getSiteConfig,
} from "@/content/loader";
import { toIconName } from "@/components/service/service-icons";
import { listBuildableServicePages } from "@/content/services";
import { isProduction } from "@/lib/env";
import { JsonLd } from "@/lib/jsonld/JsonLd";
import { staticWebPage } from "@/lib/jsonld/static-web-page";
import { formatFrenchPhone, toTelHref } from "@/lib/phone";
import { pageMetadata } from "@/lib/seo/metadata";
import { declaredLastmod } from "@/lib/seo/sitemaps";

/*
 * /professionnels/ (docs/03 §9, docs/01 §3 « Prescripteur », P8.1) : à qui la page s'adresse,
 * ce que Youdom Care met en place (pages services construites, deux modes), où (départements et
 * agences comptés depuis site.config.json), les délais sans promesse (la phrase liée à E4 n'est
 * affichée en production que si l'engagement est validé), ce que nous transmettons en retour,
 * le formulaire express sans donnée nominative. Aucun chiffre qui ne vienne de content/.
 */

export const PROFESSIONALS_PATH = "/professionnels/";
const MODES_PATH = "/comment-ca-marche/prestataire-ou-mandataire/";
const HOW_IT_WORKS_PATH = "/comment-ca-marche/";

export function generateMetadata(): Metadata {
  const { seo } = getProfessionalsPage();
  return pageMetadata({
    titre: seo.titre,
    description: seo.description,
    chemin: PROFESSIONALS_PATH,
  });
}

const count = (n: number) => new Intl.NumberFormat("fr-FR").format(n);

export default async function ProfessionalsPage() {
  const page = getProfessionalsPage();
  const siteConfig = getSiteConfig();
  const { contact, zones, agences } = siteConfig;
  const navigation = getNavigation();
  const { fil_ariane, boutons, professionnels: t, service } = getInterfaceTexts();
  const { engagements } = getCommitments();
  const modesPage = getModesPage();
  const services = (await listBuildableServicePages()).map((p) => p.meta);
  const crumbLabel =
    navigation.pied_de_page.entreprise.find((l) => l.href === PROFESSIONALS_PATH)?.libelle ??
    page.ariane;

  // Services cités par chemin : seulement ceux qui sont construits (une page a_relire n'existe pas en production).
  const serviceLinks = page.mise_en_place.services.flatMap((chemin) => {
    const service = services.find((s) => s.chemin === chemin);
    return service
      ? [
          {
            href: chemin,
            label: service.libelle_court ?? service.h1,
            icone: toIconName(service.icone),
          },
        ]
      : [];
  });

  // Délais (docs/03 §9 « délais [E4] ») : la phrase engagée n'apparaît qu'en prévisualisation ou si E4 est validé.
  const validated = new Set(engagements.filter((e) => e.valide).map((e) => e.code));
  const delaisText =
    page.delais.texte_engagement !== undefined &&
    (!isProduction() ||
      (page.delais.engagement !== undefined && validated.has(page.delais.engagement)))
      ? `${page.delais.texte} ${page.delais.texte_engagement}`
      : page.delais.texte;

  const phone = contact.telephone_principal ? formatFrenchPhone(contact.telephone_principal) : null;
  const telHref = contact.telephone_principal ? toTelHref(contact.telephone_principal) : null;
  const zonesText = page.zones.texte
    .replace("{departements}", count(zones.length))
    .replace("{agences}", count(agences.length));

  const jsonLd = staticWebPage(
    {
      titre: page.seo.titre,
      description: page.seo.description,
      chemin: PROFESSIONALS_PATH,
      h1: page.h1,
      maj: declaredLastmod[PROFESSIONALS_PATH],
    },
    siteConfig,
  );

  const groupLinks = await groupCards("/professionnels/");
  return (
    // D-032 : scène de la famille « entreprise » (professionnels, recrutement, à propos).
    <main id="contenu" data-famille="entreprise">
      <JsonLd data={jsonLd} />
      <Section tone="paper" aria-labelledby="titre" className="scene scene-soutenu">
        <Breadcrumb texts={fil_ariane} items={[{ label: crumbLabel }]} className="mb-6" />
        <div className="grid items-center gap-10 lg:grid-cols-[3fr_2fr]">
          {/* min-w-0 : « Professionnels » ne dilate pas la colonne à 320 px sous espacement du texte forcé (RGAA 10.12). */}
          <div className="min-w-0">
            <Heading level={1} id="titre">
              {page.h1}
            </Heading>
            <Lead className="mt-5">{page.chapo}</Lead>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Button href={page.formulaire.href}>{boutons.prescripteur}</Button>
              {phone && telHref ? (
                <a
                  href={telHref}
                  className="tabular-figures inline-flex min-h-11 items-center font-bold"
                >
                  {t.appeler.replace("{téléphone}", phone)}
                </a>
              ) : null}
            </div>
          </div>
          <Thread illustration="mains" className="mx-auto w-full max-w-xs lg:max-w-none" />
        </div>
      </Section>

      <Section tone="white" aria-labelledby="publics">
        <Heading level={2} id="publics">
          {page.publics.h2}
        </Heading>
        <Lead className="mt-3">{page.publics.texte}</Lead>
        <ul className="m-0 mt-8 grid list-none gap-6 p-0 sm:grid-cols-2 lg:grid-cols-3">
          {page.publics.items.map((item) => (
            <Card as="li" key={item.titre} className="max-w-none">
              <Heading level={3} visual={4}>
                {item.titre}
              </Heading>
              <p className="m-0 mt-3">{item.texte}</p>
            </Card>
          ))}
        </ul>
      </Section>

      <Section tone="teal" aria-labelledby="mise-en-place">
        <Heading level={2} id="mise-en-place">
          {page.mise_en_place.h2}
        </Heading>
        <Lead className="mt-3">{page.mise_en_place.texte}</Lead>
        {serviceLinks.length > 0 ? (
          <ul className="m-0 mt-8 grid list-none gap-4 p-0 sm:grid-cols-2 lg:grid-cols-3">
            {serviceLinks.map((service) => (
              <li key={service.href} className="max-w-none">
                <Link
                  href={service.href}
                  className="flex min-h-14 items-center gap-3 rounded-card border border-line bg-white p-5 font-bold no-underline shadow-1 hover:underline"
                >
                  {service.icone ? <Icon name={service.icone} size="md" /> : null}
                  {service.label}
                </Link>
              </li>
            ))}
          </ul>
        ) : null}
        <div className="mt-10 max-w-3xl">
          <Heading level={3} visual={4}>
            {t.modes_h3}
          </Heading>
          <p className="mt-3">{page.mise_en_place.modes_texte}</p>
          <p className="m-0 mt-4">
            <Link href={MODES_PATH} className="inline-flex min-h-11 items-center font-bold">
              {page.mise_en_place.modes_lien} : {modesPage.ariane}
            </Link>
          </p>
        </div>
      </Section>

      <Section tone="paper" aria-labelledby="zones">
        <Heading level={2} id="zones">
          {page.zones.h2}
        </Heading>
        <Lead className="mt-3">{zonesText}</Lead>
        <div className="mt-8 grid gap-8 md:grid-cols-2">
          <div>
            <Heading level={3} visual={4}>
              {t.departements_h3}
            </Heading>
            <ul className="m-0 mt-3 flex list-none flex-wrap gap-2 p-0">
              {zones.map((zone) => (
                <li
                  key={zone.code}
                  className="max-w-none rounded-full bg-white px-3 py-1 text-small font-bold shadow-1"
                >
                  {zone.nom} ({zone.code})
                </li>
              ))}
            </ul>
          </div>
          <div>
            <Heading level={3} visual={4}>
              {t.agences_h3}
            </Heading>
            <ul className="m-0 mt-3 grid list-none gap-2 p-0">
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
          </div>
        </div>
      </Section>

      <Section tone="white" aria-labelledby="delais">
        <Heading level={2} id="delais">
          {page.delais.h2}
        </Heading>
        <Lead className="mt-3 max-w-3xl">{delaisText}</Lead>
      </Section>

      <Section tone="paper" aria-labelledby="retour">
        <Heading level={2} id="retour">
          {page.retour.h2}
        </Heading>
        <Lead className="mt-3">{page.retour.texte}</Lead>
        <ul className="m-0 mt-8 grid list-none gap-6 p-0 md:grid-cols-3">
          {page.retour.items.map((item) => (
            <Card as="li" key={item.titre} className="max-w-none">
              <Heading level={3} visual={4}>
                {item.titre}
              </Heading>
              <p className="m-0 mt-3">{item.texte}</p>
            </Card>
          ))}
        </ul>
        <Callout
          variant="frontiere"
          className="mt-8"
          title={service.frontiere.sous_titre}
          columns={{
            faits: service.frontiere.colonne_faits,
            relais: service.frontiere.colonne_relais,
          }}
          items={page.retour.ne_faisons_pas}
          footer={service.frontiere.ligne_fin}
        />
        <p className="m-0 mt-8">
          <Link href={HOW_IT_WORKS_PATH} className="inline-flex min-h-11 items-center font-bold">
            {t.fonctionnement_lien}
          </Link>
        </p>
      </Section>

      <Section tone="teal" aria-labelledby="formulaire">
        <Heading level={2} id="formulaire">
          {page.formulaire.h2}
        </Heading>
        <Lead className="mt-3">{page.formulaire.texte}</Lead>
        <Callout variant="attention" className="mt-6 max-w-3xl">
          {page.formulaire.anonymat}
        </Callout>
        <div className="mt-8 flex flex-wrap items-center gap-4">
          <Button href={page.formulaire.href}>{boutons.prescripteur}</Button>
          {phone && telHref ? (
            <Button href={telHref} variant="outline">
              {t.appeler.replace("{téléphone}", phone)}
            </Button>
          ) : null}
        </div>
      </Section>

      <GroupLinksBlock links={groupLinks} />
    </main>
  );
}
