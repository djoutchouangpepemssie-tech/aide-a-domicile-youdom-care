/** @vitest-environment node */
import { describe, expect, it } from "vitest";
import {
  datesBetween,
  durationMinutes,
  isoWeekday,
  nextDay,
  parisOffsetMinutes,
  parisParts,
  parisToInstant,
  timeOf,
} from "./paris";

/*
 * Le changement d'heure n'est pas un cas d'école ici : une garde de nuit traverse ces deux nuits,
 * et la différence se paie. Ces tests figent les deux.
 */

describe("l'heure de Paris", () => {
  it("connaît son décalage en hiver et en été", () => {
    expect(parisOffsetMinutes(new Date("2026-01-15T12:00:00Z"))).toBe(60);
    expect(parisOffsetMinutes(new Date("2026-07-15T12:00:00Z"))).toBe(120);
  });

  it("convertit une heure locale en instant, dans les deux saisons", () => {
    expect(parisToInstant("2026-01-15", "09:00").toISOString()).toBe("2026-01-15T08:00:00.000Z");
    expect(parisToInstant("2026-07-15", "09:00").toISOString()).toBe("2026-07-15T07:00:00.000Z");
  });

  it("fait l'aller-retour sans dériver", () => {
    for (const date of ["2026-01-15", "2026-03-28", "2026-06-21", "2026-10-26", "2026-12-31"]) {
      for (const time of ["00:00", "07:30", "13:45", "23:59"]) {
        const parts = parisParts(parisToInstant(date, time));
        expect(`${parts.date} ${parts.time}`).toBe(`${date} ${time}`);
      }
    }
  });

  it("une heure qui n'existe pas (passage à l'heure d'été) commence au saut", () => {
    // Le 29 mars 2026 à 2 h, Paris passe directement à 3 h : 2 h 30 n'existe pas.
    const instant = parisToInstant("2026-03-29", "02:30");
    expect(parisParts(instant).time).toBe("03:00");
  });

  it("une heure qui existe deux fois (retour à l'heure d'hiver) rend la première", () => {
    // Le 25 octobre 2026, 2 h 30 existe à 00:30 UTC puis à 01:30 UTC. On rend la première.
    const instant = parisToInstant("2026-10-25", "02:30");
    expect(instant.toISOString()).toBe("2026-10-25T00:30:00.000Z");
    expect(parisParts(instant).time).toBe("02:30");
  });

  it("une garde de nuit dure vraiment une heure de moins au printemps", () => {
    // 21 h → 7 h le lendemain : dix heures d'habitude, neuf la nuit du passage à l'heure d'été,
    // onze celle du retour à l'heure d'hiver. C'est ce qui est payé.
    expect(durationMinutes("2026-01-10", "21:00", "2026-01-11", "07:00")).toBe(600);
    expect(durationMinutes("2026-03-28", "21:00", "2026-03-29", "07:00")).toBe(540);
    expect(durationMinutes("2026-10-24", "21:00", "2026-10-25", "07:00")).toBe(660);
  });

  it("sait quel jour de la semaine on est", () => {
    expect(isoWeekday("2026-10-19")).toBe(1); // lundi
    expect(isoWeekday("2026-10-25")).toBe(7); // dimanche
  });

  it("compte les jours sans se tromper aux mois ni aux années", () => {
    expect(nextDay("2026-02-28")).toBe("2026-03-01");
    expect(nextDay("2026-12-31")).toBe("2027-01-01");
    expect(nextDay("2028-02-28")).toBe("2028-02-29"); // année bissextile
    expect(datesBetween("2026-10-30", "2026-11-02")).toEqual([
      "2026-10-30",
      "2026-10-31",
      "2026-11-01",
      "2026-11-02",
    ]);
  });

  it("formate les minutes en heures lisibles", () => {
    expect(timeOf(0)).toBe("00:00");
    expect(timeOf(9 * 60 + 5)).toBe("09:05");
    expect(timeOf(1440 + 30)).toBe("00:30");
  });
});
