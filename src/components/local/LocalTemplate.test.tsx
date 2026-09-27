import { render, screen, within } from "@testing-library/react";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { localDataExemple, localEditorialExemple } from "../../../tests/fixtures/local-exemple";
import {
  getAids,
  getInterfaceTexts,
  getNavigation,
  getSiteConfig,
  getWeekExamples,
} from "@/content/loader";
import { localDataSchema, type LocalData } from "@/content/local-schema";
import { LocalTemplate, demographyFacts, type LocalTemplateData } from "./LocalTemplate";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

/** `next/link` retire la barre finale hors de Next (trailingSlash) : on compare sans elle. */
const bare = (value: string | null | undefined) => (value ?? "").replace(/\/(?=\?|$)/, "");
function expectHref(element: HTMLElement, expected: string) {
  expect(bare(element.getAttribute("href"))).toBe(bare(expected));
}

function data(overrides: Partial<LocalTemplateData> = {}): LocalTemplateData {
  const config = getSiteConfig();
  return {
    data: localDataExemple,
    editorial: localEditorialExemple,
    texts: getInterfaceTexts(),
    navigation: getNavigation(),
    phone: "01 84 80 17 03",
    agency: config.agences.find((a) => a.id === "puteaux") ?? null,
    weekExample: getWeekExamples().exemples.find((e) => e.id === "suzanne") ?? null,
    aids: getAids().aides.filter((aid) => aid.id === "apa" || aid.id === "pch"),
    accompagnements: [
      { chemin: "/personnes-agees/", libelle: "Personnes âgées", icone: "public-personnes-agees" },
      { chemin: "/services/garde-de-nuit/", libelle: "Garde de nuit", icone: "nuit" },
    ],
    crumbs: [
      { label: "Territoires", href: "/aide-a-domicile/" },
      { label: "Hauts-de-Seine", href: "/aide-a-domicile/hauts-de-seine/" },
    ],
    neighbourPaths: { "92998": "/aide-a-domicile/hauts-de-seine/voisine-la-proche/" },
    departementHref: "/aide-a-domicile/hauts-de-seine/",
    confidentialiteHref: "/politique-de-confidentialite/",
    tarifsHref: "/tarifs-et-aides/",
    reassurance: ["Évaluation à domicile gratuite, sans engagement.", "7 jours sur 7"],
    ...overrides,
  };
}

describe("LocalTemplate", () => {
  it("rend les dix blocs de docs/04 §4 dans l'ordre, avec le H1 local", () => {
    render(<LocalTemplate data={data()} />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Aide à domicile à Exempleville (92990)",
    );
    const headings = screen
      .getAllByRole("heading", { level: 2 })
      .filter((h) => h.closest("form") === null)
      .map((h) => h.textContent);
    expect(headings).toEqual([
      "Oui, nous intervenons à Exempleville.",
      "Vivre à domicile à Exempleville",
      "Les ressources près de chez vous",
      "Nos accompagnements à Exempleville",
      "Un exemple de semaine",
      "Les aides du département",
      "Communes voisines",
      "Questions locales",
      "Être rappelé(e)",
    ]);
    // Bloc 1 (bannière) + neuf H2 = dix blocs ; le sous-titre rédigé est dans la bannière.
    expect(screen.getByText(localEditorialExemple.sous_titre)).toBeInTheDocument();
    expect(document.querySelector("main")).toHaveAttribute(
      "data-local",
      "/aide-a-domicile/hauts-de-seine/exempleville/",
    );
    expect(document.querySelector("main")).toHaveAttribute("data-statut", "publie");
    expect(screen.queryByText(/attend sa relecture/)).not.toBeInTheDocument();
  });

  it("répond avec l'agence réelle la plus proche, la distance arrondie et le téléphone principal", () => {
    render(<LocalTemplate data={data()} />);
    const block = document.querySelector('[data-local-agence="puteaux"]');
    expect(block).not.toBeNull();
    expect(block).toHaveAttribute("data-local-distance", "2,4");
    expect(block).toHaveTextContent(
      "Votre agence la plus proche : Youdom Care Hauts-de-Seine, à 2,4 km à vol d'oiseau.",
    );
    expect(block).toHaveTextContent("49-51 quai de Dion-Bouton, 92800 Puteaux");
    const link = within(block as HTMLElement).getByRole("link", {
      name: "Voir l'agence Youdom Care Hauts-de-Seine",
    });
    expectHref(link, "/agences/puteaux/");
    expect(
      within(block as HTMLElement).getByRole("link", { name: /Appeler le 01.84.80.17.03/ }),
    ).toHaveAttribute("href", "tel:+33184801703");
  });

  it("affiche chaque fait avec sa source et sa date, par bloc (repères, ressources, aides)", () => {
    render(<LocalTemplate data={data()} />);
    const grids = document.querySelectorAll("[data-local-facts]");
    const ids = [...grids].map((grid) => grid.getAttribute("data-local-facts"));
    expect(ids).toEqual(["reperes", "ressources", "aides"]);
    // Repères : démographie (population + parts) et faits « vie locale ».
    const reperes = document.querySelector('[data-local-facts="reperes"]');
    expect(reperes).toHaveTextContent("Population (recensement 2022) : 45 210 habitants");
    expect(reperes).toHaveTextContent("Part des 75 ans et plus : 8,4 %");
    expect(reperes).toHaveTextContent("Marché du centre : mardi et samedi matin");
    // Ressources : point d'information, CCAS, accueil de jour, hôpital, PAM ; pas les aides.
    const ressources = document.querySelector('[data-local-facts="ressources"]');
    expect(ressources).toHaveAttribute("data-local-facts-count", "5");
    expect(ressources).toHaveTextContent("Point d'information seniors d'Exempleville");
    expect(ressources).not.toHaveTextContent("MDPH des Hauts-de-Seine");
    const aides = document.querySelector('[data-local-facts="aides"]');
    expect(aides).toHaveAttribute("data-local-facts-count", "3");
    expect(aides).toHaveTextContent("MDPH des Hauts-de-Seine");
    // Chaque fait affiché porte sa ligne « Source : …, consulté le … ».
    const rows = document.querySelectorAll("[data-fact-type]");
    const sources = document.querySelectorAll("[data-fact-source]");
    expect(rows.length).toBe(sources.length);
    // Cinq lignes démographiques calculées remplacent les faits `demographie` du pipeline.
    expect(rows.length).toBe(
      localDataExemple.facts.filter((fact) => fact.type !== "demographie").length + 5,
    );
    for (const source of sources) {
      expect(source.textContent).toMatch(/^Source : .+, consulté le 20 septembre 2026$/);
      expect(source.querySelector("a")).toHaveAttribute("href", expect.stringMatching(/^https:/));
    }
    expect(screen.getByText("CNSA, points d'information locaux")).toBeInTheDocument();
    // Lien officiel signalé comme externe.
    expect(screen.getAllByRole("link", { name: /Site officiel.*lien externe/ }).length).toBe(6);
  });

  it("rend la zone éditoriale en Markdown sûr sous « Vivre à domicile »", () => {
    render(<LocalTemplate data={data()} />);
    const zone = document.querySelector("[data-local-editorial]");
    expect(zone).not.toBeNull();
    expect(within(zone as HTMLElement).getByRole("heading", { level: 3 })).toHaveTextContent(
      "Se déplacer",
    );
    expect(within(zone as HTMLElement).getAllByRole("listitem")).toHaveLength(2);
    expect(within(zone as HTMLElement).getByText("planes").tagName).toBe("STRONG");
    expectHref(
      within(zone as HTMLElement).getByRole("link", { name: "nos accompagnements" }),
      "/personnes-agees/",
    );
  });

  it("lie les accompagnements avec leurs icônes, l'exemple illustratif, les aides, les voisines par distance", () => {
    render(<LocalTemplate data={data()} />);
    const accompagnements = document.querySelector("[data-local-accompagnements]");
    expect(within(accompagnements as HTMLElement).getAllByRole("link")).toHaveLength(2);
    expect(accompagnements?.querySelectorAll("[data-icon]")).toHaveLength(2);
    expect(screen.getAllByText(/Exemple illustratif/).length).toBeGreaterThan(0);
    expect(screen.getByText("Suzanne, 88 ans. Vit seule.")).toBeInTheDocument();
    expect(screen.getAllByRole("article").some((a) => a.textContent?.includes("APA"))).toBe(true);
    const voisines = document.querySelector("[data-local-voisines]");
    const items = within(voisines as HTMLElement).getAllByRole("listitem");
    expect(items.map((item) => item.getAttribute("data-voisine"))).toEqual([
      "92998",
      "92997",
      "75116",
    ]);
    expect(items[0]).toHaveTextContent("1,8 km");
    expectHref(
      within(items[0] as HTMLElement).getByRole("link", { name: "Voisine-la-Proche" }),
      "/aide-a-domicile/hauts-de-seine/voisine-la-proche/",
    );
    // Sans page construite : texte simple, jamais de lien mort.
    expect(within(items[1] as HTMLElement).queryByRole("link")).toBeNull();
    expect(within(items[2] as HTMLElement).queryByRole("link")).toBeNull();
    const autres = screen.getByRole("navigation", { name: "Autres pages du territoire" });
    expectHref(
      within(autres).getByRole("link", { name: "Aide à domicile dans les Hauts-de-Seine" }),
      "/aide-a-domicile/hauts-de-seine/",
    );
  });

  it("pose les questions locales, la carte de relecture et le formulaire avec la commune préremplie", () => {
    render(<LocalTemplate data={data()} />);
    for (const q of localEditorialExemple.questions) {
      expect(screen.getByText(q.question)).toBeInTheDocument();
    }
    const review = document.querySelector("[data-local-review]");
    expect(review).toHaveTextContent("Écrit par Auteur fictif, rédaction");
    expect(review).toHaveTextContent("Page mise à jour le 20 septembre 2026");
    expect(review).toHaveTextContent("Données locales assemblées le 20 septembre 2026");
    expect(document.querySelector("#formulaire")).toHaveAttribute("data-local-form-insee", "92999");
    expect(screen.getByRole("form")).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Fil d’Ariane" })).toHaveTextContent(
      "Hauts-de-Seine",
    );
  });

  it("n'affiche jamais null ni undefined, et se passe d'agence ou de téléphone inconnus", () => {
    render(
      <LocalTemplate
        data={data({
          agency: null,
          phone: null,
          weekExample: null,
          neighbourPaths: {},
          departementHref: null,
          data: { ...localDataExemple, demographie: undefined },
        })}
      />,
    );
    const text = document.body.textContent ?? "";
    expect(text).not.toMatch(/\bnull\b|\bundefined\b|\{[a-z_]+\}/);
    expect(document.querySelector("[data-local-agence]")).toBeNull();
    expect(screen.queryByText("Un exemple de semaine")).not.toBeInTheDocument();
    expect(screen.queryByText(/Population/)).not.toBeInTheDocument();
  });

  it("signale une page à relire et titre un département sans code postal", () => {
    render(
      <LocalTemplate
        data={data({
          editorial: { ...localEditorialExemple, statut: "a_relire" },
          data: {
            ...localDataExemple,
            kind: "departement",
            code: "92",
            nom: "Hauts-de-Seine",
            chemin: "/aide-a-domicile/hauts-de-seine/",
            communes_voisines: undefined,
          },
          crumbs: [{ label: "Territoires", href: "/aide-a-domicile/" }],
        })}
      />,
    );
    expect(screen.getByText(/attend sa relecture/)).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Aide à domicile dans les Hauts-de-Seine",
    );
    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "Oui, nous intervenons dans les Hauts-de-Seine.",
      }),
    ).toBeInTheDocument();
    expect(document.querySelector("#formulaire")).not.toHaveAttribute("data-local-form-insee");
  });

  it("convertit la démographie en faits sourcés", () => {
    const facts = demographyFacts(
      localDataExemple.demographie,
      getInterfaceTexts().local.demographie,
    );
    expect(facts.map((f) => f.label)).toEqual([
      "Population (recensement 2022)",
      "Part des 75 ans et plus",
      "Part des 60 à 74 ans",
      "Part des 75 à 89 ans",
      "Part des 90 ans et plus",
    ]);
    expect(facts[0]?.value).toMatch(/^45.210 habitants$/);
    expect(facts[1]?.value).toMatch(/^8,4.%$/);
    for (const fact of facts)
      expect(fact.source_url).toBe(localDataExemple.demographie?.source_url);
    expect(demographyFacts(undefined, getInterfaceTexts().local.demographie)).toEqual([]);
  });
});

/*
 * Données réelles du pipeline (data/local/{code}.json, docs/04 §5) avec l'éditorial fictif :
 * une commune, un arrondissement, un département. Ce que les contrôles P6.4 attendent : les
 * enveloppes `data-local-facts`, l'adresse de l'agence la plus proche dans <main> et aucune
 * autre adresse d'agence.
 */
function realData(code: string): LocalData | null {
  const file = path.join(process.cwd(), "data", "local", `${code}.json`);
  try {
    return localDataSchema.parse(JSON.parse(readFileSync(file, "utf8")));
  } catch {
    return null;
  }
}

describe("LocalTemplate sur les données réelles du pipeline", () => {
  const cases: [string, string][] = [
    ["92062", "Aide à domicile à Puteaux (92800)"],
    ["75115", "Aide à domicile à Paris 15e (75015)"],
    ["92", "Aide à domicile dans les Hauts-de-Seine"],
  ];
  for (const [code, expectedH1] of cases) {
    it(`data/local/${code}.json : H1, agence la plus proche seule adresse, faits sourcés`, () => {
      const real = realData(code);
      if (!real) return; // données absentes de ce poste : rien à vérifier.
      const config = getSiteConfig();
      const agency = config.agences.find((a) => a.id === real.agence_proche?.id) ?? null;
      expect(agency).not.toBeNull();
      render(
        <LocalTemplate
          data={data({
            data: real,
            editorial: { ...localEditorialExemple, code },
            agency,
            neighbourPaths: {},
            departementHref: null,
            crumbs: [{ label: "Territoires", href: "/aide-a-domicile/" }],
          })}
        />,
      );
      expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(expectedH1);
      const main = document.querySelector("main");
      expect(main).toHaveAttribute("data-local", real.chemin);
      expect(main?.querySelector(`[data-local-agence="${agency?.id}"]`)).not.toBeNull();
      const text = main?.textContent ?? "";
      expect(text).toContain(agency?.adresse ?? "");
      for (const other of config.agences) {
        if (other.id !== agency?.id) expect(text).not.toContain(other.adresse);
      }
      expect(main?.querySelectorAll("[data-local-facts]").length).toBeGreaterThanOrEqual(1);
      const shown = [...(main?.querySelectorAll("[data-fact-type]") ?? [])].length;
      expect(shown).toBeGreaterThanOrEqual(real.facts.length);
      expect(main?.querySelectorAll("[data-fact-source]").length).toBe(shown);
      expect(text).not.toMatch(/null|undefined|{[a-z_]+}/);
    });
  }
});
