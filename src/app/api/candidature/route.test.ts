// @vitest-environment node

import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

/* Route api/candidature (docs/07 §6) : origine, taille, forme du corps, messagerie absente. */

const candidature = {
  id: "8f7b1d1e-2c3a-4b5c-9d6e-7f8a9b0c1d2e",
  createdAt: "2026-09-27T10:00:00.000Z",
  sourcePage: "/recrutement/postuler/",
  contact: {
    prenom: "Claire",
    nom: "Martin",
    telephone: "06 12 34 56 78",
    email: "claire@test.local",
  },
  departement: "92",
  disponibilite: "Dès maintenant",
  consentement: { accepte: true, date: "2026-09-27T10:00:00.000Z", version: "2026-09" },
};

function multipart(headers: Record<string, string> = {}, cv: Blob | null = null) {
  const body = new FormData();
  body.set("candidature", JSON.stringify(candidature));
  body.set("meta", JSON.stringify({ honeypot: "", startedAt: "2020-01-01T00:00:00.000Z" }));
  if (cv) body.set("cv", cv, "cv.pdf");
  return new Request("http://localhost:3000/api/candidature", {
    method: "POST",
    headers: { host: "localhost:3000", ...headers },
    body,
  });
}

const pdf = () => new Blob(["%PDF-1.4\n%%EOF\n"], { type: "application/pdf" });

describe("POST /api/candidature", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("répond 403 à une origine étrangère ou absente", async () => {
    expect((await POST(multipart({ origin: "https://autre.example" }, pdf()))).status).toBe(403);
    expect((await POST(multipart({}, pdf()))).status).toBe(403);
  });

  it("répond 413 à un corps annoncé trop lourd et 400 à un corps qui n'est pas multipart", async () => {
    const heavy = multipart(
      { origin: "http://localhost:3000", "content-length": String(7 * 1024 * 1024) },
      pdf(),
    );
    expect((await POST(heavy)).status).toBe(413);
    const json = new Request("http://localhost:3000/api/candidature", {
      method: "POST",
      headers: {
        host: "localhost:3000",
        origin: "http://localhost:3000",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ candidature }),
    });
    expect((await POST(json)).status).toBe(400);
  });

  it("répond 400 quand les champs JSON manquent dans le multipart", async () => {
    const body = new FormData();
    body.set("cv", pdf(), "cv.pdf");
    const request = new Request("http://localhost:3000/api/candidature", {
      method: "POST",
      headers: { host: "localhost:3000", origin: "http://localhost:3000" },
      body,
    });
    expect((await POST(request)).status).toBe(400);
  });

  it("répond 422 sans CV et 503 sans messagerie, sans divulguer la candidature", async () => {
    vi.stubEnv("SMTP_HOST", "");
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const noCv = await POST(multipart({ origin: "http://localhost:3000" }));
    expect(noCv.status).toBe(422);
    expect(await noCv.json()).toEqual({ ok: false, erreur: "CV refusé", cv: "manquant" });
    const response = await POST(multipart({ origin: "http://localhost:3000" }, pdf()));
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ ok: false, erreur: "envoi indisponible" });
    expect(warn.mock.calls.flat().join("\n")).not.toMatch(/Claire|Martin|claire@/);
    warn.mockRestore();
  });
});
