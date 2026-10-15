/** @vitest-environment node */
import { describe, expect, it } from "vitest";
import { grant, household, membership, visit, NOW } from "../test/fixtures";
import { MemoryAuthorizationStore } from "./authorization-store";

const foyer = household();
const autreFoyer = household({ code: "FOY-0002" });
const membre = "a1b2c3d4e5f6a1b2c3d4e5f6";

describe("la lecture du contexte d'autorisation", () => {
  const store = new MemoryAuthorizationStore({
    households: [foyer, autreFoyer],
    memberships: [
      membership({ memberId: membre, householdId: foyer._id, role: "proche_referent" }),
      membership({ memberId: membre, householdId: autreFoyer._id, role: "proche_invite" }),
    ],
    grants: [
      grant({ memberId: membre, householdId: foyer._id, module: "planning", actions: ["voir"] }),
      grant({
        memberId: membre,
        householdId: autreFoyer._id,
        module: "documents",
        actions: ["voir"],
      }),
    ],
    visits: [visit({ householdId: foyer._id, workerId: membre })],
  });

  it("ne renvoie jamais les droits d'un autre foyer", async () => {
    const contexte = await store.loadContext({
      memberId: membre,
      householdId: foyer._id,
      now: NOW,
    });
    expect(contexte.grants.map((droit) => droit.module)).toEqual(["planning"]);
    expect(contexte.membership?.role).toBe("proche_referent");
  });

  it("un même membre a un rôle par foyer", async () => {
    const contexte = await store.loadContext({
      memberId: membre,
      householdId: autreFoyer._id,
      now: NOW,
    });
    expect(contexte.membership?.role).toBe("proche_invite");
  });

  it("ne charge les visites que lorsqu'on les demande", async () => {
    const sans = await store.loadContext({ memberId: membre, householdId: foyer._id, now: NOW });
    expect(sans.assignedVisits).toBeUndefined();
    const avec = await store.loadContext({
      memberId: membre,
      householdId: foyer._id,
      now: NOW,
      withAssignedVisits: true,
    });
    expect(avec.assignedVisits).toHaveLength(1);
  });

  it("répond « foyer inconnu » plutôt que de fuiter son existence", async () => {
    const contexte = await store.loadContext({
      memberId: membre,
      householdId: "f".repeat(24),
      now: NOW,
    });
    expect(contexte.household).toBeNull();
    expect(contexte.membership).toBeNull();
  });
});
