import type { SourceCache } from "./cache";
import { readZipFile } from "./zip";

/*
 * Insee, base communale « Évolution et structure de la population » (docs/04 §5), recensement
 * de la population. Variables lues : P{aa}_POP, P{aa}_POP6074, P{aa}_POP7589, P{aa}_POP90P.
 * Les valeurs sont des estimations pondérées (décimales) : la population est arrondie à l'unité,
 * les parts sont exprimées en pourcentage à une décimale.
 *
 * Millésime : 2022 (page 8581696, parue en 2025). Le millésime 2023 (résultats par zone parus le
 * 8 juillet 2026, pages « zones/8999141 ») n'avait pas de base communale téléchargeable au
 * 2026-09-20 ; mettre à jour INSEE_BASE quand elle paraît.
 */

export const INSEE_BASE = {
  millesime: "2022",
  pageUrl: "https://www.insee.fr/fr/statistiques/8581696",
  fileUrl: "https://www.insee.fr/fr/statistiques/fichier/8581696/base-cc-evol-struct-pop-2022_csv.zip",
  licence: "Licence Ouverte / Open Licence 2.0 (Etalab)",
  id: "insee-base-cc-evol-struct-pop-2022",
} as const;

export interface AgeCounts {
  population: number;
  pop_60_74: number;
  pop_75_89: number;
  pop_90_plus: number;
}

export interface AgeShares {
  population: number;
  part_60_74: number;
  part_75_89: number;
  part_90_plus: number;
  part_75_plus: number;
}

function pct(part: number, total: number): number {
  return total > 0 ? Math.round((part / total) * 1000) / 10 : 0;
}

export function computeShares(counts: AgeCounts): AgeShares {
  const total = counts.population;
  return {
    population: Math.round(total),
    part_60_74: pct(counts.pop_60_74, total),
    part_75_89: pct(counts.pop_75_89, total),
    part_90_plus: pct(counts.pop_90_plus, total),
    part_75_plus: pct(counts.pop_75_89 + counts.pop_90_plus, total),
  };
}

export function sumCounts(list: readonly AgeCounts[]): AgeCounts {
  const total: AgeCounts = { population: 0, pop_60_74: 0, pop_75_89: 0, pop_90_plus: 0 };
  for (const c of list) {
    total.population += c.population;
    total.pop_60_74 += c.pop_60_74;
    total.pop_75_89 += c.pop_75_89;
    total.pop_90_plus += c.pop_90_plus;
  }
  return total;
}

/**
 * Lit le CSV (séparateur « ; », en-tête P{aa}_… ) et ne garde que les codes demandés.
 * `keep(code)` évite de conserver les 35 000 lignes nationales.
 */
export function parseInseeCsv(
  csv: string,
  millesime: string,
  keep: (code: string) => boolean,
): Map<string, AgeCounts> {
  const yy = millesime.slice(2);
  const lines = csv.split("\n");
  const header = (lines[0] ?? "").replace(/^﻿/, "").trim().split(";");
  const col = (name: string) => {
    const index = header.indexOf(name);
    if (index < 0) throw new Error(`base Insee : colonne ${name} absente`);
    return index;
  };
  if (col("CODGEO") !== 0) throw new Error("base Insee : CODGEO doit être la première colonne");
  const iPop = col(`P${yy}_POP`);
  const i6074 = col(`P${yy}_POP6074`);
  const i7589 = col(`P${yy}_POP7589`);
  const i90 = col(`P${yy}_POP90P`);
  const result = new Map<string, AgeCounts>();
  for (let n = 1; n < lines.length; n++) {
    const line = lines[n] ?? "";
    const sep = line.indexOf(";");
    if (sep <= 0) continue;
    const code = line.slice(0, sep);
    if (!keep(code)) continue;
    const fields = line.trim().split(";");
    const num = (i: number) => Number((fields[i] ?? "0").replace(",", "."));
    result.set(code, {
      population: num(iPop),
      pop_60_74: num(i6074),
      pop_75_89: num(i7589),
      pop_90_plus: num(i90),
    });
  }
  return result;
}

export interface InseeData {
  millesime: string;
  source_url: string;
  collected_at: string;
  counts: Map<string, AgeCounts>;
}

export async function loadInsee(
  cache: SourceCache,
  keep: (code: string) => boolean,
): Promise<InseeData | null> {
  const file = await cache.tryFetch({
    id: INSEE_BASE.id,
    label: `Insee — Évolution et structure de la population ${INSEE_BASE.millesime} (base communale)`,
    url: INSEE_BASE.fileUrl,
    ext: "zip",
    licence: INSEE_BASE.licence,
    minBytes: 1_000_000,
    headers: { accept: "application/zip,*/*" },
  });
  if (!file) return null;
  const csv = readZipFile(file.bytes, (name) => /^base-cc-evol-struct-pop-\d{4}\.csv$/i.test(name));
  return {
    millesime: INSEE_BASE.millesime,
    source_url: INSEE_BASE.pageUrl,
    collected_at: file.collected_at,
    counts: parseInseeCsv(csv.toString("latin1"), INSEE_BASE.millesime, keep),
  };
}
