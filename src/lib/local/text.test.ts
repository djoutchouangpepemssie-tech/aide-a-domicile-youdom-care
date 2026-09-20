import { describe, expect, it } from "vitest";
import {
  countWords,
  jaccard,
  markdownToText,
  normalizeTokens,
  shingleSimilarity,
  stripDiacritics,
  uniquenessKey,
  wordShingles,
} from "./text";

describe("markdownToText", () => {
  it("retire les titres, les images et les adresses des liens, garde le texte des ancres", () => {
    const md = [
      "## Vivre à domicile à Puteaux",
      "",
      'La sortie au [marché des Bergères](https://www.puteaux.fr/ "Mairie") se prépare.',
      "![Plan](/images/plan.png) Voir <https://example.org/> et https://example.org/page.",
      "",
      "- **Un** point *fort*",
      "> citation",
      "",
      "Titre souligné",
      "===",
      "Fin.",
    ].join("\n");
    expect(markdownToText(md)).toBe(
      "La sortie au marché des Bergères se prépare.\nVoir et\nUn point fort\ncitation\nFin.",
    );
  });

  it("supprime les tableaux, filets et code", () => {
    const md = "| a | b |\n| --- | --- |\n| un | deux |\n\n---\n\n`code` texte ```bloc```";
    expect(markdownToText(md).replace(/\s+/g, " ")).toBe("a b un deux texte");
  });
});

describe("countWords", () => {
  it("compte les mots avec apostrophes, traits d'union et nombres à espaces", () => {
    expect(countWords("L'aide-ménagère vient 3 fois : 12 345 habitants, 27,3 %.")).toBe(7);
  });

  it("ne compte ni ponctuation ni chaîne vide", () => {
    expect(countWords("… — ; !")).toBe(0);
    expect(countWords("")).toBe(0);
  });
});

describe("normalisation et séquences", () => {
  it("retire accents, casse et ponctuation", () => {
    expect(stripDiacritics("Élément çà")).toBe("Element ca");
    expect(normalizeTokens("L'Île-de-France, où ?")).toEqual(["l", "ile", "de", "france", "ou"]);
    expect(uniquenessKey("Aide à domicile !")).toBe(uniquenessKey("aide a DOMICILE"));
  });

  it("construit des séquences de cinq jetons, aucune sous cinq mots", () => {
    expect(wordShingles("un deux trois quatre")).toEqual(new Set());
    expect([...wordShingles("un deux trois quatre cinq six")]).toEqual([
      "un deux trois quatre cinq",
      "deux trois quatre cinq six",
    ]);
    expect([...wordShingles("a b c", 2)]).toEqual(["a b", "b c"]);
  });

  it("calcule l'indice de Jaccard", () => {
    expect(jaccard(new Set(), new Set())).toBe(0);
    expect(jaccard(new Set(["a", "b"]), new Set(["b", "c"]))).toBeCloseTo(1 / 3);
    expect(jaccard(new Set(["a"]), new Set(["a"]))).toBe(1);
  });

  it("mesure la similarité de deux textes, insensible aux accents et à la casse", () => {
    const a =
      "Puteaux compte près de quarante-cinq mille habitants sur la rive gauche de la Seine.";
    const b =
      "PUTEAUX compte pres de quarante cinq mille habitants sur la rive gauche de la Seine !";
    expect(shingleSimilarity(a, b)).toBe(1);
    expect(shingleSimilarity(a, "Nanterre est la préfecture des Hauts-de-Seine.")).toBe(0);
    expect(shingleSimilarity("trop court", a)).toBe(0);
  });
});
