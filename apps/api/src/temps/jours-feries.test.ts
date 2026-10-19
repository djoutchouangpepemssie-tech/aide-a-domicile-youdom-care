/** @vitest-environment node */
import { describe, expect, it } from "vitest";
import { easterSunday, frenchHolidays, holidayName, isHoliday, isSunday } from "./jours-feries";

describe("les jours fériés", () => {
  it("calcule Pâques", () => {
    // Dates connues : 5 avril 2026, 28 mars 2027, 16 avril 2028.
    expect(easterSunday(2026)).toBe("2026-04-05");
    expect(easterSunday(2027)).toBe("2027-03-28");
    expect(easterSunday(2028)).toBe("2028-04-16");
  });

  it("en compte onze, chaque année", () => {
    for (const annee of [2026, 2027, 2028, 2029, 2030]) {
      expect(frenchHolidays(annee)).toHaveLength(11);
    }
  });

  it("place les trois fêtes mobiles de 2026", () => {
    const index = new Map(frenchHolidays(2026).map((jour) => [jour.nom, jour.date]));
    expect(index.get("Lundi de Pâques")).toBe("2026-04-06");
    expect(index.get("Ascension")).toBe("2026-05-14");
    expect(index.get("Lundi de Pentecôte")).toBe("2026-05-25");
  });

  it("reconnaît un jour férié et nomme la fête", () => {
    expect(holidayName("2026-12-25")).toBe("Noël");
    expect(holidayName("2026-05-14")).toBe("Ascension");
    expect(isHoliday("2026-10-19")).toBe(false);
  });

  it("l'Ascension tombe toujours un jeudi, le lundi de Pentecôte un lundi", () => {
    for (const annee of [2026, 2027, 2028, 2029, 2030]) {
      const index = new Map(frenchHolidays(annee).map((jour) => [jour.nom, jour.date]));
      const ascension = index.get("Ascension") ?? "";
      const pentecote = index.get("Lundi de Pentecôte") ?? "";
      expect(new Date(`${ascension}T00:00:00Z`).getUTCDay()).toBe(4);
      expect(new Date(`${pentecote}T00:00:00Z`).getUTCDay()).toBe(1);
    }
  });

  it("sait reconnaître un dimanche", () => {
    expect(isSunday("2026-10-25")).toBe(true);
    expect(isSunday("2026-10-19")).toBe(false);
  });
});
