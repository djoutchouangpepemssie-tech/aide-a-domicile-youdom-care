import { z } from "zod";
import aeehJson from "../../content/aides/aeeh.json";
import hospitalJson from "../../content/aides/aides-apres-hospitalisation.json";
import apaJson from "../../content/aides/apa.json";
import cesuJson from "../../content/aides/cesu.json";
import creditImpotJson from "../../content/aides/credit-d-impot-et-avance-immediate.json";
import pchJson from "../../content/aides/pch.json";
import { aidPageSchema, type AidPage } from "./schemas";

/*
 * Registre des pages détaillées par aide (content/aides/{id}.json). Chaque fichier est validé
 * à la première lecture ; une erreur interrompt le build. L'identifiant du fichier doit
 * correspondre au champ `id` et à l'entrée de `aides.json`.
 */

const files: Record<string, unknown> = {
  "credit-d-impot-et-avance-immediate": creditImpotJson,
  apa: apaJson,
  pch: pchJson,
  aeeh: aeehJson,
  cesu: cesuJson,
  "aides-apres-hospitalisation": hospitalJson,
};

const cache = new Map<string, AidPage>();

export function listAidPageIds(): string[] {
  return Object.keys(files);
}

export function getAidPage(id: string): AidPage | null {
  const raw = files[id];
  if (raw === undefined) return null;
  const cached = cache.get(id);
  if (cached) return cached;
  const result = aidPageSchema.safeParse(raw);
  if (!result.success) {
    throw new Error(`content/aides/${id}.json est invalide :\n${z.prettifyError(result.error)}`);
  }
  if (result.data.id !== id) {
    throw new Error(`content/aides/${id}.json : le champ id vaut « ${result.data.id} »`);
  }
  cache.set(id, result.data);
  return result.data;
}
