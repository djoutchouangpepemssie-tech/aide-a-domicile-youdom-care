/** @vitest-environment node */
import { describe, expect, it } from "vitest";
import { COLLECTIONS, HEALTH_COLLECTIONS, collectionSpec } from "./collections";

/*
 * `DATA_MODEL.md` §4 nomme les index à poser dès la vague 1, « parce qu'ils conditionnent la tenue
 * en charge ». Un document peut se contenter de les nommer ; un test les exige.
 */

function keysOf(collection: string): string[] {
  return (collectionSpec(collection)?.indexes ?? []).map((index) =>
    Object.keys(index.keys).join(","),
  );
}

describe("les index du socle", () => {
  it("pose les index nommés par le modèle de données", () => {
    expect(keysOf("visits")).toEqual(
      expect.arrayContaining([
        "householdId,plannedStart",
        "workerId,plannedStart",
        "status,plannedStart",
      ]),
    );
    expect(keysOf("visit_events")).toContain("visitId,at");
    expect(keysOf("access_grants")).toContain("memberId,householdId,module");
    expect(keysOf("audit_logs")).toEqual(expect.arrayContaining(["householdId,at", "actorId,at"]));
  });

  it("rend un membre, un foyer et un rôle uniques", () => {
    const index = collectionSpec("memberships")?.indexes.find((item) => item.options?.unique);
    expect(index?.keys).toEqual({ memberId: 1, householdId: 1 });
  });

  it("n'impose pas d'adresse e-mail : l'unicité est partielle", () => {
    const members = collectionSpec("members")?.indexes ?? [];
    for (const index of members) {
      expect(index.options?.unique).toBe(true);
      expect(index.options?.partialFilterExpression).toBeDefined();
    }
  });

  it("fait disparaître seuls les défis d'authentification périmés", () => {
    const peremption = collectionSpec("auth_challenges")?.indexes.find(
      (index) => index.options?.expireAfterSeconds !== undefined,
    );
    expect(peremption?.keys).toEqual({ expiresAt: 1 });
  });

  it("marque en ajout seul ce qui s'est passé", () => {
    for (const nom of ["audit_logs", "visit_events", "consents"]) {
      expect(collectionSpec(nom)?.appendOnly).toBe(true);
    }
  });

  it("ne déclare aucune collection de santé dans le socle", () => {
    // La vague 1 ne touche pas aux données de santé : elles arrivent en vague 2, et elles
    // n'arriveront que chez un hébergeur certifié (`ARCHITECTURE.md` §4).
    const noms = COLLECTIONS.map((collection) => collection.name);
    for (const sante of HEALTH_COLLECTIONS) expect(noms).not.toContain(sante);
  });

  it("donne un nom explicite à chaque index", () => {
    for (const collection of COLLECTIONS) {
      for (const index of collection.indexes) expect(index.options?.name).toBeTruthy();
    }
  });
});
