import { describe, expect, it } from "vitest";
import {
  activeDays,
  applyShortcut,
  countRanges,
  countSlots,
  estimateGrid,
  estimateRanges,
  halfHours,
  hasSlot,
  isNightRange,
  normalizeGrid,
  rangeHours,
  rangesFromGrid,
  rangesFromSlots,
  toggleSlot,
} from "./grid";

describe("grille hebdomadaire", () => {
  it("normalise l'ordre, les doublons et les jours vides", () => {
    expect(normalizeGrid({ mer: ["night", "morning", "morning"], lun: [] })).toEqual({
      mer: ["morning", "night"],
    });
  });

  it("coche et décoche un créneau", () => {
    const once = toggleSlot({}, "mar", "afternoon");
    expect(once).toEqual({ mar: ["afternoon"] });
    expect(hasSlot(once, "mar", "afternoon")).toBe(true);
    expect(toggleSlot(once, "mar", "afternoon")).toEqual({});
    expect(activeDays({ dim: ["noon"], lun: ["early"] })).toEqual(["lun", "dim"]);
  });

  it("applique les raccourcis en ajoutant aux créneaux déjà cochés", () => {
    const nuits = applyShortcut({ lun: ["morning"] }, "nuits");
    expect(nuits.lun).toEqual(["morning", "night"]);
    expect(countSlots(nuits)).toBe(8);
    expect(applyShortcut({}, "semaine").sam).toBeUndefined();
    expect(applyShortcut({}, "semaine").ven).toEqual([
      "early",
      "morning",
      "noon",
      "afternoon",
      "evening",
    ]);
    expect(applyShortcut({}, "weekend").dim).toHaveLength(5);
    expect(applyShortcut({}, "matins").jeu).toEqual(["morning"]);
    expect(countSlots(applyShortcut({}, "tous"))).toBe(35);
    expect(countSlots(applyShortcut({}, "continu"))).toBe(42);
    expect(applyShortcut(nuits, "effacer")).toEqual({});
  });

  it("estime les heures et les nuits", () => {
    expect(estimateGrid({})).toEqual({ hours: 0, nights: 0 });
    expect(estimateGrid({ lun: ["morning", "night"], mer: ["afternoon"] })).toEqual({
      hours: 17,
      nights: 1,
    });
    expect(estimateGrid(applyShortcut({}, "continu"))).toEqual({ hours: 168, nights: 7 });
  });
});

describe("horaires précis", () => {
  it("propose 48 demi-heures", () => {
    expect(halfHours).toHaveLength(48);
    expect(halfHours[0]).toBe("00:00");
    expect(halfHours[47]).toBe("23:30");
  });

  it("mesure une plage, y compris quand elle passe minuit", () => {
    expect(rangeHours({ debut: "08:00", fin: "12:30" })).toBe(4.5);
    expect(rangeHours({ debut: "21:00", fin: "06:00" })).toBe(9);
    expect(isNightRange({ debut: "21:00", fin: "06:00" })).toBe(true);
    expect(isNightRange({ debut: "22:00", fin: "23:30" })).toBe(true);
    expect(isNightRange({ debut: "08:00", fin: "12:00" })).toBe(false);
  });

  it("déduit les plages des créneaux en fusionnant les contigus", () => {
    expect(rangesFromSlots(["morning", "noon", "evening"])).toEqual([
      { debut: "08:00", fin: "14:00" },
      { debut: "18:00", fin: "21:00" },
    ]);
    expect(rangesFromSlots(["night"])).toEqual([{ debut: "21:00", fin: "06:00" }]);
    const ranges = rangesFromGrid({ mar: ["early", "morning"], sam: ["night"] });
    expect(ranges).toEqual({
      mar: [{ debut: "06:00", fin: "12:00" }],
      sam: [{ debut: "21:00", fin: "06:00" }],
    });
    expect(countRanges(ranges)).toBe(2);
    expect(estimateRanges(ranges)).toEqual({ hours: 15, nights: 1 });
  });
});
