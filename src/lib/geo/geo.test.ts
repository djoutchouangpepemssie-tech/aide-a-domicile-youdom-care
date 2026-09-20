import { describe, expect, it } from "vitest";
import { distanceKm, nearest, normalizeName, searchCommunes, type CommuneRecord } from "./geo";

const paris = { lat: 48.8566, lng: 2.3522 };
const puteaux = { lat: 48.884, lng: 2.238 };
const versailles = { lat: 48.8049, lng: 2.1204 };

const communes: CommuneRecord[] = [
  {
    code: "92062",
    nom: "Puteaux",
    codes_postaux: ["92800"],
    departement: "92",
    type: "commune",
    population: 45000,
    centre: puteaux,
    agence: "puteaux",
  },
  {
    code: "75112",
    nom: "Paris 12e Arrondissement",
    codes_postaux: ["75012"],
    departement: "75",
    type: "arrondissement",
    population: 140000,
    centre: paris,
    agence: "paris-12",
  },
  {
    code: "78646",
    nom: "Versailles",
    codes_postaux: ["78000"],
    departement: "78",
    type: "commune",
    population: 85000,
    centre: versailles,
    agence: "versailles",
  },
  {
    code: "91027",
    nom: "Athis-Mons",
    codes_postaux: ["91200"],
    departement: "91",
    type: "commune",
    population: 35000,
    centre: null,
    agence: null,
  },
];

describe("geo", () => {
  it("calcule une distance plausible entre Paris et Versailles", () => {
    const d = distanceKm(paris, versailles);
    expect(d).toBeGreaterThan(15);
    expect(d).toBeLessThan(20);
    expect(distanceKm(paris, paris)).toBe(0);
  });

  it("trouve l'agence la plus proche", () => {
    const agencies = [
      { id: "puteaux", coordonnees: puteaux },
      { id: "versailles", coordonnees: versailles },
    ];
    expect(nearest(paris, agencies)?.id).toBe("puteaux");
    expect(nearest(paris, [])).toBeNull();
  });

  it("normalise les noms de commune", () => {
    expect(normalizeName("Saint-Étienne-du-Rouvray")).toBe("saint etienne du rouvray");
    expect(normalizeName("L'Haÿ-les-Roses")).toBe("l hay les roses");
  });

  it("cherche par nom sans accents ou par code postal", () => {
    expect(searchCommunes("vers", communes).map((c) => c.nom)).toEqual(["Versailles"]);
    expect(searchCommunes("athis mons", communes)).toHaveLength(1);
    expect(searchCommunes("92", communes).map((c) => c.code)).toEqual(["92062"]);
    expect(searchCommunes("750", communes).map((c) => c.code)).toEqual(["75112"]);
    expect(searchCommunes("", communes)).toEqual([]);
    expect(searchCommunes("Lyon", communes)).toEqual([]);
  });
});
