import { describe, expect, it, vi } from "vitest";
import { clientIp, originAllowed, readBodyLimited, readTextLimited } from "./request";

/*
 * Contrôles communs aux routes de première partie (docs/07 §6). La lecture bornée est le point
 * sensible : elle doit tenir sans `content-length`, puisque c'est précisément l'en-tête qu'un
 * client abusif omet (docs/AUDIT_GLOBAL.md, S-4).
 */

/** Requête dont le corps arrive en morceaux, sans `content-length` (transfert découpé). */
function chunked(chunks: readonly string[], headers: Record<string, string> = {}) {
  const encoder = new TextEncoder();
  let index = 0;
  const body = new ReadableStream<Uint8Array>({
    pull(controller) {
      if (index >= chunks.length) {
        controller.close();
        return;
      }
      controller.enqueue(encoder.encode(chunks[index] ?? ""));
      index += 1;
    },
  });
  return new Request("http://localhost:3000/api/lead", {
    method: "POST",
    headers: { "content-type": "application/json", host: "localhost:3000", ...headers },
    body,
    // @ts-expect-error duplex est exigé par undici pour un corps en flux, absent des types DOM.
    duplex: "half",
  });
}

describe("originAllowed", () => {
  const request = (headers: Record<string, string>) =>
    new Request("http://localhost:3000/api/lead", {
      method: "POST",
      headers: { host: "localhost:3000", ...headers },
      body: "{}",
    });

  it("accepte l'hôte de la requête et l'adresse publique, refuse le reste", () => {
    expect(originAllowed(request({ origin: "http://localhost:3000" }))).toBe(true);
    expect(originAllowed(request({ referer: "http://localhost:3000/demande/" }))).toBe(true);
    expect(originAllowed(request({ origin: "https://autre.example" }))).toBe(false);
    expect(originAllowed(request({ origin: "pas une adresse" }))).toBe(false);
    expect(originAllowed(request({}))).toBe(false);
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://www.youdom-care.com");
    expect(originAllowed(request({ origin: "https://www.youdom-care.com" }))).toBe(true);
    vi.unstubAllEnvs();
  });
});

describe("clientIp", () => {
  const request = (headers: Record<string, string>) =>
    new Request("http://localhost:3000/api/lead", { method: "POST", headers, body: "{}" });

  it("prend la première adresse transmise, puis x-real-ip, puis « inconnue »", () => {
    expect(clientIp(request({ "x-forwarded-for": "203.0.113.7, 10.0.0.1" }))).toBe("203.0.113.7");
    expect(clientIp(request({ "x-real-ip": "203.0.113.9" }))).toBe("203.0.113.9");
    expect(clientIp(request({}))).toBe("inconnue");
  });
});

describe("readBodyLimited", () => {
  it("rend le corps entier quand il tient sous le plafond", async () => {
    const bytes = await readBodyLimited(chunked(["bon", "jour"]), 64);
    expect(bytes && new TextDecoder().decode(bytes)).toBe("bonjour");
  });

  it("refuse un corps découpé qui dépasse, même sans content-length", async () => {
    const request = chunked(Array.from({ length: 100 }, () => "x".repeat(100)));
    expect(request.headers.get("content-length")).toBeNull();
    expect(await readBodyLimited(request, 1_000)).toBeNull();
  });

  it("refuse d'emblée quand content-length annonce déjà trop gros", async () => {
    // Le corps réel tient sous le plafond : seule la taille annoncée décide, et la lecture
    // n'a même pas lieu.
    const request = chunked(["court"], { "content-length": "999999" });
    expect(await readBodyLimited(request, 1_000)).toBeNull();
  });

  it("ignore un content-length illisible et s'en tient à ce qu'il lit", async () => {
    const bon = await readBodyLimited(chunked(["court"], { "content-length": "beaucoup" }), 1_000);
    expect(bon && new TextDecoder().decode(bon)).toBe("court");
    expect(await readBodyLimited(chunked(["x".repeat(2_000)], {}), 1_000)).toBeNull();
  });

  it("compte des octets, pas des caractères", async () => {
    // « é » pèse deux octets en UTF-8 : six caractères, douze octets.
    const request = chunked(["éééééé"]);
    expect(await readBodyLimited(request, 11)).toBeNull();
    expect(await readBodyLimited(chunked(["éééééé"]), 12)).not.toBeNull();
  });

  it("readTextLimited décode le corps borné", async () => {
    expect(await readTextLimited(chunked(['{"a":1}']), 64)).toBe('{"a":1}');
    expect(await readTextLimited(chunked(["x".repeat(65)]), 64)).toBeNull();
  });
});
