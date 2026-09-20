import { serializeJsonLd } from "./serialize";
import type { JsonLdNode } from "./types";

/*
 * Rend un ou plusieurs nœuds en `<script type="application/ld+json">`, un script par nœud
 * (sérialisation et échappement dans serialize.ts). Un nœud null n'émet rien.
 */

export { serializeJsonLd };

export function JsonLd({ data }: { data: JsonLdNode | null | readonly (JsonLdNode | null)[] }) {
  const nodes = (Array.isArray(data) ? data : [data]).filter(
    (node): node is JsonLdNode => node !== null,
  );
  if (nodes.length === 0) return null;
  return (
    <>
      {nodes.map((node, index) => (
        <script
          key={`${node["@type"]}-${index}`}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(node) }}
        />
      ))}
    </>
  );
}
