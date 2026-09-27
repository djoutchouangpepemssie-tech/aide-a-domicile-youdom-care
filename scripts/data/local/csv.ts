/*
 * Analyseur CSV (RFC 4180) : guillemets doublés, retours à la ligne dans les champs, CRLF.
 * Utilisé pour les fichiers de la CNSA (virgule, champs entre guillemets).
 */

export function parseCsv(text: string, delimiter = ","): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          quoted = false;
        }
      } else {
        field += c;
      }
      continue;
    }
    if (c === '"') {
      quoted = true;
    } else if (c === delimiter) {
      row.push(field);
      field = "";
    } else if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (c !== "\r") {
      field += c;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

/** Lignes du CSV sous forme d'objets (clé = intitulé de colonne). */
export function parseCsvRecords(text: string, delimiter = ","): Record<string, string>[] {
  const rows = parseCsv(text.replace(/^﻿/, ""), delimiter);
  const header = rows[0];
  if (!header) return [];
  const records: Record<string, string>[] = [];
  for (const row of rows.slice(1)) {
    if (row.length === 1 && row[0] === "") continue;
    const record: Record<string, string> = {};
    header.forEach((key, index) => {
      record[key] = row[index] ?? "";
    });
    records.push(record);
  }
  return records;
}
