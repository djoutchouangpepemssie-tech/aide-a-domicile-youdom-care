import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArticleTemplate } from "@/components/magazine/ArticleTemplate";
import { authorPath } from "@/content/article-meta";
import { getArticle, listBuildableArticles } from "@/content/articles";
import { getSiteConfig } from "@/content/loader";
import { articleJsonLd } from "@/lib/jsonld/article";
import { JsonLd } from "@/lib/jsonld/JsonLd";
import { articleData, articleMetadata } from "../data";

/*
 * /magazine/{slug}/ : un article du Fil par fichier content/magazine/{slug}.mdx (docs/06 §3).
 * Construits : tous hors brouillon en prévisualisation, seulement `publie` en production ; un
 * article `a_relire` est en noindex avec son bandeau. Données structurées (docs/04 §2) :
 * `Article` (auteur = organisation tant qu'aucune fiche réelle), `BreadcrumbList` par le fil
 * d'Ariane, `Organization` par le pied de page.
 */

type ArticleRouteProps = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

export async function generateStaticParams() {
  return (await listBuildableArticles()).map((article) => ({ slug: article.slug }));
}

export async function generateMetadata({ params }: ArticleRouteProps): Promise<Metadata> {
  const article = await getArticle((await params).slug);
  return article ? articleMetadata(article) : {};
}

export default async function ArticleRoute({ params }: ArticleRouteProps) {
  const data = await articleData((await params).slug);
  if (!data) notFound();
  const jsonLd = articleJsonLd(data.article, getSiteConfig(), {
    author: data.author,
    authorPath: data.author ? authorPath(data.author.slug) : undefined,
  });
  return (
    <>
      <JsonLd data={jsonLd} />
      <ArticleTemplate data={data} />
    </>
  );
}
