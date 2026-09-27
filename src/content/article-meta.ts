import type { Dirent } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import { z } from "zod";
import {
  articleFrontmatterSchema,
  articleMdxComponents,
  articleRubriques,
  authorSchema,
  revisionMonths,
  type ArticleFrontmatter,
  type ArticleRubrique,
  type Author,
} from "./article-schema";

/*
 * Magazine « Le Fil » (docs/06) : lecture des en-têtes des articles (content/magazine/{slug}.mdx)
 * et des fiches auteurs (content/auteurs/{slug}.json) sans compiler le corps MDX. Utilisé par le
 * chargeur (articles.ts), les plans de site et les contrôles (`pnpm validate`, exécutés hors
 * de Next). Un fichier invalide ne fait jamais échouer le build : `listArticleMetas` le signale
 * par un avertissement et l'ignore ; c'est check-content qui le compte comme une erreur.
 *
 * Adresses (docs/06 §2) : /magazine/ (index, puis /magazine/page/{n}/), /magazine/categorie/
 * {rubrique}/ (puis …/page/{n}/), /magazine/{slug}/ (article), /magazine/auteurs/{slug}/.
 */

export const ARTICLES_DIR = path.join(process.cwd(), "content", "magazine");
export const AUTHORS_DIR = path.join(process.cwd(), "content", "auteurs");

export const MAGAZINE_PATH = "/magazine/";
export const ARTICLES_PER_PAGE = 12;

/** Segments réservés sous /magazine/ : un article ne peut pas porter ces slugs. */
export const RESERVED_SLUGS: readonly string[] = ["page", "categorie", "auteurs"];

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function articlePath(slug: string): string {
  return `${MAGAZINE_PATH}${slug}/`;
}

export function rubriquePath(rubrique: ArticleRubrique): string {
  return `${MAGAZINE_PATH}categorie/${rubrique}/`;
}

export function authorPath(slug: string): string {
  return `${MAGAZINE_PATH}auteurs/${slug}/`;
}

/** Page `n` de l'index : la première est /magazine/, les suivantes /magazine/page/{n}/. */
export function magazinePagePath(n: number): string {
  return n <= 1 ? MAGAZINE_PATH : `${MAGAZINE_PATH}page/${n}/`;
}

export function rubriquePagePath(rubrique: ArticleRubrique, n: number): string {
  const base = rubriquePath(rubrique);
  return n <= 1 ? base : `${base}page/${n}/`;
}

export function pageCount(total: number): number {
  return Math.max(1, Math.ceil(total / ARTICLES_PER_PAGE));
}

/** Tranche de la page `n` (à partir de 1). */
export function paginate<T>(items: readonly T[], n: number): T[] {
  const start = (Math.max(1, n) - 1) * ARTICLES_PER_PAGE;
  return items.slice(start, start + ARTICLES_PER_PAGE);
}

export function parseRubrique(value: string): ArticleRubrique | null {
  return (articleRubriques as readonly string[]).includes(value)
    ? (value as ArticleRubrique)
    : null;
}

/** Numéro de page d'un segment /page/{n}/ : entier à partir de 2, sinon null. */
export function parsePageNumber(value: string): number | null {
  if (!/^\d+$/.test(value)) return null;
  const n = Number(value);
  return n >= 2 ? n : null;
}

/* ---------- Corps : sommaire, temps de lecture ---------- */

export interface ArticleHeading {
  id: string;
  text: string;
}

/** Ancre d'un intertitre : minuscules sans accents, tirets (« Que change la maladie ? » → « que-change-la-maladie »). */
export function slugifyHeading(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Texte brut d'un intertitre Markdown : sans emphase, code ni lien. */
export function headingText(markdown: string): string {
  return markdown
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[*_`~]+/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Les intertitres `##` du corps, hors blocs de code, avec des ancres uniques. */
export function extractHeadings(body: string): ArticleHeading[] {
  const headings: ArticleHeading[] = [];
  const seen = new Map<string, number>();
  let inFence = false;
  for (const line of body.split(/\r?\n/)) {
    if (/^\s*(```|~~~)/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    const match = /^##\s+(.+?)\s*#*\s*$/.exec(line);
    if (!match?.[1]) continue;
    const text = headingText(match[1]);
    if (text.length === 0) continue;
    const base = slugifyHeading(text) || "section";
    const count = seen.get(base) ?? 0;
    seen.set(base, count + 1);
    headings.push({ id: count === 0 ? base : `${base}-${count + 1}`, text });
  }
  return headings;
}

/** Nombre de mots du corps : sans balises JSX, sans syntaxe Markdown. */
export function countWords(body: string): number {
  const prose = body
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[#>*_`|~-]+/g, " ");
  return prose.split(/\s+/).filter((word) => /\p{L}|\p{N}/u.test(word)).length;
}

/** Temps de lecture en minutes : 200 mots par minute, une minute au moins. */
export function readingMinutes(words: number): number {
  return Math.max(1, Math.round(words / 200));
}

/** Composants JSX utilisés dans le corps qui ne sont pas autorisés (docs/06 §3). */
export function unknownComponents(body: string): string[] {
  const allowed = new Set<string>(articleMdxComponents);
  const found = new Set<string>();
  const withoutFences = body.replace(/```[\s\S]*?```/g, " ");
  for (const match of withoutFences.matchAll(/<([A-Z][A-Za-z0-9.]*)[\s/>]/g)) {
    const name = match[1];
    if (name && !allowed.has(name)) found.add(name);
  }
  return [...found].sort();
}

/* ---------- Dates ---------- */

/** Ajoute des mois à une date AAAA-MM-JJ (fin de mois ramenée au dernier jour valide). */
export function addMonths(iso: string, months: number): string {
  const [y = 0, m = 0, d = 0] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1 + months, 1));
  const lastDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
  date.setUTCDate(Math.min(d, lastDay));
  return date.toISOString().slice(0, 10);
}

/** Date de révision prévue : `revision_le`, sinon `maj_le` + délai de la rubrique (docs/06 §4). */
export function revisionDate(
  meta: Pick<ArticleFrontmatter, "revision_le" | "maj_le" | "rubrique">,
): string {
  return meta.revision_le ?? addMonths(meta.maj_le, revisionMonths(meta.rubrique));
}

/* ---------- Lecture des fichiers ---------- */

export interface ArticleMeta {
  slug: string;
  /** Chemin de la page : /magazine/{slug}/. */
  chemin: string;
  meta: ArticleFrontmatter;
  /** Corps MDX brut. */
  body: string;
  /** Chemin du fichier relatif au dépôt. */
  file: string;
  /** Date de révision prévue (AAAA-MM-JJ). */
  revision: string;
  words: number;
  readingMinutes: number;
  headings: ArticleHeading[];
}

export type ArticleWarn = (message: string) => void;

const defaultWarn: ArticleWarn = (message) => {
  console.warn(`content/magazine : ${message}`);
};

async function listFiles(dir: string, extension: string): Promise<string[]> {
  let entries: Dirent[];
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(extension))
    .map((entry) => path.join(dir, entry.name))
    .sort();
}

/** Fichiers content/magazine/*.mdx (un niveau, triés). */
export function listArticleFiles(dir = ARTICLES_DIR): Promise<string[]> {
  return listFiles(dir, ".mdx");
}

export function slugOf(file: string): string {
  return path.basename(file).replace(/\.(mdx|json)$/, "");
}

function relative(file: string): string {
  return path.relative(process.cwd(), file).split(path.sep).join("/");
}

/** En-tête validé, corps brut et mesures ; lève une erreur lisible si le fichier est invalide. */
export async function readArticleMeta(file: string): Promise<ArticleMeta> {
  const where = relative(file);
  const slug = slugOf(file);
  if (!SLUG.test(slug)) {
    throw new Error(`${where} : nom de fichier invalide (minuscules, chiffres et tirets attendus)`);
  }
  if (RESERVED_SLUGS.includes(slug)) {
    throw new Error(`${where} : le slug « ${slug} » est réservé aux adresses du magazine`);
  }
  const raw = await readFile(file, "utf8");
  let parsed: ReturnType<typeof matter>;
  try {
    parsed = matter(raw);
  } catch (error) {
    throw new Error(
      `${where} : en-tête illisible (${error instanceof Error ? error.message : String(error)})`,
    );
  }
  const result = articleFrontmatterSchema.safeParse(parsed.data);
  if (!result.success) {
    throw new Error(`${where} : en-tête invalide\n${z.prettifyError(result.error)}`);
  }
  const body = parsed.content;
  if (body.trim().length === 0) throw new Error(`${where} : corps vide`);
  const unknown = unknownComponents(body);
  if (unknown.length > 0) {
    throw new Error(
      `${where} : composant(s) non autorisé(s) dans le corps : ${unknown.join(", ")} (autorisés : ${articleMdxComponents.join(", ")})`,
    );
  }
  const meta = result.data;
  if (meta.a_lire_ensuite?.includes(slug)) {
    throw new Error(`${where} : a_lire_ensuite renvoie vers l'article lui-même`);
  }
  const words = countWords(body);
  return {
    slug,
    chemin: articlePath(slug),
    meta,
    body,
    file: where,
    revision: revisionDate(meta),
    words,
    readingMinutes: readingMinutes(words),
    headings: extractHeadings(body),
  };
}

export interface ListArticlesOptions {
  dir?: string;
  warn?: ArticleWarn;
  /** Garder les brouillons (contrôles) ; par défaut ils sont écartés. */
  drafts?: boolean;
}

/**
 * En-têtes des articles valides. Un fichier invalide est signalé (`warn`) et ignoré ; un
 * brouillon (`statut: brouillon`) n'est jamais construit et n'est pas renvoyé sauf `drafts`.
 * Tri : date de publication décroissante, puis mise à jour décroissante, puis slug.
 */
export async function listArticleMetas(options: ListArticlesOptions = {}): Promise<ArticleMeta[]> {
  const warn = options.warn ?? defaultWarn;
  const out: ArticleMeta[] = [];
  for (const file of await listArticleFiles(options.dir)) {
    try {
      const article = await readArticleMeta(file);
      if (article.meta.statut === "brouillon" && !options.drafts) continue;
      out.push(article);
    } catch (error) {
      warn(`${error instanceof Error ? error.message : String(error)} — article ignoré`);
    }
  }
  return sortArticles(out);
}

export function sortArticles<T extends ArticleMeta>(articles: readonly T[]): T[] {
  return [...articles].sort(
    (a, b) =>
      b.meta.publie_le.localeCompare(a.meta.publie_le) ||
      b.meta.maj_le.localeCompare(a.meta.maj_le) ||
      a.slug.localeCompare(b.slug),
  );
}

/** Construit : tout hors brouillon en prévisualisation, seulement `publie` en production. */
export function isArticleBuildable(article: ArticleMeta, _production: boolean): boolean {
  // D-033 : un brouillon n'est jamais construit ; un article `a_relire` l'est partout, en
  // `noindex`, avec son bandeau, et hors des plans de site et de `/llms.txt`.
  return article.meta.statut !== "brouillon";
}

/* ---------- Auteurs ---------- */

export function listAuthorFiles(dir = AUTHORS_DIR): Promise<string[]> {
  return listFiles(dir, ".json");
}

/** Fiche auteur validée ; le slug du fichier doit être celui de la fiche. */
export async function readAuthor(file: string): Promise<Author> {
  const where = relative(file);
  const raw = await readFile(file, "utf8");
  let data: unknown;
  try {
    data = JSON.parse(raw) as unknown;
  } catch (error) {
    throw new Error(
      `${where} : JSON illisible (${error instanceof Error ? error.message : String(error)})`,
    );
  }
  const result = authorSchema.safeParse(data);
  if (!result.success) {
    throw new Error(`${where} : fiche auteur invalide\n${z.prettifyError(result.error)}`);
  }
  if (result.data.slug !== slugOf(file)) {
    throw new Error(
      `${where} : le champ slug vaut « ${result.data.slug} », le fichier s'appelle « ${slugOf(file)} »`,
    );
  }
  return result.data;
}

/** Fiches auteurs valides de content/auteurs/ (aucune tant qu'Arcel n'en a pas fourni). */
export async function listAuthors(
  dir = AUTHORS_DIR,
  warn: ArticleWarn = defaultWarn,
): Promise<Author[]> {
  const out: Author[] = [];
  for (const file of await listAuthorFiles(dir)) {
    try {
      out.push(await readAuthor(file));
    } catch (error) {
      warn(`${error instanceof Error ? error.message : String(error)} — fiche ignorée`);
    }
  }
  return out.sort((a, b) => a.nom.localeCompare(b.nom, "fr"));
}

/** Fiche de l'auteur d'un article, par son nom exact ; null pour l'équipe éditoriale. */
export function authorOf(article: ArticleMeta, authors: readonly Author[]): Author | null {
  return authors.find((author) => author.nom === article.meta.auteur.nom) ?? null;
}
