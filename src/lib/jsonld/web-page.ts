import type { SiteConfig } from "@/content/schemas";
import type { ServicePage } from "@/content/service-schema";
import {
  absoluteUrl,
  compact,
  filled,
  organizationId,
  jsonLdNode,
  type JsonLdNode,
  type JsonLdObject,
} from "./types";

/*
 * `WebPage` et `MedicalWebPage` (docs/04 §2). Une page pathologie n'est une `MedicalWebPage`
 * que si `relu_par` est rempli : `about` (MedicalCondition nommée d'après le H1),
 * `lastReviewed`, `reviewedBy` (Person), `audience` proches aidants. Sinon, `WebPage` avec
 * `dateModified` = `maj` ; l'auteur et, s'il existe, le relecteur y figurent aussi.
 */

export type WebPageInput = Pick<
  ServicePage,
  | "titre"
  | "description"
  | "chemin"
  | "h1"
  | "type"
  | "libelle_court"
  | "auteur"
  | "relu_par"
  | "maj"
>;

/** Public des pages pathologie relues (docs/04 §2 : « proches aidants »). */
export const CAREGIVER_AUDIENCE = "Proches aidants";

/**
 * Nom de la maladie tiré du H1 : « Aide à domicile et maladie d'Alzheimer : rester chez soi »
 * → « maladie d'Alzheimer ». À défaut de ce motif, la partie avant « : », puis le libellé
 * court, puis le H1 entier.
 */
export function conditionNameFromH1(h1: string, libelleCourt?: string): string | null {
  const lead = /^aide à domicile et (.+?)\s*:/iu.exec(h1);
  if (lead?.[1] && filled(lead[1])) return lead[1].trim();
  const colon = h1.indexOf(" :");
  if (colon > 0) return h1.slice(0, colon).trim();
  if (filled(libelleCourt)) return libelleCourt.trim();
  return filled(h1) ? h1.trim() : null;
}

function person(value: { nom: string; fonction: string } | null | undefined): JsonLdObject | null {
  if (!value || !filled(value.nom)) return null;
  return compact({
    "@type": "Person",
    name: value.nom,
    jobTitle: filled(value.fonction) ? value.fonction : undefined,
  });
}

function base(page: WebPageInput, config: SiteConfig): JsonLdObject | null {
  const siteUrl = config.marque.url;
  if (!filled(siteUrl) || !filled(page.titre) || !filled(page.chemin) || !filled(page.maj)) {
    return null;
  }
  const url = absoluteUrl(page.chemin, siteUrl);
  const reviewer = page.relu_par ? person(page.relu_par) : null;
  return {
    "@id": url,
    url,
    name: page.titre,
    headline: filled(page.h1) ? page.h1 : undefined,
    description: filled(page.description) ? page.description : undefined,
    inLanguage: "fr-FR",
    dateModified: page.maj,
    author: person(page.auteur) ?? undefined,
    publisher: { "@id": organizationId(siteUrl) },
    reviewedBy: reviewer ?? undefined,
    lastReviewed: reviewer && filled(page.relu_par?.date) ? page.relu_par.date : undefined,
  };
}

export function webPage(page: WebPageInput, config: SiteConfig): JsonLdNode | null {
  const node = base(page, config);
  if (!node) return null;
  return jsonLdNode("WebPage", node);
}

/** `null` tant que la page n'est pas une pathologie relue (`relu_par` renseigné). */
export function medicalWebPage(page: WebPageInput, config: SiteConfig): JsonLdNode | null {
  if (page.type !== "pathologie" || !page.relu_par) return null;
  const reviewer = person(page.relu_par);
  if (!reviewer || !filled(page.relu_par.date)) return null;
  const condition = conditionNameFromH1(page.h1, page.libelle_court);
  if (!condition) return null;
  const node = base(page, config);
  if (!node) return null;
  return jsonLdNode("MedicalWebPage", {
    ...node,
    about: { "@type": "MedicalCondition", name: condition },
    lastReviewed: page.relu_par.date,
    reviewedBy: reviewer,
    audience: { "@type": "PeopleAudience", audienceType: CAREGIVER_AUDIENCE },
  });
}
