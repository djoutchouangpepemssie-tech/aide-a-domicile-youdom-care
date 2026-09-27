import { evaluate } from "@mdx-js/mdx";
import type { MDXContent } from "mdx/types";
import * as runtime from "react/jsx-runtime";
import remarkGfm from "remark-gfm";
import { isProduction } from "@/lib/env";
import { rehypeLexique, type LexiqueLinkTarget } from "@/lib/mdx/rehype-lexique";
import { lexiqueLinkTargets } from "./lexique";
import {
  articlePath,
  authorOf,
  authorPath,
  isArticleBuildable,
  listArticleMetas,
  listAuthors,
  magazinePagePath,
  MAGAZINE_PATH,
  pageCount,
  rubriquePagePath,
  rubriquePath,
  sortArticles,
  type ArticleMeta,
  type ArticleWarn,
} from "./article-meta";
import {
  articleRubriques,
  rubriqueLabels,
  type ArticleRubrique,
  type Author,
} from "./article-schema";

/*
 * Chargeur des articles du Fil (docs/06, P7.1) : lit content/magazine/*.mdx (en-tête validé par
 * article-meta.ts), compile le corps en composant React au build. Un article invalide ou dont
 * le corps ne compile pas est signalé par un avertissement et ignoré : le build ne tombe jamais
 * à cause d'un article en cours d'écriture. Construits : tous les articles hors brouillon en
 * prévisualisation, seulement `publie` en production (même mécanisme que les services).
 */

export interface LoadedArticle extends ArticleMeta {
  /** Corps MDX compilé ; rendu avec les composants `ARetenir` et `Attention`. */
  Body: MDXContent;
}

export interface LoaderOptions {
  dir?: string;
  warn?: ArticleWarn;
  /** Termes du lexique à lier dans le corps ; par défaut ceux de content/lexique/. */
  lexique?: readonly LexiqueLinkTarget[];
}

const defaultWarn: ArticleWarn = (message) => {
  console.warn(`content/magazine : ${message}`);
};

/** Termes du lexique (docs/06 §6) ; un lexique illisible ne bloque pas les articles. */
async function lexiqueTerms(warn: ArticleWarn): Promise<readonly LexiqueLinkTarget[]> {
  try {
    return await lexiqueLinkTargets();
  } catch (error) {
    warn(
      `lexique illisible, sigles non liés (${error instanceof Error ? error.message : String(error)})`,
    );
    return [];
  }
}

async function compile(
  article: ArticleMeta,
  lexique: readonly LexiqueLinkTarget[],
): Promise<MDXContent> {
  // Lien automatique des sigles vers le lexique (docs/06 §6) : première occurrence de chaque terme.
  const compiled = await evaluate(article.body, {
    ...runtime,
    remarkPlugins: [remarkGfm],
    rehypePlugins: [[rehypeLexique, { terms: lexique }]],
  });
  return compiled.default;
}

/** Tous les articles valides hors brouillon, compilés, du plus récent au plus ancien. */
export async function loadArticles(options: LoaderOptions = {}): Promise<LoadedArticle[]> {
  const warn = options.warn ?? defaultWarn;
  const lexique = options.lexique ?? (await lexiqueTerms(warn));
  const out: LoadedArticle[] = [];
  for (const article of await listArticleMetas({ dir: options.dir, warn })) {
    try {
      out.push({ ...article, Body: await compile(article, lexique) });
    } catch (error) {
      warn(
        `${article.file} : corps MDX qui ne compile pas (${error instanceof Error ? error.message : String(error)}) — article ignoré`,
      );
    }
  }
  return sortArticles(out);
}

let cache: Promise<LoadedArticle[]> | undefined;
let authorsCache: Promise<Author[]> | undefined;

export function listArticles(): Promise<LoadedArticle[]> {
  cache ??= loadArticles();
  return cache;
}

/** Articles construits : tous sauf les brouillons, en production comme ailleurs (D-033). */
export async function listBuildableArticles(): Promise<LoadedArticle[]> {
  return (await listArticles()).filter((article) => isArticleBuildable(article, isProduction()));
}

/** Articles publiés (plans de site, indexation). */
export async function listPublishedArticles(): Promise<LoadedArticle[]> {
  return (await listArticles()).filter((article) => article.meta.statut === "publie");
}

export async function getArticle(slug: string): Promise<LoadedArticle | null> {
  return (await listBuildableArticles()).find((article) => article.slug === slug) ?? null;
}

export function articlesOfRubrique<T extends ArticleMeta>(
  articles: readonly T[],
  rubrique: ArticleRubrique,
): T[] {
  return articles.filter((article) => article.meta.rubrique === rubrique);
}

/**
 * « À lire ensuite » (docs/06 §3) : les slugs explicites de `a_lire_ensuite` dans leur ordre,
 * puis la même rubrique, puis un pilier lié en commun ; trois au plus, jamais l'article lui-même,
 * seulement parmi les articles construits.
 */
export function relatedArticles<T extends ArticleMeta>(
  article: ArticleMeta,
  pool: readonly T[],
  max = 3,
): T[] {
  const out: T[] = [];
  const add = (candidate: T | undefined) => {
    if (!candidate || candidate.slug === article.slug || out.includes(candidate)) return;
    if (out.length < max) out.push(candidate);
  };
  for (const slug of article.meta.a_lire_ensuite ?? []) {
    add(pool.find((candidate) => candidate.slug === slug));
  }
  for (const candidate of pool) {
    if (candidate.meta.rubrique === article.meta.rubrique) add(candidate);
  }
  const piliers = new Set(article.meta.piliers_lies);
  for (const candidate of pool) {
    if (candidate.meta.piliers_lies.some((pilier) => piliers.has(pilier))) add(candidate);
  }
  return out;
}

/* ---------- Auteurs ---------- */

export function listBuildableAuthors(): Promise<Author[]> {
  authorsCache ??= listAuthors();
  return authorsCache;
}

export async function getAuthor(slug: string): Promise<Author | null> {
  return (await listBuildableAuthors()).find((author) => author.slug === slug) ?? null;
}

/** Fiche de l'auteur d'un article construit, s'il en a une. */
export async function articleAuthor(article: ArticleMeta): Promise<Author | null> {
  return authorOf(article, await listBuildableAuthors());
}

/* ---------- Pages du magazine ---------- */

export interface MagazinePage {
  /** Chemin interne avec barre finale. */
  chemin: string;
  /** Titre de la page (H1), pour l'image Open Graph et le plan du site. */
  titre: string;
  kind: "index" | "rubrique" | "article" | "auteur";
}

/**
 * Toutes les pages construites du magazine : index et sa pagination, les six rubriques et leur
 * pagination, les articles construits, les fiches auteurs. Les titres des pages d'index et de
 * rubrique sont fournis par l'appelant (content/pages/magazine.json).
 */
export async function listMagazinePages(titles: {
  index: string;
  rubriques: Record<ArticleRubrique, string>;
}): Promise<MagazinePage[]> {
  const articles = await listBuildableArticles();
  const pages: MagazinePage[] = [];
  for (let n = 1; n <= pageCount(articles.length); n += 1) {
    pages.push({ chemin: magazinePagePath(n), titre: titles.index, kind: "index" });
  }
  for (const rubrique of articleRubriques) {
    const count = articlesOfRubrique(articles, rubrique).length;
    for (let n = 1; n <= pageCount(count); n += 1) {
      pages.push({
        chemin: rubriquePagePath(rubrique, n),
        titre: titles.rubriques[rubrique] ?? rubriqueLabels[rubrique],
        kind: "rubrique",
      });
    }
  }
  for (const article of articles) {
    pages.push({ chemin: articlePath(article.slug), titre: article.meta.titre, kind: "article" });
  }
  for (const author of await listBuildableAuthors()) {
    pages.push({ chemin: authorPath(author.slug), titre: author.nom, kind: "auteur" });
  }
  return pages;
}

export { MAGAZINE_PATH, articlePath, rubriquePath, magazinePagePath, rubriquePagePath, authorPath };

/** Vide les caches (tests). */
export function resetArticles() {
  cache = undefined;
  authorsCache = undefined;
}
