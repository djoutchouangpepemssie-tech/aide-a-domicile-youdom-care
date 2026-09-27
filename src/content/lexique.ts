import type { Dirent } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import type { LexiqueLinkTarget } from "@/lib/mdx/rehype-lexique";
import { lexiqueTermSchema, type LexiqueTerm } from "./lexique-schema";

/*
 * Chargeur du lexique (docs/06 §6, P7.2) : un fichier content/lexique/{slug}.json par terme,
 * validé par `lexiqueTermSchema` à la première lecture (une erreur interrompt le build et
 * `check-content`). Le nom du fichier est le slug ; deux termes ne partagent jamais une graphie
 * (terme ou variante), sinon le lien automatique ne saurait où mener. Les termes sont triés
 * dans l'ordre alphabétique français (sans distinguer accents ni casse).
 *
 * Ce module ne compile pas le Markdown : il reste lisible par les contrôles et les plans de site
 * (Node, sans MDX). Le corps rendu vient de src/lib/mdx/compile-lexique.ts.
 */

export const LEXIQUE_DIR = path.join(process.cwd(), "content", "lexique");
export const LEXIQUE_PATH = "/lexique/";

export function lexiqueTermPath(slug: string): string {
  return `${LEXIQUE_PATH}${slug}/`;
}

export const lexiqueCollator = new Intl.Collator("fr", { sensitivity: "base" });

export function sortLexiqueTerms(terms: readonly LexiqueTerm[]): LexiqueTerm[] {
  return [...terms].sort((a, b) => lexiqueCollator.compare(a.terme, b.terme));
}

export async function listLexiqueFiles(dir: string = LEXIQUE_DIR): Promise<string[]> {
  let entries: Dirent[];
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  return entries
    .filter(
      (entry) => entry.isFile() && entry.name.endsWith(".json") && !entry.name.startsWith("_"),
    )
    .map((entry) => path.join(dir, entry.name))
    .sort();
}

/** Lit et valide un terme ; le slug doit être le nom du fichier. Erreur lisible sinon. */
export async function readLexiqueTerm(file: string): Promise<LexiqueTerm> {
  const relative = path.relative(process.cwd(), file).split(path.sep).join("/");
  const raw = await readFile(file, "utf8");
  let data: unknown;
  try {
    data = JSON.parse(raw) as unknown;
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(`${relative} : JSON invalide (${reason})`);
  }
  const result = lexiqueTermSchema.safeParse(data);
  if (!result.success) {
    throw new Error(`${relative} est invalide :\n${z.prettifyError(result.error)}`);
  }
  const expected = path.basename(file, ".json");
  if (result.data.slug !== expected) {
    throw new Error(
      `${relative} : le champ slug vaut « ${result.data.slug} », attendu « ${expected} »`,
    );
  }
  return result.data;
}

/** Graphies (terme et variantes) partagées par deux termes : le lien automatique serait ambigu. */
export function findSharedSpellings(terms: readonly LexiqueTerm[]): string[] {
  const owners = new Map<string, string>();
  const conflicts: string[] = [];
  for (const term of terms) {
    for (const spelling of [term.terme, ...(term.variantes ?? [])]) {
      const key = spelling.trim().toLowerCase();
      const owner = owners.get(key);
      if (owner && owner !== term.slug) {
        conflicts.push(`« ${spelling} » (${owner} et ${term.slug})`);
      } else {
        owners.set(key, term.slug);
      }
    }
  }
  return conflicts;
}

let cache: Promise<LexiqueTerm[]> | undefined;

async function loadAll(): Promise<LexiqueTerm[]> {
  const files = await listLexiqueFiles();
  const terms = await Promise.all(files.map((file) => readLexiqueTerm(file)));
  const shared = findSharedSpellings(terms);
  if (shared.length > 0) {
    throw new Error(`content/lexique : graphie partagée par deux termes : ${shared.join(", ")}`);
  }
  return sortLexiqueTerms(terms);
}

/** Tous les termes, triés ; lus une fois par processus. */
export function listLexiqueTerms(): Promise<LexiqueTerm[]> {
  cache ??= loadAll();
  return cache;
}

export async function getLexiqueTerm(slug: string): Promise<LexiqueTerm | null> {
  const terms = await listLexiqueTerms();
  return terms.find((term) => term.slug === slug) ?? null;
}

/** Ce que le greffon rehype lit d'un terme. */
export function toLinkTargets(terms: readonly LexiqueTerm[]): LexiqueLinkTarget[] {
  return terms.map((term) => ({
    slug: term.slug,
    terme: term.terme,
    ...(term.variantes ? { variantes: term.variantes } : {}),
  }));
}

export async function lexiqueLinkTargets(): Promise<LexiqueLinkTarget[]> {
  return toLinkTargets(await listLexiqueTerms());
}

/** Lettre de classement d'un terme : initiale sans accent, en capitale ; « # » hors alphabet. */
export function lexiqueLetter(terme: string): string {
  const first = terme.trim().normalize("NFD").replace(/[̀-ͯ]/g, "").charAt(0).toUpperCase();
  return /^[A-Z]$/.test(first) ? first : "#";
}

export interface LexiqueLetterGroup {
  lettre: string;
  termes: LexiqueTerm[];
}

/** Termes groupés par lettre, dans l'ordre alphabétique ; seules les lettres non vides. */
export function groupLexiqueByLetter(terms: readonly LexiqueTerm[]): LexiqueLetterGroup[] {
  const groups = new Map<string, LexiqueTerm[]>();
  for (const term of sortLexiqueTerms(terms)) {
    const lettre = lexiqueLetter(term.terme);
    const bucket = groups.get(lettre);
    if (bucket) bucket.push(term);
    else groups.set(lettre, [term]);
  }
  return [...groups.entries()].map(([lettre, termes]) => ({ lettre, termes }));
}

export const NEIGHBOUR_COUNT = 4;

/**
 * Termes voisins d'un terme : d'abord ceux qui partagent le plus de pages liées (même sujet),
 * à égalité dans l'ordre alphabétique, puis les voisins alphabétiques les plus proches, jusqu'à
 * `count`.
 */
export function neighbourTerms(
  terms: readonly LexiqueTerm[],
  current: LexiqueTerm,
  count: number = NEIGHBOUR_COUNT,
): LexiqueTerm[] {
  const sorted = sortLexiqueTerms(terms).filter((term) => term.slug !== current.slug);
  const shared = (term: LexiqueTerm) =>
    term.pages_liees.filter((page) => current.pages_liees.includes(page)).length;
  const picked = sorted
    .filter((term) => shared(term) > 0)
    .sort((a, b) => shared(b) - shared(a))
    .slice(0, count);
  const chosen = new Set(picked.map((term) => term.slug));
  const position = sortLexiqueTerms(terms).findIndex((term) => term.slug === current.slug);
  const all = sortLexiqueTerms(terms);
  for (let distance = 1; picked.length < count; distance += 1) {
    const after = all[position + distance];
    const before = all[position - distance];
    if (!after && !before) break;
    for (const candidate of [after, before]) {
      if (candidate && !chosen.has(candidate.slug) && candidate.slug !== current.slug) {
        if (picked.length >= count) break;
        picked.push(candidate);
        chosen.add(candidate.slug);
      }
    }
  }
  return picked;
}

/** Date la plus récente des termes (les dates ISO se comparent comme des chaînes). */
export function latestLexiqueMaj(terms: readonly LexiqueTerm[]): string | undefined {
  let latest: string | undefined;
  for (const term of terms) {
    if (latest === undefined || term.maj > latest) latest = term.maj;
  }
  return latest;
}

/** Vide le cache (tests). */
export function resetLexique() {
  cache = undefined;
}
