import Link from "next/link";
import { Card } from "@/components/ui/Card/Card";
import { Heading, type HeadingLevel } from "@/components/ui/Heading/Heading";
import type { Agency } from "@/content/schemas";
import { cn } from "@/lib/cn";
import { toTelHref, formatFrenchPhone } from "@/lib/phone";
import { fill, type LocalTexts } from "./local-texts";

/*
 * Carte d'agence (docs/02 §7 `AgencyCard`) : nom, adresse, téléphone, horaires. Données de
 * content/site.config.json uniquement : un champ null (adresse de voie, téléphone, horaires)
 * n'est pas affiché, jamais remplacé. Aucun lien d'itinéraire vers un service de carte externe
 * (D-036). Avec `href`, la carte se termine par le lien vers la page de l'agence ; sans `href`
 * (page de l'agence elle-même), elle reste un bloc de faits.
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

/**
 * Adresse postale affichée : « 49-51 quai de Dion-Bouton, 92800 Puteaux ». `null` quand l'agence
 * ne publie pas d'adresse de voie (D-036, complété le 27/09/2026) : le site n'affiche alors **rien
 * du tout**, ni voie, ni code postal, ni commune, comme pour un téléphone ou des horaires
 * inconnus. Tout appelant doit donc traiter le cas `null` et masquer son bloc.
 */
export function fullAddress(
  agency: Pick<Agency, "adresse" | "code_postal" | "commune">,
): string | null {
  if (!agency.adresse) return null;
  return `${agency.adresse}, ${agency.code_postal} ${agency.commune}`;
}

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
  const address = fullAddress(agency);
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
        {address ? (
          <div>
            <dt className="text-small font-bold text-teal-900">{texts.adresse}</dt>
            <dd className="m-0">{address}</dd>
          </div>
        ) : null}
        {phone && telHref ? (
          <div>
            <dt className="text-small font-bold text-teal-900">
              {ownPhone ? texts.telephone : texts.standard}
            </dt>
            <dd className="m-0">
              <a
                href={telHref}
                data-mesure="agence"
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
      {/* D-036 : plus de lien d'itinéraire vers un service de carte externe. */}
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
