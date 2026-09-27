import { readdir } from "node:fs/promises";
import path from "node:path";
import { render, screen, within } from "@testing-library/react";
import { beforeAll, describe, expect, it } from "vitest";
import { listServicePages } from "@/content/services";
import { neverIndexedPaths } from "@/lib/seo/indexable";
import SiteMapRoute, { generateMetadata, SITE_MAP_PATH } from "./page";
import { buildSiteMap, flattenSiteMap, type SiteMapGroup } from "./site-map";

/** `next/link` retire la barre finale hors de Next : on compare sans elle. */
const bare = (value: string | null | undefined) => (value ?? "").replace(/\/(?=\?|$)/, "");

/** Routes statiques de src/app (dossiers avec page.tsx, sans segment dynamique), barre finale. */
async function staticAppRoutes(): Promise<string[]> {
  const root = path.join(process.cwd(), "src", "app");
  const routes: string[] = [];
  const walk = async (dir: string, segments: string[]) => {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        if (entry.name.startsWith("[")) continue;
        await walk(path.join(dir, entry.name), [...segments, entry.name]);
      } else if (entry.name === "page.tsx") {
        routes.push(segments.length === 0 ? "/" : `/${segments.join("/")}/`);
      }
    }
  };
  await walk(root, []);
  return routes.sort();
}

describe("Plan du site", () => {
  let groups: SiteMapGroup[];
  let hrefs: string[];

  beforeAll(async () => {
    groups = await buildSiteMap();
    hrefs = flattenSiteMap(groups);
  }, 60_000);

  it("a des balises titre et description dans les longueurs de docs/01 §8, canonique sur /plan-du-site/", () => {
    const metadata = generateMetadata();
    const title = String(metadata.title);
    expect(title.length).toBeGreaterThanOrEqual(50);
    expect(title.length).toBeLessThanOrEqual(60);
    expect(String(metadata.description).length).toBeGreaterThanOrEqual(140);
    expect(String(metadata.description).length).toBeLessThanOrEqual(155);
    expect(String(metadata.alternates?.canonical)).toMatch(/\/plan-du-site\/$/);
  });

  it("liste chaque page service construite, les piliers avant leurs sous-pages en retrait", async () => {
    const services = (await listServicePages()).map((p) => p.meta);
    for (const service of services) expect(hrefs, service.chemin).toContain(service.chemin);
    const pourQui = groups.find((g) => g.id === "pour_qui");
    expect(pourQui?.entries.map((e) => e.href)).toEqual([
      "/maladies-neurodegeneratives/",
      "/personnes-agees/",
      "/adultes-en-situation-de-handicap/",
      "/enfants-en-situation-de-handicap/",
    ]);
    const neuro = pourQui?.entries[0];
    expect(neuro?.label).toBe("Maladies neurodégénératives");
    expect(neuro?.children?.map((c) => c.label)).toEqual([
      "Alzheimer",
      "Parkinson",
      "Sclérose en plaques",
      "Corps de Lewy",
      "Dégénérescence fronto-temporale",
      "Charcot",
      "Huntington",
    ]);
    const aidants = groups.find((g) => g.id === "aidants");
    expect(aidants?.entries[0]?.href).toBe("/aidants/");
    expect(aidants?.entries[0]?.children?.map((c) => c.href)).toEqual([
      "/aidants/solutions-de-repit/",
      "/aidants/ou-en-etes-vous/",
    ]);
    const servicesGroup = groups.find((g) => g.id === "services");
    expect(servicesGroup?.entries.map((e) => e.label)).toEqual([
      "Garde de nuit",
      "Présence 24h/24",
      "Sortie d'hospitalisation",
      "Garde-malade",
      "Accompagnement en vacances",
      "Remplacement d'auxiliaire de vie",
    ]);
    // Aucun doublon, aucune page jamais indexée, pas le plan lui-même, un groupe légal vide masqué.
    expect(new Set(hrefs).size).toBe(hrefs.length);
    for (const href of hrefs) {
      for (const prefix of neverIndexedPaths) expect(href.startsWith(prefix), href).toBe(false);
    }
    expect(hrefs).not.toContain(SITE_MAP_PATH);
    expect(groups.map((g) => g.id)).not.toContain("legal");
  });

  it("déclare des routes statiques qui existent, et n'oublie aucune page statique indexable", async () => {
    const appRoutes = await staticAppRoutes();
    const ignored = [...neverIndexedPaths, SITE_MAP_PATH];
    const services = new Set((await listServicePages()).map((p) => p.meta.chemin));
    // Chaque adresse du plan est une route statique, une page service ou une page dynamique connue.
    for (const href of hrefs) {
      const known =
        appRoutes.includes(href) ||
        services.has(href) ||
        /^\/tarifs-et-aides\/[a-z0-9-]+\/$/.test(href) ||
        /^\/demande\/[a-z0-9-]+\/$/.test(href) ||
        /^\/agences\/[a-z0-9-]+\/$/.test(href) ||
        /^\/outils\/[a-z0-9-]+\/$/.test(href) ||
        /^\/magazine\/(?:[a-z0-9-]+\/)+$/.test(href) ||
        /^\/aide-a-domicile\/(?:[a-z0-9-]+\/)+$/.test(href);
      expect(known, `${href} n'existe pas dans src/app`).toBe(true);
    }
    // Chaque page statique indexable de src/app est dans le plan.
    for (const route of appRoutes) {
      if (ignored.some((prefix) => route.startsWith(prefix))) continue;
      expect(hrefs, `${route} manque au plan du site`).toContain(route);
    }
  });

  it("rend le fil d'Ariane, un seul H1, un groupe par navigation et des liens imbriqués", async () => {
    render(await SiteMapRoute());
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Plan du site");
    expect(
      screen.getByRole("navigation", { name: "Fil d’Ariane" }).querySelector("[aria-current=page]"),
    ).toHaveTextContent("Plan du site");
    for (const group of groups) {
      const nav = screen.getByRole("navigation", { name: group.title });
      expect(within(nav).getAllByRole("link").length).toBeGreaterThanOrEqual(group.entries.length);
    }
    const pourQui = screen.getByRole("navigation", { name: "Pour qui ?" });
    const pilier = within(pourQui).getByRole("link", { name: "Personnes âgées" });
    expect(bare(pilier.getAttribute("href"))).toBe("/personnes-agees");
    // Les sous-pages sont dans une liste imbriquée sous le pilier.
    const nested = pilier.closest("li")?.querySelector("ul");
    expect(nested).not.toBeNull();
    expect(
      bare(
        within(nested as HTMLElement)
          .getByRole("link", { name: "Vie quotidienne" })
          .getAttribute("href"),
      ),
    ).toBe("/personnes-agees/vie-quotidienne");
    const rendered = screen
      .getAllByRole("link")
      .map((link) => bare(link.getAttribute("href")))
      .filter((href) => href !== "" && href !== "/");
    for (const href of hrefs) {
      if (href === "/") continue;
      expect(rendered, href).toContain(bare(href));
    }
  }, 60_000);
});
