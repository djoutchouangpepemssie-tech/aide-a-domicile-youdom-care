import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StageCards } from "./StageCards";

describe("StageCards", () => {
  it("rend une liste ordonnée de trois stades reliés par le fil", () => {
    render(
      <>
        <h2 id="stades">Un accompagnement qui évolue</h2>
        <StageCards
          aria-labelledby="stades"
          stages={[
            { title: "Début", text: <p>Faire avec, pas à la place.</p> },
            { title: "Stade modéré", text: <p>Présence quotidienne.</p> },
            { title: "Stade avancé", text: <p>Présence étendue ou continue.</p> },
          ]}
        />
      </>,
    );
    const list = screen.getByRole("list", { name: "Un accompagnement qui évolue" });
    expect(list.tagName).toBe("OL");
    const items = within(list).getAllByRole("listitem");
    expect(items).toHaveLength(3);
    expect(items[0]).toHaveTextContent("1Début");
    expect(items[0]?.querySelector(".bg-teal-700")).not.toBeNull();
    expect(items[2]?.querySelector(".bg-teal-700")).toBeNull();
    expect(items[2]?.querySelector(".border-raspberry-500")).not.toBeNull();
  });
});
