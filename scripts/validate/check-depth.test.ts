import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  auditDepth,
  clickDepths,
  contextualIncoming,
  formatReport,
  MAX_DEPTH,
  MIN_CONTEXTUAL,
  parseDepthPage,
  readDepthPages,
  runDepthCheck,
} from "./check-depth";

const fixtures = path.resolve(__dirname, "fixtures/depth");

describe("check-depth", () => {
  it("relève les liens internes avec leur zone : en-tête, fil d'Ariane, corps, pied de page", () => {
    const html = `<html><head><title>T</title><meta name="robots" content="noindex"/></head><body>
      <header><a href="/">Accueil</a><a href="/menu/">Menu</a></header>
      <main id="contenu" data-statut="a_relire">
        <nav aria-label="Fil d&#x27;Ariane"><a href="/">Accueil</a><a href="/parent/">Parent</a></nav>
        <p><a href="/corps/?x=1#y">Corps</a> <a href="https://ailleurs.test/">Externe</a> <a href="//cdn.test/x">Protocole</a></p>
        <nav aria-label="Autres pages"><a href="/autre/">Autre</a></nav>
        <script>self.__next_f.push([1,"<a href=\\"/faux/\\">x</a>"])</script>
      </main>
      <footer><a href="/plan-du-site/">Plan</a></footer>
      <nav aria-label="Actions rapides"><a href="/etre-rappele/">Rappel</a></nav>
    </body></html>`;
    const page = parseDepthPage("/page/", html);
    expect(page.robotsNoindex).toBe(true);
    expect(page.review).toBe(true);
    expect(page.links).toEqual([
      { target: "/", zone: "en-tete" },
      { target: "/menu/", zone: "en-tete" },
      { target: "/", zone: "fil-d-ariane" },
      { target: "/parent/", zone: "fil-d-ariane" },
      { target: "/corps/", zone: "corps" },
      { target: "/autre/", zone: "corps" },
      { target: "/plan-du-site/", zone: "pied-de-page" },
      { target: "/etre-rappele/", zone: "pied-de-page" },
    ]);
    // Sans <main>, tout est corps ; sans data-statut, pas de relecture en cours.
    const bare = parseDepthPage("/x/", '<html><body><a href="/a/">a</a></body></html>');
    expect(bare.review).toBe(false);
    expect(bare.links).toEqual([{ target: "/a/", zone: "corps" }]);
  });

  it("calcule la profondeur de clic en largeur, tous liens confondus, et les liens contextuels", () => {
    const pages = [
      {
        path: "/",
        robotsNoindex: false,
        review: false,
        links: [
          { target: "/a/", zone: "corps" as const },
          { target: "/menu/", zone: "en-tete" as const },
        ],
      },
      {
        path: "/a/",
        robotsNoindex: false,
        review: false,
        links: [{ target: "/b/", zone: "corps" as const }],
      },
      {
        path: "/b/",
        robotsNoindex: false,
        review: false,
        links: [
          { target: "/a/", zone: "corps" as const },
          { target: "/a/", zone: "corps" as const },
          { target: "/b/", zone: "corps" as const },
          { target: "/absente/", zone: "corps" as const },
        ],
      },
      { path: "/menu/", robotsNoindex: false, review: false, links: [] },
      {
        path: "/plan-du-site/",
        robotsNoindex: false,
        review: false,
        links: [{ target: "/menu/", zone: "corps" as const }],
      },
      { path: "/seule/", robotsNoindex: false, review: false, links: [] },
    ];
    expect([...clickDepths(pages)]).toEqual([
      ["/", 0],
      ["/a/", 1],
      ["/menu/", 1],
      ["/b/", 2],
    ]);
    const incoming = contextualIncoming(pages);
    // Un lien par page source, jamais soi-même, jamais depuis le plan du site.
    expect(incoming.get("/a/")).toBe(2);
    expect(incoming.get("/b/")).toBe(1);
    expect(incoming.get("/menu/")).toBe(0);
    expect(incoming.get("/seule/")).toBe(0);
    expect(incoming.has("/absente/")).toBe(false);
    expect(clickDepths([]).size).toBe(0);
  });

  it("laisse passer un rendu conforme, fermé (noindex global), /merci/ hors contrôle", async () => {
    const report = auditDepth(await readDepthPages(path.join(fixtures, "conforme")));
    expect(report.errors).toEqual([]);
    expect(report.warnings).toEqual([]);
    expect([...report.depths.values()].every((depth) => depth <= MAX_DEPTH)).toBe(true);
    expect(report.contextual.get("/a/")).toBe(MIN_CONTEXTUAL);
    expect(report.contextual.has("/merci/rappel/")).toBe(false);
    expect(report.contextual.has("/")).toBe(false);
  });

  it("signale la profondeur excessive, l'inatteignable, l'absence de lien contextuel ; avertit sous trois et pour les pages a_relire", async () => {
    const report = auditDepth(await readDepthPages(path.join(fixtures, "fautif")));
    const contextual =
      "aucun lien entrant contextuel (hors en-tête, pied de page, fil d'Ariane, plan du site)";
    expect(report.errors).toEqual([
      `/chrome/ : ${contextual}`,
      "/d4/ : à 4 clics de l'accueil (maximum 3)",
      `/inatteignable/ : ${contextual}`,
      "/inatteignable/ : inatteignable depuis l'accueil par les liens du rendu",
      `/seulement-plan/ : ${contextual}`,
    ]);
    const under = (p: string, n: number) =>
      `${p} : ${n} lien(s) entrant(s) contextuel(s), minimum conseillé 3 (docs/04 §2)`;
    expect(report.warnings).toEqual([
      under("/a/", 2),
      under("/b/", 2),
      under("/d2/", 1),
      under("/d3/", 1),
      under("/d4/", 1),
      under("/plan-du-site/", 1),
      `/relire-chrome/ : ${contextual}`,
      under("/relire/", 1),
    ]);
    expect(report.depths.get("/d4/")).toBe(4);
    expect(report.depths.get("/seulement-plan/")).toBe(2);
    expect(report.depths.has("/inatteignable/")).toBe(false);
  });

  it("rend un rapport : distribution des profondeurs, pages les plus profondes, les moins liées", async () => {
    const report = auditDepth(await readDepthPages(path.join(fixtures, "fautif")));
    const text = formatReport(report, 3);
    expect(text).toContain("  0 clic(s) : 1 page(s)");
    expect(text).toContain("  4 clic(s) : 1 page(s)");
    expect(text).toContain("inatteignables : 1 page(s)");
    expect(text).toMatch(
      /Pages les plus profondes \(3 au plus\) :\n {3}4 {2}\/d4\/\n {3}3 {2}\/d3\//,
    );
    expect(text).toMatch(
      /Pages les moins liées[^\n]*\n {3}0 {2}\/chrome\/\n {3}0 {2}\/inatteignable\//,
    );
  });

  it("exige un rendu construit", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "yc-depth-"));
    try {
      const { errors } = await runDepthCheck({ rootDir: dir, prod: false });
      expect(errors).toHaveLength(1);
      expect(errors[0]).toContain("pnpm build");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
