import { createHmac } from "node:crypto";
import { createServer, type Server } from "node:http";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  createForgetfulRateLimiter,
  handleMesure,
  parseMesureBody,
  roundToMinute,
  type MesureServerContext,
} from "./server";

/* Collecteur simulé : un serveur HTTP local qui garde ce qu'il reçoit (corps et signature). */

interface Received {
  body: string;
  signature: string | undefined;
  contentType: string | undefined;
}

const received: Received[] = [];
let server: Server;
let url = "";

beforeAll(async () => {
  server = createServer((req, res) => {
    let body = "";
    req.on("data", (chunk: Buffer) => {
      body += chunk.toString("utf8");
    });
    req.on("end", () => {
      received.push({
        body,
        signature: req.headers["x-signature"] as string | undefined,
        contentType: req.headers["content-type"],
      });
      res.writeHead(204).end();
    });
  });
  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      url = `http://127.0.0.1:${port}/collecte`;
      resolve();
    });
  });
});

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

beforeEach(() => {
  received.length = 0;
});

const valid = JSON.stringify({
  event: "demande_envoyee",
  props: { formulaire: "personne-agee", departement: "92" },
  page: "/demande/personne-agee/",
});

function context(overrides: Partial<MesureServerContext> = {}): MesureServerContext {
  return {
    env: {},
    limiter: createForgetfulRateLimiter(),
    ip: "203.0.113.7",
    now: new Date("2026-09-27T10:15:42.123Z"),
    ...overrides,
  };
}

describe("serveur de la mesure (D-029)", () => {
  it("répond 204 sans rien stocker quand aucun collecteur n'est configuré", async () => {
    expect(await handleMesure(valid, context())).toBe(204);
    expect(received).toHaveLength(0);
  });

  it("refuse un corps invalide, trop long ou qui n'est pas du JSON", async () => {
    expect(await handleMesure("{", context())).toBe(400);
    expect(
      await handleMesure(JSON.stringify({ event: "page_vue", props: {}, page: "/" }), context()),
    ).toBe(400);
    expect(
      await handleMesure(
        JSON.stringify({ event: "appel_clic", props: { emplacement: "rail" }, page: "/" }).replace(
          '"/"',
          `"/${"a".repeat(2100)}"`,
        ),
        context(),
      ),
    ).toBe(400);
    expect(parseMesureBody(valid)).not.toBeNull();
  });

  it("relaie l'événement validé au collecteur, signé, avec l'heure arrondie à la minute", async () => {
    const secret = "secret-de-test";
    const status = await handleMesure(
      valid,
      context({ env: { MESURE_WEBHOOK_URL: url, MESURE_WEBHOOK_SECRET: secret } }),
    );
    expect(status).toBe(204);
    expect(received).toHaveLength(1);
    const [hit] = received;
    if (!hit) throw new Error("rien reçu");
    expect(hit.contentType).toBe("application/json");
    expect(JSON.parse(hit.body)).toEqual({
      event: "demande_envoyee",
      props: { formulaire: "personne-agee", departement: "92" },
      page: "/demande/personne-agee/",
      horodatage: "2026-09-27T10:15:00.000Z",
    });
    const expected = `sha256=${createHmac("sha256", secret).update(hit.body).digest("hex")}`;
    expect(hit.signature).toBe(expected);
    // Jamais l'adresse du client dans ce qui part.
    expect(hit.body).not.toContain("203.0.113.7");
  });

  it("répond 204 même si le collecteur est injoignable", async () => {
    const status = await handleMesure(
      valid,
      context({ env: { MESURE_WEBHOOK_URL: "http://127.0.0.1:9/collecte" } }),
    );
    expect(status).toBe(204);
  });

  it("limite le débit par adresse et oublie l'adresse après la fenêtre", async () => {
    const limiter = createForgetfulRateLimiter(2, 1000);
    const t0 = new Date("2026-09-27T10:00:00.000Z");
    expect(await handleMesure(valid, context({ limiter, now: t0 }))).toBe(204);
    expect(await handleMesure(valid, context({ limiter, now: t0 }))).toBe(204);
    expect(await handleMesure(valid, context({ limiter, now: t0 }))).toBe(429);
    expect(limiter.size()).toBe(1);
    // Une autre adresse n'est pas touchée.
    expect(await handleMesure(valid, context({ limiter, now: t0, ip: "198.51.100.2" }))).toBe(204);
    // Fenêtre écoulée : les deux empreintes disparaissent au passage suivant.
    const later = new Date(t0.getTime() + 1500);
    expect(await handleMesure(valid, context({ limiter, now: later, ip: "192.0.2.9" }))).toBe(204);
    expect(limiter.size()).toBe(1);
  });

  it("arrondit l'heure à la minute", () => {
    expect(roundToMinute(new Date("2026-09-27T10:15:59.999Z"))).toBe("2026-09-27T10:15:00.000Z");
  });
});
