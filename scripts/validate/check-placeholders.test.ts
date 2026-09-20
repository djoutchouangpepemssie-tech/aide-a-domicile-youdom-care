import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  extractVisibleText,
  findPlaceholders,
  runPlaceholdersCheck,
  scanHtmlDir,
} from "./check-placeholders";

describe("check-placeholders", () => {
  it("ne garde que le texte visible", () => {
    const html = `<html><head><style>.a{color:null}</style><script>self.__next_f.push([1,"null undefined TODO"])</script></head>
      <body><!-- TODO commentaire --><main><h1>Youdom&nbsp;Care</h1><p>Vous, chez vous.</p></main></body></html>`;
    expect(extractVisibleText(html)).toBe("Youdom Care Vous, chez vous.");
  });

  it("détecte chaque motif interdit", () => {
    const labels = (t: string) => findPlaceholders(t).map((h) => h.label);
    expect(labels("À faire : TODO plus tard")).toEqual(["TODO"]);
    expect(labels("Lorem ipsum dolor")).toEqual(["Lorem ipsum"]);
    expect(labels("Bonjour {{ nom }}")).toEqual(["gabarit non rendu « {{ »"]);
    expect(labels("Un conseiller vous rappelle. [E5] En cas")).toEqual([
      "engagement non résolu « [E…] »",
    ]);
    expect(labels("Environ {h} heures")).toEqual(["jeton non remplacé « {…} »"]);
    expect(labels("Téléphone : null")).toEqual(["« null »"]);
    expect(labels("Horaires : undefined")).toEqual(["« undefined »"]);
    expect(labels("Tarif à compléter")).toEqual(["champ à compléter"]);
  });

  it("laisse passer un texte propre, y compris les mots proches", () => {
    expect(
      findPlaceholders("Nulle part ailleurs. À définir ensemble. Le fil, notre compagnon."),
    ).toEqual([]);
  });

  describe("sur un dossier de rendu", () => {
    let dir: string;

    beforeEach(async () => {
      dir = await mkdtemp(path.join(os.tmpdir(), "yc-placeholders-"));
    });

    afterEach(async () => {
      await rm(dir, { recursive: true, force: true });
    });

    it("liste les fichiers fautifs avec un extrait", async () => {
      await mkdir(path.join(dir, "aide"), { recursive: true });
      await writeFile(path.join(dir, "index.html"), "<main><p>Vous, chez vous.</p></main>");
      await writeFile(path.join(dir, "aide", "apa.html"), "<main><p>Montant : TODO</p></main>");
      await writeFile(path.join(dir, "_global-error.html"), "<p>TODO ignoré</p>");
      const errors = await scanHtmlDir(dir);
      expect(errors).toHaveLength(1);
      expect(errors[0]).toContain(path.join("aide", "apa.html"));
      expect(errors[0]).toContain("TODO");
    });

    it("exige un build préalable", async () => {
      const { errors } = await runPlaceholdersCheck({ rootDir: dir, prod: false });
      expect(errors[0]).toContain("pnpm build");
    });
  });
});
