import { afterEach, describe, expect, it, vi } from "vitest";
import type { CommuneRecord } from "@/lib/geo/geo";
import { buildLead, CONSENT_VERSION, currentSourcePage, sendLead } from "./client";
import { leadPayloadSchema } from "./schema";

const puteaux: CommuneRecord = {
  code: "92062",
  nom: "Puteaux",
  codes_postaux: ["92800"],
  departement: "92",
  type: "commune",
  population: null,
  centre: null,
  agence: "puteaux",
};

describe("client de la demande", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("construit une demande de rappel conforme au schéma", () => {
    const lead = buildLead({
      form: "rappel",
      commune: puteaux,
      contact: { prenom: "Claire", nom: "Martin", telephone: "06 12 34 56 78", rappel: "Matin" },
      urgence: "48h",
      consentSante: false,
      sourcePage: "/",
    });
    expect(leadPayloadSchema.safeParse(lead).success).toBe(true);
    expect(lead).toMatchObject({
      form: "rappel",
      commune: { insee: "92062", nom: "Puteaux", codePostal: "92800", departement: "92" },
      agenceProche: "puteaux",
      consentement: { sante: false, version: CONSENT_VERSION },
    });
    expect(lead.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(lead.message).toBeUndefined();
  });

  it("refuse une commune hors Île-de-France ou un téléphone invalide", () => {
    expect(() =>
      buildLead({
        form: "rappel",
        commune: { ...puteaux, code: "69123", departement: "69" },
        contact: { prenom: "A", nom: "B", telephone: "06 12 34 56 78" },
        urgence: "48h",
        consentSante: false,
        sourcePage: "/",
      }),
    ).toThrow(/hors Île-de-France/);
    expect(() =>
      buildLead({
        form: "rappel",
        commune: puteaux,
        contact: { prenom: "A", nom: "B", telephone: "06 12" },
        urgence: "48h",
        consentSante: false,
        sourcePage: "/",
      }),
    ).toThrow();
  });

  it("ne garde de la page d'origine que le chemin, sans paramètre", () => {
    expect(currentSourcePage()).toMatch(/^\//);
    expect(currentSourcePage()).not.toContain("?");
  });

  it("envoie la demande à api/lead et lève une erreur si le serveur refuse", async () => {
    const fetchMock = vi.fn(async () => new Response(null, { status: 202 }));
    vi.stubGlobal("fetch", fetchMock);
    const lead = buildLead({
      form: "rappel",
      commune: puteaux,
      contact: { prenom: "Claire", nom: "Martin", telephone: "06 12 34 56 78" },
      urgence: "48h",
      consentSante: false,
      sourcePage: "/",
    });
    await sendLead(lead, { honeypot: "", startedAt: lead.createdAt });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/lead/",
      expect.objectContaining({ method: "POST" }),
    );
    vi.stubGlobal("fetch", async () => new Response(null, { status: 500 }));
    await expect(sendLead(lead, { honeypot: "", startedAt: lead.createdAt })).rejects.toThrow(
      "api/lead : 500",
    );
  });
});
