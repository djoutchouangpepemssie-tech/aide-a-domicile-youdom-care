import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  auditPages,
  decodeEntities,
  parsePage,
  routeOf,
  runSeoCheck,
  scanSeo,
  tagAttributes,
} from "./check-seo";

const fixtures = path.resolve(__dirname, "fixtures/seo");
const site = "https://exemple.test";

describe("check-seo", () => {
  it("lit les balises de l'en-tête, les titres, les images et les liens internes", () => {
    const html = `<html><head>
      <title>Titre &amp; Cie</title>
      <meta content="Une description d&#x27;essai" name="description"/>
      <meta name="robots" content="noindex, nofollow"/>
      <link rel="canonical" href="https://exemple.test/page/"/>
      <script>self.__next_f.push([1,"<h1>faux</h1><a href=\\"/faux/\\">x</a>"])</script>
      </head><body>
      <svg><title>Icône</title></svg>
      <h1>Un</h1><h2 class="x">Deux</h2><h3>Trois</h3>
      <img src="/a.jpg" alt="Une chaise"/><img src="/b.jpg" alt/><img src="/c.jpg" alt="" aria-hidden="true"/><img src="/d.jpg"/>
      <a href="/aidants/?commune=1#haut">a</a><a href="//cdn.test/x">b</a><a href="https://exemple.test/">c</a><a href="/">d</a>
      <!-- <a href="/commentaire/">e</a> -->
      </body></html>`;
    const facts = parsePage("/page/", html);
    expect(facts.title).toBe("Titre & Cie");
    expect(facts.description).toBe("Une description d'essai");
    expect(facts.robotsNoindex).toBe(true);
    expect(facts.canonical).toBe("https://exemple.test/page/");
    expect(facts.h1Count).toBe(1);
    expect(facts.headings).toEqual([1, 2, 3]);
    expect(facts.images).toEqual([
      { src: "/a.jpg", alt: "Une chaise", decorative: false },
      { src: "/b.jpg", alt: "", decorative: false },
      { src: "/c.jpg", alt: "", decorative: true },
      { src: "/d.jpg", alt: null, decorative: false },
    ]);
    expect(facts.links).toEqual(["/aidants/", "/"]);
  });

  it("outils : entités, attributs, chemin d'un fichier", () => {
    expect(decodeEntities("l&#x27;aide &amp; l&#233;g&egrave;re")).toBe("l'aide & lég&egrave;re");
    expect([...tagAttributes('<img src="/x.jpg" alt ROLE="presentation" data-a=\'1\'>')]).toEqual([
      ["src", "/x.jpg"],
      ["alt", ""],
      ["role", "presentation"],
      ["data-a", "1"],
    ]);
    expect(routeOf("index.html")).toBe("/");
    expect(routeOf(path.join("tarifs-et-aides", "apa.html"))).toBe("/tarifs-et-aides/apa/");
  });

  it("laisse passer un rendu conforme, y compris fermé (noindex global) et avec /merci/", async () => {
    const report = await scanSeo(path.join(fixtures, "conforme"), site);
    expect(report).toEqual({ errors: [], warnings: [] });
  });

  it("signale chaque faute avec le chemin, le motif et la valeur", async () => {
    const { errors, warnings } = await scanSeo(path.join(fixtures, "fautif"), site);
    expect(warnings).toEqual([]);
    expect(errors).toEqual([
      "/canonique/ : canonique différente de l'adresse de la page — https://exemple.test/ailleurs/",
      "/deux-h1/ : H1 multiple — 2 balises h1",
      "/double-a/, /double-b/ : description en double — « Description de démonstration numéro double, écrite pour le contrôle SEO du site : elle tient entre cent quarante et cent cinquante-cinq caractères. »",
      "/orpheline/ : page orpheline — aucun lien interne entrant depuis une autre page",
      '/sans-alt/ : image avec alt vide sans role="presentation" ni aria-hidden — /alt-vide.jpg',
      "/sans-alt/ : image sans alt — /sans-attribut.jpg",
      "/sans-titre/ : description absente",
      "/sans-titre/ : titre absent",
      "/saut/ : saut de hiérarchie des titres — h2 → h4",
      "/titre-long/ : titre hors 50–60 caractères (79) — « Un titre beaucoup trop long pour tenir dans la fenêtre de résultats des moteurs »",
    ]);
  });

  it("exclut les pages noindex seulement quand le site est ouvert", () => {
    const base = {
      title: "Page de démonstration numéro un pour le contrôle SEO",
      description:
        "Description de démonstration numéro un, écrite pour le contrôle SEO du site : elle tient entre cent quarante et cent cinquante-cinq caractères.",
      h1Count: 1,
      headings: [1],
      images: [],
    };
    const home = { ...base, path: "/", canonical: `${site}/`, links: ["/a/"] };
    const short = {
      ...base,
      path: "/a/",
      title: "Court",
      description: base.description.replace("numéro un", "numéro deux"),
      canonical: `${site}/a/`,
      links: ["/"],
    };
    // Site fermé : tout est noindex, la page courte est contrôlée.
    const closed = auditPages(
      [
        { ...home, robotsNoindex: true },
        { ...short, robotsNoindex: true },
      ],
      site,
    );
    expect(closed.errors).toEqual(["/a/ : titre hors 50–60 caractères (5) — « Court »"]);
    // Site ouvert : la page noindex est exclue.
    const open = auditPages(
      [
        { ...home, robotsNoindex: false },
        { ...short, robotsNoindex: true },
      ],
      site,
    );
    expect(open.errors).toEqual([]);
  });

  it("exige un build préalable", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "yc-seo-"));
    try {
      const { errors } = await runSeoCheck({ rootDir: dir, prod: false });
      expect(errors[0]).toContain("pnpm build");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
