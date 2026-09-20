import { describe, expect, it } from "vitest";
import { indexWeek, parseHours, summarizeWeek, type WeekEntry } from "./week";

describe("semaine", () => {
  it("lit une plage horaire, y compris passant minuit", () => {
    expect(parseHours("8h–11h")).toBe(3);
    expect(parseHours("8h30–10h")).toBe(1.5);
    expect(parseHours("16h15–19h")).toBe(2.75);
    expect(parseHours("21h–6h")).toBe(9);
    expect(parseHours("n'importe quoi")).toBeNull();
    expect(parseHours("8h–")).toBeNull();
  });

  it("estime les heures par semaine et compte les nuits", () => {
    const entries: WeekEntry[] = [
      { jour: "lun", creneau: "morning", activite: "gestes", heures: "8h–11h" },
      { jour: "mar", creneau: "afternoon", activite: "sorties" },
      { jour: "mer", creneau: "night", activite: "nuit" },
      { jour: "sam", creneau: "night", activite: "nuit" },
    ];
    expect(summarizeWeek(entries)).toEqual({ hours: 3 + 4 + 9 + 9, nights: 2 });
  });

  it("indexe les entrées par jour et créneau", () => {
    const index = indexWeek([{ jour: "jeu", creneau: "noon", activite: "repas" }]);
    expect(index.get("jeu")?.get("noon")?.activite).toBe("repas");
    expect(index.get("lun")?.size).toBe(0);
  });
});
