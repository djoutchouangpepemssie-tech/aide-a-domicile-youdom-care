import { describe, expect, it } from "vitest";
import { afterTaxCredit, formatEuro, formatRate, monthlyExample } from "./pricing";

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
});
