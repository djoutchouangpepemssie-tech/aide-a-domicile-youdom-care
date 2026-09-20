import { describe, expect, it } from "vitest";
import type { LocalData } from "@/content/local-schema";
import {
  extractNumbers,
  findUnsourcedNumbers,
  numberMatches,
  referenceNumbers,
  writtenPrecision,
} from "./numbers";

const values = (text: string) => extractNumbers(text).map((m) => m.raw);

describe("extractNumbers", () => {
  it("relève les nombres à milliers, décimales et pourcentages", () => {
    expect(values("Près de 45 000 habitants, 27,3 % de plus de 75 ans, à 3.2 km.")).toEqual([
      "45 000",
      "27,3",
      "3.2",
    ]);
    expect(extractNumbers("12 345")[0]?.value).toBe(12345);
    expect(extractNumbers("27,3")[0]?.value).toBe(27.3);
  });

  it("ignore âges, durées, horaires, ordinaux et numéros d'ordre", () => {
    const text =
      "Les 75 ans et plus, de 60 à 74 ans, depuis 20 ans ; ouvert de 8 h 30 à 18 h, 24 h/24 et 7 j/7 ; " +
      "45 minutes, 3 jours ; le 15e arrondissement, le 1er ; n° 3 et la note [2].";
    expect(values(text)).toEqual([]);
  });

  it("garde les nombres qui ne sont pas dans un contexte exclu", () => {
    expect(values("2 accueils de jour et 3 marchés, 50 % de crédit d'impôt")).toEqual([
      "2",
      "3",
      "50",
    ]);
  });
});

describe("writtenPrecision et numberMatches", () => {
  const mention = (raw: string) => ({
    raw,
    value: Number(raw.replace(/ /g, "").replace(",", ".")),
    index: 0,
  });

  it("donne la précision du dernier chiffre écrit, au plus deux chiffres significatifs", () => {
    expect(writtenPrecision("27,3")).toBe(0.1);
    expect(writtenPrecision("27")).toBe(1);
    expect(writtenPrecision("30")).toBe(1);
    expect(writtenPrecision("100")).toBe(10);
    expect(writtenPrecision("12 000")).toBe(1000);
    expect(writtenPrecision("10 000")).toBe(1000);
    expect(writtenPrecision("1 200")).toBe(100);
    expect(writtenPrecision("0")).toBe(1);
  });

  it("accepte l'arrondi à la précision écrite et refuse au-delà", () => {
    expect(numberMatches(mention("27"), 27.3)).toBe(true);
    expect(numberMatches(mention("27,3"), 27.3)).toBe(true);
    expect(numberMatches(mention("27,3"), 27.34)).toBe(true);
    expect(numberMatches(mention("30"), 27.3)).toBe(false);
    expect(numberMatches(mention("45 000"), 44902)).toBe(true);
    expect(numberMatches(mention("45 000"), 44400)).toBe(false);
    expect(numberMatches(mention("100"), 96)).toBe(true);
    expect(numberMatches(mention("100"), 94)).toBe(false);
    expect(numberMatches(mention("8"), 8.1)).toBe(true);
    expect(numberMatches(mention("0"), 0.4)).toBe(true);
  });
});

const data: LocalData = {
  code: "92062",
  kind: "commune",
  nom: "Puteaux",
  chemin: "/aide-a-domicile/hauts-de-seine/puteaux/",
  slug: "puteaux",
  departement: "92",
  codes_postaux: ["92800"],
  population: 44902,
  superficie_ha: 319,
  demographie: {
    millesime: "2021",
    population: 44902,
    part_75_plus: 8.1,
    source_url: "https://www.insee.fr/",
    collected_at: "2026-09-01",
  },
  agence_proche: { id: "puteaux", distance_km: 0.9 },
  communes_voisines: [
    { code: "92050", nom: "Nanterre", slug: "nanterre", distance_km: 2.6, page: true },
  ],
  facts: [
    {
      type: "marche",
      label: "Marché des Bergères",
      value: "Mercredi et samedi, 60 étals",
      source_url: "https://www.puteaux.fr/",
      collected_at: "2026-09-01",
    },
    {
      type: "marche",
      label: "Marché du centre",
      source_url: "https://www.puteaux.fr/",
      collected_at: "2026-09-01",
    },
    {
      type: "ccas",
      label: "CCAS",
      address: "131 rue de la République, 92800 Puteaux",
      source_url: "https://lannuaire.service-public.fr/",
      collected_at: "2026-09-01",
    },
  ],
  generated_at: "2026-09-01",
  sources: [{ label: "Insee", url: "https://www.insee.fr/", collected_at: "2026-09-01" }],
};

describe("referenceNumbers et findUnsourcedNumbers", () => {
  it("réunit valeurs des faits, démographie, distances, codes et effectifs par type", () => {
    const refs = referenceNumbers(data);
    for (const expected of [60, 131, 92800, 44902, 8.1, 2021, 319, 0.9, 2.6, 92062, 92, 3, 2, 1]) {
      expect(refs).toContain(expected);
    }
  });

  it("ne signale que les nombres non couverts", () => {
    const text =
      "Près de 45 000 habitants, 8 % de 75 ans et plus, 2 marchés dont un de 60 étals, à 0,9 km de l'agence ; " +
      "environ 12 000 personnes seules et 27 % de locataires.";
    expect(findUnsourcedNumbers(text, referenceNumbers(data)).map((m) => m.raw)).toEqual([
      "12 000",
      "27",
    ]);
  });
});
