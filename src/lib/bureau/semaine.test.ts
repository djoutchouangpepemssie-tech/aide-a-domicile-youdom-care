import { describe, expect, it } from "vitest";
import {
  ajouterJours,
  aujourdhui,
  joursDe,
  jourIso,
  libelleJour,
  libelleSemaine,
  lundiDe,
  semaineDe,
} from "./semaine";

describe("le calendrier du bureau", () => {
  it("compte les jours à travers les mois et les années bissextiles", () => {
    expect(ajouterJours("2026-02-28", 1)).toBe("2026-03-01");
    expect(ajouterJours("2028-02-28", 1)).toBe("2028-02-29");
    expect(ajouterJours("2026-12-31", 1)).toBe("2027-01-01");
    expect(ajouterJours("2026-10-19", -7)).toBe("2026-10-12");
  });

  it("sait quel jour de la semaine on est", () => {
    expect(jourIso("2026-10-19")).toBe(1);
    expect(jourIso("2026-10-25")).toBe(7);
  });

  it("commence la semaine le lundi", () => {
    expect(lundiDe("2026-10-25")).toBe("2026-10-19");
    expect(semaineDe("2026-10-22")).toEqual({ from: "2026-10-19", to: "2026-10-25" });
    expect(joursDe(semaineDe("2026-10-22"))).toHaveLength(7);
  });

  it("écrit les jours et la semaine en français", () => {
    expect(libelleJour("2026-10-19")).toBe("lundi 19 octobre");
    expect(libelleSemaine({ from: "2026-10-19", to: "2026-10-25" })).toBe("du 19 au 25 octobre");
    // Une semaine à cheval sur deux mois le dit, au lieu de laisser deviner.
    expect(libelleSemaine({ from: "2026-09-28", to: "2026-10-04" })).toBe(
      "du 28 septembre au 4 octobre",
    );
  });

  it("donne le jour à l'heure de Paris, pas celui du serveur", () => {
    // 22 h 30 UTC le 19 octobre, c'est déjà le 20 à Paris (heure d'été).
    expect(aujourdhui(new Date("2026-10-19T22:30:00Z"))).toBe("2026-10-20");
    expect(aujourdhui(new Date("2026-10-19T09:00:00Z"))).toBe("2026-10-19");
  });
});
