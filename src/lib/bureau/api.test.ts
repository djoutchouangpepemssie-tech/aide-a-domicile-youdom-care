import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, api, apiBase, apiFetch, CLEF_JETON, jeton } from "./api";

/*
 * Le client du bureau. Ce qui est éprouvé ici n'est pas « fetch fonctionne », mais les trois
 * promesses du fichier : le jeton va bien dans l'en-tête, une session expirée se nettoie toute
 * seule, et une API non configurée se dit au lieu de deviner une adresse.
 */

const reponses: Array<{ status: number; body?: unknown }> = [];
const appels: Array<{ url: string; init: RequestInit }> = [];

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "https://api.exemple/");
  reponses.length = 0;
  appels.length = 0;
  sessionStorage.clear();
  vi.stubGlobal("fetch", (url: string, init: RequestInit) => {
    appels.push({ url, init });
    const prochaine = reponses.shift() ?? { status: 200, body: {} };
    return Promise.resolve(
      // Un 204 n'a pas de corps : `new Response("")` est refusé par la plateforme.
      new Response(prochaine.body === undefined ? null : JSON.stringify(prochaine.body), {
        status: prochaine.status,
      }),
    );
  });
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("l'adresse de l'API", () => {
  it("retire la barre oblique finale", () => {
    expect(apiBase()).toBe("https://api.exemple");
  });

  it("se plaint quand elle manque, au lieu d'inventer", () => {
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "");
    expect(() => apiBase()).toThrow(/NEXT_PUBLIC_API_BASE_URL/);
  });
});

describe("le jeton", () => {
  it("vit dans sessionStorage, pas dans un cookie", () => {
    jeton.ecrire("abc");
    expect(sessionStorage.getItem(CLEF_JETON)).toBe("abc");
    expect(jeton.lire()).toBe("abc");
    jeton.effacer();
    expect(jeton.lire()).toBeNull();
  });

  it("voyage dans l'en-tête Authorization", async () => {
    jeton.ecrire("jeton-de-test");
    reponses.push({ status: 200, body: { ok: true } });
    await apiFetch("/admin/v1/me");
    const entetes = appels[0].init.headers as Record<string, string>;
    expect(entetes.authorization).toBe("Bearer jeton-de-test");
  });

  it("n'est pas joint aux routes d'ouverture de session", async () => {
    jeton.ecrire("jeton-de-test");
    reponses.push({ status: 202, body: { challengeId: "x", expiresIn: 600 } });
    await api.demanderCode({ email: "arcel@exemple.fr" });
    const entetes = appels[0].init.headers as Record<string, string>;
    expect(entetes.authorization).toBeUndefined();
  });
});

describe("les erreurs", () => {
  it("portent le code et le message de l'API", async () => {
    reponses.push({
      status: 409,
      body: { code: "regles_non_respectees", message: "Règle bloquante." },
    });
    await expect(
      apiFetch("/admin/v1/series", { methode: "POST", corps: {} }),
    ).rejects.toMatchObject({
      code: "regles_non_respectees",
      status: 409,
      message: "Règle bloquante.",
    });
  });

  it("nettoient le jeton sur 401 : garder un jeton mort ne sert personne", async () => {
    jeton.ecrire("perime");
    reponses.push({ status: 401, body: { code: "non_authentifie", message: "Session expirée." } });
    await expect(apiFetch("/admin/v1/me")).rejects.toBeInstanceOf(ApiError);
    expect(jeton.lire()).toBeNull();
  });

  it("ne nettoient pas le jeton sur un 404", async () => {
    jeton.ecrire("valide");
    reponses.push({ status: 404, body: { code: "introuvable", message: "Introuvable." } });
    await expect(apiFetch("/admin/v1/rules/abc")).rejects.toBeInstanceOf(ApiError);
    expect(jeton.lire()).toBe("valide");
  });
});

describe("les appels", () => {
  it("composent l'adresse de la semaine", async () => {
    jeton.ecrire("j");
    reponses.push({ status: 200, body: { occurrences: [] } });
    await api.semaine("a".repeat(24), "2026-10-19", "2026-10-25");
    expect(appels[0].url).toBe(
      `https://api.exemple/admin/v1/planning?agencyId=${"a".repeat(24)}&from=2026-10-19&to=2026-10-25`,
    );
  });

  it("acceptent une réponse vide (204)", async () => {
    reponses.push({ status: 204 });
    await expect(apiFetch("/admin/v1/grants/x", { methode: "DELETE" })).resolves.toBeUndefined();
  });
});
