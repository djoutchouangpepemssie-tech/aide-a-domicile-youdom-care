import Link from "next/link";
import { Breadcrumb } from "@/components/blocks/Breadcrumb/Breadcrumb";
import { Section } from "@/components/layout/Section/Section";
import { Heading } from "@/components/ui/Heading/Heading";
import { Lead } from "@/components/ui/Lead/Lead";
import { MAGAZINE_PATH, rubriquePath, type ArticleMeta } from "@/content/article-meta";
import { articleRubriques, rubriqueLabels, type ArticleRubrique } from "@/content/article-schema";
import type { MagazinePageContent } from "@/content/magazine-schema";
import type { InterfaceTexts } from "@/content/schemas";
import { ArticleGrid } from "./ArticleCard";
import { Pagination } from "./Pagination";
import { RubriqueNav } from "./RubriqueNav";

/*
 * Pages de liste du Fil (docs/06 §2) : l'index /magazine/ (présentation courte, les six rubriques
 * en cartes, les derniers articles, pagination) et les rubriques /magazine/categorie/{rubrique}/
 * (fil d'Ariane, H1, une phrase, navigation entre rubriques, articles, pagination). Sans article,
 * un message explique que les premiers sont en cours d'écriture ; la page reste construite et
 * passe en noindex (route). Le lien vers la charte éditoriale ferme la page.
 */

export interface ArticleListPageProps {
  page: MagazinePageContent;
  texts: InterfaceTexts;
  articles: readonly ArticleMeta[];
  current: number;
  total: number;
  hrefFor: (n: number) => string;
  /** Rubrique courante ; absente sur l'index. */
  rubrique?: ArticleRubrique;
}

export function ArticleListPage({
  page,
  texts,
  articles,
  current,
  total,
  hrefFor,
  rubrique,
}: ArticleListPageProps) {
  const t = texts.magazine;
  const cardTexts = { temps_lecture: t.temps_lecture, maj_le: t.maj_le };
  const section = rubrique ? page.rubriques[rubrique] : null;
  const crumbs = rubrique
    ? [{ label: page.ariane, href: MAGAZINE_PATH }, { label: rubriqueLabels[rubrique] }]
    : [{ label: page.ariane }];

  return (
    <main id="contenu" data-magazine={rubrique ?? "index"} data-page={current}>
      <Section tone="paper" aria-labelledby="titre">
        <Breadcrumb texts={texts.fil_ariane} items={crumbs} className="mb-6" />
        <Heading level={1} id="titre">
          {section ? section.h1 : page.h1}
        </Heading>
        <Lead className="mt-5">{section ? section.texte : page.chapo}</Lead>
        {rubrique ? (
          <RubriqueNav label={t.rubriques_h2} current={rubrique} className="mt-8" />
        ) : null}
      </Section>

      {!rubrique ? (
        <Section tone="white" aria-labelledby="rubriques" data-section="rubriques">
          <Heading level={2} id="rubriques">
            {t.rubriques_h2}
          </Heading>
          <ul className="m-0 mt-8 grid list-none gap-4 p-0 sm:grid-cols-2 lg:grid-cols-3">
            {articleRubriques.map((id) => (
              <li key={id} className="max-w-none">
                <article className="relative flex h-full flex-col rounded-card border border-line bg-white p-6 shadow-1 transition-[box-shadow,border-color] [transition-duration:var(--duration-base)] hover:border-teal-700 hover:shadow-2 motion-reduce:transition-none">
                  <Heading level={3} visual={4} className="m-0">
                    <Link
                      href={rubriquePath(id)}
                      className="text-teal-900 no-underline after:absolute after:inset-0 after:rounded-card after:content-[''] hover:underline"
                    >
                      {rubriqueLabels[id]}
                    </Link>
                  </Heading>
                  <p className="m-0 mt-2 text-small text-text-soft">{page.rubriques[id].texte}</p>
                </article>
              </li>
            ))}
          </ul>
          <p className="m-0 mt-8 max-w-prose text-text-soft">{page.promesse}</p>
        </Section>
      ) : null}

      <Section
        tone={rubrique ? "white" : "paper"}
        aria-labelledby="articles"
        data-section="articles"
      >
        <Heading level={2} id="articles">
          {rubrique ? t.articles_h2 : t.derniers_h2}
        </Heading>
        {articles.length > 0 ? (
          <div className="mt-8">
            <ArticleGrid articles={articles} texts={cardTexts} withRubriqueLinks={!rubrique} />
          </div>
        ) : (
          <p className="m-0 mt-5 max-w-prose" data-aucun-article>
            {rubrique ? t.aucun_article_rubrique : t.aucun_article}
          </p>
        )}
        <Pagination current={current} total={total} hrefFor={hrefFor} texts={t.pagination} />
      </Section>

      <Section tone="teal" aria-labelledby="charte" className="py-10!" data-section="charte">
        <p id="charte" className="m-0 max-w-prose">
          {page.charte.texte}{" "}
          <Link href={page.charte.href} className="font-bold">
            {page.charte.lien}
          </Link>
        </p>
      </Section>
    </main>
  );
}
