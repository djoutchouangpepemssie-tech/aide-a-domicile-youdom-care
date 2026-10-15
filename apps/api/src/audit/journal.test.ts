/** @vitest-environment node */
import { describe, expect, it } from "vitest";
import { grant, household, membership, NOW } from "../test/fixtures";
import type { AuthorizationContext } from "../droits/authorize";
import { MemoryAuditJournal, authorizeAndLog } from "./journal";

const foyer = household();
const membre = "a1b2c3d4e5f6a1b2c3d4e5f6";

function contexte(overrides: Partial<AuthorizationContext> = {}): AuthorizationContext {
  return {
    now: NOW,
    household: { _id: foyer._id, status: "actif" },
    membership: membership({ memberId: membre, householdId: foyer._id, role: "beneficiaire" }),
    grants: [],
    ...overrides,
  };
}

describe("le journal d'audit", () => {
  it("garde les refus, pas seulement les succès", async () => {
    const journal = new MemoryAuditJournal();
    await authorizeAndLog(
      { memberId: membre, householdId: foyer._id, module: "fiche_de_vie", action: "voir" },
      contexte(),
      journal,
    );
    expect(journal.all()).toHaveLength(1);
    expect(journal.all()[0]).toMatchObject({
      outcome: "refuse",
      reason: "aucun_droit",
      module: "fiche_de_vie",
      actorId: membre,
      actorRole: "beneficiaire",
    });
  });

  it("garde aussi les accès autorisés : le bénéficiaire doit pouvoir les relire", async () => {
    const journal = new MemoryAuditJournal();
    await authorizeAndLog(
      { memberId: membre, householdId: foyer._id, module: "planning", action: "voir" },
      contexte({
        grants: [
          grant({
            memberId: membre,
            householdId: foyer._id,
            module: "planning",
            actions: ["voir"],
          }),
        ],
      }),
      journal,
      { requestId: "req-42" },
    );
    expect(journal.all()[0]).toMatchObject({
      outcome: "autorise",
      reason: null,
      requestId: "req-42",
    });
  });

  it("n'écrit jamais le contenu consulté", async () => {
    const journal = new MemoryAuditJournal();
    await authorizeAndLog(
      { memberId: membre, householdId: foyer._id, module: "comptes_rendus", action: "voir" },
      contexte(),
      journal,
      { target: "visite du 14/10" },
    );
    const champs = Object.keys(journal.all()[0]);
    for (const interdit of ["body", "content", "notes", "payload", "pathologies"]) {
      expect(champs).not.toContain(interdit);
    }
  });

  it("refuse un événement mal formé plutôt que de l'écrire", async () => {
    const journal = new MemoryAuditJournal();
    await expect(
      // @ts-expect-error — module inexistant : le schéma doit arrêter l'écriture.
      journal.append({ at: NOW, action: "voir", module: "inconnu", outcome: "autorise" }),
    ).rejects.toThrow();
  });

  it("n'expose ni modification ni suppression", () => {
    const journal = new MemoryAuditJournal();
    expect(Reflect.get(journal, "update")).toBeUndefined();
    expect(Reflect.get(journal, "delete")).toBeUndefined();
  });
});
