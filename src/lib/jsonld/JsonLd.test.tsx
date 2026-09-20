import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { JsonLd, serializeJsonLd } from "./JsonLd";
import type { JsonLdNode } from "./types";

const node: JsonLdNode = {
  "@context": "https://schema.org",
  "@type": "Thing",
  name: "Un <script>alert(1)</script> & un </script> fermant",
};

describe("jsonld/JsonLd", () => {
  it("échappe < > et & en séquences JSON, en gardant un JSON valide", () => {
    const text = serializeJsonLd(node);
    expect(text).not.toContain("<");
    expect(text).not.toContain(">");
    expect(text).not.toContain("&");
    expect(text).toContain("\\u003cscript\\u003e");
    expect(JSON.parse(text)).toEqual(node);
  });

  it("rend un script application/ld+json par nœud et rien pour null", () => {
    const { container } = render(<JsonLd data={[node, null, { ...node, name: "Deux" }]} />);
    const scripts = container.querySelectorAll('script[type="application/ld+json"]');
    expect(scripts).toHaveLength(2);
    expect(JSON.parse(scripts[1]?.textContent ?? "")).toMatchObject({ name: "Deux" });
    expect(container.innerHTML).not.toContain("</script>alert");
    expect(render(<JsonLd data={null} />).container.innerHTML).toBe("");
  });
});
