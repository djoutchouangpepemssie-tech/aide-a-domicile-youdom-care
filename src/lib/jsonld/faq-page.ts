import { absoluteUrl, filled, jsonLdNode, type JsonLdNode } from "./types";

/*
 * `FAQPage` (docs/04 §2, facultatif : plus d'extrait enrichi). Les questions et réponses sont
 * celles de la section 11, telles quelles : jamais de texte absent de la page.
 */

export interface FaqItem {
  question: string;
  reponse: string;
}

export function faqPage(
  faq: readonly FaqItem[],
  location?: { chemin: string; siteUrl: string },
): JsonLdNode | null {
  if (faq.length === 0) return null;
  if (faq.some((item) => !filled(item.question) || !filled(item.reponse))) return null;
  const url =
    location && filled(location.chemin) && filled(location.siteUrl)
      ? absoluteUrl(location.chemin, location.siteUrl)
      : undefined;
  return jsonLdNode("FAQPage", {
    "@id": url ? `${url}#faq` : undefined,
    url,
    mainEntity: faq.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.reponse },
    })),
  });
}
