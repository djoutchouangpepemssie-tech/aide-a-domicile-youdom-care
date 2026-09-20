import type { JsonLdNode } from "./types";

/*
 * Sérialisation d'un nœud pour `<script type="application/ld+json">` : `<`, `>` et `&` sont
 * échappés en séquences JSON (`\u003c`…) pour qu'aucune valeur ne puisse fermer la balise ni
 * ouvrir un commentaire ; le JSON reste strictement valide.
 */

const escapes: Record<string, string> = {
  "<": "\\u003c",
  ">": "\\u003e",
  "&": "\\u0026",
};

export function serializeJsonLd(node: JsonLdNode): string {
  return JSON.stringify(node).replace(/[<>&]/g, (char) => escapes[char] ?? char);
}
