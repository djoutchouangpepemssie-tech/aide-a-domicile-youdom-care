import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  collectFreshnessWarnings,
  isOverdue,
  runFreshnessCheck,
  todayIso,
} from "./check-freshness";

const rootDir = path.resolve(__dirname, "../..");
const fixture = path.join(rootDir, "tests", "fixtures", "magazine", "valide.mdx");

describe("check-freshness", () => {
  let tmp: string;

  beforeEach(async () => {
    tmp = await mkdtemp(path.join(os.tmpdir(), "yc-freshness-"));
    await mkdir(path.join(tmp, "content", "magazine"), { recursive: true });
    await mkdir(path.join(tmp, "content", "aides"), { recursive: true });
  });

  afterEach(async () => {
    await rm(tmp, { recursive: true, force: true });
  });

  it("compare des dates ISO", () => {
    expect(isOverdue("2026-01-01", "2026-01-02")).toBe(true);
    expect(isOverdue("2026-01-02", "2026-01-02")).toBe(false);
    expect(todayIso(new Date("2026-09-27T10:00:00Z"))).toBe("2026-09-27");
  });

  it("avertit pour un article dont la révision est passée et une page d'aide de plus de six mois", async () => {
    const article = await readFile(fixture, "utf8");
    await writeFile(
      path.join(tmp, "content", "magazine", "ancien.mdx"),
      article
        .replace('publie_le: "2026-09-20"', 'publie_le: "2024-01-10"')
        .replace('maj_le: "2026-09-27"', 'maj_le: "2024-01-10"'),
    );
    await writeFile(path.join(tmp, "content", "magazine", "recent.mdx"), article);
    const aid = JSON.parse(
      await readFile(path.join(rootDir, "content", "aides", "apa.json"), "utf8"),
    ) as { maj: string };
    await writeFile(
      path.join(tmp, "content", "aides", "apa.json"),
      JSON.stringify({ ...aid, maj: "2025-01-01" }),
    );
    await writeFile(path.join(tmp, "content", "aides", "invalide.json"), "{}");

    const warnings = await collectFreshnessWarnings(tmp, "2026-09-27");
    expect(warnings).toHaveLength(2);
    expect(warnings[0]).toMatch(/ancien\.mdx : révision prévue le 2025-01-10 dépassée/);
    expect(warnings[1]).toMatch(/aides\/apa\.json : mise à jour du 2025-01-01, plus de 6 mois/);

    // Rien n'est échu vu d'une date antérieure.
    expect(await collectFreshnessWarnings(tmp, "2024-06-01")).toEqual([]);
  });

  it("ne produit jamais d'erreur, même sur le dépôt", async () => {
    const { errors, warnings } = await runFreshnessCheck({ rootDir, prod: false });
    expect(errors).toEqual([]);
    for (const warning of warnings) expect(warning).toMatch(/dépassée|plus de 6 mois/);
  });
});
