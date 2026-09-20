import { absoluteUrl, filled, jsonLdNode, type JsonLdNode } from "./types";

/*
 * `BreadcrumbList` (docs/04 §2 : partout sauf l'accueil), émis par le composant Breadcrumb à
 * partir de ses propres éléments. Les adresses sont absolues ; le dernier élément (page
 * courante) peut ne pas en avoir, les autres en ont obligatoirement.
 */

export interface BreadcrumbListItem {
  name: string;
  /** Chemin interne ou adresse absolue ; facultatif pour la page courante seulement. */
  url?: string;
}

export function breadcrumbList(
  items: readonly BreadcrumbListItem[],
  siteUrl: string,
): JsonLdNode | null {
  if (items.length < 2 || !filled(siteUrl)) return null;
  const last = items.length - 1;
  for (const [index, item] of items.entries()) {
    if (!filled(item.name)) return null;
    if (index < last && !filled(item.url)) return null;
  }
  return jsonLdNode("BreadcrumbList", {
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: filled(item.url) ? absoluteUrl(item.url, siteUrl) : undefined,
    })),
  });
}
