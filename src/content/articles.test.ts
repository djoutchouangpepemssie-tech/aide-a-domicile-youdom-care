import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  addMonths,
  countWords,
  extractHeadings,
  isArticleBuildable,
  listArticleMetas,
  magazinePagePath,
  pageCount,
  paginate,
  parsePageNumber,
  parseRubrique,
  readingMinutes,
  revisionDate,
  rubriquePagePath,
  slugifyHeading,
  unknownComponents,
} from "./article-meta";
import { articlesOfRubrique, loadArticles, relatedArticles } from "./articles";

const dir = path.resolve(__dirname, "../../tests/fixtures/magazine");

describe("chargeur des articles du Fil", () => {
  it("lit les articles valides, écarte le brouillon et signale l'article invalide sans échouer", async () => {
    const warnings: string[] = [];
    const articles = await listArticleMetas({ dir, warn: (message) => warnings.push(message) });
    expect(articles.map((a) => a.slug)).toEqual(["valide", "deuxieme", "troisieme"]);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toMatch(/invalide\.mdx/);
    expect(warnings[0]).toMatch(/article ignoré/);
  });

  it("calcule le chemin, la révision, le temps de lecture et le sommaire", async () => {
    const [valide] = await listArticleMetas({ dir, warn: () => {} });
    expect(valide?.chemin).toBe("/magazine/valide/");
    // Rubrique « Comprendre » : douze mois après maj_le.
    expect(valide?.revision).toBe("2027-09-27");
    expect(valide?.readingMinutes).toBe(1);
    expect(valide?.headings).toEqual([
      {
        id: "premiere-question-reelle-comme-la-pose-un-proche",
        text: "Première question réelle, comme la pose un proche ?",
      },
      {
        id: "deuxieme-question-avec-un-accent-ou-en-etes-vous",
        text: "Deuxième question, avec un accent : où en êtes-vous ?",
      },
      { id: "troisieme-question", text: "Troisième question ?" },
    ]);
  });

  it("respecte revision_le quand il est donné, sinon six mois pour « Droits et aides »", async () => {
    const articles = await listArticleMetas({ dir, warn: () => {} });
    const troisieme = articles.find((a) => a.slug === "troisieme");
    expect(troisieme?.revision).toBe("2027-01-15");
    expect(revisionDate({ rubrique: "droits-et-aides", maj_le: "2026-09-27" })).toBe("2027-03-27");
    expect(addMonths("2026-01-31", 1)).toBe("2026-02-28");
    expect(addMonths("2026-11-15", 2)).toBe("2027-01-15");
  });

  it("compile le corps MDX en composant", async () => {
    const articles = await loadArticles({ dir, warn: () => {} });
    expect(articles).toHaveLength(3);
    for (const article of articles) expect(typeof article.Body).toBe("function");
  });

  it("construit tout hors brouillon, en production comme ailleurs (D-033)", async () => {
    const articles = await listArticleMetas({ dir, warn: () => {}, drafts: true });
    const byStatut = Object.fromEntries(articles.map((a) => [a.meta.statut, a]));
    expect(isArticleBuildable(byStatut.brouillon, false)).toBe(false);
    expect(isArticleBuildable(byStatut.brouillon, true)).toBe(false);
    // Un article a_relire est servi partout, en noindex, hors des plans de site.
    expect(isArticleBuildable(byStatut.a_relire, false)).toBe(true);
    expect(isArticleBuildable(byStatut.a_relire, true)).toBe(true);
    expect(isArticleBuildable(byStatut.publie, true)).toBe(true);
  });

  it("« À lire ensuite » : explicites, puis même rubrique, puis même pilier, jamais soi-même, trois au plus", async () => {
    const pool = await listArticleMetas({ dir, warn: () => {} });
    const valide = pool.find((a) => a.slug === "valide");
    const deuxieme = pool.find((a) => a.slug === "deuxieme");
    const troisieme = pool.find((a) => a.slug === "troisieme");
    if (!valide || !deuxieme || !troisieme) throw new Error("fixtures manquantes");
    // valide : a_lire_ensuite = [troisieme] (autre rubrique) puis deuxieme (même rubrique).
    expect(relatedArticles(valide, pool).map((a) => a.slug)).toEqual(["troisieme", "deuxieme"]);
    // deuxieme : même rubrique que valide ; troisieme n'a ni rubrique ni pilier commun.
    expect(relatedArticles(deuxieme, pool).map((a) => a.slug)).toEqual(["valide"]);
    // troisieme : pilier commun avec valide seulement.
    expect(relatedArticles(troisieme, pool).map((a) => a.slug)).toEqual(["valide"]);
    expect(relatedArticles(valide, pool, 1)).toHaveLength(1);
    expect(articlesOfRubrique(pool, "comprendre").map((a) => a.slug)).toEqual([
      "valide",
      "deuxieme",
    ]);
  });

  it("repère les composants non autorisés et compte les mots hors balises", () => {
    expect(unknownComponents("<ARetenir>\n- a\n</ARetenir>\n<Attention>b</Attention>")).toEqual([]);
    expect(unknownComponents("<Foo />\n<Bar.Baz>x</Bar.Baz>\n<ARetenir/>")).toEqual([
      "Bar.Baz",
      "Foo",
    ]);
    expect(
      countWords(
        "## Titre\n\nUn **mot** et [un lien](/x/).\n\n<ARetenir>\n- deux mots\n</ARetenir>",
      ),
    ).toBe(8);
    expect(readingMinutes(0)).toBe(1);
    expect(readingMinutes(1000)).toBe(5);
  });

  it("ancre les intertitres sans accents et dédoublonne", () => {
    expect(slugifyHeading("Où en êtes-vous ?")).toBe("ou-en-etes-vous");
    expect(
      extractHeadings("## A ?\n\n```\n## pas un titre\n```\n\n## A ?\n\n### Trois").map(
        (h) => h.id,
      ),
    ).toEqual(["a", "a-2"]);
  });

  it("pagine par douze et lit les segments d'adresse", () => {
    const items = Array.from({ length: 25 }, (_, i) => i);
    expect(pageCount(0)).toBe(1);
    expect(pageCount(12)).toBe(1);
    expect(pageCount(13)).toBe(2);
    expect(paginate(items, 1)).toHaveLength(12);
    expect(paginate(items, 3)).toEqual([24]);
    expect(magazinePagePath(1)).toBe("/magazine/");
    expect(magazinePagePath(2)).toBe("/magazine/page/2/");
    expect(rubriquePagePath("comprendre", 1)).toBe("/magazine/categorie/comprendre/");
    expect(rubriquePagePath("comprendre", 3)).toBe("/magazine/categorie/comprendre/page/3/");
    expect(parsePageNumber("2")).toBe(2);
    expect(parsePageNumber("1")).toBeNull();
    expect(parsePageNumber("abc")).toBeNull();
    expect(parseRubrique("comprendre")).toBe("comprendre");
    expect(parseRubrique("inconnue")).toBeNull();
  });
});
