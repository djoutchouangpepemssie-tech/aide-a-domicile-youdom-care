import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  checkDocument,
  findForbiddenWords,
  isBannedLabel,
  longSentences,
  scanContentDir,
} from "./check-copy";

describe("check-copy", () => {
  it("détecte les mots interdits de docs/07 §3 et docs/01 §2", () => {
    expect(findForbiddenWords("Nous promettons de guérir votre proche")).toEqual([
      "guérir / guérison",
    ]);
    expect(findForbiddenWords("Pour ralentir la maladie")).toEqual(["ralentir la maladie"]);
    expect(findForbiddenWords("Un traitement adapté")).toEqual(["traitement"]);
    expect(findForbiddenWords("Résultat garanti")).toEqual(["garantir"]);
    expect(findForbiddenWords("Le n°1 de l'aide à domicile")).toEqual(["n°1"]);
    expect(findForbiddenWords("Le numéro 1 en Île-de-France")).toEqual(["n°1"]);
    expect(findForbiddenWords("Leader du secteur")).toEqual(["leader"]);
    expect(findForbiddenWords("La meilleure équipe")).toEqual(["meilleur"]);
    expect(findForbiddenWords("Unique en France")).toEqual(["unique en France"]);
    expect(findForbiddenWords("Nos patients")).toEqual(["patient"]);
    expect(findForbiddenWords("Un placement en établissement")).toEqual(["placement / placer"]);
  });

  /*
   * Familles ajoutées après l'audit des textes rendus du 29/09/2026 : « ce que nous
   * garantissons » était passé deux fois, et deux pages locales comparaient des prix alors que
   * le site n'en publie aucun.
   */
  it("détecte les familles ajoutées par l'audit des textes", () => {
    expect(findForbiddenWords("Ce que nous garantissons")).toEqual(["garantir"]);
    expect(findForbiddenWords("Deux heures ne coûtent pas cher")).toEqual([
      "prix présenté comme bas",
    ]);
    expect(findForbiddenWords("Une formule moins chère")).toEqual(["prix présenté comme bas"]);
    expect(findForbiddenWords("Un acteur incontournable")).toEqual(["supériorité invérifiable"]);
    expect(findForbiddenWords("Offre limitée, ne tardez pas")).toEqual(["urgence commerciale"]);
    expect(findForbiddenWords("100 % de satisfaction")).toEqual(["satisfaction chiffrée"]);
    // Formes voisines qui doivent passer : le médecin traitant, un déplacement sur place.
    expect(findForbiddenWords("Le médecin traitant et la place du marché")).toEqual([]);
    expect(findForbiddenWords("Un logement cher à chauffer")).toEqual([]);
  });

  it("laisse passer les mots proches, les citations et la mention légale", () => {
    expect(findForbiddenWords("Frais de déplacement, remplacement, sur place, impatient")).toEqual(
      [],
    );
    expect(findForbiddenWords("Nous n'écrivons jamais « patient » ni « traitement »")).toEqual([]);
    expect(
      findForbiddenWords(
        "Attention, dans le cadre d'un contrat de placement de travailleurs, le consommateur est l'employeur.",
      ),
    ).toEqual([]);
    expect(findForbiddenWords("Une garantie n'est pas un mot autorisé")).toEqual(["garantir"]);
  });

  it("repère une phrase de plus de 30 mots", () => {
    const longue = Array.from({ length: 31 }, (_, i) => `mot${i}`).join(" ") + ".";
    expect(longSentences(`Courte. ${longue} Encore courte !`)).toEqual([longue]);
    expect(longSentences("Vous, chez vous. Nous, à vos côtés.")).toEqual([]);
  });

  it("bannit les libellés de bouton génériques", () => {
    expect(isBannedLabel("Envoyer")).toBe(true);
    expect(isBannedLabel(" en savoir plus ")).toBe(true);
    expect(isBannedLabel("Cliquez ici pour continuer")).toBe(true);
    expect(isBannedLabel("Envoyer ma demande")).toBe(false);
    expect(isBannedLabel("Être rappelé(e)")).toBe(false);
  });

  it("ignore les notes internes, les sources et ne contrôle les phrases que dans les chapôs", () => {
    const hits = checkDocument("x.json", {
      _lisezmoi: "traitement interne",
      sources: [{ libelle: "Traitement des données" }],
      chapo: "Une phrase. " + Array.from({ length: 31 }, () => "mot").join(" ") + ".",
      texte: Array.from({ length: 40 }, () => "mot").join(" ") + ".",
      bouton: "Envoyer",
    });
    expect(hits.map((h) => `${h.pointer}: ${h.message.split(" — ")[0]}`)).toEqual([
      "chapo: phrase de plus de 30 mots dans un chapô",
      "bouton: libellé de bouton banni « Envoyer »",
    ]);
  });

  describe("sur un dossier de contenu", () => {
    let dir: string;

    beforeEach(async () => {
      dir = await mkdtemp(path.join(os.tmpdir(), "yc-copy-"));
    });

    afterEach(async () => {
      await rm(dir, { recursive: true, force: true });
    });

    it("contrôle aussi l'en-tête et le corps des fichiers MDX", async () => {
      await writeFile(
        path.join(dir, "page.mdx"),
        `---\nh1: "Titre"\nchapo: "Un chapô."\n---\n\n## Section\n\nNos patients sont bien.\n`,
      );
      const errors = await scanContentDir(dir);
      expect(errors).toEqual(["page.mdx › corps : mot interdit « patient »"]);
    });

    it("liste les fichiers fautifs avec le chemin JSON", async () => {
      await mkdir(path.join(dir, "pages"), { recursive: true });
      await writeFile(path.join(dir, "ok.json"), JSON.stringify({ h1: "Vous, chez vous." }));
      await writeFile(
        path.join(dir, "pages", "ko.json"),
        JSON.stringify({ blocs: [{ titre: "Nos patients" }] }),
      );
      const errors = await scanContentDir(dir);
      expect(errors).toEqual([
        "pages/ko.json › blocs[0].titre : mot interdit « patient » — Nos patients",
      ]);
    });
  });
});
