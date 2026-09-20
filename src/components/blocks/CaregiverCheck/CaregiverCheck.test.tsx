import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { getCaregiverCheckPage } from "@/content/loader";
import { CaregiverCheck, levelFor } from "./CaregiverCheck";

const page = getCaregiverCheckPage();
const [firstLevel, , lastLevel] = page.niveaux;
const strongest = page.reponses[page.reponses.length - 1];

describe("CaregiverCheck (docs/03 §7)", () => {
  it("affiche l'avertissement « pas un test médical », huit questions et aucun résultat au départ", () => {
    render(<CaregiverCheck page={page} />);
    expect(screen.getByText(page.avertissement.titre)).toBeInTheDocument();
    expect(screen.getAllByRole("group")).toHaveLength(8);
    expect(screen.getAllByRole("radio")).toHaveLength(24);
    expect(screen.queryByText(firstLevel?.titre ?? "")).not.toBeInTheDocument();
  });

  it("signale les questions sans réponse au lieu de calculer", async () => {
    const user = userEvent.setup();
    render(<CaregiverCheck page={page} />);
    await user.click(screen.getByRole("button", { name: page.bouton_resultat }));
    expect(screen.getByRole("alert")).toHaveTextContent("8 question(s)");
  });

  it("calcule le niveau dans le navigateur, propose « J'ai besoin de relais » et se remet à zéro", async () => {
    const user = userEvent.setup();
    render(<CaregiverCheck page={page} />);
    const souvent = strongest?.libelle ?? "";
    for (const group of screen.getAllByRole("group")) {
      const radios = group.querySelectorAll<HTMLInputElement>("input[type=radio]");
      const last = [...radios].find((r) => r.labels?.[0]?.textContent?.includes(souvent));
      if (!last) throw new Error("bouton radio introuvable");
      await user.click(last);
    }
    await user.click(screen.getByRole("button", { name: page.bouton_resultat }));
    const top = lastLevel ?? firstLevel;
    if (!top) throw new Error("niveaux manquants");
    expect(screen.getByRole("heading", { level: 2, name: page.resultat_h2 })).toBeVisible();
    expect(screen.getByText(top.titre)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: page.appel.bouton })).toHaveAttribute(
      "href",
      expect.stringMatching(/^\/demande\/relais-aidant\/?$/),
    );
    expect(window.localStorage.length).toBe(0);
    expect(window.sessionStorage.length).toBe(0);

    await user.click(screen.getByRole("button", { name: page.bouton_recommencer }));
    expect(screen.queryByText(top.titre)).not.toBeInTheDocument();
    expect(screen.getAllByRole("radio").every((r) => !(r as HTMLInputElement).checked)).toBe(true);
  });

  it("couvre toute l'échelle 0–16 avec trois niveaux contigus", () => {
    const ids = new Set<string>();
    for (let total = 0; total <= 16; total += 1) ids.add(levelFor(page, total).id);
    expect(ids.size).toBe(3);
    expect(levelFor(page, 0).id).toBe(firstLevel?.id);
    expect(levelFor(page, 16).id).toBe(lastLevel?.id);
  });
});
