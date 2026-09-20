import Link from "next/link";
import { Card } from "@/components/ui/Card/Card";
import { Heading, type HeadingLevel } from "@/components/ui/Heading/Heading";
import type { Agency } from "@/content/schemas";
import { cn } from "@/lib/cn";
import { toTelHref, formatFrenchPhone } from "@/lib/phone";
import { fill, type LocalTexts } from "./local-texts";

/*
 * Carte d'agence (docs/02 §7 `AgencyCard`) : nom, adresse, téléphone, horaires, itinéraire.
 * Données de content/site.config.json uniquement : un champ null (téléphone, horaires) n'est
 * pas affiché, jamais remplacé. L'itinéraire est un lien vers OpenStreetMap avec l'adresse
 * encodée (`routeUrl`), signalé comme externe. Avec `href`, la carte se termine par le lien vers
 * la page de l'agence ; sans `href` (page de l'agence elle-même), elle reste un bloc de faits.
 */

export interface AgencyCardProps {
  agency: Agency;
  texts: LocalTexts["agence"];
  /** Page de l'agence ; absent sur la page elle-même. */
  href?: string;
  /** Numéro du standard, affiché quand l'agence n'a pas de numéro propre. */
  standardPhone?: string | null;
  headingLevel?: HeadingLevel;
  className?: string;
}

/** Adresse postale complète : « 49-51 quai de Dion-Bouton, 92800 Puteaux ». */
export function fullAddress(agency: Pick<Agency, "adresse" | "code_postal" | "commune">): string {
  return `${agency.adresse}, ${agency.code_postal} ${agency.commune}`;
}

/** Lien d'itinéraire : recherche OpenStreetMap sur l'adresse encodée (aucun script tiers). */
export function routeUrl(agency: Pick<Agency, "adresse" | "code_postal" | "commune">): string {
  return `https://www.openstreetmap.org/search?query=${encodeURIComponent(fullAddress(agency))}`;
}

const externalIcon = (
  <svg
    aria-hidden="true"
    viewBox="0 0 24 24"
    width="16"
    height="16"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="shrink-0"
  >
    <path d="M14 4h6v6M20 4l-9 9M18 13v6H5V6h6" />
  </svg>
);

export function AgencyCard({
  agency,
  texts,
  href,
  standardPhone,
  headingLevel = 3,
  className,
}: AgencyCardProps) {
  const ownPhone = agency.telephone;
  const phone = ownPhone ?? standardPhone ?? null;
  const telHref = phone ? toTelHref(phone) : null;
  return (
    <Card
      as="article"
      className={cn("agency-card flex flex-col", className)}
      data-agence={agency.id}
      interactive={href !== undefined}
    >
      <Heading level={headingLevel} visual={4}>
        {agency.nom}
      </Heading>
      <dl className="m-0 mt-3 grid gap-3">
        <div>
          <dt className="text-small font-bold text-teal-900">{texts.adresse}</dt>
          <dd className="m-0">{fullAddress(agency)}</dd>
        </div>
        {phone && telHref ? (
          <div>
            <dt className="text-small font-bold text-teal-900">
              {ownPhone ? texts.telephone : texts.standard}
            </dt>
            <dd className="m-0">
              <a
                href={telHref}
                className="tabular-figures inline-flex min-h-11 items-center font-bold"
              >
                {formatFrenchPhone(phone)}
              </a>
            </dd>
          </div>
        ) : null}
        {agency.horaires ? (
          <div data-agence-horaires>
            <dt className="text-small font-bold text-teal-900">{texts.horaires}</dt>
            <dd className="m-0">{agency.horaires}</dd>
          </div>
        ) : null}
      </dl>
      <p className="m-0 mt-auto pt-4">
        <a
          href={routeUrl(agency)}
          rel="noopener noreferrer"
          className="inline-flex min-h-12 items-center gap-2 font-bold"
          data-agence-itineraire
        >
          {texts.itineraire}
          {externalIcon}
          <span className="sr-only"> ({texts.itineraire_externe})</span>
        </a>
      </p>
      {href ? (
        <p className="m-0 mt-2">
          <Link
            href={href}
            prefetch={false}
            className="inline-flex min-h-12 items-center font-bold"
          >
            {fill(texts.voir, { nom: agency.nom })}
          </Link>
        </p>
      ) : null}
    </Card>
  );
}
