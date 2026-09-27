import { evaluate } from "@mdx-js/mdx";
import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import * as runtime from "react/jsx-runtime";
import { describe, expect, it } from "vitest";
import {
  compilePatterns,
  isSigle,
  linkText,
  rehypeLexique,
  type LexiqueLinkTarget,
  type LexiqueNode,
} from "./rehype-lexique";

const terms: LexiqueLinkTarget[] = [
  { slug: "apa", terme: "APA", variantes: ["allocation personnalisée d'autonomie"] },
  { slug: "auxiliaire-de-vie", terme: "auxiliaire de vie", variantes: ["auxiliaires de vie"] },
  {
    slug: "gir-et-grille-aggir",
    terme: "GIR et grille AGGIR",
    variantes: ["GIR", "AGGIR", "grille AGGIR"],
  },
];

const text = (value: string): LexiqueNode => ({ type: "text", value });
const el = (tagName: string, children: LexiqueNode[], properties = {}): LexiqueNode => ({
  type: "element",
  tagName,
  properties,
  children,
});
const root = (children: LexiqueNode[]): LexiqueNode => ({ type: "root", children });

/** Liens du lexique, dans l'ordre du document. */
function links(node: LexiqueNode): LexiqueNode[] {
  const out: LexiqueNode[] = [];
  const visit = (n: LexiqueNode) => {
    if (n.type === "element" && n.tagName === "a" && n.properties?.dataLexique) out.push(n);
    for (const child of n.children ?? []) visit(child);
  };
  visit(node);
  return out;
}

function toText(node: LexiqueNode): string {
  if (node.type === "text") return node.value ?? "";
  return (node.children ?? []).map(toText).join("");
}

function run(tree: LexiqueNode, options = {}): LexiqueNode {
  rehypeLexique({ terms, ...options })(tree);
  return tree;
}

describe("rehype-lexique", () => {
  it("lie la première occurrence seulement, sans perdre de texte", () => {
    const tree = run(root([el("p", [text("L'APA aide. L'APA encore, et l'APA toujours.")])]));
    const found = links(tree);
    expect(found).toHaveLength(1);
    expect(found[0]?.properties).toEqual({ href: "/lexique/apa/", dataLexique: "apa" });
    expect(toText(found[0] ?? text(""))).toBe("APA");
    expect(toText(tree)).toBe("L'APA aide. L'APA encore, et l'APA toujours.");
  });

  it("ne lie ni dans un titre, ni dans un lien, ni dans du code, ni dans un bouton", () => {
    const tree = run(
      root([
        el("h2", [text("L'APA en bref")]),
        el("p", [el("a", [text("APA")], { href: "/x/" })]),
        el("p", [el("code", [text("APA")])]),
        el("p", [el("button", [text("APA")])]),
        el("p", [text("Enfin l'APA dans le texte.")]),
      ]),
    );
    const found = links(tree);
    expect(found).toHaveLength(1);
    expect(toText(tree.children?.[4] ?? text(""))).toBe("Enfin l'APA dans le texte.");
    expect(links(tree.children?.[0] ?? text(""))).toHaveLength(0);
  });

  it("respecte la casse des sigles et l'ignore pour les mots ; les variantes comptent", () => {
    const tree = run(
      root([
        el("p", [text("apa n'est pas un sigle ici.")]),
        el("p", [text("Les Auxiliaires de vie passent le matin.")]),
        el("p", [text("Puis l'allocation personnalisée d’autonomie, et l'APA ensuite.")]),
      ]),
    );
    const found = links(tree);
    expect(found.map((l) => [l.properties?.dataLexique, toText(l)])).toEqual([
      ["auxiliaire-de-vie", "Auxiliaires de vie"],
      ["apa", "allocation personnalisée d’autonomie"],
    ]);
  });

  it("préfère la graphie la plus longue et respecte les frontières de mots", () => {
    const tree = run(root([el("p", [text("La grille AGGIR classe en GIR 4 ; AGGIR encore.")])]));
    const found = links(tree);
    expect(found).toHaveLength(1);
    expect(toText(found[0] ?? text(""))).toBe("grille AGGIR");
    // « AGGIR » seul ne contient pas le sigle GIR.
    const alone = run(root([el("p", [text("Le mot AGGIR seul, puis GIR.")])]));
    expect(links(alone).map((l) => toText(l))).toEqual(["AGGIR"]);
    expect(isSigle("APA")).toBe(true);
    expect(isSigle("Apa")).toBe(false);
    expect(isSigle("auxiliaire de vie")).toBe(false);
  });

  it("ne touche pas l'arbre quand le lexique est vide, ni un terme exclu", () => {
    const original = root([el("p", [text("L'APA et les auxiliaires de vie.")])]);
    const untouched = structuredClone(original);
    rehypeLexique({ terms: [] })(untouched);
    expect(untouched).toEqual(original);
    const excluded = run(structuredClone(original), { exclude: ["apa"] });
    expect(links(excluded).map((l) => l.properties?.dataLexique)).toEqual(["auxiliaire-de-vie"]);
  });

  it("linkText renvoie null sans correspondance et découpe le texte sinon", () => {
    const patterns = compilePatterns(terms);
    expect(linkText("Rien à lier.", patterns, new Set())).toBeNull();
    const linked = new Set<string>();
    const parts = linkText("Avant APA après", patterns, linked, "/l/") ?? [];
    expect(parts.map((p) => p.type)).toEqual(["text", "element", "text"]);
    expect(parts[1]?.properties?.href).toBe("/l/apa/");
    expect(linked.has("apa")).toBe(true);
  });

  it("s'applique à un MDX compilé : composants JSX parcourus, titres et code épargnés", async () => {
    const source = [
      "## L'APA en titre",
      "",
      "<Note>Dans le composant : APA.</Note>",
      "",
      "Puis `APA` en code et l'APA dans le texte, avec une auxiliaire de vie.",
      "",
    ].join("\n");
    const compiled = await evaluate(source, {
      ...runtime,
      rehypePlugins: [[rehypeLexique, { terms }]],
    });
    const Note = ({ children }: { children?: ReactNode }) => createElement("aside", null, children);
    const html = renderToStaticMarkup(createElement(compiled.default, { components: { Note } }));
    expect(html.match(/data-lexique="apa"/g)).toHaveLength(1);
    expect(html).toContain(
      '<aside>Dans le composant : <a href="/lexique/apa/" data-lexique="apa">APA</a>.</aside>',
    );
    expect(html).toContain("<h2>L&#x27;APA en titre</h2>");
    expect(html).toContain("<code>APA</code>");
    expect(html).toContain(
      '<a href="/lexique/auxiliaire-de-vie/" data-lexique="auxiliaire-de-vie">auxiliaire de vie</a>',
    );
  });
});
