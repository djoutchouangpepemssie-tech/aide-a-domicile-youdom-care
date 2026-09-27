import path from "node:path";
import { evaluate } from "@mdx-js/mdx";
import type { MDXContent } from "mdx/types";
import * as runtime from "react/jsx-runtime";
import remarkGfm from "remark-gfm";
import { isProduction } from "@/lib/env";
import { rehypeLexique } from "@/lib/mdx/rehype-lexique";
import { lexiqueLinkTargets } from "./lexique";
import { listMdxFiles, readServiceMeta, SERVICES_DIR } from "./service-meta";
import type { ServicePage } from "./service-schema";

/*
 * Pages services et pathologies : un fichier content/services/**\/*.mdx par page, en-tête
 * validé par `servicePageSchema` (service-meta.ts), corps compilé en composant React au build
 * (rendu statique). En production, une page `a_relire` n'est pas construite (docs/03 §1).
 */

export interface LoadedServicePage {
  meta: ServicePage;
  /** Corps MDX compilé, null si le fichier n'a pas de corps. */
  Body: MDXContent | null;
  file: string;
}

let cache: Promise<LoadedServicePage[]> | undefined;

async function loadAll(): Promise<LoadedServicePage[]> {
  const files = await listMdxFiles(SERVICES_DIR);
  // Lien automatique des sigles vers le lexique (docs/06 §6) : première occurrence de chaque terme.
  const lexique = await lexiqueLinkTargets();
  const pages: LoadedServicePage[] = [];
  const seen = new Set<string>();
  for (const file of files) {
    const { meta, body } = await readServiceMeta(file);
    if (seen.has(meta.chemin))
      throw new Error(`content/services : chemin en double ${meta.chemin}`);
    seen.add(meta.chemin);
    let Body: MDXContent | null = null;
    if (body.trim().length > 0) {
      const compiled = await evaluate(body, {
        ...runtime,
        remarkPlugins: [remarkGfm],
        rehypePlugins: [[rehypeLexique, { terms: lexique }]],
      });
      Body = compiled.default;
    }
    pages.push({ meta, Body, file: path.relative(process.cwd(), file) });
  }
  return pages;
}

export function listServicePages(): Promise<LoadedServicePage[]> {
  cache ??= loadAll();
  return cache;
}

/** Pages construites : toutes en prévisualisation, seulement les pages relues en production. */
export async function listBuildableServicePages(): Promise<LoadedServicePage[]> {
  const pages = await listServicePages();
  return isProduction() ? pages.filter((p) => p.meta.statut === "publie") : pages;
}

export async function getServicePage(chemin: string): Promise<LoadedServicePage | null> {
  const pages = await listBuildableServicePages();
  return pages.find((p) => p.meta.chemin === chemin) ?? null;
}

/** Vide le cache (tests). */
export function resetServicePages() {
  cache = undefined;
}
