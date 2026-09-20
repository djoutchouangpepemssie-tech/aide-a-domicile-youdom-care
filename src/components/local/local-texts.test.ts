import { describe, expect, it } from "vitest";
import { getInterfaceTexts } from "@/content/loader";
import { localFactTypes } from "@/content/local-schema";
import {
  aidFactTypes,
  arrondissementNumber,
  formInsee,
  formatDistance,
  lifeFactTypes,
  localPlace,
  localTitle,
  resourceFactTypes,
  roundedDistance,
} from "./local-texts";

const texts = getInterfaceTexts().local;

describe("local-texts", () => {
  it("numérote les arrondissements de Paris", () => {
    expect(arrondissementNumber("75101")).toBe("1er");
    expect(arrondissementNumber("75115")).toBe("15e");
    expect(arrondissementNumber("75120")).toBe("20e");
    expect(arrondissementNumber("75121")).toBeNull();
    expect(arrondissementNumber("92062")).toBeNull();
  });

  it("forme le complément de lieu selon le type de territoire", () => {
    expect(
      localPlace({ kind: "commune", nom: "Puteaux", code: "92062", departement: "92" }, texts),
    ).toBe("à Puteaux");
    expect(
      localPlace(
        { kind: "departement", nom: "Hauts-de-Seine", code: "92", departement: "92" },
        texts,
      ),
    ).toBe("dans les Hauts-de-Seine");
    expect(localPlace({ kind: "departement", nom: "Paris", code: "75" }, texts)).toBe("à Paris");
    expect(localPlace({ kind: "departement", nom: "Essonne", code: "91" }, texts)).toBe(
      "dans l'Essonne",
    );
    expect(
      localPlace(
        {
          kind: "arrondissement",
          nom: "Paris 15e Arrondissement",
          code: "75115",
          departement: "75",
        },
        texts,
      ),
    ).toBe("à Paris 15e");
    expect(
      localPlace({ kind: "quartier", nom: "Javel", code: "7511501", departement: "75" }, texts),
    ).toBe("à Javel");
  });

  it("compose le H1 de docs/04 §4 : code postal pour une commune ou un arrondissement, pas pour un département", () => {
    expect(
      localTitle(
        {
          kind: "commune",
          nom: "Puteaux",
          code: "92062",
          departement: "92",
          codes_postaux: ["92800"],
        },
        texts,
      ),
    ).toBe("Aide à domicile à Puteaux (92800)");
    expect(
      localTitle(
        {
          kind: "arrondissement",
          nom: "Paris 15e Arrondissement",
          code: "75115",
          departement: "75",
          codes_postaux: ["75015"],
        },
        texts,
      ),
    ).toBe("Aide à domicile à Paris 15e (75015)");
    expect(
      localTitle(
        { kind: "departement", nom: "Hauts-de-Seine", code: "92", departement: "92" },
        texts,
      ),
    ).toBe("Aide à domicile dans les Hauts-de-Seine");
    expect(localTitle({ kind: "commune", nom: "Sans-Code", code: "92000" }, texts)).toBe(
      "Aide à domicile à Sans-Code",
    );
  });

  it("arrondit les distances", () => {
    expect(roundedDistance(2.36)).toBe("2");
    expect(roundedDistance(0.4)).toBeNull();
    expect(roundedDistance(11.5)).toBe("12");
    expect(formatDistance(1.8)).toBe("1,8");
    expect(formatDistance(4)).toBe("4,0");
  });

  it("répartit tous les types de faits entre les trois blocs, sans doublon", () => {
    const all = [...lifeFactTypes, ...resourceFactTypes, ...aidFactTypes];
    expect(new Set(all).size).toBe(all.length);
    expect([...all].sort()).toEqual([...localFactTypes].sort());
    for (const type of localFactTypes) expect(texts.faits.types[type]).toBeTruthy();
  });

  it("choisit le code INSEE à préremplir dans le formulaire", () => {
    expect(formInsee({ kind: "commune", code: "92062" })).toBe("92062");
    expect(formInsee({ kind: "arrondissement", code: "75115" })).toBe("75115");
    expect(formInsee({ kind: "quartier", code: "7511501", parent: "75115" })).toBe("75115");
    expect(formInsee({ kind: "departement", code: "92" })).toBeUndefined();
  });
});
