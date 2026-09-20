import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { result, type Check, type CheckContext, type CheckResult } from "./types";

/*
 * docs/07 §7 : le rendu ne doit contenir ni TODO, ni Lorem, ni `{{`, ni `[E…]` non résolu,
 * ni « null » / « undefined », ni champ à compléter. Le contrôle lit les pages HTML produites
 * par `next build` (.next/server/app/**\/*.html) et n'examine que le texte visible.
 */

const patterns: { label: string; regex: RegExp }[] = [
  { label: "TODO", regex: /\bTODO\b/ },
  { label: "Lorem ipsum", regex: /\blorem\b/i },
  { label: "gabarit non rendu « {{ »", regex: /\{\{/ },
  { label: "engagement non résolu « [E…] »", regex: /\[E\d+\]/ },
  { label: "jeton non remplacé « {…} »", regex: /\{[a-zA-Zéèêàçù_]+\}/ },
  { label: "« null »", regex: /(^|[^\w-])null(?![\w-])/ },
  { label: "« undefined »", regex: /(^|[^\w-])undefined(?![\w-])/ },
  { label: "champ à compléter", regex: /à compl[ée]ter|\bTBD\b|\bXXX\b/i },
];

const entities: Record<string, string> = {
  "&nbsp;": " ",
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&#x27;": "'",
};

/** Texte visible d'un document HTML : sans scripts, styles, gabarits ni commentaires. */
export function extractVisibleText(html: string): string {
  return html
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<(script|style|template|noscript)\b[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z#0-9]+;/gi, (m) => entities[m] ?? " ")
    .replace(/\s+/g, " ")
    .trim();
}

export interface PlaceholderHit {
  label: string;
  excerpt: string;
}

export function findPlaceholders(text: string): PlaceholderHit[] {
  const hits: PlaceholderHit[] = [];
  for (const { label, regex } of patterns) {
    const match = regex.exec(text);
    if (match) {
      const start = Math.max(0, match.index - 40);
      const excerpt = text.slice(start, match.index + match[0].length + 40).trim();
      hits.push({ label, excerpt: `…${excerpt}…` });
    }
  }
  return hits;
}

async function listHtmlFiles(dir: string): Promise<string[]> {
  const out: string[] = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...(await listHtmlFiles(full)));
    } else if (entry.name.endsWith(".html") && entry.name !== "_global-error.html") {
      out.push(full);
    }
  }
  return out.sort();
}

export async function scanHtmlDir(dir: string): Promise<string[]> {
  const errors: string[] = [];
  for (const file of await listHtmlFiles(dir)) {
    const text = extractVisibleText(await readFile(file, "utf8"));
    for (const hit of findPlaceholders(text)) {
      errors.push(`${path.relative(dir, file)} : ${hit.label} — ${hit.excerpt}`);
    }
  }
  return errors;
}

export async function runPlaceholdersCheck(ctx: CheckContext): Promise<CheckResult> {
  const outputDir = path.join(ctx.rootDir, ".next", "server", "app");
  try {
    await stat(outputDir);
  } catch {
    return result([
      "aucun rendu à contrôler : lancez `pnpm build` avant `pnpm validate` (.next/server/app absent).",
    ]);
  }
  return result(await scanHtmlDir(outputDir));
}

export const checkPlaceholders: Check = {
  id: "check-placeholders",
  description:
    "le rendu contient TODO, Lorem, {{, [E…] non résolu, null, undefined ou un champ à compléter",
  run: runPlaceholdersCheck,
};
