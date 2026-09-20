import { afterEach, describe, expect, it, vi } from "vitest";
import { originAllowed, POST } from "./route";

function request(body: string, headers: Record<string, string> = {}) {
  return new Request("http://localhost:3000/api/lead", {
    method: "POST",
    headers: { "Content-Type": "application/json", host: "localhost:3000", ...headers },
    body,
  });
}

describe("POST /api/lead", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("contrôle l'origine", () => {
    expect(originAllowed(request("{}", { origin: "http://localhost:3000" }))).toBe(true);
    expect(originAllowed(request("{}", { referer: "http://localhost:3000/demande/" }))).toBe(true);
    expect(originAllowed(request("{}", { origin: "https://autre.example" }))).toBe(false);
    expect(originAllowed(request("{}"))).toBe(false);
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://www.youdom-care.com");
    expect(originAllowed(request("{}", { origin: "https://www.youdom-care.com" }))).toBe(true);
  });

  it("répond 403 à une origine étrangère, 413 à un corps trop lourd, 400 à un JSON invalide", async () => {
    expect((await POST(request("{}", { origin: "https://autre.example" }))).status).toBe(403);
    expect(
      (await POST(request("x".repeat(70_000), { origin: "http://localhost:3000" }))).status,
    ).toBe(413);
    expect((await POST(request("{pas du json", { origin: "http://localhost:3000" }))).status).toBe(
      400,
    );
  });

  it("répond 503 quand la messagerie n'est pas configurée, sans divulguer la demande", async () => {
    vi.stubEnv("SMTP_HOST", "");
    const info = vi.spyOn(console, "warn").mockImplementation(() => {});
    const lead = {
      id: "8f7b1d1e-2c3a-4b5c-9d6e-7f8a9b0c1d2e",
      createdAt: "2026-09-20T10:00:00.000Z",
      form: "rappel",
      sourcePage: "/",
      commune: { insee: "92062", nom: "Puteaux", codePostal: "92800", departement: "92" },
      agenceProche: "puteaux",
      urgence: "48h",
      contact: { prenom: "Claire", nom: "Martin", telephone: "06 12 34 56 78" },
      consentement: { sante: false, date: "2026-09-20T10:00:00.000Z", version: "2026-09" },
    };
    const response = await POST(
      request(
        JSON.stringify({ lead, meta: { honeypot: "", startedAt: "2020-01-01T00:00:00.000Z" } }),
        { origin: "http://localhost:3000" },
      ),
    );
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ ok: false, erreur: "envoi indisponible" });
    expect(info.mock.calls.flat().join("\n")).not.toMatch(/Claire|Martin|Puteaux/);
    info.mockRestore();
  });
});
