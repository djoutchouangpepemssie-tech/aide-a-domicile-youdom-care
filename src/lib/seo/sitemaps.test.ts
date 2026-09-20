import { readdir } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { listFormDefinitions } from "@/content/form-definitions";
import { getAidPage } from "@/content/aid-pages";
import { listMdxFiles, readServiceMeta, SERVICES_DIR } from "@/content/service-meta";
import { neverIndexedPaths } from "./indexable";
import {
  absoluteUrl,
  buildSitemapIndex,
  declaredLastmod,
  ISO_DATE,
  isSitemapPath,
  latestLastmod,
  listPopulatedSegments,
  normalizeEntries,
  renderSitemapIndex,
  renderUrlset,
  segmentEntries,
  segmentPath,
  sitemapIndexUrl,
  sitemapSegmentIds,
  sitemapSegments,
} from "./sitemaps";

/** Routes statiques construites depuis src/app (page.tsx sans segment dynamique). */
async function staticAppRoutes(): Promise<string[]> {
  const appDir = path.join(process.cwd(), "src", "app");
  const routes: string[] = [];
  async function walk(dir: string, segments: string[]) {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        if (entry.name.startsWith("[") || entry.name.startsWith("(")) continue;
        await walk(path.join(dir, entry.name), [...segments, entry.name]);
      } else if (entry.name === "page.tsx") {
        routes.push(segments.length === 0 ? "/" : `/${segments.join("/")}/`);
      }
    }
  }
  await walk(appDir, []);
  return routes.sort();
}

describe("plans de site segmentés", () => {
  it("déclare les treize segments de docs/04 §2, chacun avec sa fonction", () => {
    expect(sitemapSegmentIds).toHaveLength(13);
    expect(sitemapSegmentIds).toContain("pages");
    expect(sitemapSegmentIds).toContain("services");
    expect(sitemapSegmentIds.filter((id) => id.startsWith("local-"))).toHaveLength(8);
    expect(sitemapSegments.map((s) => s.id)).toEqual([...sitemapSegmentIds]);
    for (const id of sitemapSegmentIds) expect(id).toMatch(/^[a-z0-9-]+$/);
  });

  it("ne liste que les segments non vides, dans l'ordre", async () => {
    const populated = await listPopulatedSegments();
    const ids = populated.map((s) => s.id);
    expect(ids[0]).toBe("pages");
    for (const segment of populated) expect(segment.entries.length).toBeGreaterThan(0);
    // Sans contenu local ni éditorial, ces segments restent absents.
    for (const id of ["local-paris", "magazine", "lexique", "agences"]) {
      expect(ids).not.toContain(id);
    }
  });

  it("n'émet que des chemins internes avec barre finale, hors zones jamais indexées, datés", async () => {
    for (const segment of await listPopulatedSegments()) {
      for (const entry of segment.entries) {
        expect(entry.path).toMatch(/^\/(?:[a-z0-9-]+\/)*$/);
        expect(entry.lastmod).toMatch(ISO_DATE);
        for (const prefix of neverIndexedPaths) expect(entry.path.startsWith(prefix)).toBe(false);
      }
    }
  });

  it("couvre toutes les routes statiques de src/app sauf celles en noindex", async () => {
    const entries = await segmentEntries("pages");
    const paths = new Set(entries?.map((e) => e.path));
    for (const route of await staticAppRoutes()) {
      const excluded = neverIndexedPaths.some((prefix) => route.startsWith(prefix));
      expect(paths.has(route), route).toBe(!excluded);
    }
    for (const definition of listFormDefinitions()) {
      expect(paths.has(`/demande/${definition.slug}/`)).toBe(true);
    }
    expect(paths.has("/merci/rappel/")).toBe(false);
    expect(paths.has("/styleguide/")).toBe(false);
  });

  it("date les pages d'aides par leur champ maj et les autres pages par la date déclarée", async () => {
    const entries = (await segmentEntries("pages")) ?? [];
    const apa = entries.find((e) => e.path === "/tarifs-et-aides/apa/");
    expect(apa?.lastmod).toBe(getAidPage("apa")?.maj);
    const how = entries.find((e) => e.path === "/comment-ca-marche/");
    expect(how?.lastmod).toBe(declaredLastmod["/comment-ca-marche/"]);
    for (const date of Object.values(declaredLastmod)) expect(date).toMatch(ISO_DATE);
  });

  it("ne met dans le segment services que les pages relues, datées par maj", async () => {
    const expected: Record<string, string> = {};
    for (const file of await listMdxFiles(SERVICES_DIR)) {
      const { meta } = await readServiceMeta(file);
      if (meta.statut === "publie") expected[meta.chemin] = meta.maj;
    }
    const entries = (await segmentEntries("services")) ?? [];
    expect(Object.fromEntries(entries.map((e) => [e.path, e.lastmod]))).toEqual(expected);
  });

  it("renvoie null pour un segment inconnu", async () => {
    expect(await segmentEntries("inconnu")).toBeNull();
  });

  it("normalise : exclut les zones noindex, dédoublonne (date la plus récente), trie", () => {
    const entries = normalizeEntries([
      { path: "/b/", lastmod: "2026-01-02" },
      { path: "/styleguide/", lastmod: "2026-01-01" },
      { path: "/merci/rappel/", lastmod: "2026-01-01" },
      { path: "/api/lead/", lastmod: "2026-01-01" },
      { path: "/a/", lastmod: "2026-01-01" },
      { path: "/a/", lastmod: "2026-03-01" },
      { path: "/sans-barre", lastmod: "2026-01-01" },
    ]);
    expect(entries).toEqual([
      { path: "/a/", lastmod: "2026-03-01" },
      { path: "/b/", lastmod: "2026-01-02" },
    ]);
    expect(() => normalizeEntries([{ path: "/a/", lastmod: "hier" }])).toThrow(/lastmod/);
    expect(isSitemapPath("/")).toBe(true);
    expect(isSitemapPath("/Majuscule/")).toBe(false);
  });

  it("construit des adresses absolues et l'index XML des segments non vides", async () => {
    expect(absoluteUrl("/comment-ca-marche/")).toBe(
      "https://www.youdom-care.com/comment-ca-marche/",
    );
    expect(sitemapIndexUrl()).toBe("https://www.youdom-care.com/sitemap.xml");
    expect(segmentPath("pages")).toBe("/sitemap/pages.xml");
    expect(latestLastmod([{ path: "/a/", lastmod: "2026-01-01" }])).toBe("2026-01-01");
    expect(latestLastmod([])).toBeUndefined();

    const xml = await buildSitemapIndex();
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
    expect(xml).toContain('<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
    expect(xml).toContain("<loc>https://www.youdom-care.com/sitemap/pages.xml</loc>");
    expect(xml).toMatch(/<lastmod>\d{4}-\d{2}-\d{2}<\/lastmod>/);
    expect(xml).not.toContain("/sitemap/magazine.xml");
  });

  it("rend le plan d'un segment avec adresses absolues et lastmod", () => {
    const xml = renderUrlset([{ path: "/comment-ca-marche/", lastmod: "2026-09-20" }]);
    expect(xml).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
    expect(xml).toContain(
      "<url><loc>https://www.youdom-care.com/comment-ca-marche/</loc><lastmod>2026-09-20</lastmod></url>",
    );
    expect(xml.trimEnd().endsWith("</urlset>")).toBe(true);
  });

  it("échappe le XML de l'index", () => {
    const xml = renderSitemapIndex([{ loc: "https://exemple.fr/a?b=1&c=2" }]);
    expect(xml).toContain("<loc>https://exemple.fr/a?b=1&amp;c=2</loc>");
    expect(xml).not.toContain("<lastmod>");
  });
});
