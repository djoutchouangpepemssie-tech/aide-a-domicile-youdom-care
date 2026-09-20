import { describe, expect, it } from "vitest";
import { serviceExemple } from "../../../tests/fixtures/service-exemple";
import { listServicePages } from "@/content/services";
import type { ServicePage } from "@/content/service-schema";
import {
  RELATED_MAX,
  RELATED_MIN,
  relatedCandidates,
  relatedLinks,
  transverseByPublic,
  type RelatedSource,
} from "./related";

/** Univers fictif autour de la fixture : un pilier, ses sous-pages, d'autres publics, des services. */
function page(overrides: Partial<ServicePage> & Pick<ServicePage, "chemin">): RelatedSource {
  return {
    type: "pathologie",
    public: "neuro",
    pilier: "/exemple/",
    soeurs: ["/exemple/soeur-un/", "/exemple/soeur-deux/"],
    h1: `Titre de ${overrides.chemin}`,
    ...overrides,
  };
}

const univers: RelatedSource[] = [
  page({ chemin: "/exemple/", type: "pilier", pilier: undefined, h1: "Pilier fictif" }),
  serviceExemple,
  page({ chemin: "/exemple/soeur-un/", ordre: 2, libelle_court: "Sœur une", icone: "memoire" }),
  page({ chemin: "/exemple/soeur-deux/", ordre: 3, libelle_court: "Sœur deux" }),
  page({ chemin: "/exemple/troisieme/", ordre: 4, libelle_court: "Troisième" }),
  page({ chemin: "/exemple/quatrieme/", libelle_court: "Quatrième" }),
  page({ chemin: "/exemple/cinquieme/", ordre: 5, libelle_court: "Cinquième" }),
  page({ chemin: "/exemple/sixieme/", ordre: 6, libelle_court: "Sixième" }),
  page({
    chemin: "/ailleurs/",
    type: "pilier",
    public: "aidant",
    pilier: undefined,
    h1: "Un autre pilier",
  }),
  page({
    chemin: "/services/garde-de-nuit/",
    type: "service",
    public: "transverse",
    pilier: undefined,
    soeurs: ["/services/presence-24h-24/", "/exemple/"],
    libelle_court: "Garde de nuit",
    icone: "nuit",
  }),
  page({
    chemin: "/services/presence-24h-24/",
    type: "service",
    public: "transverse",
    pilier: undefined,
    soeurs: ["/services/garde-de-nuit/", "/exemple/soeur-un/"],
    libelle_court: "Présence 24h/24",
  }),
];

describe("relatedLinks (fixture)", () => {
  it("place la famille d'abord, puis les sœurs, sans la page ni son pilier, dans un ordre stable", () => {
    const links = relatedLinks(serviceExemple, univers);
    const hrefs = links.map((l) => l.href);
    expect(hrefs).not.toContain("/exemple/page-test/");
    expect(hrefs).not.toContain("/exemple/");
    expect(hrefs.length).toBeLessThanOrEqual(RELATED_MAX);
    expect(hrefs.length).toBeGreaterThanOrEqual(RELATED_MIN);
    // Famille par `ordre` (2, 3, 4, 5, 6) puis sans ordre (quatrième) : six places, les sœurs
    // (ordre 2 et 3) sont dedans.
    expect(hrefs).toEqual([
      "/exemple/soeur-un/",
      "/exemple/soeur-deux/",
      "/exemple/troisieme/",
      "/exemple/cinquieme/",
      "/exemple/sixieme/",
      "/exemple/quatrieme/",
    ]);
    expect(links.map((l) => l.tier)).toEqual(Array(6).fill("famille"));
    // Titres et icônes : `libelle_court` puis `icone` de la page cible.
    expect(links[0]).toMatchObject({ label: "Sœur une", icone: "memoire", public: "neuro" });
    expect(links[1]?.icone).toBeUndefined();
    // Ordre d'entrée sans effet.
    expect(relatedLinks(serviceExemple, [...univers].reverse())).toEqual(links);
  });

  it("garde toujours les sœurs déclarées, même au-delà du maximum", () => {
    const soeurs = ["/services/garde-de-nuit/", "/ailleurs/"];
    const links = relatedLinks({ ...serviceExemple, soeurs }, univers);
    expect(links).toHaveLength(RELATED_MAX);
    const hrefs = links.map((l) => l.href);
    expect(hrefs).toContain("/services/garde-de-nuit/");
    expect(hrefs).toContain("/ailleurs/");
    // Les sœurs viennent après la famille (ordre des paliers), les places restantes vont à la famille.
    expect(hrefs.slice(0, 4)).toEqual([
      "/exemple/soeur-un/",
      "/exemple/soeur-deux/",
      "/exemple/troisieme/",
      "/exemple/cinquieme/",
    ]);
    expect(links.find((l) => l.href === "/ailleurs/")).toMatchObject({
      tier: "soeurs",
      label: "Un autre pilier",
    });
  });

  it("ignore les sœurs absentes des pages construites et complète avec le public et les services", () => {
    const petit = univers.filter(
      (p) =>
        !["/exemple/soeur-deux/", "/exemple/troisieme/", "/exemple/quatrieme/"].includes(p.chemin),
    );
    const links = relatedLinks(
      { ...serviceExemple, soeurs: ["/exemple/soeur-deux/", "/exemple/soeur-un/"] },
      petit,
    );
    const hrefs = links.map((l) => l.href);
    expect(hrefs).not.toContain("/exemple/soeur-deux/");
    expect(hrefs.slice(0, 3)).toEqual([
      "/exemple/soeur-un/",
      "/exemple/cinquieme/",
      "/exemple/sixieme/",
    ]);
    // Services transverses conseillés au public neuro, dans l'ordre du registre.
    expect(hrefs).toContain("/services/garde-de-nuit/");
    expect(links.find((l) => l.href === "/services/garde-de-nuit/")?.tier).toBe("transverse");
  });

  it("nomme un pilier par son public quand il n'a pas de libellé court", () => {
    const links = relatedLinks(
      { ...serviceExemple, soeurs: ["/ailleurs/", "/exemple/soeur-un/"] },
      univers,
      { publics: { aidant: "Aidants" } },
    );
    expect(links.find((l) => l.href === "/ailleurs/")?.label).toBe("Aidants");
  });

  it("pour un service transverse : les autres services, puis les piliers des publics conseillés", () => {
    const nuit = univers.find((p) => p.chemin === "/services/garde-de-nuit/");
    if (!nuit) throw new Error("fixture");
    const tiers = relatedCandidates(nuit, univers);
    expect(tiers.famille).toEqual([]);
    expect(tiers.soeurs.map((p) => p.chemin)).toEqual(["/services/presence-24h-24/", "/exemple/"]);
    expect(tiers.public.map((p) => p.chemin)).toEqual(["/services/presence-24h-24/"]);
    // Garde de nuit est conseillée aux publics neuro et aidant : leurs piliers.
    expect(tiers.transverse.map((p) => p.chemin)).toEqual(["/exemple/", "/ailleurs/"]);
    const links = relatedLinks(nuit, univers);
    expect(links.map((l) => l.href)).toEqual([
      "/services/presence-24h-24/",
      "/exemple/",
      "/ailleurs/",
    ]);
    expect(links.map((l) => l.tier)).toEqual(["soeurs", "soeurs", "transverse"]);
  });

  it("pour un pilier : ses sous-pages, puis ses sœurs, puis les services conseillés", () => {
    const pilier = univers.find((p) => p.chemin === "/exemple/");
    if (!pilier) throw new Error("fixture");
    const links = relatedLinks(
      { ...pilier, soeurs: ["/ailleurs/", "/services/presence-24h-24/"] },
      univers,
    );
    expect(links).toHaveLength(RELATED_MAX);
    expect(links.map((l) => l.href)).toContain("/ailleurs/");
    expect(links.map((l) => l.href)).toContain("/services/presence-24h-24/");
    expect(links[0]).toMatchObject({ href: "/exemple/page-test/", tier: "famille" });
  });

  it("renvoie ce qui existe quand l'univers est trop petit", () => {
    expect(relatedLinks(serviceExemple, [serviceExemple])).toEqual([]);
    expect(relatedLinks(serviceExemple, [])).toEqual([]);
  });
});

describe("relatedLinks (pages réelles)", () => {
  it("donne à chaque page service 3 à 6 liens vers des pages existantes, jamais elle-même, dans un ordre stable", async () => {
    const pages = (await listServicePages()).map((p) => p.meta);
    const known = new Set(pages.map((p) => p.chemin));
    expect(pages.length).toBeGreaterThanOrEqual(26);
    for (const page of pages) {
      const links = relatedLinks(page, pages);
      const hrefs = links.map((l) => l.href);
      expect(hrefs.length, page.chemin).toBeGreaterThanOrEqual(RELATED_MIN);
      expect(hrefs.length, page.chemin).toBeLessThanOrEqual(RELATED_MAX);
      expect(new Set(hrefs).size, page.chemin).toBe(hrefs.length);
      expect(hrefs, page.chemin).not.toContain(page.chemin);
      for (const href of hrefs) expect(known.has(href), `${page.chemin} → ${href}`).toBe(true);
      for (const soeur of page.soeurs) {
        if (known.has(soeur)) expect(hrefs, `${page.chemin} → ${soeur}`).toContain(soeur);
      }
      expect(relatedLinks(page, [...pages].reverse()), page.chemin).toEqual(links);
      for (const link of links) expect(link.label.length, link.href).toBeGreaterThan(0);
    }
  }, 60_000);

  it("le registre des services conseillés ne cite que des services transverses existants", async () => {
    const pages = (await listServicePages()).map((p) => p.meta);
    const services = new Set(pages.filter((p) => p.type === "service").map((p) => p.chemin));
    for (const cited of Object.values(transverseByPublic).flat()) {
      expect(services.has(cited), cited).toBe(true);
    }
  }, 60_000);
});
