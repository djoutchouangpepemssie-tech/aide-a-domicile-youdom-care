import type { SiteConfig } from "@/content/schemas";
import { toTelHref } from "@/lib/phone";
import {
  absoluteUrl,
  filled,
  organizationId,
  jsonLdNode,
  siteOrigin,
  type JsonLdNode,
  type JsonLdObject,
} from "./types";

/*
 * `Organization` (docs/04 §2, monté une fois par page dans le pied de page). Tout vient de
 * content/site.config.json : `legalName`, `identifier` (SIRET), `sameAs` et `logo` ne sont émis
 * que si la donnée existe. `areaServed` : les départements de `zones`. Aucune adresse postale
 * ici : les points d'accueil réels relèvent des `LocalBusiness` des pages agences.
 */

export interface OrganizationOptions {
  /** Chemin ou adresse du logo, seulement si le fichier existe dans public/ (Q-CONTENU-6). */
  logo?: string | null;
}

/** Numéro affiché « 01 84 80 17 03 » → « +33184801703 » ; null si le numéro n'est pas français. */
export function internationalPhone(display: string | null | undefined): string | null {
  if (!filled(display)) return null;
  const href = toTelHref(display);
  return href ? href.replace(/^tel:/, "") : null;
}

/** Les zones desservies (huit départements d'Île-de-France) sous forme d'`AdministrativeArea`. */
export function areaServed(zones: SiteConfig["zones"]): JsonLdObject[] {
  return zones
    .filter((zone) => filled(zone.nom))
    .map((zone) => ({ "@type": "AdministrativeArea", name: zone.nom }));
}

export function organization(
  config: SiteConfig,
  options: OrganizationOptions = {},
): JsonLdNode | null {
  const { marque, contact, legal, zones, reseaux_sociaux } = config;
  if (!filled(marque.nom) || !filled(marque.url)) return null;

  const telephone = internationalPhone(contact.telephone_principal);
  const email = filled(contact.email) ? contact.email : undefined;
  const siret = filled(legal.siret) ? legal.siret.replace(/\s+/g, "") : undefined;
  const sameAs = Object.values(reseaux_sociaux).filter((value): value is string => filled(value));

  const contactPoint: JsonLdObject | undefined =
    telephone || email
      ? {
          "@type": "ContactPoint",
          contactType: "customer service",
          telephone: telephone ?? undefined,
          email,
          areaServed: "FR",
          availableLanguage: "fr",
        }
      : undefined;

  return jsonLdNode("Organization", {
    "@id": organizationId(marque.url),
    name: marque.nom,
    legalName: filled(legal.raison_sociale) ? legal.raison_sociale : undefined,
    url: `${siteOrigin(marque.url)}/`,
    description: filled(marque.description_courte) ? marque.description_courte : undefined,
    logo: filled(options.logo) ? absoluteUrl(options.logo, marque.url) : undefined,
    telephone: telephone ?? undefined,
    email,
    identifier: siret ? { "@type": "PropertyValue", propertyID: "SIRET", value: siret } : undefined,
    areaServed: areaServed(zones),
    sameAs: sameAs.length > 0 ? sameAs : undefined,
    contactPoint,
  });
}
