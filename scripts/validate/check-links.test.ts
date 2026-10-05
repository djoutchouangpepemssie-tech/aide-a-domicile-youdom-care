import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  plannedRoutes,
  builtRoutes,
  checkExternal,
  checkRefs,
  extractLinks,
  isInternalHref,
  normalizeInternal,
  runLinksCheck,
} from "./check-links";

describe("check-links", () => {
  it("reconnaît les chemins internes et les normalise avec barre finale", () => {
    expect(isInternalHref("/personnes-agees/")).toBe(true);
    expect(isInternalHref("/tarifs-et-aides/apa")).toBe(true);
    expect(isInternalHref("/etre-rappele/?commune=75056")).toBe(true);
    expect(isInternalHref("https://www.service-public.gouv.fr/")).toBe(false);
    expect(isInternalHref("//cdn.example")).toBe(false);
    expect(isInternalHref("mailto:contact@exemple.fr")).toBe(false);
    expect(normalizeInternal("/tarifs-et-aides/apa")).toBe("/tarifs-et-aides/apa/");
    expect(normalizeInternal("/etre-rappele/?commune=75056#form")).toBe("/etre-rappele/");
    expect(normalizeInternal("/")).toBe("/");
  });

  it("relève les liens des JSON (hors clés _) et des MDX (en-tête et corps)", () => {
    const json = JSON.stringify({
      _lisezmoi: "/ignore/",
      nav: [{ href: "/aidants/" }, { href: "https://exemple.fr/" }],
      texte: "sans lien",
    });
    expect(extractLinks("x.json", json).map((r) => r.href)).toEqual(["/aidants/"]);

    const mdx = `---\nchemin: /a/\npilier: /p/\nsoeurs:\n  - /s1/\n  - /s2/\n---\n\nVoir [la page](/b/) et [le site](https://exemple.fr/) et [ancre](#ici).\n`;
    const refs = extractLinks("x.mdx", mdx);
    expect(refs.map((r) => r.href)).toEqual(["/a/", "/p/", "/s1/", "/s2/", "/b/"]);
    expect(refs.at(-1)?.pointer).toBe("corps");
  });

  it("distingue lien cassé (erreur) et page prévue par le plan (avertissement)", () => {
    // La page prévue est la première encore listée ; quand le plan est entièrement livré, le lien
    // devient une erreur comme les autres.
    const [planned, phase] = Object.entries(plannedRoutes)[0] ?? ["/page-prevue/", null];
    const routes = new Set(["/", "/aidants/"]);
    const refs = [
      { file: "/root/content/a.json", pointer: "nav[0].href", href: "/aidants/" },
      { file: "/root/content/a.json", pointer: "nav[1].href", href: planned },
      { file: "/root/content/b.mdx", pointer: "corps", href: "/introuvable/" },
    ];
    const report = checkRefs(refs, routes, "/root");
    const plannedWarning = `content/a.json › nav[1].href : ${planned} prévu en ${phase}, pas encore construit`;
    expect(report.warnings).toEqual(phase ? [plannedWarning] : []);
    expect(report.errors).toEqual([
      ...(phase ? [] : [`content/a.json › nav[1].href : lien interne cassé → ${planned}`]),
      "content/b.mdx › corps : lien interne cassé → /introuvable/",
    ]);
  });

  it("ouvre chaque source externe une fois : 404 et 410 en erreur, refus et panne en avertissement", async () => {
    const calls: string[] = [];
    const fake = (async (input: string | URL | Request) => {
      const url = String(input);
      calls.push(url);
      if (url.includes("absente")) return new Response("", { status: 404 });
      if (url.includes("partie")) return new Response("", { status: 410 });
      if (url.includes("filtre")) return new Response("", { status: 403 });
      if (url.includes("trop-vite")) return new Response("", { status: 429 });
      if (url.includes("en-panne")) return new Response("", { status: 503 });
      if (url.includes("bloque"))
        throw new TypeError("fetch failed", { cause: new Error("ECONNRESET") });
      return new Response("ok", { status: 200 });
    }) as typeof fetch;
    const report = await checkExternal(
      [
        "https://ok.example/",
        "https://ok.example/",
        "https://absente.example/",
        "https://partie.example/",
        "https://filtre.example/",
        "https://trop-vite.example/",
        "https://en-panne.example/",
        "https://bloque.example/",
      ],
      fake,
      2,
    );
    expect(calls).toHaveLength(7);
    expect(report.errors).toEqual([
      "https://absente.example/ → HTTP 404",
      "https://partie.example/ → HTTP 410",
    ]);
    // Un 403, un 429 ou un 5xx dit « je refuse de répondre », pas « la page n'existe plus » :
    // plusieurs sources publiques filtrent les agents non-navigateurs (docs/AUDIT_GLOBAL.md, Q-2).
    expect(report.warnings).toEqual([
      "https://bloque.example/ → injoignable depuis ce poste (ECONNRESET), à vérifier à la main",
      "https://en-panne.example/ → HTTP 503 (refus de répondre, pas une page disparue), à vérifier à la main",
      "https://filtre.example/ → HTTP 403 (refus de répondre, pas une page disparue), à vérifier à la main",
      "https://trop-vite.example/ → HTTP 429 (refus de répondre, pas une page disparue), à vérifier à la main",
    ]);
  });

  describe("sur un rendu", () => {
    let dir: string;
    beforeEach(async () => {
      dir = await mkdtemp(path.join(os.tmpdir(), "yc-links-"));
    });
    afterEach(async () => {
      await rm(dir, { recursive: true, force: true });
    });

    it("lit les routes construites et exige un build", async () => {
      const app = path.join(dir, ".next", "server", "app");
      await mkdir(path.join(app, "services"), { recursive: true });
      await writeFile(path.join(app, "index.html"), "<html></html>");
      await writeFile(path.join(app, "_not-found.html"), "<html></html>");
      await writeFile(path.join(app, "aidants.html"), "<html></html>");
      await writeFile(path.join(app, "services", "garde-de-nuit.html"), "<html></html>");
      expect([...(await builtRoutes(app))].sort()).toEqual([
        "/",
        "/aidants/",
        "/services/garde-de-nuit/",
      ]);

      await mkdir(path.join(dir, "content"), { recursive: true });
      await writeFile(
        path.join(dir, "content", "nav.json"),
        JSON.stringify({ items: [{ href: "/aidants/" }, { href: "/perdu/" }] }),
      );
      const res = await runLinksCheck({ rootDir: dir, prod: false });
      expect(res.errors).toEqual([
        "content/nav.json › items[1].href : lien interne cassé → /perdu/",
      ]);

      await rm(path.join(dir, ".next"), { recursive: true, force: true });
      const noBuild = await runLinksCheck({ rootDir: dir, prod: false });
      expect(noBuild.errors[0]).toMatch(/pnpm build/);
    });
  });
});
