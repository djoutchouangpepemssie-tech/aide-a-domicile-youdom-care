import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { Intervenant, Occurrence, Signalement } from "@/lib/bureau/api";
import { SemaineJours } from "./SemaineJours";

const SEMAINE = { from: "2026-10-19", to: "2026-10-25" };
const FOYER = "a".repeat(24);
const FATIMA = "b".repeat(24);

function occurrence(over: Partial<Occurrence> = {}): Occurrence {
  return {
    serieId: "c".repeat(24),
    householdId: FOYER,
    date: "2026-10-19",
    slotIndex: 0,
    start: "09:00",
    end: "11:00",
    endDate: "2026-10-19",
    kind: "jour",
    workerId: FATIMA,
    origine: "serie",
    motif: null,
    ...over,
  };
}

const intervenants: Intervenant[] = [
  { id: FATIMA, prenom: "Fatima", initiale: "B", photo: null, qualifications: [] },
];

describe("la semaine du bureau", () => {
  it("affiche les sept jours, nommés", () => {
    render(<SemaineJours semaine={SEMAINE} occurrences={[]} intervenants={[]} signalements={[]} />);
    for (const jour of [
      "lundi 19 octobre",
      "mardi 20 octobre",
      "mercredi 21 octobre",
      "jeudi 22 octobre",
      "vendredi 23 octobre",
      "samedi 24 octobre",
      "dimanche 25 octobre",
    ]) {
      expect(screen.getByRole("heading", { name: new RegExp(jour, "i") })).toBeVisible();
    }
  });

  it("dit qu'un jour est vide, au lieu de laisser une case muette", () => {
    render(<SemaineJours semaine={SEMAINE} occurrences={[]} intervenants={[]} signalements={[]} />);
    expect(screen.getAllByText("Aucune visite prévue.")).toHaveLength(7);
  });

  it("nomme l'intervenante par son prénom et son initiale, jamais son nom complet", () => {
    render(
      <SemaineJours
        semaine={SEMAINE}
        occurrences={[occurrence()]}
        intervenants={intervenants}
        signalements={[]}
      />,
    );
    expect(screen.getByText("Fatima B.")).toBeVisible();
  });

  it("écrit « à pourvoir » : la couleur seule ne dit rien", () => {
    render(
      <SemaineJours
        semaine={SEMAINE}
        occurrences={[occurrence({ workerId: null })]}
        intervenants={intervenants}
        signalements={[]}
      />,
    );
    expect(screen.getByText("À pourvoir")).toBeVisible();
  });

  it("trie les visites d'un jour par heure et donne la plage", () => {
    render(
      <SemaineJours
        semaine={SEMAINE}
        occurrences={[
          occurrence({ slotIndex: 1, start: "14:00", end: "16:00" }),
          occurrence({ slotIndex: 0, start: "09:00", end: "11:00" }),
        ]}
        intervenants={intervenants}
        signalements={[]}
      />,
    );
    const lundi = screen.getByRole("heading", { name: /lundi 19 octobre/i }).closest("section");
    const heures = within(lundi as HTMLElement)
      .getAllByText(/\d\d:\d\d–\d\d:\d\d/)
      .map((noeud) => noeud.textContent);
    expect(heures).toEqual(["09:00–11:00", "14:00–16:00"]);
  });

  it("montre la nature de la visite et signale une occurrence modifiée", () => {
    render(
      <SemaineJours
        semaine={SEMAINE}
        occurrences={[
          occurrence({ kind: "nuit_calme", origine: "exception", motif: "Fatima en formation" }),
        ]}
        intervenants={intervenants}
        signalements={[]}
      />,
    );
    expect(screen.getByText("nuit calme")).toBeVisible();
    expect(screen.getByText("modifiée")).toBeVisible();
    expect(screen.getByText("Fatima en formation")).toBeVisible();
  });

  it("accroche chaque signalement à sa visite, avec sa sévérité écrite", () => {
    const visite = occurrence();
    const signalement: Signalement = {
      regle: "amplitude_quotidienne",
      severite: "bloquant",
      message: "amplitude de 14 h le 2026-10-19, maximum 13 h",
      visites: [`${visite.serieId}#${visite.date}#${visite.slotIndex}`],
    };
    render(
      <SemaineJours
        semaine={SEMAINE}
        occurrences={[visite]}
        intervenants={intervenants}
        signalements={[signalement]}
      />,
    );
    expect(screen.getByText("Bloquant")).toBeVisible();
    expect(screen.getByText(/amplitude de 14 h/)).toBeVisible();
  });

  it("ne mélange pas les signalements d'une autre visite", () => {
    const visite = occurrence();
    render(
      <SemaineJours
        semaine={SEMAINE}
        occurrences={[visite]}
        intervenants={intervenants}
        signalements={[
          {
            regle: "repos_quotidien",
            severite: "avertissement",
            message: "9 h de repos entre deux journées",
            visites: ["une-autre-visite"],
          },
        ]}
      />,
    );
    expect(screen.queryByText(/9 h de repos/)).toBeNull();
  });

  it("met en avant le jour courant, et le dit aux lecteurs d'écran", () => {
    render(
      <SemaineJours
        semaine={SEMAINE}
        occurrences={[]}
        intervenants={[]}
        signalements={[]}
        aujourdhui="2026-10-21"
      />,
    );
    const mercredi = screen.getByRole("heading", { name: /mercredi 21 octobre/i });
    expect(mercredi.textContent).toContain("aujourd’hui");
  });
});
