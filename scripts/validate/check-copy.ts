import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import { result, type Check, type CheckContext, type CheckResult } from "./types";

/*
 * docs/07 §3 et §7, docs/01 §2 : aucun mot interdit dans les contenus, aucune phrase de plus de
 * 30 mots dans un chapô, aucun bouton « Envoyer », « En savoir plus » ou « Cliquez ici ».
 * Le contrôle lit tous les JSON de `content/`. Les mots entre guillemets « … » sont des
 * citations et ne comptent pas (docs/07 §3 : « patient » et « traitement » hors citations),
 * de même que les libellés de sources. Les clés qui commencent par `_` sont des notes
 * internes non rendues.
 */

/** Frontières de mot qui respectent les lettres accentuées (`\b` ne le fait pas). */
const word = (pattern: string) => new RegExp(`(?<!\\p{L})(?:${pattern})(?!\\p{L})`, "iu");

export const forbiddenWords: readonly { label: string; regex: RegExp }[] = [
  { label: "guérir / guérison", regex: word("guérir|guéri[es]*|guérisons?") },
  { label: "ralentir la maladie", regex: word("ralenti[rt]\\s+(?:la|sa|cette|leur)\\s+maladie") },
  { label: "traitement", regex: word("traitements?") },
  { label: "garanti", regex: word("garanti[es]*") },
  { label: "n°1", regex: /(?<!\p{L})(?:n\s?°\s?1|numéro\s+(?:1|un))(?![\p{L}\d])/iu },
  { label: "leader", regex: word("leaders?") },
  { label: "meilleur", regex: word("meilleure?s?") },
  { label: "unique en France", regex: word("uniques?\\s+en\\s+France") },
  { label: "patient", regex: word("patient(?:e|s|es)?") },
  { label: "placement / placer", regex: word("placements?|placer|placée?s?") },
];

/**
 * Formulations imposées par la loi (docs/07 §1) : elles contiennent un mot interdit et sont
 * retirées du texte avant contrôle.
 */
const legalPhrases: readonly string[] = ["contrat de placement de travailleurs"];

export const bannedLabels: readonly string[] = ["Envoyer", "En savoir plus", "Cliquez ici"];

export const MAX_WORDS_PER_SENTENCE = 30;

/** Retire les citations entre guillemets français et les formulations légales. */
export function stripQuotations(text: string): string {
  let out = text.replace(/«[^»]*»/g, " ");
  for (const phrase of legalPhrases) out = out.split(phrase).join(" ");
  return out;
}

export function findForbiddenWords(text: string): string[] {
  const cleaned = stripQuotations(text);
  return forbiddenWords.filter(({ regex }) => regex.test(cleaned)).map(({ label }) => label);
}

export function longSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?…])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.split(/\s+/).filter(Boolean).length > MAX_WORDS_PER_SENTENCE);
}

export function isBannedLabel(text: string): boolean {
  const normalized = text.trim().replace(/\s+/g, " ").toLowerCase();
  return (
    bannedLabels.some((label) => label.toLowerCase() === normalized) || /cliquez ici/i.test(text)
  );
}

export interface CopyHit {
  file: string;
  pointer: string;
  message: string;
}

function walk(value: unknown, pointer: string, onString: (text: string, pointer: string) => void) {
  if (typeof value === "string") {
    onString(value, pointer);
  } else if (Array.isArray(value)) {
    value.forEach((item, index) => walk(item, `${pointer}[${index}]`, onString));
  } else if (value && typeof value === "object") {
    for (const [key, item] of Object.entries(value)) {
      if (key.startsWith("_") || key === "sources") continue;
      walk(item, pointer ? `${pointer}.${key}` : key, onString);
    }
  }
}

function excerpt(text: string): string {
  return text.length > 90 ? `${text.slice(0, 87).trimEnd()}…` : text;
}

export function checkDocument(file: string, document: unknown): CopyHit[] {
  const hits: CopyHit[] = [];
  walk(document, "", (text, pointer) => {
    for (const label of findForbiddenWords(text)) {
      hits.push({ file, pointer, message: `mot interdit « ${label} » — ${excerpt(text)}` });
    }
    if (isBannedLabel(text)) {
      hits.push({ file, pointer, message: `libellé de bouton banni « ${text.trim()} »` });
    }
    if (/(^|\.)chapo$/.test(pointer)) {
      for (const sentence of longSentences(text)) {
        hits.push({
          file,
          pointer,
          message: `phrase de plus de ${MAX_WORDS_PER_SENTENCE} mots dans un chapô — ${excerpt(sentence)}`,
        });
      }
    }
  });
  return hits;
}

async function listContentFiles(dir: string): Promise<string[]> {
  const out: string[] = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await listContentFiles(full)));
    else if (entry.name.endsWith(".json") || entry.name.endsWith(".mdx")) out.push(full);
  }
  return out.sort();
}

/** Corps MDX : mots interdits, puis phrases de plus de 30 mots dans le premier paragraphe. */
export function checkMdxBody(file: string, body: string): CopyHit[] {
  const hits: CopyHit[] = [];
  const prose = body.replace(/^#+ .*$/gm, " ");
  for (const label of findForbiddenWords(prose)) {
    hits.push({ file, pointer: "corps", message: `mot interdit « ${label} »` });
  }
  return hits;
}

export async function scanContentDir(dir: string): Promise<string[]> {
  const errors: string[] = [];
  for (const file of await listContentFiles(dir)) {
    const relative = path.relative(dir, file).split(path.sep).join("/");
    const raw = await readFile(file, "utf8");
    const hits = file.endsWith(".mdx")
      ? (() => {
          const { data, content } = matter(raw);
          return [...checkDocument(relative, data), ...checkMdxBody(relative, content)];
        })()
      : checkDocument(relative, JSON.parse(raw) as unknown);
    for (const hit of hits) {
      errors.push(`${hit.file} › ${hit.pointer} : ${hit.message}`);
    }
  }
  return errors;
}

export async function runCopyCheck(ctx: CheckContext): Promise<CheckResult> {
  return result(await scanContentDir(path.join(ctx.rootDir, "content")));
}

export const checkCopy: Check = {
  id: "check-copy",
  description:
    "un mot interdit apparaît, une phrase dépasse 30 mots dans un chapô ou un bouton porte un libellé banni",
  run: runCopyCheck,
};
