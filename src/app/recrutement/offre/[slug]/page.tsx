import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumb } from "@/components/blocks/Breadcrumb/Breadcrumb";
import { Section } from "@/components/layout/Section/Section";
import { formatOfferDate, formatSalary } from "@/components/recrutement/OfferCard";
import { Button } from "@/components/ui/Button/Button";
import { Heading } from "@/components/ui/Heading/Heading";
import { Lead } from "@/components/ui/Lead/Lead";
import { getInterfaceTexts, getRecruitmentPage, getSiteConfig } from "@/content/loader";
import { fullAddress } from "@/components/local/AgencyCard";
import {
  APPLY_PATH,
  getLiveOffer,
  listLiveOffers,
  offerSeo,
  RECRUITMENT_PATH,
  todayIso,
} from "@/content/offres";
import { JsonLd } from "@/lib/jsonld/JsonLd";
import { jobPosting } from "@/lib/jsonld/job-posting";
import { pageMetadata } from "@/lib/seo/metadata";

/*
 * /recrutement/offre/{slug}/ (docs/03 §9, docs/04 §2 `JobPosting`, P8.2) : une page par offre
 * publiée et non expirée de content/offres, construite au build ; aucune aujourd'hui, la route
 * ne produit donc rien et tout autre chemin renvoie 404. Le `JobPosting` reprend les champs de
 * l'offre et l'adresse de l'agence ; le bouton mène à la candidature avec l'offre en paramètre
 * (`?offre=slug`, aucune donnée personnelle dans l'adresse).
 */

type OfferRouteProps = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

export async function generateStaticParams() {
  const offers = await listLiveOffers();
  return offers.map((entry) => ({ slug: entry.offer.slug }));
}

export async function generateMetadata({ params }: OfferRouteProps): Promise<Metadata> {
  const { slug } = await params;
  const entry = await getLiveOffer(slug);
  if (!entry) return {};
  const { recrutement } = getInterfaceTexts();
  const seo = offerSeo(entry.offer, entry.agency, recrutement);
  return pageMetadata({ titre: seo.titre, description: seo.description, chemin: entry.chemin });
}

export default async function OfferPage({ params }: OfferRouteProps) {
  const { slug } = await params;
  const entry = await getLiveOffer(slug);
  if (!entry) notFound();
  const { offer, agency, chemin } = entry;
  const page = getRecruitmentPage();
  const siteConfig = getSiteConfig();
  const { fil_ariane, recrutement: t } = getInterfaceTexts();
  const jsonLd = jobPosting({ offer, agency, chemin, today: todayIso() }, siteConfig);

  const facts: { label: string; value: string }[] = [
    {
      label: t.contrat,
      value: `${t.contrats[offer.contrat]}, ${t.temps[offer.temps_de_travail].toLocaleLowerCase("fr-FR")}`,
    },
    {
      label: t.lieu,
      value: [agency.nom, fullAddress(agency)].filter(Boolean).join(" · "),
    },
    { label: t.secteur, value: offer.secteur },
    ...(offer.salaire ? [{ label: t.salaire, value: formatSalary(offer.salaire, t) }] : []),
  ];

  return (
    <main id="contenu" data-famille="entreprise">
      <JsonLd data={jsonLd} />
      <Section tone="paper" aria-labelledby="titre">
        <Breadcrumb
          texts={fil_ariane}
          items={[{ label: page.ariane, href: RECRUITMENT_PATH }, { label: offer.titre }]}
          className="mb-6"
        />
        <p className="m-0 text-small font-bold text-teal-900">{t.offre_sur_titre}</p>
        <Heading level={1} id="titre" className="mt-2">
          {offer.titre}
        </Heading>
        <Lead className="mt-5">{offer.description}</Lead>
        <dl className="m-0 mt-8 grid gap-3 sm:grid-cols-2">
          {facts.map((fact) => (
            <div key={fact.label} className="rounded-card border border-line bg-white p-4">
              <dt className="text-small font-bold text-text-soft">{fact.label}</dt>
              <dd className="m-0 mt-1 font-bold">{fact.value}</dd>
            </div>
          ))}
        </dl>
        <p className="m-0 mt-6 text-small text-text-soft">
          {t.publiee_le.replace("{date}", formatOfferDate(offer.publiee_le))} ·{" "}
          {t.valable_jusqu_au.replace("{date}", formatOfferDate(offer.valable_jusqu_au))}
        </p>
        <div className="mt-8">
          <Button href={`${APPLY_PATH}?offre=${offer.slug}`}>{t.postuler_offre}</Button>
        </div>
      </Section>

      <Section tone="white" aria-labelledby="missions">
        <Heading level={2} id="missions">
          {t.missions_h2}
        </Heading>
        <ul className="mt-6 grid max-w-3xl gap-2 pl-5">
          {offer.missions.map((mission) => (
            <li key={mission}>{mission}</li>
          ))}
        </ul>
      </Section>

      <Section tone="paper" aria-labelledby="profil">
        <Heading level={2} id="profil">
          {t.profil_h2}
        </Heading>
        <ul className="mt-6 grid max-w-3xl gap-2 pl-5">
          {offer.profil.map((point) => (
            <li key={point}>{point}</li>
          ))}
        </ul>
        <div className="mt-8 flex flex-wrap items-center gap-4">
          <Button href={`${APPLY_PATH}?offre=${offer.slug}`}>{t.postuler_offre}</Button>
          <Link href={RECRUITMENT_PATH} className="font-bold">
            {t.toutes_les_offres}
          </Link>
        </div>
      </Section>
    </main>
  );
}
