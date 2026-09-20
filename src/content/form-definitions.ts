import adulteHandicapJson from "../../content/formulaires/adulte-handicap.json";
import aidantJson from "../../content/formulaires/aidant.json";
import enfantHandicapJson from "../../content/formulaires/enfant-handicap.json";
import nuit24hJson from "../../content/formulaires/nuit-24h.json";
import neuroJson from "../../content/formulaires/neuro.json";
import personneAgeeJson from "../../content/formulaires/personne-agee.json";
import { formDefinitionSchema, type FormDefinition } from "./schemas";

/*
 * Registre des formulaires détaillés (docs/05 §2) : un fichier content/formulaires/{id}.json
 * par cas, validé à la première lecture. Les adresses sont celles de docs/05 §2 (`slug`).
 * Un cas absent du registre n'a pas de page : le lien reste masqué sur /demande/.
 */

const files: Record<string, unknown> = {
  neuro: neuroJson,
  "personne-agee": personneAgeeJson,
  "adulte-handicap": adulteHandicapJson,
  "enfant-handicap": enfantHandicapJson,
  aidant: aidantJson,
  "nuit-24h": nuit24hJson,
};

const cache = new Map<string, FormDefinition>();

function parse(id: string): FormDefinition {
  const cached = cache.get(id);
  if (cached) return cached;
  const result = formDefinitionSchema.safeParse(files[id]);
  if (!result.success) {
    throw new Error(`content/formulaires/${id}.json est invalide : ${result.error.message}`);
  }
  if (result.data.id !== id) {
    throw new Error(`content/formulaires/${id}.json : id « ${result.data.id} » inattendu`);
  }
  cache.set(id, result.data);
  return result.data;
}

export function listFormDefinitions(): FormDefinition[] {
  return Object.keys(files).map(parse);
}

export function getFormDefinitionBySlug(slug: string): FormDefinition | null {
  return listFormDefinitions().find((definition) => definition.slug === slug) ?? null;
}
