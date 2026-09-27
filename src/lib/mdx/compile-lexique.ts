import { evaluate } from "@mdx-js/mdx";
import type { MDXContent } from "mdx/types";
import * as runtime from "react/jsx-runtime";
import remarkGfm from "remark-gfm";
import { rehypeLexique, type LexiqueLinkTarget } from "./rehype-lexique";

/*
 * Compilation de l'explication d'un terme du lexique (Markdown minimal de
 * content/lexique/{slug}.json) en composant React, au build. Les autres termes du lexique y
 * sont liés à leur première occurrence ; le terme défini par la page ne se lie pas lui-même.
 * Séparé de src/content/lexique.ts pour que le chargeur reste lisible sans MDX (contrôles,
 * plans de site).
 */

const cache = new Map<string, Promise<MDXContent>>();

export function compileLexiqueBody(
  slug: string,
  markdown: string,
  targets: readonly LexiqueLinkTarget[],
): Promise<MDXContent> {
  const cached = cache.get(slug);
  if (cached) return cached;
  const compiled = evaluate(markdown, {
    ...runtime,
    remarkPlugins: [remarkGfm],
    rehypePlugins: [[rehypeLexique, { terms: targets, exclude: [slug] }]],
  }).then((module) => module.default);
  cache.set(slug, compiled);
  return compiled;
}

/** Vide le cache (tests). */
export function resetLexiqueBodies() {
  cache.clear();
}
