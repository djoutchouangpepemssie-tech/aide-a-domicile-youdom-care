import { describe, expect, it } from "vitest";
import {
  chooseEveryDay,
  continuousGrid,
  emptyPlanning,
  expandPeriod,
  needsNightQuestion,
  normalizeDates,
  planningEstimate,
  syncRanges,
  toLeadPlanning,
} from "./planning";
import { planningSchema } from "./schema";

describe("étape planning", () => {
  it("aligne les plages sur les jours cochés", () => {
    const synced = syncRanges(
      { lun: ["morning"], mer: ["night"] },
      { lun: [{ debut: "09:00", fin: "11:00" }], sam: [{ debut: "10:00", fin: "12:00" }] },
    );
    expect(synced).toEqual({
      lun: [{ debut: "09:00", fin: "11:00" }],
      mer: [{ debut: "21:00", fin: "06:00" }],
    });
  });

  it("estime d'après la grille ou d'après les plages", () => {
    const grid = {
      ...emptyPlanning,
      rythme: "regulier" as const,
      grille: { lun: ["morning" as const] },
    };
    expect(planningEstimate(grid)).toEqual({ hours: 4, nights: 0 });
    const precise = {
      ...grid,
      precis: true,
      plages: { lun: [{ debut: "22:00", fin: "07:00" }] },
    };
    expect(planningEstimate(precise)).toEqual({ hours: 9, nights: 1 });
    expect(needsNightQuestion(grid)).toBe(false);
    expect(needsNightQuestion(precise)).toBe(true);
  });

  it("produit un planning régulier conforme au schéma de la demande", () => {
    expect(toLeadPlanning(emptyPlanning)).toBeUndefined();
    const value = {
      ...emptyPlanning,
      rythme: "regulier" as const,
      grille: { mar: ["afternoon", "night"] as ("afternoon" | "night")[] },
      nuit: "calme" as const,
      urgence: "semaine" as const,
    };
    const lead = toLeadPlanning(value);
    expect(lead).toEqual({
      rythme: "regulier",
      grille: { mar: ["afternoon", "night"] },
      heuresParSemaine: 13,
      nuit: "calme",
    });
    expect(planningSchema.safeParse(lead).success).toBe(true);
    const precise = toLeadPlanning({
      ...value,
      precis: true,
      plages: { mar: [{ debut: "14:00", fin: "17:30" }] },
      nuit: "active",
    });
    expect(precise).toEqual({
      rythme: "regulier",
      plages: { mar: [{ debut: "14:00", fin: "17:30" }] },
      heuresParSemaine: 3.5,
    });
    expect(planningSchema.safeParse(precise).success).toBe(true);
  });

  it("gère les dates ponctuelles : normalisation, période, créneaux communs", () => {
    expect(normalizeDates(["2026-10-04", "2026-10-03", "2026-10-04", "pas une date"])).toEqual([
      "2026-10-03",
      "2026-10-04",
    ]);
    expect(expandPeriod("2026-10-30", "2026-11-02")).toEqual([
      "2026-10-30",
      "2026-10-31",
      "2026-11-01",
      "2026-11-02",
    ]);
    expect(expandPeriod("2026-11-02", "2026-10-30")).toEqual([]);
    expect(expandPeriod("2026-01-01", "2026-12-31")).toHaveLength(60);
    const value = {
      ...emptyPlanning,
      rythme: "ponctuel" as const,
      dates: ["2026-10-03", "2026-10-04"],
      creneaux: ["morning", "night"] as ("morning" | "night")[],
      nuit: "active" as const,
    };
    expect(planningEstimate(value)).toEqual({ hours: 26, nights: 2 });
    const lead = toLeadPlanning(value);
    expect(lead).toEqual({
      rythme: "ponctuel",
      dates: ["2026-10-03", "2026-10-04"],
      creneaux: ["morning", "night"],
      nuit: "active",
    });
    expect(planningSchema.safeParse(lead).success).toBe(true);
    expect(planningSchema.safeParse({ rythme: "ponctuel" }).success).toBe(false);
  });

  it("gère la présence 24h/24 : grille remplie d'office, début et durée", () => {
    expect(continuousGrid(["sam", "dim"]).sam).toHaveLength(6);
    const base = { ...emptyPlanning, rythme: "24h" as const };
    const all = chooseEveryDay(base, true);
    expect(planningEstimate(all)).toEqual({ hours: 168, nights: 7 });
    const some = chooseEveryDay({ ...base, grille: { lun: ["morning"] } }, false);
    expect(some.grille).toEqual({
      lun: ["early", "morning", "noon", "afternoon", "evening", "night"],
    });
    const lead = toLeadPlanning({
      ...all,
      debut: "2026-10-01",
      duree: "semaines",
      nuit: "calme",
      urgence: "48h",
    });
    expect(lead).toMatchObject({
      rythme: "24h",
      dates: ["2026-10-01"],
      duree: "semaines",
      heuresParSemaine: 168,
      nuit: "calme",
    });
    expect(lead?.grille?.dim).toHaveLength(6);
    expect(planningSchema.safeParse(lead).success).toBe(true);
  });
});
