import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Icon } from "./Icon";
import { iconGroups, iconNames, icons } from "./icons";

/*
 * Un petit lecteur de tracés SVG : il vérifie la grammaire (commandes connues, bon nombre
 * d'arguments), l'absence de fermeture (`Z`) et suit la plume pour s'assurer que chaque point
 * d'arrivée reste dans la grille de 24 avec sa marge de 2 (docs/design/ICONES.md).
 */
const ARGS: Record<string, number> = { M: 2, L: 2, T: 2, H: 1, V: 1, C: 6, S: 4, Q: 4, A: 7 };
const MARGIN = 2;
const GRID = 24;

interface Pen {
  x: number;
  y: number;
  points: { x: number; y: number }[];
  commands: number;
}

function walk(d: string): Pen {
  const tokens = d.match(/[a-zA-Z]|-?(?:\d+\.?\d*|\.\d+)/g) ?? [];
  const pen: Pen = { x: 0, y: 0, points: [], commands: 0 };
  let index = 0;
  let command = "";

  const number = (): number => {
    const token = tokens[index++];
    if (token === undefined || /[a-zA-Z]/.test(token)) {
      throw new Error(`argument manquant après « ${command} » dans « ${d} »`);
    }
    return Number(token);
  };

  while (index < tokens.length) {
    const token = tokens[index];
    if (token !== undefined && /[a-zA-Z]/.test(token)) {
      command = token;
      index += 1;
    } else if (command === "M") {
      command = "L";
    } else if (command === "m") {
      command = "l";
    }
    const upper = command.toUpperCase();
    if (upper === "Z") throw new Error(`tracé fermé par Z dans « ${d} »`);
    const count = ARGS[upper];
    if (count === undefined) throw new Error(`commande inconnue « ${command} » dans « ${d} »`);
    const relative = command !== upper;
    const args = Array.from({ length: count }, number);
    const [ox, oy] = relative ? [pen.x, pen.y] : [0, 0];
    switch (upper) {
      case "H":
        pen.x = ox + args[0];
        break;
      case "V":
        pen.y = oy + args[0];
        break;
      default: {
        // Les deux derniers arguments sont toujours le point d'arrivée.
        pen.x = ox + args[count - 2];
        pen.y = oy + args[count - 1];
      }
    }
    pen.points.push({ x: pen.x, y: pen.y });
    pen.commands += 1;
  }
  return pen;
}

describe("registre des icônes", () => {
  it("compte au moins 32 icônes, toutes rattachées à un groupe connu", () => {
    expect(iconNames.length).toBeGreaterThanOrEqual(32);
    const groups = new Set(iconGroups.map((group) => group.id));
    for (const name of iconNames) {
      expect(groups.has(icons[name].groupe), name).toBe(true);
    }
  });

  it.each(iconNames)(
    "« %s » : tracé valide, ouvert, dans la grille de 24 avec marge de 2",
    (name) => {
      const { main, knot } = icons[name];
      expect(main.trim()).not.toBe("");
      expect(main).toMatch(/^M/);

      const pen = walk(main);
      expect(pen.commands).toBeGreaterThan(1);
      for (const point of pen.points) {
        expect(point.x, `${name} : x=${point.x}`).toBeGreaterThanOrEqual(MARGIN - 0.01);
        expect(point.x, `${name} : x=${point.x}`).toBeLessThanOrEqual(GRID - MARGIN + 0.01);
        expect(point.y, `${name} : y=${point.y}`).toBeGreaterThanOrEqual(MARGIN - 0.01);
        expect(point.y, `${name} : y=${point.y}`).toBeLessThanOrEqual(GRID - MARGIN + 0.01);
      }

      if (knot !== undefined) {
        expect(knot.trim()).not.toBe("");
        expect(knot).toMatch(/^M/);
        expect(walk(knot).commands).toBeGreaterThan(0);
        // Le nœud est un segment du dessin, jamais le dessin entier.
        expect(knot.length).toBeLessThan(main.length);
      }
    },
  );
});

describe("Icon", () => {
  it.each(iconNames)("« %s » rend un SVG 24 × 24 non vide", (name) => {
    const { container } = render(<Icon name={name} />);
    const svg = container.querySelector("svg");
    expect(svg).not.toBeNull();
    expect(svg).toHaveAttribute("viewBox", "0 0 24 24");
    expect(svg).toHaveAttribute("fill", "none");
    expect(svg).toHaveAttribute("data-icon", name);
    const paths = container.querySelectorAll("path");
    expect(paths.length).toBeGreaterThanOrEqual(1);
    for (const path of paths) {
      expect(path.getAttribute("d")).toBeTruthy();
      expect(path).toHaveAttribute("vector-effect", "non-scaling-stroke");
    }
  });

  it("dessine le nœud en framboise quand il existe, et rien de plus sinon", () => {
    const { container: withKnot } = render(<Icon name="maison" />);
    expect(withKnot.querySelectorAll("path")).toHaveLength(2);
    expect(withKnot.querySelector(".icon-knot")).toHaveClass("text-raspberry-500");

    const knotted = iconNames.filter((name) => icons[name].knot !== undefined);
    const plain = iconNames.filter((name) => icons[name].knot === undefined);
    for (const name of plain) {
      const { container } = render(<Icon name={name} />);
      expect(container.querySelectorAll("path")).toHaveLength(1);
      expect(container.querySelector(".icon-knot")).toBeNull();
    }
    expect(knotted.length + plain.length).toBe(iconNames.length);
  });

  it("est décorative sans libellé, image nommée avec", () => {
    const { container } = render(<Icon name="telephone" />);
    const decorative = container.querySelector("svg");
    expect(decorative).toHaveAttribute("aria-hidden", "true");
    expect(decorative).toHaveAttribute("focusable", "false");
    expect(decorative).not.toHaveAttribute("role");

    const { getByRole } = render(<Icon name="telephone" label="Téléphone" />);
    const named = getByRole("img", { name: "Téléphone" });
    expect(named).not.toHaveAttribute("aria-hidden");
  });

  it("suit les tailles 20, 24, 32 et les trois tons", () => {
    const { container: small } = render(<Icon name="coeur" size="sm" />);
    expect(small.querySelector("svg")).toHaveAttribute("width", "20");
    expect(small.querySelector("svg")).toHaveClass("size-5", "text-teal-700");

    const { container: medium } = render(<Icon name="coeur" tone="ink" />);
    expect(medium.querySelector("svg")).toHaveAttribute("width", "24");
    expect(medium.querySelector("svg")).toHaveClass("size-6", "text-ink");

    const { container: large } = render(<Icon name="coeur" size="lg" tone="white" />);
    expect(large.querySelector("svg")).toHaveAttribute("height", "32");
    expect(large.querySelector("svg")).toHaveClass("size-8", "text-white");
  });

  it("prend l'épaisseur du fil et accepte une classe supplémentaire", () => {
    const { container } = render(<Icon name="mains" className="mt-1" />);
    const svg = container.querySelector("svg");
    expect(svg).toHaveClass("icon", "mt-1");
    expect(svg?.getAttribute("style")).toContain("stroke-width: var(--thread-width, 2px)");
  });
});
