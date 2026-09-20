import { render, screen, within } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { STAGE_DEPTH_PX, StageCards, stageId } from "./StageCards";

const stages = [
  { title: "Début", text: <p>Faire avec, pas à la place.</p>, icone: "memoire" as const },
  { title: "Stade modéré", text: <p>Présence quotidienne.</p> },
  { title: "Stade avancé", text: <p>Présence étendue ou continue.</p> },
];

describe("StageCards", () => {
  it("rend une liste ordonnée de trois stades reliés par le fil, nœud framboise sur le dernier", () => {
    render(
      <>
        <h2 id="stades">Un accompagnement qui évolue</h2>
        <StageCards aria-labelledby="stades" stages={stages} />
      </>,
    );
    const list = screen.getByRole("list", { name: "Un accompagnement qui évolue" });
    expect(list.tagName).toBe("OL");
    expect(list).toHaveClass("stage-cards", "t-rail", "m-reveal--draw");
    const items = within(list).getAllByRole("listitem");
    expect(items).toHaveLength(3);
    expect(items[0]).toHaveTextContent("Début");
    expect(items[1]).toHaveTextContent("2Stade modéré");
    // Icône à la place du numéro sur le premier stade
    expect(items[0]?.querySelector('[data-icon="memoire"]')).not.toBeNull();
    // Deux segments du fil (pas après le dernier), un nœud par stade
    expect(list.querySelectorAll(".t-connector")).toHaveLength(2);
    expect(items[2]?.querySelector(".t-connector")).toBeNull();
    expect(items[2]?.querySelector(".t-knot")).toHaveClass("text-raspberry-500");
    expect(items[0]?.querySelector(".t-knot")).toHaveClass("text-teal-700");
  });

  it("donne un identifiant à chaque stade (stade-1…) et respecte `ids` et `active`", () => {
    const { container, unmount } = render(<StageCards stages={stages} active={1} />);
    const items = container.querySelectorAll("li");
    expect(Array.from(items).map((item) => item.id)).toEqual(["stade-1", "stade-2", "stade-3"]);
    expect(items[1]).toHaveAttribute("data-active", "true");
    expect(items[0]).not.toHaveAttribute("data-active");
    unmount();

    render(<StageCards stages={stages} ids={["debut", "evolution", "avance"]} />);
    expect(document.getElementById("evolution")).not.toBeNull();
    expect(stageId({ title: "x", id: "propre" }, 4)).toBe("propre");
    expect(stageId({ title: "x" }, 4)).toBe("stade-5");
  });

  it("entre à trois profondeurs (0 / 12 / 24 px) avec 200 ms d'écart, en variables CSS", () => {
    const { container } = render(<StageCards stages={stages} />);
    const items = Array.from(container.querySelectorAll("li")) as HTMLElement[];
    expect(STAGE_DEPTH_PX).toBe(12);
    expect(items.map((item) => item.style.getPropertyValue("--t-depth"))).toEqual([
      "",
      "12px",
      "24px",
    ]);
    expect(items.map((item) => item.style.getPropertyValue("--m-delay"))).toEqual([
      "",
      "200ms",
      "400ms",
    ]);
    expect(items.every((item) => item.classList.contains("t-rail__item"))).toBe(true);
  });

  it("est complet et visible au rendu serveur, sans état de révélation", () => {
    const html = renderToString(<StageCards stages={stages} />);
    expect(html).toContain("Stade avancé");
    expect(html).toContain('id="stade-3"');
    expect(html).not.toContain("data-reveal");
  });
});
