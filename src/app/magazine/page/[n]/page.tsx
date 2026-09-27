import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArticleListPage } from "@/components/magazine/ArticleListPage";
import { magazinePagePath, parsePageNumber } from "@/content/article-meta";
import { listBuildableArticles } from "@/content/articles";
import { getInterfaceTexts } from "@/content/loader";
import { extraPages, indexData, indexMetadata } from "../../data";

/*
 * /magazine/page/{n}/ : pages 2 et suivantes de l'index (12 articles par page). Construites
 * seulement quand il y a assez d'articles ; la page 1 reste /magazine/.
 */

type PageProps = { params: Promise<{ n: string }> };

export const dynamicParams = false;

export async function generateStaticParams() {
  const count = (await listBuildableArticles()).length;
  return extraPages(count).map((n) => ({ n: String(n) }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const n = parsePageNumber((await params).n);
  return n ? indexMetadata(n) : {};
}

export default async function MagazineIndexPageN({ params }: PageProps) {
  const n = parsePageNumber((await params).n);
  const data = n ? await indexData(n) : null;
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
