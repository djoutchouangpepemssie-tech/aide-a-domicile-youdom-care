import { describe, expect, it } from "vitest";
import { euros, pourcentage, resteACharge } from "./montants";

describe("les montants du bureau", () => {
  it("affiche un prix en euros, toujours à deux décimales", () => {
    // L'espace avant l'euro est une espace insécable : on compare sans elle.
    expect(euros(2450).replace(/\s/g, " ")).toBe("24,50 €");
    expect(euros(2500).replace(/\s/g, " ")).toBe("25,00 €");
    expect(euros(0).replace(/\s/g, " ")).toBe("0,00 €");
  });

  it("n'estime aucun reste à charge sans taux saisi", () => {
    expect(resteACharge(2450, null)).toBeNull();
  });

  it("arrondit le reste à charge au centime supérieur, jamais à la baisse", () => {
    // 2 451 × 0,5 = 1 225,5 → 1 226 : on n'annonce pas un reste à charge plus bas qu'il n'est.
    expect(resteACharge(2451, 0.5)).toBe(1226);
    expect(resteACharge(2450, 0.5)).toBe(1225);
  });

  it("dit le taux en pourcentage", () => {
    expect(pourcentage(0.5).replace(/\s/g, " ")).toBe("50 %");
    expect(pourcentage(0.255).replace(/\s/g, " ")).toBe("25,5 %");
  });
});
