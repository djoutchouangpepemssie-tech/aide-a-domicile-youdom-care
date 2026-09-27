import { beforeEach, describe, expect, it } from "vitest";
import emailsJson from "../../../content/emails.json";
import interfaceJson from "../../../content/interface.json";
import { createRateLimiter } from "@/lib/lead/server";
import type { MailAttachment, Mailer } from "@/lib/mail/transport";
import type { CandidaturePayload } from "./schema";
import { handleCandidature, type CandidatureFile, type CandidatureServerContext } from "./server";

/* Gestionnaire d'une candidature (docs/05 §2, §6 à §8) avec un transport simulé. */

interface Sent {
  to: string;
  replyTo: string | undefined;
  subject: string;
  text: string;
  html: string;
  attachments: MailAttachment[] | undefined;
}

const sent: Sent[] = [];
const fakeMailer: Mailer = {
  async send({ to, replyTo, subject, text, html, attachments }) {
    sent.push({ to, replyTo, subject, text, html, attachments });
  },
};

const candidature: CandidaturePayload = {
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
  commune: { insee: "92062", nom: "Puteaux", codePostal: "92800", departement: "92" },
  disponibilite: "Dès maintenant",
  message: "Trois ans auprès de personnes âgées.",
  consentement: { accepte: true, date: "2026-09-27T10:00:00.000Z", version: "2026-09" },
};

const now = new Date("2026-09-27T10:00:10.000Z");
const meta = { honeypot: "", startedAt: "2026-09-27T10:00:00.000Z" };

const pdf = (): CandidatureFile => {
  const bytes = Buffer.from("%PDF-1.4\n% CV de test\n%%EOF\n", "latin1");
  return { name: "CV Claire Martin.pdf", type: "application/pdf", size: bytes.length, bytes };
};

function context(overrides: Partial<CandidatureServerContext> = {}): CandidatureServerContext {
  return {
    mailer: fakeMailer,
    render: {
      emails: emailsJson,
      interfaceTexts: interfaceJson,
      phone: "01 84 80 17 03",
      departements: { "92": "Hauts-de-Seine" },
      offres: { "auxiliaire-de-vie-puteaux": "Auxiliaire de vie à domicile" },
    },
    env: { LEADS_TO: "equipe@test.local" },
    limiter: createRateLimiter(),
    ip: "203.0.113.1",
    now,
    log: () => {},
    ...overrides,
  };
}

describe("traitement d'une candidature", () => {
  beforeEach(() => {
    sent.length = 0;
  });

  it("envoie l'alerte avec le CV joint puis l'accusé, sans journaliser le contenu", async () => {
    const lines: string[] = [];
    const result = await handleCandidature(
      { fields: candidature, meta, file: pdf() },
      context({ log: (l) => lines.push(l) }),
    );
    expect(result).toEqual({ status: 202, body: { ok: true, id: candidature.id } });
    expect(sent).toHaveLength(2);
    const [team, ack] = sent as [Sent, Sent];
    expect(team.to).toBe("equipe@test.local");
    expect(team.replyTo).toBe("claire@test.local");
    expect(team.subject).toBe("Nouvelle candidature — Hauts-de-Seine");
    expect(team.text).toContain("Claire Martin");
    expect(team.text).toContain("Puteaux (92800)");
    expect(team.text).toContain("Dès maintenant");
    expect(team.text).toContain("Candidature spontanée");
    expect(team.text).toContain("Trois ans auprès de personnes âgées.");
    expect(team.text).toContain("CV-Claire-Martin.pdf");
    expect(team.html).toContain('href="tel:+33612345678"');
    expect(team.attachments).toHaveLength(1);
    expect(team.attachments?.[0]).toMatchObject({
      filename: "CV-Claire-Martin.pdf",
      contentType: "application/pdf",
    });
    expect(team.attachments?.[0]?.content.subarray(0, 4).toString("latin1")).toBe("%PDF");
    expect(ack.to).toBe("claire@test.local");
    expect(ack.subject).toBe("Nous avons bien reçu votre candidature — Youdom Care");
    expect(ack.text).toContain("Bonjour Claire");
    expect(ack.text).toContain("01 84 80 17 03");
    for (const forbidden of ["Martin", "Puteaux", "Trois ans", "CV-Claire"]) {
      expect(ack.text).not.toContain(forbidden);
    }
    expect(lines.join("\n")).toContain(`candidature ${candidature.id} envoyée`);
    for (const line of lines) expect(line).not.toMatch(/Claire|Martin|Puteaux|Trois ans/);
  });

  it("nomme l'offre visée quand elle est publiée", async () => {
    await handleCandidature(
      { fields: { ...candidature, offre: "auxiliaire-de-vie-puteaux" }, meta, file: pdf() },
      context(),
    );
    expect(sent[0]?.text).toContain("Auxiliaire de vie à domicile");
  });

  it("refuse des champs manquants ou inconnus (400) sans rien envoyer", async () => {
    const { contact: _contact, ...sansContact } = candidature;
    expect(
      (await handleCandidature({ fields: sansContact, meta, file: pdf() }, context())).status,
    ).toBe(400);
    expect(
      (
        await handleCandidature(
          { fields: { ...candidature, sante: "diabète" }, meta, file: pdf() },
          context(),
        )
      ).status,
    ).toBe(400);
    expect(
      (await handleCandidature({ fields: candidature, meta: {}, file: pdf() }, context())).status,
    ).toBe(400);
    expect(sent).toHaveLength(0);
  });

  it("refuse un CV absent, trop lourd, d'un mauvais type ou à la signature fausse (422)", async () => {
    const missing = await handleCandidature({ fields: candidature, meta, file: null }, context());
    expect(missing).toEqual({
      status: 422,
      body: { ok: false, erreur: "CV refusé", cv: "manquant" },
    });

    const heavy = { ...pdf(), size: 5 * 1024 * 1024 + 1 };
    expect(
      (await handleCandidature({ fields: candidature, meta, file: heavy }, context())).body.cv,
    ).toBe("trop_lourd");

    const exe = { ...pdf(), name: "cv.exe", type: "application/octet-stream" };
    expect(
      (await handleCandidature({ fields: candidature, meta, file: exe }, context())).body.cv,
    ).toBe("type_invalide");

    const fake = pdf();
    fake.bytes = Buffer.from("MZ\x90\x00programme", "latin1");
    fake.size = fake.bytes.length;
    expect(
      (await handleCandidature({ fields: candidature, meta, file: fake }, context())).body.cv,
    ).toBe("type_invalide");
    expect(sent).toHaveLength(0);
  });

  it("ignore silencieusement un robot (champ piège) et refuse un remplissage trop rapide", async () => {
    const trap = await handleCandidature(
      { fields: candidature, meta: { ...meta, honeypot: "http://spam" }, file: pdf() },
      context(),
    );
    expect(trap.status).toBe(202);
    const fast = await handleCandidature(
      {
        fields: candidature,
        meta: { ...meta, startedAt: "2026-09-27T10:00:09.000Z" },
        file: pdf(),
      },
      context(),
    );
    expect(fast.status).toBe(400);
    expect(sent).toHaveLength(0);
  });

  it("limite les envois par adresse (429)", async () => {
    const limiter = createRateLimiter(1);
    expect(
      (await handleCandidature({ fields: candidature, meta, file: pdf() }, context({ limiter })))
        .status,
    ).toBe(202);
    expect(
      (await handleCandidature({ fields: candidature, meta, file: pdf() }, context({ limiter })))
        .status,
    ).toBe(429);
  });

  it("répond 503 sans messagerie ou quand l'envoi échoue, sans stocker la candidature", async () => {
    expect(
      (
        await handleCandidature(
          { fields: candidature, meta, file: pdf() },
          context({ mailer: null }),
        )
      ).status,
    ).toBe(503);
    expect(
      (await handleCandidature({ fields: candidature, meta, file: pdf() }, context({ env: {} })))
        .status,
    ).toBe(503);
    const failing: Mailer = {
      async send() {
        throw new Error("SMTP indisponible");
      },
    };
    const result = await handleCandidature(
      { fields: candidature, meta, file: pdf() },
      context({ mailer: failing }),
    );
    expect(result).toEqual({ status: 503, body: { ok: false, erreur: "envoi indisponible" } });
  });
});
