import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { VisiteDuJour } from "@/lib/bureau/api";
import { VisiteCarte, heure } from "./VisiteCarte";

function visite(over: Partial<VisiteDuJour> = {}): VisiteDuJour {
  return {
    id: "v1",
    foyer: { id: "f1", code: "FOY-0001" },
    adresse: { line1: "12 rue des Lilas", postalCode: "75011", city: "Paris" },
    // 9 h 00 – 11 h 00 heure de Paris, en octobre (UTC+2).
    debut: "2026-10-20T07:00:00.000Z",
    fin: "2026-10-20T09:00:00.000Z",
    nature: "jour",
    statut: "prevue",
    pointages: [],
    ...over,
  };
}

const rendre = (props: Partial<Parameters<typeof VisiteCarte>[0]> = {}) =>
  render(
    <ul>
      <VisiteCarte
        visite={visite()}
        enAttente={[]}
        nfcDisponible={false}
        onPointer={vi.fn()}
        {...props}
      />
    </ul>,
  );

describe("une visite de la tournée", () => {
  it("dit l'heure de Paris en français, pas un horodatage", () => {
    expect(heure("2026-10-20T07:00:00.000Z")).toBe("9 h 00");
    // Le changement d'heure ne décale pas l'affichage : en janvier, Paris est à UTC+1.
    expect(heure("2026-01-20T08:05:00.000Z")).toBe("9 h 05");
  });

  it("ne propose qu'un geste : celui que le terrain attend ensuite", async () => {
    rendre();
    expect(screen.getByRole("button", { name: /Je suis en route/ })).toBeVisible();
    expect(screen.queryByRole("button", { name: /Je repars/ })).toBeNull();
  });

  it("passe à l'arrivée puis au départ au fil des pointages", () => {
    rendre({
      visite: visite({
        pointages: [{ type: "en_route", source: "nfc", at: "2026-10-20T06:50:00.000Z" }],
      }),
    });
    expect(screen.getByRole("button", { name: /Je suis arrivée/ })).toBeVisible();
    expect(screen.getByText(/en route à 8 h 50/)).toBeVisible();
  });

  it("ne propose plus rien quand le départ est pointé, et le dit", () => {
    rendre({
      visite: visite({
        pointages: [
          { type: "arrivee", source: "nfc", at: "2026-10-20T07:02:00.000Z" },
          { type: "depart", source: "nfc", at: "2026-10-20T09:01:00.000Z" },
        ],
      }),
    });
    expect(screen.getByText("visite pointée")).toBeVisible();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("exige un motif pour un pointage manuel, et le transmet", async () => {
    const utilisateur = userEvent.setup();
    const onPointer = vi.fn();
    rendre({ onPointer });

    await utilisateur.click(screen.getByRole("button", { name: /Je suis en route/ }));
    const valider = screen.getByRole("button", { name: /Je suis en route/ });
    expect(valider).toBeDisabled();

    await utilisateur.type(screen.getByLabelText(/Pourquoi un pointage manuel/), "badge illisible");
    await utilisateur.click(screen.getByRole("button", { name: /Je suis en route/ }));
    expect(onPointer).toHaveBeenCalledWith("en_route", "manuel", "badge illisible");
  });

  it("propose le badge seulement quand le téléphone sait le lire", async () => {
    const utilisateur = userEvent.setup();
    const onPointer = vi.fn();
    rendre({ nfcDisponible: true, onPointer });
    await utilisateur.click(screen.getByRole("button", { name: /badge/ }));
    expect(onPointer).toHaveBeenCalledWith("en_route", "nfc");
  });

  it("montre ce qui n'est pas encore parti, au lieu de le cacher", () => {
    rendre({ enAttente: [{ type: "arrivee", essais: 3 }] });
    expect(screen.getByText("en attente d’envoi")).toBeVisible();
    expect(screen.getByText(/3 essais/)).toBeVisible();
    // Un pointage en attente compte comme pointé : on ne repropose pas l'arrivée.
    expect(screen.getByRole("button", { name: /Je repars/ })).toBeVisible();
  });
});
