/*
 * Texte des pages locales (docs/04 §4, seuils bloquants) : fonctions pures partagées par
 * `check-local-facts` (mots de la zone éditoriale) et `check-local-uniqueness` (similarité de
 * Jaccard sur les séquences de 5 mots). Aucune lecture de fichier ici.
 *
 * Règles :
 * - `markdownToText` retire les titres (lignes `#`), les images, les URL des liens (le texte de
 *   l'ancre est conservé : c'est de la prose), les liens automatiques et URL nues, les marques
 *   d'emphase, de liste, de citation et de tableau, les balises HTML.
 * - `countWords` compte les suites de lettres ou de chiffres ; apostrophes et traits d'union
 *   internes n'y coupent pas un mot (« l'aide-ménagère » = 1 mot) ; un nombre écrit avec des
 *   espaces de milliers (« 12 345 ») = 1 mot ; « % » et la ponctuation ne comptent pas.
 * - `normalizeTokens` : minuscules, sans accents, sans ponctuation (toute suite de caractères
 *   qui n'est ni lettre ni chiffre sépare deux jetons ; « l'aide » donne « l », « aide »).
 * - `wordShingles` : séquences de n jetons consécutifs (n = 5 par défaut) ; un texte de moins
 *   de n jetons n'a aucune séquence, sa similarité avec tout autre texte vaut 0.
 * - `jaccard` : |A ∩ B| / |A ∪ B| ; 0 si les deux ensembles sont vides.
 */

export const SHINGLE_SIZE = 5;

/** Retire les diacritiques (« é » → « e ») après décomposition Unicode. */
export function stripDiacritics(text: string): string {
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

/** Markdown → texte brut, sans titres ni liens (voir l'en-tête du fichier). */
export function markdownToText(markdown: string): string {
  return (
    markdown
      .replace(/\r\n?/g, "\n")
      // Blocs de code et code en ligne : le contenu n'est pas de la prose.
      .replace(/```[\s\S]*?```/g, " ")
      .replace(/`[^`\n]*`/g, " ")
      // Titres : la ligne entière est retirée.
      .replace(/^[ \t]{0,3}#{1,6}[ \t].*$/gm, " ")
      // Titres soulignés (« === » ou « --- » sous une ligne) : ligne et soulignement retirés.
      .replace(/^[^\n]+\n[ \t]{0,3}(?:=+|-+)[ \t]*$/gm, " ")
      // Images : retirées entièrement (le texte alternatif n'est pas de la prose).
      .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
      // Liens : on garde le texte de l'ancre, on retire l'adresse et le titre éventuel.
      .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
      .replace(/\[([^\]]*)\]\[[^\]]*\]/g, "$1")
      // Définitions de liens de référence, liens automatiques et URL nues.
      .replace(/^[ \t]{0,3}\[[^\]]+\]:[ \t]*\S+.*$/gm, " ")
      .replace(/<https?:\/\/[^>\s]+>/g, " ")
      .replace(/https?:\/\/\S+/g, " ")
      // Balises HTML éventuelles.
      .replace(/<[^>\n]+>/g, " ")
      // Filets, marques de liste, de citation et de tableau.
      .replace(/^[ \t]{0,3}(?:[-*_][ \t]*){3,}$/gm, " ")
      .replace(/^[ \t]*(?:[-*+]|\d+[.)])[ \t]+/gm, "")
      .replace(/^[ \t]*>+[ \t]?/gm, "")
      .replace(/^[ \t]*\|?[ \t]*:?-{2,}:?[ \t]*(?:\|[ \t]*:?-{2,}:?[ \t]*)*\|?[ \t]*$/gm, " ")
      .replace(/\|/g, " ")
      // Emphase : les marques seules, pas le texte.
      .replace(/(\*{1,3}|_{1,3})(?=\S)([\s\S]*?\S)\1/g, "$2")
      .replace(/~~(?=\S)([\s\S]*?\S)~~/g, "$1")
      .replace(/\\([\\`*_{}[\]()#+\-.!])/g, "$1")
      .replace(/[ \t\u00a0\u202f]+/g, " ")
      .replace(/\s*\n\s*/g, "\n")
      .trim()
  );
}

/** Un mot : lettres ou chiffres, liés par apostrophe, trait d'union ou séparateur décimal (« 27,3 »). */
const wordPattern = /[\p{L}\p{N}]+(?:['’\-][\p{L}\p{N}]+|[,.](?=\p{N})\p{N}+)*/gu;

/** Nombre de mots d'un texte brut (voir l'en-tête pour la définition d'un mot). */
export function countWords(text: string): number {
  const joined = text.replace(/(\d)[ \u00a0\u202f](?=\d{3}\b)/g, "$1");
  return joined.match(wordPattern)?.length ?? 0;
}

/** Jetons normalisés : minuscules, sans accents, sans ponctuation. */
export function normalizeTokens(text: string): string[] {
  return stripDiacritics(text.toLowerCase())
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 0);
}

/** Séquences de `size` jetons consécutifs, chacune sous la forme « a b c d e ». */
export function wordShingles(text: string, size = SHINGLE_SIZE): Set<string> {
  const tokens = normalizeTokens(text);
  const shingles = new Set<string>();
  for (let i = 0; i + size <= tokens.length; i += 1) {
    shingles.add(tokens.slice(i, i + size).join(" "));
  }
  return shingles;
}

/** Indice de Jaccard entre deux ensembles ; 0 si les deux sont vides. */
export function jaccard(a: ReadonlySet<string>, b: ReadonlySet<string>): number {
  if (a.size === 0 && b.size === 0) return 0;
  let intersection = 0;
  for (const item of a) if (b.has(item)) intersection += 1;
  return intersection / (a.size + b.size - intersection);
}

/** Similarité de Jaccard sur les séquences de `size` mots entre deux textes. */
export function shingleSimilarity(a: string, b: string, size = SHINGLE_SIZE): number {
  return jaccard(wordShingles(a, size), wordShingles(b, size));
}

/** Clé d'unicité d'un texte court (sous-titre, description, question) : jetons normalisés. */
export function uniquenessKey(text: string): string {
  return normalizeTokens(text).join(" ");
}
