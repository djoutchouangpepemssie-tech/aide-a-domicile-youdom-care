import type { Agency, JobOffer, SiteConfig } from "@/content/schemas";
import { internationalPhone } from "./organization";
import {
  absoluteUrl,
  filled,
  jsonLdNode,
  organizationId,
  siteOrigin,
  type JsonLdNode,
  type JsonLdObject,
} from "./types";

/*
 * `JobPosting` (docs/04 §2 : offres réelles seulement) : `title`, `description`, `datePosted`,
 * `validThrough`, `employmentType`, `hiringOrganization` (Youdom Care, par `@id` et nom),
 * `jobLocation` = l'adresse de l'agence de rattachement (la seule adresse postale admise par
 * check-schema est celle d'une agence de site.config.json), `baseSalary` seulement si l'offre
 * en indique un. Rien d'autre : aucun champ rempli avec une valeur supposée. Une offre
 * `brouillon` ou expirée n'a pas de nœud.
 */

/** Correspondance des contrats et temps de travail avec le vocabulaire schema.org. */
const employmentTypes: Record<JobOffer["contrat"], string> = {
  cdi: "FULL_TIME",
  cdd: "TEMPORARY",
};

const salaryUnits: Record<NonNullable<JobOffer["salaire"]>["unite"], string> = {
  heure: "HOUR",
  mois: "MONTH",
  an: "YEAR",
};

export interface JobPostingInput {
  offer: JobOffer;
  agency: Agency;
  /** Chemin de la page de l'offre (« /recrutement/offre/{slug}/ »). */
  chemin: string;
  /** Date du jour (AAAA-MM-JJ) : une offre expirée n'émet rien. */
  today: string;
}

function employmentType(offer: JobOffer): string[] {
  const types = [employmentTypes[offer.contrat]];
  if (offer.temps_de_travail === "temps-partiel") types.push("PART_TIME");
  return [...new Set(types)];
}

function baseSalary(offer: JobOffer): JsonLdObject | undefined {
  if (!offer.salaire) return undefined;
  return {
    "@type": "MonetaryAmount",
    currency: offer.salaire.devise,
    value: {
      "@type": "QuantitativeValue",
      minValue: offer.salaire.min,
      maxValue: offer.salaire.max,
      unitText: salaryUnits[offer.salaire.unite],
    },
  };
}

export function jobPosting(input: JobPostingInput, config: SiteConfig): JsonLdNode | null {
  const { offer, agency, chemin, today } = input;
  const siteUrl = config.marque.url;
  if (!filled(siteUrl) || !filled(config.marque.nom)) return null;
  if (offer.statut !== "publiee" || offer.valable_jusqu_au < today) return null;
  if (!filled(agency.adresse) || !filled(agency.code_postal) || !filled(agency.commune)) {
    return null;
  }
  const url = absoluteUrl(chemin, siteUrl);
  const description = [
    offer.description,
    ...offer.missions.map((mission) => `- ${mission}`),
    ...offer.profil.map((point) => `- ${point}`),
  ].join("\n");
  const telephone = internationalPhone(agency.telephone ?? config.contact.telephone_principal);
  return jsonLdNode("JobPosting", {
    "@id": url,
    url,
    title: offer.titre,
    description,
    datePosted: offer.publiee_le,
    validThrough: offer.valable_jusqu_au,
    employmentType: employmentType(offer),
    hiringOrganization: {
      "@type": "Organization",
      "@id": organizationId(siteUrl),
      name: config.marque.nom,
      sameAs: `${siteOrigin(siteUrl)}/`,
    },
    jobLocation: {
      "@type": "Place",
      name: agency.nom,
      address: {
        "@type": "PostalAddress",
        streetAddress: agency.adresse,
        postalCode: agency.code_postal,
        addressLocality: agency.commune,
        addressCountry: "FR",
      },
      telephone: telephone ?? undefined,
    },
    baseSalary: baseSalary(offer),
    directApply: true,
  });
}
