/*
 * Lien automatique des sigles vers le lexique (docs/06 §6 : « chaque sigle rencontré dans le
 * site renvoie à sa page de lexique à sa première occurrence »). Greffon rehype : dans un arbre
 * HTML (hast, y compris les nœuds JSX du MDX), la première occurrence de chaque terme ou variante
 * devient un lien `<a href="/lexique/{slug}/" data-lexique="{slug}">`. Règles :
 *
 * - mot entier (frontières de lettres et de chiffres Unicode : « l'APA », « (APA) », « GIR 4 »
 *   sont reconnus, « AGGIR » ne contient pas « GIR ») ; les apostrophes droite et typographique
 *   et les espaces insécables sont équivalents ;
 * - un sigle (majuscules et chiffres seulement : « APA », « GIR ») se compare en respectant la
 *   casse (« apa » n'est pas lié) ; un mot ou une expression se compare sans tenir compte de la
 *   casse (« Auxiliaire de vie » est lié) ;
 * - une seule fois par terme et par arbre, à la première occurrence dans l'ordre du document ;
 *   quand plusieurs termes commencent au même endroit, le plus long l'emporte ;
 * - jamais dans un titre (h1 à h6), un lien existant, du code, un bouton, un script ou un
 *   attribut ; ni dans un composant JSX nommé comme eux (Button, Heading, Link) ;
 * - les termes viennent de content/lexique/*.json au moment de la compilation
 *   (src/content/lexique.ts › lexiqueLinkTargets) ; `exclude` retire un terme (la page qui le
 *   définit ne se lie pas elle-même) ; sans terme, l'arbre n'est pas touché.
 *
 * Aucune dépendance : les nœuds sont parcourus avec une forme minimale de hast (`LexiqueNode`).
 * Branchement : `rehypePlugins: [[rehypeLexique, { terms }]]` dans `evaluate` de @mdx-js/mdx
 * (src/content/services.ts pour les pages services, src/lib/mdx/compile-lexique.ts pour les
 * définitions ; à ajouter de la même façon aux articles du magazine).
 */

export interface LexiqueLinkTarget {
  slug: string;
  terme: string;
  variantes?: readonly string[];
}

export interface RehypeLexiqueOptions {
  terms: readonly LexiqueLinkTarget[];
  /** Slugs à ne pas lier (la page du terme lui-même). */
  exclude?: readonly string[];
  /** Préfixe des adresses, barre finale comprise. */
  basePath?: string;
}

/** Forme minimale d'un nœud hast ou MDX : tout est facultatif sauf `type`. */
export interface LexiqueNode {
  type: string;
  value?: string;
  tagName?: string;
  name?: string | null;
  properties?: Record<string, unknown>;
  children?: LexiqueNode[];
}

export const LEXIQUE_BASE_PATH = "/lexique/";

/** Éléments (et composants JSX, comparés sans la casse) dans lesquels on ne lie jamais. */
export const SKIPPED_ELEMENTS: ReadonlySet<string> = new Set([
  "a",
  "link",
  "button",
  "code",
  "pre",
  "kbd",
  "samp",
  "script",
  "style",
  "svg",
  "math",
  "textarea",
  "select",
  "option",
  "title",
  "heading",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
]);

/** Vrai pour un sigle : majuscules et chiffres seulement, deux caractères au moins. */
export function isSigle(value: string): boolean {
  return /^[\p{Lu}\p{N}]{2,}$/u.test(value);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Expression d'une graphie : mot entier, apostrophes et espaces tolérants. */
export function variantPattern(variant: string): RegExp {
  const body = escapeRegExp(variant.trim())
    .replace(/['’]/g, "['’]")
    .replace(/\s+/g, "[\\s\\u00a0]+");
  return new RegExp(
    `(?<![\\p{L}\\p{N}])(?:${body})(?![\\p{L}\\p{N}])`,
    isSigle(variant) ? "u" : "iu",
  );
}

export interface LexiquePattern {
  slug: string;
  regex: RegExp;
}

export function compilePatterns(
  terms: readonly LexiqueLinkTarget[],
  exclude: readonly string[] = [],
): LexiquePattern[] {
  const excluded = new Set(exclude);
  const patterns: LexiquePattern[] = [];
  for (const term of terms) {
    if (excluded.has(term.slug)) continue;
    for (const variant of [term.terme, ...(term.variantes ?? [])]) {
      if (variant.trim().length === 0) continue;
      patterns.push({ slug: term.slug, regex: variantPattern(variant) });
    }
  }
  return patterns;
}

interface FoundMatch {
  slug: string;
  index: number;
  length: number;
}

function earliestMatch(
  text: string,
  patterns: readonly LexiquePattern[],
  linked: ReadonlySet<string>,
): FoundMatch | null {
  let best: FoundMatch | null = null;
  for (const pattern of patterns) {
    if (linked.has(pattern.slug)) continue;
    const match = pattern.regex.exec(text);
    if (!match) continue;
    const found = { slug: pattern.slug, index: match.index, length: match[0].length };
    if (
      !best ||
      found.index < best.index ||
      (found.index === best.index && found.length > best.length)
    ) {
      best = found;
    }
  }
  return best;
}

function linkNode(text: string, slug: string, basePath: string): LexiqueNode {
  return {
    type: "element",
    tagName: "a",
    properties: { href: `${basePath}${slug}/`, dataLexique: slug },
    children: [{ type: "text", value: text }],
  };
}

/**
 * Remplace, dans un texte, la première occurrence de chaque terme non encore lié par un lien.
 * Renvoie `null` si rien n'a changé ; `linked` est enrichi des termes liés.
 */
export function linkText(
  value: string,
  patterns: readonly LexiquePattern[],
  linked: Set<string>,
  basePath: string = LEXIQUE_BASE_PATH,
): LexiqueNode[] | null {
  const out: LexiqueNode[] = [];
  let rest = value;
  let changed = false;
  while (rest.length > 0) {
    const found = earliestMatch(rest, patterns, linked);
    if (!found) break;
    const before = rest.slice(0, found.index);
    if (before.length > 0) out.push({ type: "text", value: before });
    out.push(linkNode(rest.slice(found.index, found.index + found.length), found.slug, basePath));
    linked.add(found.slug);
    changed = true;
    rest = rest.slice(found.index + found.length);
  }
  if (!changed) return null;
  if (rest.length > 0) out.push({ type: "text", value: rest });
  return out;
}

function isSkipped(node: LexiqueNode): boolean {
  const name = (node.tagName ?? node.name ?? "").toLowerCase();
  return name.length > 0 && SKIPPED_ELEMENTS.has(name);
}

interface WalkContext {
  patterns: readonly LexiquePattern[];
  linked: Set<string>;
  basePath: string;
}

function walk(node: LexiqueNode, ctx: WalkContext) {
  const children = node.children;
  if (!children) return;
  for (let index = 0; index < children.length; index += 1) {
    const child = children[index];
    if (!child) continue;
    if (child.type === "text") {
      if (typeof child.value !== "string" || child.value.trim().length === 0) continue;
      const replaced = linkText(child.value, ctx.patterns, ctx.linked, ctx.basePath);
      if (replaced) {
        children.splice(index, 1, ...replaced);
        index += replaced.length - 1;
      }
      continue;
    }
    if (isSkipped(child)) continue;
    walk(child, ctx);
  }
}

/** Greffon rehype : `rehypePlugins: [[rehypeLexique, { terms }]]`. */
export function rehypeLexique(options: RehypeLexiqueOptions): (tree: LexiqueNode) => void {
  const patterns = compilePatterns(options.terms, options.exclude ?? []);
  const basePath = options.basePath ?? LEXIQUE_BASE_PATH;
  return (tree) => {
    if (patterns.length === 0) return;
    walk(tree, { patterns, linked: new Set<string>(), basePath });
  };
}
