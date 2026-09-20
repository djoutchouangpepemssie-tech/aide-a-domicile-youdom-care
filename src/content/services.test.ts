import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { serviceExemple } from "../../tests/fixtures/service-exemple";
import { readServiceMeta } from "./service-meta";

function toFrontmatter(meta: Record<string, unknown>): string {
  return `---\n${JSON.stringify(meta, null, 2)}\n---\n`;
}

describe("chargeur des pages services", () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(os.tmpdir(), "yc-services-"));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("lit un en-tête valide et le corps MDX", async () => {
    const file = path.join(dir, "exemple.mdx");
    await writeFile(file, `${toFrontmatter(serviceExemple)}\n## Un titre\n\nDu texte.\n`);
    const { meta, body } = await readServiceMeta(file);
    expect(meta.chemin).toBe("/exemple/page-test/");
    expect(body).toContain("## Un titre");
  });

  it("refuse un en-tête invalide avec un message lisible", async () => {
    const file = path.join(dir, "invalide.mdx");
    await writeFile(file, toFrontmatter({ ...serviceExemple, ne_faisons_pas: [] }));
    await expect(readServiceMeta(file)).rejects.toThrow(/en-tête invalide[\s\S]*ne_faisons_pas/);
  });
});
