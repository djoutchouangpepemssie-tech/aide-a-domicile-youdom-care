import { describe, expect, it } from "vitest";
import {
  afterTaxCredit,
  formatEuro,
  formatRate,
  hourlyPriceFor,
  monthlyEstimates,
  budgetBasis,
  monthlyBudget,
  monthlyExample,
  withSurcharge,
} from "./pricing";

describe("pricing", () => {
  it("formate en euros à la française", () => {
    expect(formatEuro(30)).toBe("30 €");
    expect(formatEuro(27.5)).toBe("27,50 €");
    expect(formatEuro(1234.56)).toBe("1 234,56 €");
    expect(formatRate(0.5)).toBe("50 %");
  });

  it("calcule le reste à charge après crédit d'impôt", () => {
    expect(afterTaxCredit(30, 0.5)).toBe(15);
    expect(afterTaxCredit(27.5, 0.5)).toBe(13.75);
    expect(afterTaxCredit(33.33, 0.5)).toBe(16.67);
  });

  it("calcule un exemple mensuel à partir d'heures hebdomadaires", () => {
    expect(monthlyExample(30, 10)).toBe(1300);
    expect(monthlyExample(25, 3)).toBe(325);
  });

  it("applique le bon palier de dégressivité, ou le prix de base", () => {
    const tiers = [
      { jusqu_a_heures_par_semaine: 20, prix_ttc: 28 },
      { jusqu_a_heures_par_semaine: 10, prix_ttc: 30 },
      { jusqu_a_heures_par_semaine: null, prix_ttc: 20 },
    ];
    expect(hourlyPriceFor(32, 5, tiers)).toBe(30);
    expect(hourlyPriceFor(32, 15, tiers)).toBe(28);
    expect(hourlyPriceFor(32, 40, tiers)).toBe(32);
    expect(hourlyPriceFor(32, 40)).toBe(32);
  });

  it("majore un prix et arrondit au centime", () => {
    expect(withSurcharge(30, 0.25)).toBe(37.5);
    expect(withSurcharge(27.27, 0.1)).toBe(30);
  });

  it("produit des exemples mensuels avant et après crédit d'impôt", () => {
    const estimates = monthlyEstimates(30, 0.5, [5, 10]);
    expect(estimates).toEqual([
      { hoursPerWeek: 5, hourlyPrice: 30, before: 650, after: 325 },
      { hoursPerWeek: 10, hourlyPrice: 30, before: 1300, after: 650 },
    ]);
  });
});

describe("budget d’un planning", () => {
  const services = [
    { libelle: "Nuit calme", unite: "nuit", prix_ttc: 120, degressivite: [] },
    { libelle: "Aide à l’autonomie", unite: "heure", prix_ttc: null, degressivite: [] },
    {
      libelle: "Vie quotidienne",
      unite: "heure",
      prix_ttc: 30,
      degressivite: [{ jusqu_a_heures_par_semaine: 10, prix_ttc: 32 }],
    },
  ];

  it("retient la première prestation à l’heure dont le prix est connu", () => {
    expect(budgetBasis([], 0.5)).toBeNull();
    expect(budgetBasis(services.slice(0, 2), 0.5)).toBeNull();
    expect(budgetBasis(services, 0.5)).toMatchObject({ hourlyPrice: 30, label: "Vie quotidienne" });
  });

  it("calcule le budget mensuel avant et après crédit d’impôt", () => {
    const basis = budgetBasis(services, 0.5);
    if (!basis) throw new Error("base attendue");
    expect(monthlyBudget(basis, 5)).toEqual({
      hoursPerWeek: 5,
      hourlyPrice: 32,
      before: 693,
      after: 347,
    });
    expect(monthlyBudget(basis, 20).hourlyPrice).toBe(30);
  });
});
