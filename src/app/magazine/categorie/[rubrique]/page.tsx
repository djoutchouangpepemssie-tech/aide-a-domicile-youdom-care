import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArticleListPage } from "@/components/magazine/ArticleListPage";
import { parseRubrique, rubriquePagePath } from "@/content/article-meta";
import { articleRubriques } from "@/content/article-schema";
import { getInterfaceTexts } from "@/content/loader";
import { rubriqueData, rubriqueMetadata } from "../../data";

/*
 * /magazine/categorie/{rubrique}/ : les six rubriques de docs/06 §2, toutes construites (une
 * rubrique sans article publié est en noindex et l'explique). Suite sur …/page/{n}/.
 */

type RubriqueProps = { params: Promise<{ rubrique: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return articleRubriques.map((rubrique) => ({ rubrique }));
}

export async function generateMetadata({ params }: RubriqueProps): Promise<Metadata> {
  const rubrique = parseRubrique((await params).rubrique);
  return rubrique ? rubriqueMetadata(rubrique, 1) : {};
}

export default async function RubriquePage({ params }: RubriqueProps) {
  const rubrique = parseRubrique((await params).rubrique);
  const data = rubrique ? await rubriqueData(rubrique, 1) : null;
  if (!rubrique || !data) notFound();
  return (
    <ArticleListPage
      page={data.page}
      texts={getInterfaceTexts()}
      articles={data.articles}
      current={data.current}
      total={data.total}
      hrefFor={(n) => rubriquePagePath(rubrique, n)}
      rubrique={rubrique}
    />
  );
}
