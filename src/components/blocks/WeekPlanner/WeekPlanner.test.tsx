import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import interfaceJson from "../../../../content/interface.json";
import type { WeekEntry } from "@/lib/week/week";
import { WeekPlanner } from "./WeekPlanner";

const texts = interfaceJson.semaine_type;

const entries: WeekEntry[] = [
  { jour: "lun", creneau: "morning", activite: "gestes", heures: "8h–11h", libelle: "Lever" },
  { jour: "mar", creneau: "afternoon", activite: "sorties", heures: "14h–17h" },
  { jour: "mer", creneau: "night", activite: "nuit", libelle: "Nuit" },
];

describe("WeekPlanner (lecture)", () => {
  it("rend un tableau réel avec en-têtes de ligne et de colonne, mention et résumé", () => {
    render(
      <WeekPlanner
        title="Madeleine, 82 ans"
        context="Vit avec son mari."
        entries={entries}
        texts={texts}
      />,
    );
    const table = screen.getByRole("table", { name: /Madeleine, 82 ans/ });
    expect(within(table).getAllByRole("columnheader")).toHaveLength(8);
    expect(within(table).getAllByRole("rowheader")).toHaveLength(6);
    expect(within(table).getByRole("columnheader", { name: "Lundi" })).toBeInTheDocument();
    expect(within(table).getByRole("rowheader", { name: /Nuit/ })).toHaveTextContent("21h–6h");

    const cells = within(table).getAllByRole("cell");
    expect(cells).toHaveLength(42);
    expect(within(table).getAllByText("Gestes du quotidien")).toHaveLength(1);
    expect(within(table).getByText("8h–11h")).toBeInTheDocument();
    expect(within(table).getAllByText("Libre")).toHaveLength(39);

    expect(screen.getAllByText("Exemple illustratif").length).toBeGreaterThan(0);
    // 3 h (8h–11h) + 3 h (14h–17h) + 9 h (nuit)
    expect(screen.getByText("Environ 15 heures par semaine, dont une nuit.")).toBeInTheDocument();
  });

  it("n'affiche dans la légende que les activités utilisées", () => {
    render(<WeekPlanner title="Exemple" entries={entries} texts={texts} />);
    const legend = screen.getByText("Légende des activités").nextElementSibling as HTMLElement;
    const items = within(legend)
      .getAllByRole("listitem")
      .map((item) => item.textContent);
    expect(items).toEqual(["Gestes du quotidien", "Sorties", "Nuit"]);
  });

  it("propose une liste par jour pour les petits écrans", () => {
    render(<WeekPlanner title="Exemple" entries={entries} texts={texts} />);
    const days = screen.getAllByText(/^(Lundi|Mardi|Mercredi|Jeudi|Vendredi|Samedi|Dimanche)$/);
    // 7 en-têtes de colonne + 7 titres de jour dans la liste mobile
    expect(days).toHaveLength(14);
  });
});
