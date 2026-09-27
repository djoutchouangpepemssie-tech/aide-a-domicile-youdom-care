import { inflateRawSync } from "node:zlib";

/*
 * Lecteur ZIP minimal (répertoire central, méthodes « stored » et « deflate ») : suffisant pour
 * les archives de l'Insee, sans dépendance. Pas de ZIP64 (archives < 4 Go).
 */

const SIG_EOCD = 0x06054b50;
const SIG_CENTRAL = 0x02014b50;
const SIG_LOCAL = 0x04034b50;

export interface ZipEntry {
  name: string;
  method: number;
  compressedSize: number;
  uncompressedSize: number;
  localHeaderOffset: number;
}

export function listZipEntries(buffer: Buffer): ZipEntry[] {
  const eocd = findEndOfCentralDirectory(buffer);
  const count = buffer.readUInt16LE(eocd + 10);
  let offset = buffer.readUInt32LE(eocd + 16);
  const entries: ZipEntry[] = [];
  for (let i = 0; i < count; i++) {
    if (buffer.readUInt32LE(offset) !== SIG_CENTRAL) {
      throw new Error("archive ZIP invalide : entrée du répertoire central attendue");
    }
    const method = buffer.readUInt16LE(offset + 10);
    const compressedSize = buffer.readUInt32LE(offset + 20);
    const uncompressedSize = buffer.readUInt32LE(offset + 24);
    const nameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    const localHeaderOffset = buffer.readUInt32LE(offset + 42);
    const name = buffer.toString("utf8", offset + 46, offset + 46 + nameLength);
    entries.push({ name, method, compressedSize, uncompressedSize, localHeaderOffset });
    offset += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
}

export function readZipEntry(buffer: Buffer, entry: ZipEntry): Buffer {
  const start = entry.localHeaderOffset;
  if (buffer.readUInt32LE(start) !== SIG_LOCAL) {
    throw new Error(`archive ZIP invalide : en-tête local attendu pour ${entry.name}`);
  }
  const nameLength = buffer.readUInt16LE(start + 26);
  const extraLength = buffer.readUInt16LE(start + 28);
  const dataStart = start + 30 + nameLength + extraLength;
  const data = buffer.subarray(dataStart, dataStart + entry.compressedSize);
  if (entry.method === 0) return Buffer.from(data);
  if (entry.method === 8) return inflateRawSync(data);
  throw new Error(`méthode de compression ZIP non prise en charge (${entry.method}) : ${entry.name}`);
}

/** Lit l'entrée dont le nom vérifie le prédicat ; lève une erreur si absente. */
export function readZipFile(buffer: Buffer, predicate: (name: string) => boolean): Buffer {
  const entry = listZipEntries(buffer).find((e) => predicate(e.name));
  if (!entry) throw new Error("archive ZIP : fichier attendu absent");
  return readZipEntry(buffer, entry);
}

function findEndOfCentralDirectory(buffer: Buffer): number {
  const minOffset = Math.max(0, buffer.length - 22 - 0xffff);
  for (let i = buffer.length - 22; i >= minOffset; i--) {
    if (buffer.readUInt32LE(i) === SIG_EOCD) return i;
  }
  throw new Error("archive ZIP invalide : fin de répertoire central introuvable");
}
