import path from "node:path";
import { describe, expect, it } from "vitest";
import { checkContrastPairs, contrastPairs, runContrastCheck } from "./check-contrast";
import {
  composite,
  contrastRatio,
  hexToRgb,
  parseColorTokens,
  parseGlassAlphas,
  relativeLuminance,
} from "./contrast";

const rootDir = path.resolve(__dirname, "../..");

describe("contraste WCAG", () => {
  it("convertit l'hexadécimal, court ou long", () => {
    expect(hexToRgb("#0F2F38")).toEqual({ r: 15, g: 47, b: 56 });
    expect(hexToRgb("fff")).toEqual({ r: 255, g: 255, b: 255 });
    expect(() => hexToRgb("#12345")).toThrow(/invalide/);
  });

  it("retrouve les bornes connues", () => {
    expect(relativeLuminance(hexToRgb("#ffffff"))).toBeCloseTo(1, 5);
    expect(relativeLuminance(hexToRgb("#000000"))).toBe(0);
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 5);
    expect(contrastRatio("#ffffff", "#000000")).toBeCloseTo(21, 5);
    expect(contrastRatio("#777777", "#ffffff")).toBeCloseTo(4.48, 2);
  });

  it("compose une couche translucide sur un fond, comme le navigateur", () => {
    // Blanc à 72 % sur du noir : 0,72 × 255 = 184 sur chaque canal.
    expect(composite("#ffffff", "#000000", 0.72)).toBe("#b8b8b8");
    expect(composite("#ffffff", "#ffffff", 0.72)).toBe("#ffffff");
    expect(composite("#000000", "#ffffff", 1)).toBe("#000000");
    expect(() => composite("#ffffff", "#000000", 1.2)).toThrow(/Alpha/);
  });

  it("lit les opacités du verre depuis glass.css", () => {
    const alphas = parseGlassAlphas(
      ":root { --glass-alpha-base: 72%; --glass-alpha-fallback: 94%; --glass-alpha: var(--glass-alpha-base); }",
    );
    expect(alphas.get("base")).toBeCloseTo(0.72, 5);
    expect(alphas.get("fallback")).toBeCloseTo(0.94, 5);
    expect(alphas.size).toBe(2);
  });

  it("lit les jetons de base et les jetons du mode confort", () => {
    const css = `:root { --color-ink: #0F2F38; --color-white: #ffffff; --color-text: var(--color-ink); }
      :root[data-comfort="on"] { --color-text: #06222a; --color-link: #004a57; }`;
    const tokens = parseColorTokens(css);
    expect(tokens.base.get("ink")).toBe("#0f2f38");
    expect(tokens.base.has("text")).toBe(false);
    expect(tokens.comfort.get("text")).toBe("#06222a");
    expect(tokens.comfort.get("link")).toBe("#004a57");
  });
});

describe("check-contrast", () => {
  it("retrouve toutes les valeurs de docs/02 §2 depuis tokens.css (tolérance 0,05)", async () => {
    const { errors } = await runContrastCheck({ rootDir, prod: false });
    expect(errors).toEqual([]);
    expect(contrastPairs.length).toBeGreaterThanOrEqual(30);
  });

  it("signale un écart par rapport au cahier et un jeton manquant", () => {
    const tokens = parseColorTokens(":root { --color-ink: #0f2f38; --color-white: #ffffff; }");
    const errors = checkContrastPairs(tokens, [
      { fg: "ink", bg: "white", expected: 12, min: 7, usage: "test" },
      { fg: "ink", bg: "paper", expected: 13.36, min: 7, usage: "test" },
    ]);
    expect(errors).toHaveLength(2);
    expect(errors[0]).toContain("calculé 14.15, cahier 12.00");
    expect(errors[1]).toContain("introuvable");
  });

  it("recompose une surface de verre et mesure le texte dessus", () => {
    const tokens = parseColorTokens(
      ":root { --color-ink: #0f2f38; --color-white: #ffffff; --color-sand: #f4eee4; }",
    );
    const alphas = new Map([["glass-base", 0.72]]);
    // Verre blanc à 72 % sur du sable : 13,58 ; sur une photo noire : 7,13.
    expect(
      checkContrastPairs(
        tokens,
        [
          { fg: "ink", bg: "mix:white@glass-base/sand", expected: 13.58, min: 7, usage: "test" },
          {
            fg: "ink",
            bg: "mix:white@glass-base/#000000",
            expected: 7.13,
            min: 4.5,
            usage: "test",
          },
        ],
        alphas,
      ),
    ).toEqual([]);
    // Sans la table des opacités, la couche est introuvable : le contrôle le dit.
    expect(
      checkContrastPairs(tokens, [
        { fg: "ink", bg: "mix:white@glass-base/sand", expected: 13.58, min: 7, usage: "test" },
      ]),
    ).toEqual(["jeton introuvable pour le couple ink / mix:white@glass-base/sand"]);
  });

  it("signale un couple sous son seuil d'usage", () => {
    const tokens = parseColorTokens(
      ":root { --color-green-500: #58be81; --color-white: #ffffff; }",
    );
    const errors = checkContrastPairs(tokens, [
      { fg: "white", bg: "green-500", expected: 2.31, min: 4.5, usage: "test" },
    ]);
    expect(errors).toEqual(["white sur green-500 : 2.31 sous le seuil 4.5 (test)"]);
  });
});
