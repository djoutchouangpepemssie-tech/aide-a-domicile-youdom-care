import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumb } from "@/components/blocks/Breadcrumb/Breadcrumb";
import { themeBlocks, ThemeLinksBlock } from "@/components/blocks/RelatedLinks/ThemeLinks";
import { Section } from "@/components/layout/Section/Section";
import { Reveal } from "@/components/motion/Reveal/Reveal";
import { Button } from "@/components/ui/Button/Button";
import { Card } from "@/components/ui/Card/Card";
import { Heading } from "@/components/ui/Heading/Heading";
import { Icon } from "@/components/ui/Icon/Icon";
import { Lead } from "@/components/ui/Lead/Lead";
import { getInterfaceTexts, getNavigation, getServicesPage, getSiteConfig } from "@/content/loader";
import { formatFrenchPhone, toTelHref } from "@/lib/phone";
import { pageMetadata } from "@/lib/seo/metadata";

/*
 * Index /services/ (D-064).
 *
 * « Nos services » était un menu déroulant sans page d'atterrissage (`href` absent dans
 * content/navigation.json) : aucune page ne montrait les prestations ensemble, et un visiteur qui
 * ne savait pas déjà quel service il cherchait n'avait nulle part où regarder.
 *
 * Le plan de la page vit dans content/pages/services.json : les trois groupes, leur ordre, et pour
 * chaque service son icône. **Les libellés et les descriptions n'y sont pas** : ils sont lus dans
 * le menu par `href`, pour que la page et le menu ne puissent pas diverger. Un `href` absent du
 * menu interrompt le build plutôt que d'afficher une carte sans nom.
 *
 * Aucun mode d'intervention n'est affiché par carte : `content/tarifs.json` le porte par
 * prestation et sa liste est encore vide (Q-TARIFS-1). Plutôt que d'inventer un mode, la page
 * renvoie vers l'explication des deux modes, comme le reste du site.
 */

export const SERVICES_PATH = "/services/";

export function generateMetadata(): Metadata {
  const { seo } = getServicesPage();
  return pageMetadata({ titre: seo.titre, description: seo.description, chemin: SERVICES_PATH });
}

/** Libellé et description d'un service, lus dans le menu : une seule source avec l'en-tête. */
function menuEntries() {
  const navigation = getNavigation();
  const children = navigation.principale.find((item) => item.id === "services")?.enfants ?? [];
  return new Map(children.map((child) => [child.href, child]));
}

export default async function ServicesPage() {
  const page = getServicesPage();
  const navigation = getNavigation();
  const texts = getInterfaceTexts();
  const { contact } = getSiteConfig();
  const entries = menuEntries();
  const phone = contact.telephone_principal;
  const telHref = phone ? toTelHref(phone) : null;
  const themes = await themeBlocks(SERVICES_PATH);

  return (
    <main id="contenu" data-page="services" data-famille="service">
      <Section tone="paper" aria-labelledby="titre">
        <Breadcrumb texts={texts.fil_ariane} items={[{ label: page.ariane }]} className="mb-6" />
        <Heading level={1} id="titre">
          {page.h1}
        </Heading>
        <Lead className="mt-5 max-w-3xl">{page.chapo}</Lead>
        <p className="mt-6 max-w-3xl text-small text-text-soft">
          {page.mode_texte}{" "}
          <Link href="/comment-ca-marche/prestataire-ou-mandataire/" className="font-bold">
            {page.mode_lien}
          </Link>
        </p>
      </Section>

      {page.groupes.map((groupe, index) => (
        <Section
          key={groupe.id}
          tone={index % 2 === 0 ? "white" : "paper"}
          aria-labelledby={`groupe-${groupe.id}`}
        >
          <Heading level={2} id={`groupe-${groupe.id}`}>
            {groupe.h2}
          </Heading>
          <Lead className="mt-3 max-w-3xl">{groupe.texte}</Lead>
          <Reveal
            as="ul"
            variant="stagger"
            className="m-0 mt-8 grid list-none gap-6 p-0 md:grid-cols-2 xl:grid-cols-3"
            data-services
          >
            {groupe.services.map((service) => {
              const entry = entries.get(service.href);
              if (!entry) {
                throw new Error(
                  `content/pages/services.json : ${service.href} est absent du menu « Nos services » de content/navigation.json`,
                );
              }
              return (
                <li key={service.href} className="max-w-none">
                  <Card as="article" padding="lg" interactive className="flex h-full flex-col">
                    <Icon name={service.icone} className="size-8 text-teal-700" />
                    <Heading level={3} className="mt-4">
                      <Link href={service.href} className="no-underline hover:underline">
                        {entry.libelle}
                      </Link>
                    </Heading>
                    {entry.description ? (
                      <p className="mt-2 text-text-soft">{entry.description}</p>
                    ) : null}
                    {service.inclus ? (
                      <ul className="m-0 mt-4 flex list-none flex-wrap gap-2 p-0">
                        {service.inclus.map((item) => (
                          <li
                            key={item}
                            className="max-w-none rounded-field bg-tint-teal px-3 py-1 text-small"
                          >
                            {item}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </Card>
                </li>
              );
            })}
          </Reveal>
        </Section>
      ))}

      <Section tone="teal" aria-labelledby="publics">
        <Heading level={2} id="publics">
          {page.public_h2}
        </Heading>
        <Lead className="mt-3 max-w-3xl">{page.public_texte}</Lead>
        <ul className="m-0 mt-8 flex list-none flex-wrap gap-4 p-0">
          {(navigation.principale.find((item) => item.id === "pour-qui")?.enfants ?? []).map(
            (child) => (
              <li key={child.href} className="max-w-none">
                <Link
                  href={child.href}
                  className="inline-flex min-h-12 items-center rounded-field bg-white px-4 font-bold no-underline hover:underline"
                >
                  {child.libelle}
                </Link>
              </li>
            ),
          )}
        </ul>
      </Section>

      <Section tone="paper" aria-labelledby="appel">
        <Heading level={2} id="appel">
          {page.appel_h2}
        </Heading>
        <Lead className="mt-3 max-w-3xl">{page.appel_texte}</Lead>
        <div className="mt-8 flex flex-wrap items-center gap-4">
          <Button href={navigation.demande_href}>{texts.boutons.demande_detaillee}</Button>
          <Button href={navigation.rappel_href} variant="secondary">
            {texts.boutons.rappel}
          </Button>
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
