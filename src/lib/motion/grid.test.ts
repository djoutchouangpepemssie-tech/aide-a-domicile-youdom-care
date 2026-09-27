import { describe, expect, it } from "vitest";
import {
  MOTION_DURATION,
  MOTION_EASE_OUT,
  MOTION_MAX_DURATION,
  MOTION_PRESS_SCALE,
  MOTION_RISE_PX,
  MOTION_STAGGER,
  MOTION_TILT_MAX_DEGREES,
  ms,
} from "./grid";

/*
 * La grille est le contrat du mouvement écrit en chiffres (BRIEF_LIQUID_GLASS §5, D-032) : ce test
 * échoue si une valeur sort du contrat, avant qu'un composant ne la reprenne.
 */

describe("grille du mouvement", () => {
  it("tient dans le contrat : rien au-dessus de 600 ms", () => {
    expect(MOTION_MAX_DURATION).toBe(600);
    for (const [name, duration] of Object.entries(MOTION_DURATION)) {
      expect(duration, name).toBeGreaterThan(0);
      expect(duration, name).toBeLessThanOrEqual(MOTION_MAX_DURATION);
    }
  });

  it("place chaque geste dans sa fourchette", () => {
    // Entrée : une seule séquence de moins de 600 ms.
    expect(MOTION_DURATION.entry).toBeLessThan(600);
    // Révélation au défilement : 250 à 400 ms.
    expect(MOTION_DURATION.reveal).toBeGreaterThanOrEqual(250);
    expect(MOTION_DURATION.draw).toBeLessThanOrEqual(400);
    // Pointeur et fondu de page : courts.
    expect(MOTION_DURATION.pointer).toBe(150);
    expect(MOTION_DURATION.page).toBe(150);
    // Pression d'un bouton : 100 ms, 95 % d'échelle.
    expect(MOTION_DURATION.press).toBe(100);
    expect(MOTION_PRESS_SCALE).toBe(0.95);
  });

  it("garde les amplitudes du contrat : 40 ms de cascade, 2°, 8 px", () => {
    expect(MOTION_STAGGER).toBe(40);
    expect(MOTION_TILT_MAX_DEGREES).toBe(2);
    expect(MOTION_RISE_PX).toBeLessThanOrEqual(8);
  });

  it("n'a qu'une courbe, celle du jeton `--ease-out`", () => {
    expect(MOTION_EASE_OUT).toBe("cubic-bezier(0.2, 0.7, 0.2, 1)");
  });

  it("formate une durée pour la CSS", () => {
    expect(ms(MOTION_DURATION.reveal)).toBe("300ms");
    expect(ms(0)).toBe("0ms");
  });
});
