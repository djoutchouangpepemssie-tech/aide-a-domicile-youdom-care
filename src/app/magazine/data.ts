import type { Metadata } from "next";
import type { ArticleTemplateData } from "@/components/magazine/ArticleTemplate";
import {
  magazinePagePath,
  pageCount,
  paginate,
  rubriquePagePath,
  type ArticleMeta,
} from "@/content/article-meta";
import type { ArticleRubrique, Author } from "@/content/article-schema";
import {
  articleAuthor,
  articlesOfRubrique,
  getArticle,
  listBuildableArticles,
  listMagazinePages,
  relatedArticles,
  type LoadedArticle,
  type MagazinePage,
} from "@/content/articles";
import { getInterfaceTexts, getMagazinePage, getSiteConfig } from "@/content/loader";
import type { MagazinePageContent } from "@/content/magazine-schema";
import { serviceOgImagePath } from "@/lib/og/paths";
import { canonicalUrl, pageMetadata } from "@/lib/seo/metadata";

/*
 * Données partagées des routes du magazine (index, pagination, rubriques, articles) et de la
 * route des images Open Graph. Métadonnées : `pageMetadata`, avec le suffixe de pagination sur
 * les pages 2 et suivantes, `noindex` quand la page ne liste AUCUN article ; image Open Graph par
 * /og/{chemin}/.
 *
 * **Pourquoi « aucun article listé » et non « aucun article publié » (D-070).** La condition
 * portait sur `listPublishedArticles()`, c'est-à-dire `statut === "publie"`. Or D-035 a rendu un
 * article `a_relire` indexable comme les autres, et les treize articles du site sont tous
 * `a_relire` : l'index et les cinq rubriques peuplées partaient donc en `noindex` alors que les
 * treize articles qu'ils listent sont indexés, et alors que `/magazine/` figure dans le plan de
 * site. Un moteur recevait une adresse à explorer, la trouvait en `noindex`, et aucun lien
 * n'arrivait aux articles. D-035 avait changé la règle de l'article sans changer celle du hub.
 *
 * La condition suit désormais ce que la page montre réellement : une page qui liste des articles
 * s'indexe, une page vide ne s'indexe pas. C'est le cas de la rubrique « Dans les coulisses »,
 * qui n'a aucun article.
 */

export interface ArticleListData {
  page: MagazinePageContent;
  articles: ArticleMeta[];
  /** Page courante, à partir de 1. */
  current: number;
  total: number;
  /** Vrai quand la page ne liste aucun article : page construite mais en noindex (D-070). */
  noindex: boolean;
}

export function paginatedSeo(seo: { titre: string; description: string }, n: number) {
  if (n <= 1) return seo;
  const { pagination } = getInterfaceTexts().magazine;
  return {
    titre: `${seo.titre} ${pagination.suffixe_titre.replace("{n}", String(n))}`,
    description: `${seo.description} ${pagination.suffixe_description.replace("{n}", String(n))}`,
  };
}

/** Page `n` de l'index ; null si la page n'existe pas. */
export async function indexData(n: number): Promise<ArticleListData | null> {
  const page = getMagazinePage();
  const all = await listBuildableArticles();
  const total = pageCount(all.length);
  if (n < 1 || n > total) return null;
  const articles = paginate(all, n);
  return { page, articles, current: n, total, noindex: articles.length === 0 };
}

export async function indexMetadata(n: number): Promise<Metadata> {
  const data = await indexData(n);
  if (!data) return {};
  const chemin = magazinePagePath(n);
  return pageMetadata({
    ...paginatedSeo(data.page.seo, n),
    chemin,
    noindex: data.noindex,
    image: serviceOgImagePath(chemin),
  });
}

/** Page `n` d'une rubrique ; null si la page n'existe pas. */
export async function rubriqueData(
  rubrique: ArticleRubrique,
  n: number,
): Promise<ArticleListData | null> {
  const page = getMagazinePage();
  const all = articlesOfRubrique(await listBuildableArticles(), rubrique);
  const total = pageCount(all.length);
  if (n < 1 || n > total) return null;
  const articles = paginate(all, n);
  return { page, articles, current: n, total, noindex: articles.length === 0 };
}

export async function rubriqueMetadata(rubrique: ArticleRubrique, n: number): Promise<Metadata> {
  const data = await rubriqueData(rubrique, n);
  if (!data) return {};
  const chemin = rubriquePagePath(rubrique, n);
  return pageMetadata({
    ...paginatedSeo(data.page.rubriques[rubrique].seo, n),
    chemin,
    noindex: data.noindex,
    image: serviceOgImagePath(chemin),
  });
}

/** Numéros des pages 2 et suivantes d'une liste. */
export function extraPages(count: number): number[] {
  return Array.from({ length: Math.max(0, pageCount(count) - 1) }, (_, index) => index + 2);
}

/** Données du gabarit d'un article construit ; null pour un slug inconnu. */
export async function articleData(slug: string): Promise<ArticleTemplateData | null> {
  const article = await getArticle(slug);
  if (!article) return null;
  const pool = await listBuildableArticles();
  return {
    article,
    texts: getInterfaceTexts(),
    magazineLabel: getMagazinePage().ariane,
    related: relatedArticles(article, pool),
    author: await articleAuthor(article),
    url: canonicalUrl(article.chemin, getSiteConfig().marque.url),
  };
}

export function articleMetadata(article: LoadedArticle): Metadata {
  return pageMetadata({
    titre: article.meta.seo.titre,
    description: article.meta.seo.description,
    chemin: article.chemin,
    // D-035 : un article en attente de relecture est indexable comme les autres.
    noindex: false,
    image: serviceOgImagePath(article.chemin),
  });
}

/** Titres (H1) de l'index et des rubriques, pour les images Open Graph et le plan du site. */
export function magazineTitles() {
  const page = getMagazinePage();
  return {
    index: page.h1,
    rubriques: Object.fromEntries(
      Object.entries(page.rubriques).map(([rubrique, content]) => [rubrique, content.h1]),
    ) as Record<ArticleRubrique, string>,
  };
}

/** Toutes les pages construites du magazine, avec leur titre. */
export function allMagazinePages(): Promise<MagazinePage[]> {
  return listMagazinePages(magazineTitles());
}

/** Coupe un texte à `max` caractères sur un mot entier, avec des points de suspension. */
export function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  const end = text[max - 1] === " " ? cut.length : cut.lastIndexOf(" ");
  return `${cut.slice(0, Math.max(end, max - 20)).trimEnd()}…`;
}

/**
 * Titre et description moteur d'une fiche auteur, composés depuis la fiche tant que
 * `authorSchema` ne porte pas de champ `seo` (à ajouter avec la première fiche réelle).
 */
export function authorSeo(author: Author): { titre: string; description: string } {
  return {
    titre: truncate(`${author.nom}, ${author.fonction} : ses articles dans Le Fil`, 60),
    description: truncate(author.biographie, 155),
  };
}
