import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  checkPageJsonLd,
  extractJsonLd,
  findEmptyValues,
  runSchemaCheck,
  scanHtmlDir,
} from "./check-schema";

const fixtures = path.join(__dirname, "fixtures", "schema");
const options = {
  agencies: [{ adresse: "61 rue de Lyon", code_postal: "75012", commune: "Paris" }],
};

describe("check-schema", () => {
  it("n'extrait que les vrais blocs application/ld+json, pas la charge utile RSC", async () => {
    const html = await readFile(path.join(fixtures, "valide", "page.html"), "utf8");
    const blocks = extractJsonLd(html);
    expect(blocks).toHaveLength(4);
    expect(blocks.every((block) => JSON.parse(block)["@context"] === "https://schema.org")).toBe(
      true,
    );
  });

  it("repère les valeurs vides à toute profondeur", () => {
    expect(
      findEmptyValues({ a: null, b: "", c: [], d: {}, e: [{ f: " " }], g: "ok", h: 0 }),
    ).toEqual(["$.a = null", '$.b = ""', "$.c = []", "$.d = {}", '$.e[0].f = ""']);
  });

  it("laisse passer une page valide (adresse d'agence, relecteur affiché, fil d'Ariane absolu)", async () => {
    const html = await readFile(path.join(fixtures, "valide", "page.html"), "utf8");
    expect(checkPageJsonLd(html, options)).toEqual([]);
  });

  it("signale chaque défaut d'une page invalide", async () => {
    const html = await readFile(path.join(fixtures, "invalide", "page.html"), "utf8");
    const errors = checkPageJsonLd(html, options, "invalide/page.html");
    const has = (pattern: RegExp) => expect(errors.some((e) => pattern.test(e))).toBe(true);
    has(/type interdit AggregateRating/);
    has(/type interdit Review/);
    has(/PostalAddress qui n'est pas une agence/);
    has(/valeur vide \$\.sameAs = \[\]/);
    has(/valeur vide \$\.logo = ""/);
    has(/valeur vide \$\.review\.name = null/);
    has(/2 Organization, un seul attendu/);
    has(/@context schema\.org attendu/);
    has(/@type manquant/);
    has(/BreadcrumbList avec moins de deux éléments/);
    has(/MedicalWebPage sans carte de relecture/);
    has(/relecteur « Personne Absente » n'est pas affiché/);
    has(/JSON invalide/);
  });

  it("refuse une adresse relative ou une position fausse dans le fil d'Ariane", () => {
    const html = `<script type="application/ld+json">${JSON.stringify({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Accueil", item: "/" },
        { "@type": "ListItem", position: 3, name: "Page" },
      ],
    })}</script>`;
    const errors = checkPageJsonLd(html, options);
    expect(errors).toHaveLength(2);
    expect(errors[0]).toContain("adresse absolue attendue (/)");
    expect(errors[1]).toContain("position 2 attendue");
  });

  it("accepte l'adresse de la page courante sous forme d'objet @id", () => {
    const html = `<script type='application/ld+json'>${JSON.stringify({
      "@context": "http://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Accueil", item: "https://www.example.org/" },
        {
          "@type": "ListItem",
          position: 2,
          name: "Page",
          item: { "@id": "https://www.example.org/p/" },
        },
      ],
    })}</script>`;
    expect(checkPageJsonLd(html, options)).toEqual([]);
  });

  it("accepte une page sans JSON-LD", () => {
    expect(checkPageJsonLd("<main><p>Rien</p></main>", options)).toEqual([]);
  });

  describe("sur un dossier de rendu", () => {
    let dir: string;

    beforeEach(async () => {
      dir = await mkdtemp(path.join(os.tmpdir(), "yc-schema-"));
    });

    afterEach(async () => {
      await rm(dir, { recursive: true, force: true });
    });

    it("parcourt les fixtures et préfixe chaque erreur du fichier fautif", async () => {
      const errors = await scanHtmlDir(fixtures, options);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.every((e) => e.startsWith(path.join("invalide", "page.html")))).toBe(true);
    });

    it("exige un build préalable", async () => {
      const { errors } = await runSchemaCheck({ rootDir: dir, prod: false });
      expect(errors[0]).toContain("pnpm build");
    });
  });
});
