import type { ArticleMeta } from "@/content/article-meta";
import { rubriqueLabels } from "@/content/article-schema";
import type { Author } from "@/content/article-schema";
import type { SiteConfig } from "@/content/schemas";
import {
  absoluteUrl,
  compact,
  filled,
  jsonLdNode,
  organizationId,
  type JsonLdNode,
  type JsonLdObject,
} from "./types";

/*
 * `Article` (docs/04 §2) pour les pages du magazine : `headline`, `description`, `image`,
 * `datePublished`, `dateModified`, `articleSection` (rubrique), `citation` (les sources
 * numérotées, en `CreativeWork` nommées et adressées), `wordCount`, `timeRequired`. L'auteur
 * est une `Person` seulement quand une fiche réelle existe dans content/auteurs/ (avec l'adresse
 * de sa page) ; tant qu'il n'y en a pas, c'est l'organisation Youdom Care, référencée par son
 * identifiant. Le relecteur, s'il existe, est une `Person` en `reviewedBy` avec `lastReviewed`.
 * `Organization` vient du pied de page et `BreadcrumbList` du fil d'Ariane.
 */

export interface ArticleJsonLdOptions {
  /** Fiche de l'auteur réel, si elle existe ; sinon l'auteur est l'organisation. */
  author?: Author | null;
  /** Chemin de la page de l'auteur réel (/magazine/auteurs/{slug}/). */
  authorPath?: string;
}

export function articleJsonLd(
  article: ArticleMeta,
  config: SiteConfig,
  options: ArticleJsonLdOptions = {},
): JsonLdNode | null {
  const siteUrl = config.marque.url;
  if (!filled(siteUrl) || !filled(article.meta.titre)) return null;
  const url = absoluteUrl(article.chemin, siteUrl);
  const { meta } = article;

  const author: JsonLdObject =
    options.author && filled(options.author.nom)
      ? compact({
          "@type": "Person",
          name: options.author.nom,
          jobTitle: options.author.fonction,
          url: filled(options.authorPath) ? absoluteUrl(options.authorPath, siteUrl) : undefined,
        })
      : { "@id": organizationId(siteUrl) };

  const reviewer: JsonLdObject | undefined = meta.relu_par
    ? compact({ "@type": "Person", name: meta.relu_par.nom, jobTitle: meta.relu_par.fonction })
    : undefined;

  return jsonLdNode("Article", {
    "@id": url,
    url,
    mainEntityOfPage: url,
    headline: meta.titre,
    description: meta.seo.description,
    inLanguage: "fr-FR",
    image: absoluteUrl(meta.image.src, siteUrl),
    datePublished: meta.publie_le,
    dateModified: meta.maj_le,
    articleSection: rubriqueLabels[meta.rubrique],
    wordCount: article.words,
    timeRequired: `PT${article.readingMinutes}M`,
    author,
    publisher: { "@id": organizationId(siteUrl) },
    reviewedBy: reviewer,
    lastReviewed: reviewer ? meta.relu_par?.date : undefined,
    citation: meta.sources.map((source) => ({
      "@type": "CreativeWork",
      name: source.libelle,
      url: source.href,
    })),
  });
}
