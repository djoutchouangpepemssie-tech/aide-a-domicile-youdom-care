import { createHmac } from "node:crypto";
import { SMTPServer } from "smtp-server";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import emailsJson from "../../../content/emails.json";
import interfaceJson from "../../../content/interface.json";
import { mailerFromEnv } from "@/lib/mail/transport";
import type { LeadPayload } from "./schema";
import { createRateLimiter, handleLead, signWebhook, type LeadServerContext } from "./server";

/* Serveur SMTP simulé (docs/05 §7 : « tests avec un serveur SMTP simulé »). */

interface Received {
  from: string;
  to: string[];
  raw: string;
}

const received: Received[] = [];
let server: SMTPServer;
let port = 0;

beforeAll(async () => {
  server = new SMTPServer({
    secure: false,
    disabledCommands: ["AUTH", "STARTTLS"],
    onData(stream, session, callback) {
      let raw = "";
      stream.on("data", (chunk: Buffer) => {
        raw += chunk.toString("utf8");
      });
      stream.on("end", () => {
        received.push({
          from: session.envelope.mailFrom ? session.envelope.mailFrom.address : "",
          to: session.envelope.rcptTo.map((r) => r.address),
          raw,
        });
        callback();
      });
    },
  });
  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const address = server.server.address();
      port = typeof address === "object" && address ? address.port : 0;
      resolve();
    });
  });
});

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

const lead: LeadPayload = {
  id: "8f7b1d1e-2c3a-4b5c-9d6e-7f8a9b0c1d2e",
  createdAt: "2026-09-20T10:00:00.000Z",
  form: "personne-agee",
  sourcePage: "/personnes-agees/",
  commune: { insee: "92062", nom: "Puteaux", codePostal: "92800", departement: "92" },
  agenceProche: "puteaux",
  urgence: "semaine",
  situation: { age: "80 à 89 ans" },
  contact: {
    prenom: "Claire",
    nom: "Martin",
    telephone: "06 12 34 56 78",
    email: "claire@example.org",
  },
  consentement: { sante: true, date: "2026-09-20T10:00:00.000Z", version: "2026-09" },
};

const now = new Date("2026-09-20T10:00:10.000Z");
const meta = { honeypot: "", startedAt: "2026-09-20T10:00:00.000Z" };

function context(overrides: Partial<LeadServerContext> = {}): LeadServerContext {
  return {
    mailer: mailerFromEnv({
      SMTP_HOST: "127.0.0.1",
      SMTP_PORT: String(port),
      LEADS_FROM: "Youdom Care <no-reply@example.org>",
      SMTP_ALLOW_INSECURE: "true",
    }),
    render: {
      emails: emailsJson,
      interfaceTexts: interfaceJson,
      phone: "01 84 80 17 03",
      callbackDelay: null,
      agencies: { puteaux: "Youdom Care Hauts-de-Seine" },
    },
    env: { LEADS_TO: "equipe@example.org" },
    limiter: createRateLimiter(),
    ip: "203.0.113.1",
    now,
    log: () => {},
    ...overrides,
  };
}

describe("traitement d'une demande", () => {
  beforeEach(() => {
    received.length = 0;
  });

  it("envoie l'alerte à l'équipe et l'accusé de réception par SMTP, sans journaliser le contenu", async () => {
    const lines: string[] = [];
    const result = await handleLead({ lead, meta }, context({ log: (l) => lines.push(l) }));
    expect(result).toEqual({ status: 202, body: { ok: true, id: lead.id } });
    expect(received).toHaveLength(2);
    const [team, ack] = received as [Received, Received];
    expect(team.to).toEqual(["equipe@example.org"]);
    expect(team.raw).toContain("Nouvelle demande");
    expect(team.raw).toMatch(/Reply-To: claire@example.org/);
    expect(ack.to).toEqual(["claire@example.org"]);
    expect(ack.raw).not.toContain("Puteaux");
    expect(lines.join("\n")).toContain(`lead ${lead.id} personne-agee envoyé`);
    for (const line of lines) {
      expect(line).not.toMatch(/Claire|Martin|Puteaux|80 à 89/);
    }
  });

  it("ignore silencieusement le champ piège et refuse un remplissage trop rapide", async () => {
    const trapped = await handleLead(
      { lead, meta: { ...meta, honeypot: "http://spam" } },
      context(),
    );
    expect(trapped.status).toBe(202);
    expect(received).toHaveLength(0);
    const fast = await handleLead(
      { lead, meta: { ...meta, startedAt: "2026-09-20T10:00:09.000Z" } },
      context(),
    );
    expect(fast.status).toBe(400);
    expect(received).toHaveLength(0);
  });

  it("refuse un corps invalide et limite les envois par adresse", async () => {
    expect((await handleLead({ lead: { ...lead, form: "devis" }, meta }, context())).status).toBe(
      400,
    );
    expect((await handleLead("n'importe quoi", context())).status).toBe(400);
    const limiter = createRateLimiter(2);
    const ctx = context({ limiter });
    expect((await handleLead({ lead, meta }, ctx)).status).toBe(202);
    expect((await handleLead({ lead, meta }, ctx)).status).toBe(202);
    expect((await handleLead({ lead, meta }, ctx)).status).toBe(429);
    expect(received).toHaveLength(4);
  });

  it("répond 503 sans messagerie et n'échoue pas si le webhook tombe", async () => {
    expect((await handleLead({ lead, meta }, context({ mailer: null }))).status).toBe(503);
    const calls: { url: string; signature: string | undefined; body: string }[] = [];
    const fetchImpl = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      const headers = new Headers(init?.headers);
      calls.push({
        url: String(url),
        signature: headers.get("X-Signature") ?? undefined,
        body: String(init?.body),
      });
      throw new Error("webhook injoignable");
    }) as unknown as typeof fetch;
    const result = await handleLead(
      { lead, meta },
      context({
        env: {
          LEADS_TO: "equipe@example.org",
          LEAD_WEBHOOK_URL: "https://crm.example.org/lead",
          LEAD_WEBHOOK_SECRET: "s3cret",
        },
        fetchImpl,
      }),
    );
    expect(result.status).toBe(202);
    expect(calls).toHaveLength(1);
    const expected = `sha256=${createHmac("sha256", "s3cret")
      .update(calls[0]?.body ?? "")
      .digest("hex")}`;
    expect(calls[0]?.signature).toBe(expected);
    expect(signWebhook("s3cret", "abc")).toMatch(/^sha256=[0-9a-f]{64}$/);
  });

  it("exige Turnstile quand la clé secrète est définie", async () => {
    const fetchImpl = vi.fn(
      async () => new Response(JSON.stringify({ success: true })),
    ) as unknown as typeof fetch;
    const env = { LEADS_TO: "equipe@example.org", TURNSTILE_SECRET_KEY: "k" };
    expect((await handleLead({ lead, meta }, context({ env }))).status).toBe(403);
    expect(
      (
        await handleLead(
          { lead, meta: { ...meta, turnstileToken: "t" } },
          context({ env, fetchImpl }),
        )
      ).status,
    ).toBe(202);
  });
});
