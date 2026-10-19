import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { MembreDuFoyer, Protection } from "@/lib/bureau/api";
import { FoyerMembres } from "./FoyerMembres";

const NADIA = "a".repeat(24);
const CLAIRE = "b".repeat(24);

function membre(over: Partial<MembreDuFoyer> = {}): MembreDuFoyer {
  return {
    id: NADIA,
    nom: "Nadia",
    role: "proche_referent",
    statut: "actif",
    droits: [{ id: "d1", module: "planning", actions: ["voir"] }],
    ...over,
  };
}

describe("les membres d'un foyer", () => {
  it("dit le rôle en français et les droits effectifs", () => {
    render(<FoyerMembres membres={[membre()]} protections={[]} />);
    expect(screen.getByText("Nadia")).toBeVisible();
    expect(screen.getByText("proche référent")).toBeVisible();
    expect(screen.getByText(/planning/)).toBeVisible();
    expect(screen.getByText(/\(voir\)/)).toBeVisible();
  });

  it("dit en mots qu'un membre sans droit ne voit rien", () => {
    render(<FoyerMembres membres={[membre({ droits: [] })]} protections={[]} />);
    expect(screen.getByText(/ne voit rien de ce foyer/)).toBeVisible();
  });

  it("signale une invitation en cours et un accès retiré", () => {
    render(
      <FoyerMembres
        membres={[
          membre({ statut: "invite" }),
          membre({ id: CLAIRE, nom: "Claire", statut: "revoque" }),
        ]}
        protections={[]}
      />,
    );
    expect(screen.getByText("invitation en cours")).toBeVisible();
    expect(screen.getByText("accès retiré")).toBeVisible();
  });

  it("montre la mesure de protection et marque celle qui n'est pas vérifiée", () => {
    const protections: Protection[] = [
      {
        memberId: NADIA,
        type: "tutelle",
        portee: ["biens", "personne"],
        representation: "representation",
        verifiee: false,
      },
    ];
    render(<FoyerMembres membres={[membre()]} protections={protections} />);
    expect(screen.getByText(/tutelle \(biens et personne, représentation\)/)).toBeVisible();
    expect(screen.getByText("non vérifiée")).toBeVisible();
  });

  it("ne montre pas la mesure d'un autre membre sur le mauvais membre", () => {
    const protections: Protection[] = [
      {
        memberId: CLAIRE,
        type: "curatelle",
        portee: ["biens"],
        representation: "assistance",
        verifiee: true,
      },
    ];
    render(<FoyerMembres membres={[membre()]} protections={protections} />);
    expect(screen.queryByText(/curatelle/)).toBeNull();
  });

  it("dit qu'un foyer sans membre n'a personne, au lieu d'une liste vide", () => {
    render(<FoyerMembres membres={[]} protections={[]} />);
    expect(screen.getByText(/Personne n’est encore rattaché/)).toBeVisible();
  });
});
