/** @vitest-environment node */
import { describe, expect, it } from "vitest";
import { CHALLENGE_TTL_MS, MAX_ATTEMPTS, createChallenge, verifyChallenge } from "./challenges";

const PEPPER = "un-poivre-de-tests-suffisamment-long-0123456789";
const NOW = new Date("2026-10-15T10:00:00.000Z");

function nouveau(kind: "lien_magique" | "code_sms" = "code_sms") {
  return createChallenge({
    id: "a".repeat(24),
    memberId: "b".repeat(24),
    kind,
    now: NOW,
    pepper: PEPPER,
  });
}

describe("le défi d'authentification", () => {
  it("ne stocke jamais le secret, seulement son empreinte", () => {
    const { challenge, secret } = nouveau();
    expect(secret).toMatch(/^\d{6}$/);
    expect(JSON.stringify(challenge)).not.toContain(secret);
    expect(challenge.secretFingerprint).toMatch(/^[0-9a-f]{64}$/);
  });

  it("produit un jeton long pour un lien magique", () => {
    const { secret } = nouveau("lien_magique");
    expect(secret.length).toBeGreaterThanOrEqual(42);
  });

  it("accepte le bon secret, une fois", () => {
    const { challenge, secret } = nouveau();
    const premier = verifyChallenge(challenge, secret, NOW, PEPPER);
    expect(premier.ok).toBe(true);
    const second = verifyChallenge(premier.challenge, secret, NOW, PEPPER);
    expect(second).toMatchObject({ ok: false, failure: "deja_utilise" });
  });

  it("refuse après expiration", () => {
    const { challenge, secret } = nouveau();
    const plusTard = new Date(NOW.getTime() + CHALLENGE_TTL_MS.code_sms + 1);
    expect(verifyChallenge(challenge, secret, plusTard, PEPPER)).toMatchObject({
      ok: false,
      failure: "expire",
    });
  });

  it("compte les essais et s'arrête à cinq", () => {
    let { challenge } = nouveau();
    for (let essai = 0; essai < MAX_ATTEMPTS; essai += 1) {
      const verdict = verifyChallenge(challenge, "000000", NOW, PEPPER);
      expect(verdict).toMatchObject({ ok: false, failure: "invalide" });
      challenge = verdict.challenge;
    }
    expect(challenge.attempts).toBe(MAX_ATTEMPTS);
    expect(verifyChallenge(challenge, "000000", NOW, PEPPER)).toMatchObject({
      ok: false,
      failure: "trop_d_essais",
    });
  });

  it("un code volé en base ne suffit pas : il faut aussi le poivre", () => {
    const { challenge, secret } = nouveau();
    const autrePoivre = "un-autre-poivre-de-tests-aussi-long-0123456789";
    expect(verifyChallenge(challenge, secret, NOW, autrePoivre)).toMatchObject({ ok: false });
  });

  it("deux défis successifs ne donnent pas le même code", () => {
    const codes = new Set(Array.from({ length: 50 }, () => nouveau().secret));
    expect(codes.size).toBeGreaterThan(40);
  });
});
