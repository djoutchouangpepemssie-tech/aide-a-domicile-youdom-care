import { describe, expect, it } from "vitest";
import { formatFrenchPhone, toTelHref } from "./phone";

describe("phone", () => {
  it("construit un lien tel: international depuis un numéro français", () => {
    expect(toTelHref("01 84 80 17 03")).toBe("tel:+33184801703");
    expect(toTelHref("06.67.22.45.07")).toBe("tel:+33667224507");
    expect(toTelHref("+33 1 84 80 17 03")).toBe("tel:+33184801703");
    expect(toTelHref("12345")).toBeNull();
  });

  it("regroupe les chiffres par deux avec des espaces insécables", () => {
    expect(formatFrenchPhone("0184801703")).toBe("01 84 80 17 03");
    expect(formatFrenchPhone("+33184801703")).toBe("01 84 80 17 03");
    expect(formatFrenchPhone("3939")).toBe("3939");
  });
});
