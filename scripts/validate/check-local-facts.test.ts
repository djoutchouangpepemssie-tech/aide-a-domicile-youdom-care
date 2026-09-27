import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  auditFacts,
  describeFacts,
  isSourced,
  loadLocalPages,
  runLocalFactsCheck,
} from "./check-local-facts";

/*
 * Les gabarits de test font quelques centaines de mots ; le seuil de production est à 1000 depuis
 * D-043. Ces tests vérifient le **comportement** du contrôle, pas la valeur du seuil : ils gardent
 * donc les seuils d'origine de docs/04 §4.
 */
const SEUILS_GABARITS = {
  commune: 350,
  arrondissement: 450,
  quartier: 300,
  departement: 600,
};

const fixtures = path.join(__dirname, "fixtures", "local");
const conforme = path.join(fixtures, "conforme");
const fautif = path.join(fixtures, "fautif");

describe("check-local-facts", () => {
  it("passe sur deux pages conformes", async () => {
    const { errors, warnings } = await runLocalFactsCheck({
      rootDir: conforme,
      prod: false,
      motsMin: SEUILS_GABARITS,
    });
    expect(errors).toEqual([]);
    expect(warnings).toEqual([]);
  });

  it("signale un fait sans source et ses conséquences sur un département", async () => {
    const { errors } = await runLocalFactsCheck({
      rootDir: fautif,
      prod: false,
      motsMin: SEUILS_GABARITS,
    });
    const has = (pattern: RegExp) => expect(errors.some((e) => pattern.test(e))).toBe(true);
    has(/data\/local\/92\.json : facts\[1\]\.source_url/);
    has(
      /content\/local\/92\.json : 1 fait\(s\) sans source_url ou collected_at .* « Pôles autonomie territoriaux »/,
    );
    has(/content\/local\/92\.json : 2 fait\(s\) sourcé\(s\), seuil 15 pour un\(e\) departement/);
    has(
      /content\/local\/92\.json : zone éditoriale de 108 mots, seuil 600 pour un\(e\) departement/,
    );
  });

  it("signale un nombre absent des faits, un index hors de facts[] et une zone trop courte", async () => {
    const { errors } = await runLocalFactsCheck({
      rootDir: fautif,
      prod: false,
      motsMin: SEUILS_GABARITS,
    });
    const has = (pattern: RegExp) => expect(errors.some((e) => pattern.test(e))).toBe(true);
    has(
      /92050\.json › zone_editoriale : nombre\(s\) absent\(s\) des faits et de la démographie — « 12 000 »/,
    );
    has(/92050\.json : faits_utilises renvoie à l'index 12, facts\[\] n'en compte que 9/);
    has(/92050\.json : zone éditoriale de 340 mots, seuil 350 pour un\(e\) commune/);
    expect(errors.filter((e) => e.startsWith("content/local/92062.json"))).toEqual([]);
  });

  it("reconnaît un fait sourcé", () => {
    expect(isSourced({ source_url: "https://x.fr/", collected_at: "2026-09-01" })).toBe(true);
    expect(isSourced({ source_url: "ftp://x.fr/", collected_at: "2026-09-01" })).toBe(false);
    expect(isSourced({ source_url: "https://x.fr/", collected_at: "hier" })).toBe(false);
    expect(isSourced(null)).toBe(false);
  });

  it("exige six faits situés dans le quartier", async () => {
    const { pages } = await loadLocalPages(conforme);
    const puteaux = pages.find((p) => p.code === "92062");
    expect(puteaux?.data).not.toBeNull();
    if (!puteaux?.data) return;
    const quartier = {
      ...puteaux,
      data: {
        ...puteaux.data,
        kind: "quartier" as const,
        facts: puteaux.data.facts.map((f, i) => ({ ...f, in_territory: i < 3 })),
      },
    };
    const audit = auditFacts(quartier, SEUILS_GABARITS);
    expect(audit.errors).toEqual([
      expect.stringContaining("3 fait(s) situé(s) dans le quartier (in_territory), seuil 6"),
    ]);
    expect(describeFacts(audit.stats)).toBe(
      "faits sourcés 9/6 (dans le quartier 3) · mots 364/300",
    );
  });

  it("ne bloque pas une région, mais l'annonce", async () => {
    const { pages } = await loadLocalPages(conforme);
    const page = pages.find((p) => p.code === "92062");
    if (!page?.data) throw new Error("fixture absente");
    const audit = auditFacts({ ...page, data: { ...page.data, kind: "region" } });
    expect(audit.errors).toEqual([]);
    expect(audit.warnings).toEqual([expect.stringContaining("type region, aucun seuil")]);
    expect(describeFacts(audit.stats)).toBe("9 fait(s) sourcé(s) · 364 mots");
  });

  describe("sans page locale", () => {
    let dir: string;
    beforeEach(async () => {
      dir = await mkdtemp(path.join(os.tmpdir(), "yc-local-facts-"));
    });
    afterEach(async () => {
      await rm(dir, { recursive: true, force: true });
    });

    it("passe avec un avertissement", async () => {
      const { errors, warnings } = await runLocalFactsCheck({
        rootDir: dir,
        prod: false,
        motsMin: SEUILS_GABARITS,
      });
      expect(errors).toEqual([]);
      expect(warnings).toEqual(["aucune page locale : content/local absent ou vide"]);
    });
  });
});
