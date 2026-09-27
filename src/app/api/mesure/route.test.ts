import { describe, expect, it } from "vitest";
import { POST } from "./route";

/* La route : méthode, origine, taille, statuts sans corps. Le traitement est testé dans src/lib/mesure. */

function request(body: string, headers: Record<string, string> = {}): Request {
  return new Request("http://localhost:3000/api/mesure/", {
    method: "POST",
    headers: { "Content-Type": "application/json", host: "localhost:3000", ...headers },
    body,
  });
}

const valid = JSON.stringify({ event: "appel_clic", props: { emplacement: "en-tete" }, page: "/" });

describe("POST /api/mesure (D-029)", () => {
  it("refuse une origine étrangère ou absente, sans corps de réponse", async () => {
    const foreign = await POST(request(valid, { origin: "https://autre.example" }));
    expect(foreign.status).toBe(403);
    expect(await foreign.text()).toBe("");
    expect((await POST(request(valid))).status).toBe(403);
  });

  it("accepte un événement valide de la même origine et répond 204", async () => {
    const response = await POST(request(valid, { origin: "http://localhost:3000" }));
    expect(response.status).toBe(204);
    expect(await response.text()).toBe("");
    const referer = await POST(request(valid, { referer: "http://localhost:3000/agences/" }));
    expect(referer.status).toBe(204);
  });

  it("refuse un événement inconnu ou une propriété interdite (400)", async () => {
    const unknown = JSON.stringify({ event: "page_vue", props: {}, page: "/" });
    expect((await POST(request(unknown, { origin: "http://localhost:3000" }))).status).toBe(400);
    const extra = JSON.stringify({
      event: "appel_clic",
      props: { emplacement: "en-tete", commune: "Puteaux" },
      page: "/",
    });
    expect((await POST(request(extra, { origin: "http://localhost:3000" }))).status).toBe(400);
  });

  it("refuse un corps de plus de 2 Ko (413)", async () => {
    const big = JSON.stringify({
      event: "appel_clic",
      props: { emplacement: "en-tete" },
      page: "/",
      x: "a".repeat(2100),
    });
    const response = await POST(request(big, { origin: "http://localhost:3000" }));
    expect(response.status).toBe(413);
    const declared = await POST(
      request(valid, { origin: "http://localhost:3000", "content-length": "4096" }),
    );
    expect(declared.status).toBe(413);
  });

  it("n'expose que POST", async () => {
    const route = await import("./route");
    expect(Object.keys(route).filter((k) => /^[A-Z]+$/.test(k))).toEqual(["POST"]);
  });
});
