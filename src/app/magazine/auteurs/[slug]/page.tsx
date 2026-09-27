import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Breadcrumb } from "@/components/blocks/Breadcrumb/Breadcrumb";
import { Section } from "@/components/layout/Section/Section";
import { ArticleGrid } from "@/components/magazine/ArticleCard";
import { Heading } from "@/components/ui/Heading/Heading";
import { Lead } from "@/components/ui/Lead/Lead";
import { PhotoFigure, photoSizes } from "@/components/ui/PhotoFigure/PhotoFigure";
import { authorPath, MAGAZINE_PATH } from "@/content/article-meta";
import { getAuthor, listBuildableArticles, listBuildableAuthors } from "@/content/articles";
import { getInterfaceTexts, getMagazinePage } from "@/content/loader";
import { pageMetadata } from "@/lib/seo/metadata";
import { authorSeo } from "../../data";

/*
 * /magazine/auteurs/{slug}/ : fiche d'un auteur réel de content/auteurs/{slug}.json (docs/06 §4),
 * fournie par Arcel. Aucune fiche aujourd'hui : la route existe et ne construit rien ; l'auteur
 * « Équipe éditoriale Youdom Care » n'a pas de page. Le titre et la description moteur sont
 * composés depuis la fiche (nom, fonction, biographie) tant que `authorSchema` ne porte pas de
 * champ `seo` : à ajouter avec la première fiche réelle.
 */

type AuthorRouteProps = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

export async function generateStaticParams() {
  return (await listBuildableAuthors()).map((author) => ({ slug: author.slug }));
}

export async function generateMetadata({ params }: AuthorRouteProps): Promise<Metadata> {
  const author = await getAuthor((await params).slug);
  if (!author) return {};
  return pageMetadata({ ...authorSeo(author), chemin: authorPath(author.slug) });
}

export default async function AuthorRoute({ params }: AuthorRouteProps) {
  const author = await getAuthor((await params).slug);
  if (!author) notFound();
  const texts = getInterfaceTexts();
  const t = texts.magazine;
  const page = getMagazinePage();
  const articles = (await listBuildableArticles()).filter(
    (article) => article.meta.auteur.nom === author.nom,
  );
  return (
    <main id="contenu" data-auteur={author.slug}>
      <Section tone="paper" aria-labelledby="titre">
        <Breadcrumb
          texts={texts.fil_ariane}
          items={[{ label: page.ariane, href: MAGAZINE_PATH }, { label: author.nom }]}
          className="mb-6"
        />
        <div className="grid gap-8 md:grid-cols-[minmax(0,1fr)_16rem] md:items-start">
          <div>
            <Heading level={1} id="titre">
              {author.nom}
            </Heading>
            <p className="m-0 mt-2 font-bold text-teal-800">{author.fonction}</p>
            <Lead className="mt-5">{author.biographie}</Lead>
          </div>
          {author.photo ? (
            <PhotoFigure
              src={author.photo.src}
              alt={author.photo.alt}
              focal={author.photo.focal}
              ratio="4:5"
              radius={20}
              sizes={photoSizes.half}
            />
          ) : null}
        </div>
      </Section>
      <Section tone="white" aria-labelledby="articles">
        <Heading level={2} id="articles">
          {t.auteur_articles_h2.replace("{nom}", author.nom)}
        </Heading>
        {articles.length > 0 ? (
          <div className="mt-8">
            <ArticleGrid
              articles={articles}
              texts={{ temps_lecture: t.temps_lecture, maj_le: t.maj_le }}
              withRubriqueLinks
            />
          </div>
        ) : (
          <p className="m-0 mt-5 max-w-prose">{t.aucun_article}</p>
        )}
      </Section>
    </main>
  );
}
