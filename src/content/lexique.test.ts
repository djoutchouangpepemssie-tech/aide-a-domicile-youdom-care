import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  findSharedSpellings,
  groupLexiqueByLetter,
  latestLexiqueMaj,
  lexiqueLetter,
  listLexiqueTerms,
  neighbourTerms,
  readLexiqueTerm,
  sortLexiqueTerms,
  toLinkTargets,
} from "./lexique";
import {
  LEXIQUE_WORDS_MAX,
  LEXIQUE_WORDS_MIN,
  lexiqueWordCount,
  type LexiqueTerm,
} from "./lexique-schema";

/** Les termes de P7.2 (docs/06 §6) et les trois ajoutés pour les articles du Fil. */
const expectedSlugs = [
  "aah",
  "aeeh",
  "ajpa",
  "apa",
  "ardh",
  "auxiliaire-de-vie",
  "ccas",
  "cesu",
  "clic",
  "consultation-memoire",
  "credit-d-impot",
  "esa",
  "gir-et-grille-aggir",
  "had",
  "mdph",
  "mode-mandataire",
  "mode-prestataire",
  "pch",
  "plateforme-de-repit",
  "saad",
  "sessad",
  "ssiad",
  "tsa",
];

function fixture(overrides: Partial<LexiqueTerm> = {}): LexiqueTerm {
  return {
    slug: "test",
    terme: "TEST",
    developpe: "Terme de test",
    seo: {
      titre: "Terme de test : une balise titre de cinquante caractères",
      description:
        "Une description moteur de test qui fait entre cent quarante et cent cinquante-cinq caractères pour respecter le schéma des pages du site web.",
    },
    definition: "Une définition.",
    explication: Array.from({ length: 130 }, (_, i) => `mot${i}`).join(" "),
    pour_qui: "Tout le monde.",
    lien_officiel: { libelle: "Source", href: "https://example.org/", consulte_le: "2026-09-27" },
    pages_liees: ["/tarifs-et-aides/"],
    maj: "2026-09-27",
    ...overrides,
  };
}

describe("lexique : contenu du dépôt", () => {
  it("charge les termes du lancement, triés, un fichier par slug, dans les bornes du cahier", async () => {
    const terms = await listLexiqueTerms();
    expect(terms.map((t) => t.slug).sort()).toEqual(expectedSlugs);
    expect(terms.map((t) => t.terme)).toEqual(sortLexiqueTerms(terms).map((t) => t.terme));
    for (const term of terms) {
      const words = lexiqueWordCount(term);
      expect(words, term.slug).toBeGreaterThanOrEqual(LEXIQUE_WORDS_MIN);
      expect(words, term.slug).toBeLessThanOrEqual(LEXIQUE_WORDS_MAX);
      expect(term.lien_officiel.href).toMatch(/^https:\/\//);
      expect(term.lien_officiel.consulte_le).toBe("2026-09-27");
      expect(term.pages_liees.length).toBeGreaterThanOrEqual(1);
      // Le développé d'un sigle commence par une capitale ; un mot n'a pas de développé forcément.
      if (term.developpe)
        expect(term.developpe.charAt(0)).toBe(term.developpe.charAt(0).toUpperCase());
    }
    expect(findSharedSpellings(terms)).toEqual([]);
  });

  it("groupe par lettre sans accent, dans l'ordre alphabétique", async () => {
    const groups = groupLexiqueByLetter(await listLexiqueTerms());
    const letters = groups.map((g) => g.lettre);
    expect(letters).toEqual([...letters].sort());
    const a = groups.find((g) => g.lettre === "A");
    expect(a?.termes.map((t) => t.slug)).toEqual(
      expect.arrayContaining(["aah", "apa", "ardh", "auxiliaire-de-vie"]),
    );
    expect(lexiqueLetter("équipe spécialisée")).toBe("E");
    expect(lexiqueLetter("crédit d'impôt")).toBe("C");
    expect(lexiqueLetter("24h")).toBe("#");
  });

  it("propose des voisins : mêmes pages liées d'abord, puis l'alphabet, jamais le terme lui-même", async () => {
    const terms = await listLexiqueTerms();
    const apa = terms.find((t) => t.slug === "apa");
    if (!apa) throw new Error("apa manquant");
    const neighbours = neighbourTerms(terms, apa);
    expect(neighbours).toHaveLength(4);
    expect(neighbours.map((t) => t.slug)).not.toContain("apa");
    expect(new Set(neighbours.map((t) => t.slug)).size).toBe(4);
    // GIR partage /tarifs-et-aides/apa/ avec l'APA : il est voisin.
    expect(neighbours.map((t) => t.slug)).toContain("gir-et-grille-aggir");
    expect(neighbourTerms(terms, apa, 2)).toHaveLength(2);
  });

  it("expose au greffon le slug, le terme et les variantes seulement", async () => {
    const targets = toLinkTargets(await listLexiqueTerms());
    const apa = targets.find((t) => t.slug === "apa");
    expect(apa).toEqual({
      slug: "apa",
      terme: "APA",
      variantes: ["allocation personnalisée d'autonomie"],
    });
    for (const target of targets)
      expect(Object.keys(target).sort()).toEqual(expect.arrayContaining(["slug", "terme"]));
    expect(latestLexiqueMaj(await listLexiqueTerms())).toBe("2026-09-27");
  });
});

describe("lexique : lecture d'un fichier", () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(os.tmpdir(), "yc-lexique-"));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("lit un terme valide dont le slug est le nom du fichier", async () => {
    const file = path.join(dir, "test.json");
    await writeFile(file, JSON.stringify(fixture()));
    const term = await readLexiqueTerm(file);
    expect(term.terme).toBe("TEST");
  });

  it("refuse un JSON illisible, un slug différent du fichier, un texte trop court", async () => {
    const broken = path.join(dir, "casse.json");
    await writeFile(broken, "{ pas du json");
    await expect(readLexiqueTerm(broken)).rejects.toThrow(/JSON invalide/);

    const renamed = path.join(dir, "autre.json");
    await writeFile(renamed, JSON.stringify(fixture()));
    await expect(readLexiqueTerm(renamed)).rejects.toThrow(/attendu « autre »/);

    const short = path.join(dir, "test.json");
    await writeFile(short, JSON.stringify(fixture({ explication: "Trop court." })));
    await expect(readLexiqueTerm(short)).rejects.toThrow(/mots rendus/);
  });

  it("signale une graphie partagée ou une variante identique au terme", async () => {
    const a = fixture({ slug: "a", terme: "AAA", variantes: ["même chose"] });
    const b = fixture({ slug: "b", terme: "BBB", variantes: ["Même chose"] });
    expect(findSharedSpellings([a, b])).toEqual(["« Même chose » (a et b)"]);
    const same = path.join(dir, "test.json");
    await writeFile(same, JSON.stringify(fixture({ variantes: ["Test", "TEST"] })));
    await expect(readLexiqueTerm(same)).rejects.toThrow(/identique au terme/);
  });
});
