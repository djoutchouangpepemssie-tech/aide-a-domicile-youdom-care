import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import interfaceJson from "../../../../content/interface.json";
import { emptyPlanning } from "@/lib/lead/planning";
import { budgetText, cellName, summaryText, WeekPlannerInput } from "./WeekPlannerInput";

const texts = {
  semaine_type: interfaceJson.semaine_type,
  formulaires: interfaceJson.formulaires,
  planning: interfaceJson.planning,
};

const basis = { hourlyPrice: 30, creditRate: 0.5, tiers: [], label: "Vie quotidienne" };

function openGrid(budget?: typeof basis) {
  render(<WeekPlannerInput texts={texts} budget={budget ?? null} />);
  fireEvent.click(screen.getByRole("radio", { name: "Régulier, chaque semaine" }));
  return screen.getByRole("table", { name: "Vos créneaux de la semaine" });
}

describe("WeekPlannerInput", () => {
  it("pose d'abord la question du rythme et n'affiche la grille que pour un besoin régulier", () => {
    render(<WeekPlannerInput texts={texts} />);
    expect(screen.getByRole("radiogroup", { name: "À quel rythme ?" })).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("radiogroup", { name: "Quand souhaitez-vous commencer ?" }),
    ).toBeNull();
    fireEvent.click(screen.getByRole("radio", { name: "Je ne sais pas encore" }));
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(
      screen.getByRole("radiogroup", { name: "Quand souhaitez-vous commencer ?" }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("radio", { name: "Régulier, chaque semaine" }));
    expect(screen.getByRole("table", { name: "Vos créneaux de la semaine" })).toBeInTheDocument();
  });

  it("nomme chaque case complètement et met le résumé à jour", () => {
    const table = openGrid();
    expect(cellName("mar", "afternoon", texts)).toBe("Mardi, après-midi, 14h à 18h");
    expect(within(table).getAllByRole("checkbox")).toHaveLength(42);
    const live = screen.getByText("Aucun créneau choisi pour l'instant.").parentElement;
    expect(live).toHaveAttribute("aria-live", "polite");
    fireEvent.click(within(table).getByRole("checkbox", { name: "Mardi, après-midi, 14h à 18h" }));
    fireEvent.click(within(table).getByRole("checkbox", { name: "Lundi, nuit, 21h à 6h" }));
    expect(live).toHaveTextContent(
      "Environ 13 heures par semaine, dont une nuit. Ce n'est qu'une base : nous l'ajusterons ensemble.",
    );
  });

  it("applique les raccourcis et « Tout effacer »", () => {
    const table = openGrid();
    fireEvent.click(screen.getByRole("button", { name: "Toutes les nuits" }));
    expect(within(table).getAllByRole("checkbox", { checked: true })).toHaveLength(7);
    expect(screen.getByText(/dont 7 nuits/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Du lundi au vendredi" }));
    expect(within(table).getAllByRole("checkbox", { checked: true })).toHaveLength(32);
    fireEvent.click(screen.getByRole("button", { name: "Tout effacer" }));
    expect(within(table).queryAllByRole("checkbox", { checked: true })).toHaveLength(0);
  });

  it("se parcourt aux flèches dans le tableau", () => {
    const table = openGrid();
    const first = within(table).getByRole("checkbox", { name: "Lundi, tôt le matin, 6h à 8h" });
    first.focus();
    fireEvent.keyDown(first, { key: "ArrowRight" });
    expect(
      within(table).getByRole("checkbox", { name: "Mardi, tôt le matin, 6h à 8h" }),
    ).toHaveFocus();
    fireEvent.keyDown(document.activeElement as Element, { key: "ArrowDown" });
    expect(within(table).getByRole("checkbox", { name: "Mardi, matin, 8h à 12h" })).toHaveFocus();
    fireEvent.keyDown(document.activeElement as Element, { key: "ArrowLeft" });
    fireEvent.keyDown(document.activeElement as Element, { key: "ArrowLeft" });
    expect(within(table).getByRole("checkbox", { name: "Lundi, matin, 8h à 12h" })).toHaveFocus();
  });

  it("propose un accordéon par jour avec le nombre de créneaux", () => {
    openGrid();
    const lundi = screen.getAllByText("Lundi").find((el) => el.closest("summary"));
    expect(lundi).toBeDefined();
    const details = lundi?.closest("details") as HTMLElement;
    expect(details).toHaveTextContent("Aucun créneau");
    fireEvent.click(within(details).getByRole("checkbox", { name: "Lundi, matin, 8h à 12h" }));
    expect(details).toHaveTextContent("1 créneau");
  });

  it("déduit les horaires précis des créneaux, les laisse modifier et copier", () => {
    const table = openGrid();
    expect(
      screen.queryByRole("checkbox", { name: "Je préfère indiquer des horaires précis" }),
    ).toBeNull();
    fireEvent.click(within(table).getByRole("checkbox", { name: "Lundi, matin, 8h à 12h" }));
    fireEvent.click(within(table).getByRole("checkbox", { name: "Lundi, midi, 12h à 14h" }));
    fireEvent.click(within(table).getByRole("checkbox", { name: "Jeudi, soirée, 18h à 21h" }));
    fireEvent.click(
      screen.getByRole("checkbox", { name: "Je préfère indiquer des horaires précis" }),
    );
    const lundi = screen.getByRole("group", { name: "Lundi, plage 1" });
    expect(within(lundi).getByRole("combobox", { name: "De" })).toHaveValue("08:00");
    expect(within(lundi).getByRole("combobox", { name: "À" })).toHaveValue("14:00");
    fireEvent.change(within(lundi).getByRole("combobox", { name: "À" }), {
      target: { value: "13:30" },
    });
    expect(screen.getByText(/Environ 8,5 heures par semaine\./)).toBeInTheDocument();
    const jeudi = screen.getByRole("group", { name: "Jeudi, plage 1" });
    fireEvent.change(within(jeudi).getByRole("combobox", { name: "De" }), {
      target: { value: "22:00" },
    });
    fireEvent.change(within(jeudi).getByRole("combobox", { name: "À" }), {
      target: { value: "06:00" },
    });
    expect(
      screen.getByText(/Environ 13,5 heures par semaine, dont une nuit\./),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("radiogroup", { name: "Comment se passent les nuits ?" }),
    ).toBeInTheDocument();
    fireEvent.change(
      screen.getAllByRole("combobox", { name: "Copier ce jour sur…" })[0] as Element,
      {
        target: { value: "jeu" },
      },
    );
    fireEvent.click(screen.getAllByRole("button", { name: "Copier" })[0] as Element);
    expect(
      within(screen.getByRole("group", { name: "Jeudi, plage 1" })).getByRole("combobox", {
        name: "À",
      }),
    ).toHaveValue("13:30");
    fireEvent.click(screen.getAllByRole("button", { name: "Ajouter une plage" })[0] as Element);
    expect(screen.getByRole("group", { name: "Lundi, plage 2" })).toBeInTheDocument();
    fireEvent.click(
      within(screen.getByRole("group", { name: "Lundi, plage 2" })).getByRole("button", {
        name: "Retirer",
      }),
    );
    expect(screen.queryByRole("group", { name: "Lundi, plage 2" })).toBeNull();
  });

  it("affiche le budget seulement quand une base tarifaire existe", () => {
    const value = {
      ...emptyPlanning,
      rythme: "regulier" as const,
      grille: { lun: ["morning" as const] },
    };
    expect(budgetText(value, null, texts)).toBeNull();
    expect(budgetText(value, basis, texts)?.replace(/[  ]/g, " ")).toBe(
      "Environ 520 € par mois TTC, soit 260 € après crédit d'impôt.",
    );
    const table = openGrid(basis);
    expect(screen.queryByText(/par mois TTC/)).toBeNull();
    fireEvent.click(within(table).getByRole("checkbox", { name: "Lundi, matin, 8h à 12h" }));
    expect(screen.getByText(/Environ 520 € par mois TTC/)).toBeInTheDocument();
    expect(
      screen.getByText("Estimation indicative, devis gratuit après évaluation."),
    ).toBeInTheDocument();
  });

  it("ponctuel : dates une à une ou par période, créneaux communs, résumé total", () => {
    render(<WeekPlannerInput texts={texts} />);
    fireEvent.click(screen.getByRole("radio", { name: "Ponctuel, à des dates précises" }));
    expect(screen.getByText("Aucune date choisie pour l'instant.")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Une date"), { target: { value: "2026-10-03" } });
    fireEvent.click(screen.getByRole("button", { name: "Ajouter cette date" }));
    fireEvent.change(screen.getByLabelText("Ou une période, du"), {
      target: { value: "2026-10-10" },
    });
    fireEvent.change(screen.getByLabelText("au"), { target: { value: "2026-10-12" } });
    fireEvent.click(screen.getByRole("button", { name: "Ajouter la période" }));
    expect(screen.getByText("4 date(s) choisie(s)")).toBeInTheDocument();
    expect(screen.getByText("samedi 3 octobre 2026")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Retirer dimanche 11 octobre 2026" }));
    expect(screen.getByText("3 date(s) choisie(s)")).toBeInTheDocument();
    const slots = screen.getByRole("group", { name: "À quels moments, ces jours-là ?" });
    fireEvent.click(within(slots).getByLabelText(/^Matin/));
    fireEvent.click(within(slots).getByLabelText(/^Nuit/));
    expect(
      screen.getByText(/^Environ 39 heures au total sur 3 date\(s\), dont 3 nuits\./),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("radiogroup", { name: "Comment se passent les nuits ?" }),
    ).toBeInTheDocument();
  });

  it("24h/24 : tous les jours ou jours choisis, grille remplie d'office, début et durée", () => {
    render(<WeekPlannerInput texts={texts} />);
    fireEvent.click(screen.getByRole("radio", { name: "Présence continue 24h/24" }));
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("radio", { name: "Oui, 7 jours sur 7" }));
    const table = screen.getByRole("table", { name: "Vos créneaux de la semaine" });
    expect(within(table).getAllByRole("checkbox", { checked: true })).toHaveLength(42);
    expect(screen.getByText(/^Environ 168 heures par semaine, dont 7 nuits\./)).toBeInTheDocument();
    fireEvent.click(within(table).getByRole("checkbox", { name: "Lundi, matin, 8h à 12h" }));
    expect(screen.getByText(/^Environ 164 heures par semaine/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("radio", { name: "Certains jours seulement" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Samedi" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Dimanche" }));
    expect(within(table).getAllByRole("checkbox", { checked: true })).toHaveLength(30);
    fireEvent.change(screen.getByLabelText("Date de début souhaitée"), {
      target: { value: "2026-10-01" },
    });
    fireEvent.click(screen.getByRole("radio", { name: "Quelques semaines" }));
    expect(screen.getByRole("radio", { name: "Quelques semaines" })).toBeChecked();
    expect(screen.getByLabelText("Date de début souhaitée")).toHaveValue("2026-10-01");
  });

  it("fonctionne en mode contrôlé", () => {
    const onChange = vi.fn();
    const value = {
      ...emptyPlanning,
      rythme: "regulier" as const,
      grille: { mer: ["noon" as const] },
    };
    render(<WeekPlannerInput texts={texts} value={value} onChange={onChange} />);
    const table = screen.getByRole("table");
    expect(
      within(table).getByRole("checkbox", { name: "Mercredi, midi, 12h à 14h" }),
    ).toBeChecked();
    fireEvent.click(within(table).getByRole("checkbox", { name: "Jeudi, midi, 12h à 14h" }));
    expect(onChange).toHaveBeenCalledWith({ ...value, grille: { mer: ["noon"], jeu: ["noon"] } });
    fireEvent.click(screen.getByRole("radio", { name: "Dans le mois" }));
    expect(onChange).toHaveBeenLastCalledWith({ ...value, urgence: "mois" });
    expect(summaryText(value, texts)).toMatch(/^Environ 2 heures par semaine\./);
  });
});
