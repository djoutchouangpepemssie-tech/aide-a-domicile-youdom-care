import Link from "next/link";
import { formatFrenchDate } from "@/components/blocks/SourcesList/SourcesList";
import { Card } from "@/components/ui/Card/Card";
import { Heading, type HeadingLevel } from "@/components/ui/Heading/Heading";
import { PhotoFigure, photoSizes } from "@/components/ui/PhotoFigure/PhotoFigure";
import type { ArticleMeta } from "@/content/article-meta";
import { rubriqueLabels } from "@/content/article-schema";

/*
 * Carte d'article (docs/02 §7 `ArticleCard`) : photo 3:2, rubrique, titre-lien, date de mise à
 * jour et temps de lecture. Un seul lien pour le lecteur d'écran (le titre) ; toute la carte est
 * cliquable par pseudo-élément. Utilisée sur l'index, les rubriques, les fiches auteurs et le
 * bloc « À lire ensuite » des articles.
 */

export interface ArticleCardTexts {
  /** Contient {n}. */
  temps_lecture: string;
  /** Contient {date}. */
  maj_le: string;
}

export interface ArticleCardProps {
  article: ArticleMeta;
  texts: ArticleCardTexts;
  /** Niveau du titre de la carte : 3 sous un H2 de liste, 2 sur une page sans autre H2. */
  headingLevel?: HeadingLevel;
  /** Chemin de la rubrique, pour le lien discret sous la photo. */
  rubriqueHref?: string;
  className?: string;
}

export function ArticleCard({
  article,
  texts,
  headingLevel = 3,
  rubriqueHref,
  className,
}: ArticleCardProps) {
  const { meta } = article;
  const rubrique = rubriqueLabels[meta.rubrique];
  return (
    <Card
      as="article"
      interactive
      padding="none"
      className={
        className ? `relative flex h-full flex-col ${className}` : "relative flex h-full flex-col"
      }
      data-article-card={article.slug}
    >
      <div className="overflow-hidden rounded-t-card">
        <PhotoFigure
          src={meta.image.src}
          alt={meta.image.alt}
          focal={meta.image.focal}
          ratio="3:2"
          radius={20}
          sizes={photoSizes.half}
          className="rounded-b-none!"
        />
      </div>
      <div className="flex flex-1 flex-col gap-2 p-6">
        {rubriqueHref ? (
          <Link
            href={rubriqueHref}
            // Cible de 44 px (WCAG 2.5.8, P9.6) : le lien de rubrique mesurait 24 px de haut.
            className="relative z-10 inline-flex min-h-11 items-center self-start text-small font-bold text-teal-800 no-underline hover:underline"
          >
            {rubrique}
          </Link>
        ) : (
          <p className="m-0 text-small font-bold text-teal-800">{rubrique}</p>
        )}
        <Heading level={headingLevel} visual={4} className="m-0">
          <Link
            href={article.chemin}
            className="text-ink no-underline after:absolute after:inset-0 after:rounded-card after:content-[''] hover:underline"
          >
            {meta.titre}
          </Link>
        </Heading>
        <p className="tabular-figures m-0 mt-auto flex flex-wrap gap-x-3 pt-2 text-small text-text-soft">
          <time dateTime={meta.maj_le}>
            {texts.maj_le.replace("{date}", formatFrenchDate(meta.maj_le))}
          </time>
          <span aria-hidden="true">·</span>
          <span>{texts.temps_lecture.replace("{n}", String(article.readingMinutes))}</span>
        </p>
      </div>
    </Card>
  );
}

/** Grille de cartes : une colonne, deux à partir de 40 rem, trois à partir de 64 rem. */
export function ArticleGrid({
  articles,
  texts,
  headingLevel = 3,
  withRubriqueLinks = false,
}: {
  articles: readonly ArticleMeta[];
  texts: ArticleCardTexts;
  headingLevel?: HeadingLevel;
  withRubriqueLinks?: boolean;
}) {
  if (articles.length === 0) return null;
  return (
    <ul className="m-0 grid list-none gap-6 p-0 sm:grid-cols-2 lg:grid-cols-3" data-article-grid>
      {articles.map((article) => (
        <li key={article.slug} className="max-w-none">
          <ArticleCard
            article={article}
            texts={texts}
            headingLevel={headingLevel}
            rubriqueHref={
              withRubriqueLinks ? `/magazine/categorie/${article.meta.rubrique}/` : undefined
            }
          />
        </li>
      ))}
    </ul>
  );
}
