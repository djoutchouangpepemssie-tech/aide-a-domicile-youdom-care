import type { Dirent } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import { z } from "zod";
import { servicePageSchema, type ServicePage } from "./service-schema";

/*
 * Lecture des en-têtes des pages services (content/services/**\/*.mdx) sans compiler le corps :
 * utilisée par les contrôles (`pnpm validate`, exécutés en CommonJS) et par le chargeur.
 */

export const SERVICES_DIR = path.join(process.cwd(), "content", "services");

export async function listMdxFiles(dir: string): Promise<string[]> {
  let entries: Dirent[];
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  const out: string[] = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await listMdxFiles(full)));
    else if (entry.name.endsWith(".mdx")) out.push(full);
  }
  return out.sort();
}

/** En-tête validé et corps brut ; lève une erreur lisible si l'en-tête est invalide. */
export async function readServiceMeta(file: string): Promise<{ meta: ServicePage; body: string }> {
  const raw = await readFile(file, "utf8");
  const { data, content } = matter(raw);
  const result = servicePageSchema.safeParse(data);
  if (!result.success) {
    throw new Error(
      `${path.relative(process.cwd(), file)} : en-tête invalide\n${z.prettifyError(result.error)}`,
    );
  }
  return { meta: result.data, body: content };
}
