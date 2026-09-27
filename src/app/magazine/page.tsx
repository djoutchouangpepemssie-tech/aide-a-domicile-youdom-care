import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArticleListPage } from "@/components/magazine/ArticleListPage";
import { magazinePagePath } from "@/content/article-meta";
import { getInterfaceTexts } from "@/content/loader";
import { indexData, indexMetadata } from "./data";

/*
 * /magazine/ : index du Fil (docs/06 §2, P7.1). Présentation, rubriques, derniers articles
 * construits (12 par page, suite sur /magazine/page/{n}/). Noindex tant qu'aucun article publié.
 */

export function generateMetadata(): Promise<Metadata> {
  return indexMetadata(1);
}

export default async function MagazineIndexPage() {
  const data = await indexData(1);
  if (!data) notFound();
  return (
    <ArticleListPage
      page={data.page}
      texts={getInterfaceTexts()}
      articles={data.articles}
      current={data.current}
      total={data.total}
      hrefFor={magazinePagePath}
    />
  );
}
