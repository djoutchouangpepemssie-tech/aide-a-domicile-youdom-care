import type { Agency, SiteConfig } from "@/content/schemas";
import { internationalPhone } from "./organization";
import {
  absoluteUrl,
  filled,
  jsonLdNode,
  organizationId,
  type JsonLdNode,
  type JsonLdObject,
} from "./types";

/*
 * `LocalBusiness` (docs/04 §2 : une par agence réelle, /agences/{id}/). Tout vient de
 * content/site.config.json et de data/agences.geo.json : `name`, `address` (la seule adresse
 * postale admise par check-schema est celle d'une agence), `geo` si le géocodage existe,
 * `telephone` (numéro de l'agence, sinon le standard), `openingHoursSpecification` seulement si
 * `horaires` est renseigné et lisible, `parentOrganization` par `@id`, `areaServed` = le
 * département de l'agence. Rien n'est inventé : un champ inconnu est omis.
 */

export interface LocalBusinessOptions {
  /** Coordonnées géocodées (data/agences.geo.json) ; null si absentes. */
  geo?: { lat: number; lng: number } | null;
}

const dayNames: Record<string, string> = {
  lundi: "Monday",
  mardi: "Tuesday",
  mercredi: "Wednesday",
  jeudi: "Thursday",
  vendredi: "Friday",
  samedi: "Saturday",
  dimanche: "Sunday",
};
const dayOrder = Object.keys(dayNames);

function toTime(value: string): string | null {
  const match = /^(\d{1,2})\s*(?:h|:)\s*(\d{2})?$/i.exec(value.trim());
  if (!match?.[1]) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2] ?? "0");
  if (hours > 23 || minutes > 59) return null;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

/**
 * Lit des horaires écrits en français simple (« du lundi au vendredi, de 9h à 18h »,
 * « lundi-vendredi 9h-18h30 », « samedi 9h à 12h ») en `OpeningHoursSpecification`. Toute autre
 * forme renvoie null : on n'émet alors rien plutôt qu'une approximation.
 */
export function parseOpeningHours(horaires: string): JsonLdObject[] | null {
  const specs: JsonLdObject[] = [];
  const parts = horaires
    .toLowerCase()
    .replace(/ /g, " ")
    .split(/\s*(?:;|\/|\bet\b)\s*/)
    .filter((part) => part.trim().length > 0);
  for (const part of parts) {
    const match =
      /^(?:du\s+)?(lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)(?:\s*(?:au|-|à)\s*(lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche))?\s*,?\s*(?:de\s+)?(\d{1,2}\s*(?:h|:)\s*(?:\d{2})?)\s*(?:à|-|–)\s*(\d{1,2}\s*(?:h|:)\s*(?:\d{2})?)\s*\.?$/.exec(
        part.trim(),
      );
    if (!match?.[1] || !match[3] || !match[4]) return null;
    const first = dayOrder.indexOf(match[1]);
    const last = match[2] ? dayOrder.indexOf(match[2]) : first;
    const opens = toTime(match[3]);
    const closes = toTime(match[4]);
    if (first < 0 || last < first || !opens || !closes) return null;
    specs.push({
      "@type": "OpeningHoursSpecification",
      dayOfWeek: dayOrder.slice(first, last + 1).map((day) => dayNames[day] ?? day),
      opens,
      closes,
    });
  }
  return specs.length > 0 ? specs : null;
}

export function agencyPath(agency: Pick<Agency, "id">): string {
  return `/agences/${agency.id}/`;
}

export function localBusiness(
  agency: Agency,
  config: SiteConfig,
  options: LocalBusinessOptions = {},
): JsonLdNode | null {
  const siteUrl = config.marque.url;
  if (
    !filled(siteUrl) ||
    !filled(agency.nom) ||
    !filled(agency.adresse) ||
    !filled(agency.code_postal) ||
    !filled(agency.commune)
  ) {
    return null;
  }
  const url = absoluteUrl(agencyPath(agency), siteUrl);
  const telephone = internationalPhone(agency.telephone ?? config.contact.telephone_principal);
  const zone = config.zones.find((z) => z.code === agency.departement);
  const geo = options.geo ?? agency.coordonnees ?? null;
  const hours = agency.horaires ? parseOpeningHours(agency.horaires) : null;

  return jsonLdNode("LocalBusiness", {
    "@id": `${url}#agence`,
    name: agency.nom,
    url,
    address: {
      "@type": "PostalAddress",
      streetAddress: agency.adresse,
      postalCode: agency.code_postal,
      addressLocality: agency.commune,
      addressCountry: "FR",
    },
    geo: geo ? { "@type": "GeoCoordinates", latitude: geo.lat, longitude: geo.lng } : undefined,
    telephone: telephone ?? undefined,
    email: filled(config.contact.email) ? config.contact.email : undefined,
    openingHoursSpecification: hours ?? undefined,
    parentOrganization: { "@id": organizationId(siteUrl) },
    areaServed: zone ? { "@type": "AdministrativeArea", name: zone.nom } : undefined,
  });
}
