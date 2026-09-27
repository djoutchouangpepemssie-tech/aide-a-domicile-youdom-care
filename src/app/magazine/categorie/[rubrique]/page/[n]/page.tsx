import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArticleListPage } from "@/components/magazine/ArticleListPage";
import { parsePageNumber, parseRubrique, rubriquePagePath } from "@/content/article-meta";
import { articleRubriques } from "@/content/article-schema";
import { articlesOfRubrique, listBuildableArticles } from "@/content/articles";
import { getInterfaceTexts } from "@/content/loader";
import { extraPages, rubriqueData, rubriqueMetadata } from "../../../../data";

/*
 * /magazine/categorie/{rubrique}/page/{n}/ : pages 2 et suivantes d'une rubrique, construites
 * seulement quand la rubrique dépasse douze articles.
 */

type PageProps = { params: Promise<{ rubrique: string; n: string }> };

export const dynamicParams = false;

export async function generateStaticParams() {
  const articles = await listBuildableArticles();
  return articleRubriques.flatMap((rubrique) =>
    extraPages(articlesOfRubrique(articles, rubrique).length).map((n) => ({
      rubrique,
      n: String(n),
    })),
  );
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { rubrique: raw, n: rawN } = await params;
  const rubrique = parseRubrique(raw);
  const n = parsePageNumber(rawN);
  return rubrique && n ? rubriqueMetadata(rubrique, n) : {};
}

export default async function RubriquePageN({ params }: PageProps) {
  const { rubrique: raw, n: rawN } = await params;
  const rubrique = parseRubrique(raw);
  const n = parsePageNumber(rawN);
  const data = rubrique && n ? await rubriqueData(rubrique, n) : null;
  if (!rubrique || !data) notFound();
  return (
    <ArticleListPage
      page={data.page}
      texts={getInterfaceTexts()}
      articles={data.articles}
      current={data.current}
      total={data.total}
      hrefFor={(page) => rubriquePagePath(rubrique, page)}
      rubrique={rubrique}
    />
  );
}
