import { readFileSync } from "node:fs";
import path from "node:path";

/*
 * Crédits photographiques (docs/07 §2, P8.3) : la page /mentions-legales/ rend la liste des
 * auteurs et des licences de public/images/CREDITS.md, seule source de ces faits (D-024). Le
 * fichier est lu au build ; son tableau Markdown est analysé ligne à ligne, et la ligne
 * « Licences : … » donne l'adresse de chaque licence. Aucune valeur n'est complétée à la main :
 * une colonne vide reste absente de l'écran.
 */

export interface PhotoCredit {
  fichier: string;
  source: string;
  auteur: string;
  href: string;
  licence: string;
}

export interface CreditLicence {
  /** Nom de la plateforme (« Pexels », « Unsplash »). */
  source: string;
  href: string;
}

export interface CreditsByAuthor {
  auteur: string;
  source: string;
  licence: string;
  photos: { fichier: string; href: string }[];
}

export interface PhotoCredits {
  photos: PhotoCredit[];
  licences: CreditLicence[];
}

export const CREDITS_FILE = path.join("public", "images", "CREDITS.md");

/** Découpe une ligne de tableau Markdown en cellules nettoyées. */
function cells(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
}

const isUrl = (value: string) => /^https?:\/\//.test(value);

/** Analyse le contenu de CREDITS.md : tableau des photos et ligne des licences. */
export function parseCredits(markdown: string): PhotoCredits {
  const photos: PhotoCredit[] = [];
  let header: string[] | null = null;
  for (const line of markdown.split(/\r?\n/)) {
    if (!line.trim().startsWith("|")) {
      header = null;
      continue;
    }
    const row = cells(line);
    if (header === null) {
      header = row.map((cell) => cell.toLowerCase());
      continue;
    }
    if (row.every((cell) => /^:?-+:?$/.test(cell))) continue;
    const at = (name: string) => row[header?.indexOf(name) ?? -1] ?? "";
    const photo: PhotoCredit = {
      fichier: at("fichier"),
      source: at("source"),
      auteur: at("auteur"),
      href: at("adresse de la page"),
      licence: at("licence"),
    };
    if (photo.fichier && photo.auteur && photo.licence && isUrl(photo.href)) photos.push(photo);
  }

  const licences: CreditLicence[] = [];
  const licenceLine = /^Licences\s*:\s*(.+)$/m.exec(markdown)?.[1] ?? "";
  for (const part of licenceLine.split(";")) {
    // « Pexels — https://… ; Unsplash — https://…. Texte libre. » : l'adresse s'arrête au
    // premier blanc, sans la ponctuation finale ; ce qui suit est ignoré.
    const match = /^\s*([^—]+?)\s*—\s*(https?:\/\/\S+)/.exec(part);
    if (match?.[1] && match[2]) {
      licences.push({ source: match[1].trim(), href: match[2].replace(/[.,;]+$/, "") });
    }
  }
  return { photos, licences };
}

/** Regroupe les photos par auteur (ordre de première apparition), source et licence conservées. */
export function groupByAuthor(photos: readonly PhotoCredit[]): CreditsByAuthor[] {
  const groups = new Map<string, CreditsByAuthor>();
  for (const photo of photos) {
    const key = `${photo.auteur}|${photo.source}|${photo.licence}`;
    const group = groups.get(key) ?? {
      auteur: photo.auteur,
      source: photo.source,
      licence: photo.licence,
      photos: [],
    };
    group.photos.push({ fichier: photo.fichier, href: photo.href });
    groups.set(key, group);
  }
  return [...groups.values()].sort((a, b) => a.auteur.localeCompare(b.auteur, "fr"));
}

let cached: PhotoCredits | undefined;

/** Crédits du dépôt (public/images/CREDITS.md), lus une fois par processus. */
export function getPhotoCredits(rootDir = process.cwd()): PhotoCredits {
  cached ??= parseCredits(readFileSync(path.join(rootDir, CREDITS_FILE), "utf8"));
  return cached;
}
