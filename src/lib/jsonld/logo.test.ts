import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { findLogo } from "./logo";

describe("jsonld/findLogo", () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(os.tmpdir(), "yc-logo-"));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("renvoie null tant qu'aucun fichier de logo n'existe (Q-CONTENU-6)", () => {
    expect(findLogo(dir)).toBeNull();
    expect(findLogo()).toBeNull();
  });

  it("renvoie le chemin web du premier logo trouvé, le SVG d'abord", async () => {
    await writeFile(path.join(dir, "logo.png"), "png");
    expect(findLogo(dir)).toBe("/images/marque/logo.png");
    await writeFile(path.join(dir, "logo.svg"), "<svg/>");
    expect(findLogo(dir)).toBe("/images/marque/logo.svg");
  });
});
