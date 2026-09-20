import { render, screen, within } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import interfaceJson from "../../../../content/interface.json";
import type { WeekEntry } from "@/lib/week/week";
import { WEEK_COUNT_DURATION, WeekPlanner, summaryParts, summaryText } from "./WeekPlanner";

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
    expect(summaryText(entries, texts)).toBe("Environ 15 heures par semaine, dont une nuit.");
    expect(summaryParts(entries, texts)).toEqual({
      before: "Environ ",
      hours: 15,
      after: " heures par semaine, dont une nuit.",
    });
    const summary = document.querySelector(".week-summary") as HTMLElement;
    expect(summary).toHaveTextContent(/^Environ 15\s*15 heures par semaine, dont une nuit\.$/);
    expect(summary.querySelector(".m-count .sr-only")).toHaveTextContent("15");
    expect(WEEK_COUNT_DURATION).toBe(600);
  });

  it("numérote les cases remplies pour week-fill, ligne par ligne, sans rien cacher", () => {
    const { container } = render(<WeekPlanner title="Exemple" entries={entries} texts={texts} />);
    const root = container.firstElementChild as HTMLElement;
    expect(root).toHaveClass("week-planner", "m-reveal");
    expect(root).toHaveAttribute("data-variant", "display");
    expect(root).not.toHaveAttribute("data-reveal");
    const table = screen.getByRole("table");
    const filled = Array.from(table.querySelectorAll(".week-fill")) as HTMLElement[];
    expect(filled).toHaveLength(3);
    // Ordre de remplissage : matin (lundi), après-midi (mardi), nuit (mercredi)
    expect(filled.map((cell) => cell.style.getPropertyValue("--m-i"))).toEqual(["0", "1", "2"]);
    expect(filled[0]).toHaveTextContent("Gestes du quotidien");
    expect(filled[2]).toHaveTextContent("Nuit");
  });

  it("rend la grille pleine et le résumé définitif côté serveur", () => {
    const html = renderToString(<WeekPlanner title="Exemple" entries={entries} texts={texts} />);
    expect(html).toContain("Gestes du quotidien");
    expect(html).toContain("heures par semaine, dont une nuit.");
    expect(html).not.toContain("data-reveal");
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
