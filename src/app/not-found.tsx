import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumb } from "@/components/blocks/Breadcrumb/Breadcrumb";
import { TerritorySearch } from "@/components/blocks/TerritorySearch/TerritorySearch";
import { Section } from "@/components/layout/Section/Section";
import { Reveal } from "@/components/motion/Reveal/Reveal";
import { toIconName } from "@/components/service/service-icons";
import { Button } from "@/components/ui/Button/Button";
import { Heading } from "@/components/ui/Heading/Heading";
import { Icon } from "@/components/ui/Icon/Icon";
import { Lead } from "@/components/ui/Lead/Lead";
import { getInterfaceTexts, getNavigation, getNotFoundPage, getSiteConfig } from "@/content/loader";
import { listBuildableServicePages } from "@/content/services";
import { formatFrenchPhone, toTelHref } from "@/lib/phone";
import { pageTitle } from "@/lib/seo/title";

/*
 * Page introuvable (docs/04 §2 « Erreurs », P5.5) : statut 404 posé par Next, jamais indexée
 * (Next ajoute `noindex` à toute réponse 404 ; la balise est aussi déclarée ici), aucune
 * redirection. Utile : la recherche de commune, le téléphone, les cinq piliers avec leurs
 * icônes (pages construites seulement), le plan du site, le retour à l'accueil et le rappel.
 * Contenu : content/pages/404.json.
 */

export const SITE_MAP_HREF = "/plan-du-site/";

export function generateMetadata(): Metadata {
  const { seo } = getNotFoundPage();
  const { marque } = getSiteConfig();
  return {
    title: pageTitle(seo.titre, marque.nom),
    description: seo.description,
    robots: { index: false, follow: false },
  };
}

export default async function NotFound() {
  const page = getNotFoundPage();
  const { contact, agences } = getSiteConfig();
  const navigation = getNavigation();
  const { boutons, en_tete, fil_ariane, formulaires, recherche_commune, service } =
    getInterfaceTexts();
  const piliers = (await listBuildableServicePages())
    .map((p) => p.meta)
    .filter((p) => p.type === "pilier");
  const menu = navigation.principale.find((item) => item.id === "pour-qui")?.enfants ?? [];
  const rank = new Map(menu.map((child, index) => [child.href, index] as const));
  piliers.sort(
    (a, b) =>
      (rank.get(a.chemin) ?? Number.MAX_SAFE_INTEGER) -
        (rank.get(b.chemin) ?? Number.MAX_SAFE_INTEGER) || a.chemin.localeCompare(b.chemin, "fr"),
  );

  const phone = contact.telephone_principal;
  const telHref = phone ? toTelHref(phone) : null;
  const appel = page.appel_texte.split("{téléphone}");
  const searchTexts = { ...recherche_commune, hors: formulaires.hors_idf };

  return (
    <main id="contenu" data-page="404">
      <Section tone="paper" aria-labelledby="titre">
        <Breadcrumb texts={fil_ariane} items={[{ label: page.ariane }]} className="mb-6" />
        <Heading level={1} id="titre">
          {page.h1}
        </Heading>
        <Lead className="mt-5">{page.texte}</Lead>
        <div className="mt-8 flex flex-wrap items-center gap-4">
          <Button href={navigation.rappel_href}>{boutons.rappel}</Button>
          {phone && telHref ? (
            <Button href={telHref} variant="link" className="tabular-figures">
              {en_tete.appeler.replace("{téléphone}", formatFrenchPhone(phone))}
            </Button>
          ) : null}
        </div>
      </Section>

      <Section tone="white" aria-labelledby="commune">
        <Heading level={2} id="commune">
          {page.commune_h2}
        </Heading>
        <Lead className="mt-3">{page.commune_texte}</Lead>
        <TerritorySearch
          className="mt-8 max-w-2xl"
          texts={searchTexts}
          agencies={Object.fromEntries(agences.map((a) => [a.id, a.nom]))}
        />
      </Section>

      {piliers.length > 0 ? (
        <Section tone="teal" aria-labelledby="piliers">
          <Heading level={2} id="piliers">
            {page.piliers_h2}
          </Heading>
          <Reveal
            as="ul"
            variant="stagger"
            className="m-0 mt-8 grid list-none gap-4 p-0 sm:grid-cols-2 lg:grid-cols-3"
            data-piliers
          >
            {piliers.map((pilier) => {
              const icon = toIconName(pilier.icone);
              return (
                <li key={pilier.chemin} className="max-w-none">
                  <Link
                    href={pilier.chemin}
                    prefetch={false}
                    className="flex min-h-14 items-center gap-3 rounded-card border border-line bg-white px-4 py-3 font-bold text-teal-900 no-underline shadow-1 transition-[box-shadow] [transition-duration:var(--duration-base)] hover:shadow-2 motion-reduce:transition-none"
                  >
                    {icon ? <Icon name={icon} /> : null}
                    <span>{service.publics[pilier.public]}</span>
                  </Link>
                </li>
              );
            })}
          </Reveal>
        </Section>
      ) : null}

      <Section tone="paper" aria-labelledby="reprendre">
        <Heading level={2} id="reprendre">
          {phone && telHref ? page.appel_h2 : page.liens_h2}
        </Heading>
        {phone && telHref ? (
          <p className="mt-3">
            {appel[0]}
            <a href={telHref} className="tabular-figures font-bold">
              {formatFrenchPhone(phone)}
            </a>
            {appel[1]}
          </p>
        ) : null}
        <ul className="m-0 mt-6 flex list-none flex-wrap gap-x-8 gap-y-2 p-0">
          <li className="max-w-none">
            <Link href={SITE_MAP_HREF} className="inline-flex min-h-12 items-center font-bold">
              {page.plan_du_site}
            </Link>
          </li>
          <li className="max-w-none">
            <Link href="/" className="inline-flex min-h-12 items-center font-bold">
              {page.retour_accueil}
            </Link>
          </li>
        </ul>
      </Section>
    </main>
  );
}
