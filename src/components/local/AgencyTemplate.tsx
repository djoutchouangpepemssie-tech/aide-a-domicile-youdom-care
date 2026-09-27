import Link from "next/link";
import { Breadcrumb } from "@/components/blocks/Breadcrumb/Breadcrumb";
import { RappelForm } from "@/components/forms/RappelForm/RappelForm";
import { Section } from "@/components/layout/Section/Section";
import { Button } from "@/components/ui/Button/Button";
import { Heading } from "@/components/ui/Heading/Heading";
import { Lead } from "@/components/ui/Lead/Lead";
import { PhotoFigure, photoSizes } from "@/components/ui/PhotoFigure/PhotoFigure";
import type { AgenciesPage, Agency, InterfaceTexts } from "@/content/schemas";
import { formatFrenchPhone, toTelHref } from "@/lib/phone";
import { AgencyCard, fullAddress } from "./AgencyCard";
import { agencyPhoto } from "./local-photos";
import { fill, formatDistance } from "./local-texts";

/*
 * Page d'une agence (docs/00 §5, docs/04 §2 `LocalBusiness`, P6.6) : nom, adresse, téléphone
 * et horaires seulement s'ils sont renseignés (site.config.json), itinéraire, communes suivies
 * (pages locales construites dont cette agence est la plus proche, par distance), lien vers la
 * page du département si elle existe, formulaire de rappel. Le JSON-LD `LocalBusiness` est
 * émis par la route (src/lib/jsonld/local-business.ts).
 */

export interface AgencyCommune {
  code: string;
  nom: string;
  chemin: string;
  distance_km: number;
}

export interface AgencyTemplateData {
  agency: Agency;
  texts: InterfaceTexts;
  page: AgenciesPage["page"];
  /** Libellé du fil d'Ariane de l'index (« Nos agences »). */
  indexLabel: string;
  /** Téléphone principal (standard) ; null si inconnu. */
  phone: string | null;
  /** « dans les Hauts-de-Seine ». */
  lieu: string;
  /** Page du département de l'agence si elle est construite. */
  departementHref: string | null;
  /** Communes suivies, déjà triées par distance. */
  communes: readonly AgencyCommune[];
  confidentialiteHref: string;
}

export function AgencyTemplate({ data }: { data: AgencyTemplateData }) {
  const {
    agency,
    texts,
    page,
    indexLabel,
    phone,
    lieu,
    departementHref,
    communes,
    confidentialiteHref,
  } = data;
  const t = texts.local;
  const telHref = phone ? toTelHref(phone) : null;
  const rappelTexts = {
    ...texts.formulaires,
    ...texts.formulaires.rappel,
    recherche: texts.recherche_commune,
  };

  return (
    <main id="contenu" data-agence-page={agency.id}>
      <Section tone="paper" aria-labelledby="titre">
        <Breadcrumb
          texts={texts.fil_ariane}
          items={[{ label: indexLabel, href: "/agences/" }, { label: agency.nom }]}
          className="mb-6"
        />
        <div className="grid items-center gap-10 lg:grid-cols-[3fr_2fr]">
          <div>
            <p className="m-0 text-small font-bold tracking-wide text-teal-800 uppercase">
              {page.sur_titre}
            </p>
            <Heading level={1} id="titre" className="mt-3">
              {agency.nom}
            </Heading>
            <Lead className="mt-5">{fill(page.chapo, { adresse: fullAddress(agency), lieu })}</Lead>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Button href="#formulaire">{texts.boutons.rappel}</Button>
              {phone && telHref ? (
                <Button
                  href={telHref}
                  variant="link"
                  className="tabular-figures"
                  data-mesure="agence"
                >
                  {fill(t.reponse.appeler, { téléphone: formatFrenchPhone(phone) })}
                </Button>
              ) : null}
            </div>
          </div>
          <PhotoFigure
            src={agencyPhoto.src}
            alt={agencyPhoto.alt}
            focal={agencyPhoto.focal}
            ratio="4:5"
            mobileRatio="16:9"
            radius={28}
            sizes={photoSizes.hero}
            priority
          />
        </div>
      </Section>

      <Section tone="white" aria-label={agency.nom}>
        <AgencyCard
          agency={agency}
          texts={t.agence}
          standardPhone={phone}
          headingLevel={2}
          className="max-w-2xl"
        />
      </Section>

      <Section tone="teal" aria-labelledby="communes">
        <Heading level={2} id="communes">
          {t.agence.communes_h2}
        </Heading>
        <Lead className="mt-3">
          {communes.length > 0 ? t.agence.communes_texte : t.agence.communes_aucune}
        </Lead>
        {communes.length > 0 ? (
          <ol
            className="m-0 mt-6 grid list-none gap-3 p-0 sm:grid-cols-2 lg:grid-cols-3"
            data-agence-communes
          >
            {communes.map((commune) => (
              <li
                key={commune.code}
                className="flex max-w-none items-center justify-between gap-3 rounded-card border border-line bg-white px-4 py-2 shadow-1"
              >
                <Link
                  href={commune.chemin}
                  prefetch={false}
                  className="inline-flex min-h-11 items-center font-bold"
                >
                  {commune.nom}
                </Link>
                <span className="tabular-figures text-small text-text-soft">
                  {fill(t.voisines_distance, { distance: formatDistance(commune.distance_km) })}
                </span>
              </li>
            ))}
          </ol>
        ) : null}
        <ul className="m-0 mt-8 flex list-none flex-wrap gap-x-8 gap-y-2 p-0">
          {departementHref ? (
            <li className="max-w-none">
              <Link
                href={departementHref}
                prefetch={false}
                className="inline-flex min-h-12 items-center font-bold"
              >
                {fill(t.agence.departement_lien, { lieu })}
              </Link>
            </li>
          ) : null}
          <li className="max-w-none">
            <Link
              href="/aide-a-domicile/"
              prefetch={false}
              className="inline-flex min-h-12 items-center font-bold"
            >
              {t.territoires}
            </Link>
          </li>
          <li className="max-w-none">
            <Link
              href="/agences/"
              prefetch={false}
              className="inline-flex min-h-12 items-center font-bold"
            >
              {indexLabel}
            </Link>
          </li>
        </ul>
      </Section>

      <Section
        tone="white"
        id="formulaire"
        aria-labelledby="formulaire-titre"
        className="scroll-mt-20"
      >
        <Heading level={2} id="formulaire-titre">
          {page.rappel_h2}
        </Heading>
        <Lead className="mt-3">{page.rappel_texte}</Lead>
        <div className="mt-8 max-w-3xl">
          <RappelForm
            texts={rappelTexts}
            phone={phone}
            confidentialiteHref={confidentialiteHref}
            initialInsee={agency.code_insee}
          />
        </div>
      </Section>
    </main>
  );
}
