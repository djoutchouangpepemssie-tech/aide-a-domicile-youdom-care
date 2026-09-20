import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { Tabs } from "./Tabs";

const items = [
  { id: "a", label: "Madeleine", content: <p>Semaine de Madeleine</p> },
  { id: "b", label: "Noé", content: <p>Semaine de Noé</p> },
  { id: "c", label: "Bernard", content: <p>Semaine de Bernard</p> },
];

describe("Tabs", () => {
  it("rend une liste d'onglets nommée, le premier sélectionné, un panneau relié", () => {
    render(<Tabs items={items} label="Exemples de semaines" />);
    const tablist = screen.getByRole("tablist", { name: "Exemples de semaines" });
    const tabs = screen.getAllByRole("tab");
    expect(tablist).toBeInTheDocument();
    expect(tabs).toHaveLength(3);
    expect(tabs[0]).toHaveAttribute("aria-selected", "true");
    expect(tabs[1]).toHaveAttribute("tabindex", "-1");
    const panel = screen.getByRole("tabpanel");
    expect(panel).toHaveAccessibleName("Madeleine");
    expect(panel).toHaveTextContent("Semaine de Madeleine");
  });

  it("se pilote à la souris et aux flèches, Début et Fin", async () => {
    render(<Tabs items={items} label="Exemples" />);
    const tabs = screen.getAllByRole("tab");
    await userEvent.click(tabs[1] as HTMLElement);
    expect(screen.getByRole("tabpanel")).toHaveTextContent("Semaine de Noé");

    await userEvent.keyboard("{ArrowRight}");
    expect(tabs[2]).toHaveFocus();
    expect(screen.getByRole("tabpanel")).toHaveTextContent("Semaine de Bernard");

    await userEvent.keyboard("{ArrowRight}");
    expect(tabs[0]).toHaveFocus();
    await userEvent.keyboard("{End}");
    expect(tabs[2]).toHaveFocus();
    await userEvent.keyboard("{Home}");
    expect(tabs[0]).toHaveFocus();
    expect(screen.getByRole("tabpanel")).toHaveTextContent("Semaine de Madeleine");
  });
});
