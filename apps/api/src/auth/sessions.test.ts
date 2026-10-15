/** @vitest-environment node */
import { describe, expect, it } from "vitest";
import {
  SECOND_FACTOR_MAX_AGE_MS,
  SESSION_IDLE_MS,
  SESSION_MAX_AGE_MS,
  createSession,
  revokeSession,
  verifySession,
} from "./sessions";

const PEPPER = "un-poivre-de-tests-suffisamment-long-0123456789";
const NOW = new Date("2026-10-15T10:00:00.000Z");

function nouvelle(secondFactorAt: Date | null = null) {
  return createSession({
    id: "a".repeat(24),
    memberId: "b".repeat(24),
    now: NOW,
    pepper: PEPPER,
    device: { label: "iPhone de Claire" },
    secondFactorAt,
  });
}

describe("la session", () => {
  it("ne porte aucun droit : seule l'identité du membre", () => {
    const { session } = nouvelle();
    // Si le jeton portait les droits, un retrait ne prendrait effet qu'à la reconnexion.
    expect(Object.keys(session)).not.toContain("grants");
    expect(JSON.stringify(session)).not.toContain("module");
  });

  it("ne stocke que l'empreinte du jeton", () => {
    const { session, token } = nouvelle();
    expect(JSON.stringify(session)).not.toContain(token);
  });

  it("accepte le bon jeton et rafraîchit la dernière activité", () => {
    const { session, token } = nouvelle();
    const plusTard = new Date(NOW.getTime() + 60_000);
    const verdict = verifySession(session, token, plusTard, PEPPER);
    expect(verdict.ok).toBe(true);
    if (verdict.ok) expect(verdict.session.lastSeenAt).toEqual(plusTard);
  });

  it("refuse un jeton inconnu", () => {
    const { session } = nouvelle();
    expect(verifySession(session, "jeton-forge", NOW, PEPPER)).toEqual({
      ok: false,
      failure: "invalide",
    });
  });

  it("refuse une session révoquée à distance", () => {
    const { session, token } = nouvelle();
    const revoquee = revokeSession(session, NOW, "c".repeat(24));
    expect(verifySession(revoquee, token, NOW, PEPPER)).toEqual({ ok: false, failure: "revoquee" });
  });

  it("refuse après la durée absolue et après l'inactivité", () => {
    const { session, token } = nouvelle();
    expect(
      verifySession(session, token, new Date(NOW.getTime() + SESSION_MAX_AGE_MS + 1), PEPPER),
    ).toMatchObject({ ok: false });
    expect(
      verifySession(session, token, new Date(NOW.getTime() + SESSION_IDLE_MS + 1), PEPPER),
    ).toEqual({ ok: false, failure: "inactive" });
  });

  it("le second facteur se périme", () => {
    const { session, token } = nouvelle(NOW);
    const frais = verifySession(session, token, new Date(NOW.getTime() + 60_000), PEPPER);
    expect(frais).toMatchObject({ ok: true, secondFactorPresented: true });

    const vieux = verifySession(
      { ...session, lastSeenAt: new Date(NOW.getTime() + SECOND_FACTOR_MAX_AGE_MS) },
      token,
      new Date(NOW.getTime() + SECOND_FACTOR_MAX_AGE_MS + 1000),
      PEPPER,
    );
    expect(vieux).toMatchObject({ ok: true, secondFactorPresented: false });
  });
});
