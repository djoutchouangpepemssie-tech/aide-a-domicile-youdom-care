import { beforeEach, describe, expect, it } from "vitest";
import { CLEF_FILE, file, prochainGeste } from "./pointages";

describe("la file des pointages", () => {
  beforeEach(() => {
    globalThis.localStorage?.clear();
  });

  it("garde un pointage en attente et le retire une fois envoyé", () => {
    const apres = file.ajouter({
      id: "p1",
      visitId: "v1",
      type: "arrivee",
      source: "nfc",
      at: "2026-10-20T09:02:00.000Z",
    });
    expect(apres).toHaveLength(1);
    expect(file.lire()[0]?.essais).toBe(0);
    expect(file.retirer("p1")).toHaveLength(0);
  });

  it("compte les essais, pour que l'écran puisse le dire", () => {
    file.ajouter({
      id: "p1",
      visitId: "v1",
      type: "arrivee",
      source: "nfc",
      at: "2026-10-20T09:00:00.000Z",
    });
    file.marquerEssai("p1");
    file.marquerEssai("p1");
    expect(file.lire()[0]?.essais).toBe(2);
  });

  it("écarte un enregistrement illisible sans emporter les autres", () => {
    globalThis.localStorage.setItem(
      CLEF_FILE,
      JSON.stringify([
        {
          id: "bon",
          visitId: "v1",
          type: "arrivee",
          source: "manuel",
          at: "2026-10-20T09:00:00.000Z",
          essais: 0,
        },
        { id: "cassé", type: "arrivee" },
        "n'importe quoi",
      ]),
    );
    expect(file.lire().map((entree) => entree.id)).toEqual(["bon"]);
  });

  it("rend une file vide quand le stockage contient n'importe quoi", () => {
    globalThis.localStorage.setItem(CLEF_FILE, "{pas du json");
    expect(file.lire()).toEqual([]);
  });

  it("suit l'ordre du terrain pour le prochain geste", () => {
    expect(prochainGeste([])).toBe("en_route");
    expect(prochainGeste([{ type: "en_route" }])).toBe("arrivee");
    expect(prochainGeste([{ type: "en_route" }, { type: "arrivee" }])).toBe("depart");
    expect(prochainGeste([{ type: "arrivee" }, { type: "depart" }])).toBe("termine");
    // Une arrivée pointée sans « en route » (le cas courant) ne fait pas revenir en arrière.
    expect(prochainGeste([{ type: "arrivee" }])).toBe("depart");
  });
});
