import { describe, expect, it } from "vitest";
import emailsJson from "../../../content/emails.json";
import interfaceJson from "../../../content/interface.json";
import type { LeadPayload } from "@/lib/lead/schema";
import {
  escapeHtml,
  renderAcknowledgement,
  renderTeamEmail,
  sanitizeSubject,
  teamSubject,
} from "./render";

const ctx = {
  emails: emailsJson,
  interfaceTexts: interfaceJson,
  phone: "01 84 80 17 03",
  callbackDelay: null,
  agencies: { puteaux: "Youdom Care Hauts-de-Seine" },
};

const lead: LeadPayload = {
  id: "8f7b1d1e-2c3a-4b5c-9d6e-7f8a9b0c1d2e",
  createdAt: "2026-09-20T10:00:00.000Z",
  form: "neuro",
  sourcePage: "/maladies-neurodegeneratives/alzheimer/",
  commune: { insee: "92062", nom: "Puteaux", codePostal: "92800", departement: "92" },
  agenceProche: "puteaux",
  urgence: "semaine",
  pourQui: "Mon père ou ma mère",
  situation: { maladie: "Alzheimer ou apparentée", ce_qui_pese: ["Les nuits difficiles"] },
  besoins: ["Nuits", "Repas"],
  planning: {
    rythme: "regulier",
    grille: { lun: ["morning", "night"], sam: ["afternoon"] },
    heuresParSemaine: 17,
    nuit: "calme",
  },
  contact: { prenom: "Claire", nom: "Martin", telephone: "06 12 34 56 78", email: "c@example.org" },
  message: 'Elle habite au 3e <sans> ascenseur & "seule".',
  consentement: { sante: true, date: "2026-09-20T10:00:00.000Z", version: "2026-09" },
};

describe("e-mails de la demande", () => {
  it("compose l'objet de l'alerte sans donnée de santé", () => {
    expect(teamSubject(lead, ctx)).toBe(
      "Nouvelle demande — Maladie neurodégénérative — Puteaux — Dans la semaine",
    );
    const contact = {
      ...lead,
      form: "contact" as const,
      commune: undefined,
      agenceProche: undefined,
    };
    expect(teamSubject(contact, ctx)).toBe("Nouvelle demande — Contact — Dans la semaine");
    expect(teamSubject(lead, ctx)).not.toMatch(/Alzheimer|nuit/i);
  });

  it("assainit l'objet : un retour chariot dans un champ libre n'ouvre pas d'en-tête", () => {
    // `commune.nom` est un champ libre de 80 caractères et entre dans l'objet : un saut de ligne
    // y terminerait l'en-tête `Subject` (docs/AUDIT_GLOBAL.md, S-9).
    const injecte: LeadPayload = {
      ...lead,
      commune: {
        insee: "92062",
        nom: "Puteaux\r\nBcc: ailleurs@example.org",
        codePostal: "92800",
        departement: "92",
      },
    };
    const subject = teamSubject(injecte, ctx);
    expect(subject).not.toMatch(/[\r\n]/);
    expect(subject).toContain("Puteaux Bcc: ailleurs@example.org");
    expect(sanitizeSubject("a\u0000b\tc   d \n")).toBe("a b c d");
  });

  it("rend l'alerte lisible : coordonnées avec lien tel:, planning en tableau, JSON repliable, HTML échappé", () => {
    const mail = renderTeamEmail(lead, ctx);
    expect(mail.html).toContain('href="tel:+33612345678"');
    expect(mail.html).toContain("06 12 34 56 78".replaceAll(" ", " "));
    expect(mail.html).toContain("<table");
    expect((mail.html.match(/✔/g) ?? []).length).toBe(3);
    expect(mail.html).toContain("<details");
    expect(mail.html).toContain("&lt;sans&gt; ascenseur &amp; &quot;seule&quot;");
    expect(mail.html).not.toContain("<sans>");
    expect(mail.html).toContain("Youdom Care Hauts-de-Seine");
    expect(mail.text).toContain("Alzheimer ou apparentée");
    expect(mail.text).toContain("Lundi : Matin, Nuit");
    expect(mail.text).toContain('"id": "8f7b1d1e-2c3a-4b5c-9d6e-7f8a9b0c1d2e"');
    expect(mail.text).toContain("Estimation : environ 17 heures par semaine");
    expect(mail.text).toContain("Nuits : Nuit calme");
    expect(mail.text).toContain("version du texte : 2026-09");
  });

  it("rend les dates ponctuelles et la présence 24h/24", () => {
    const ponctuel = renderTeamEmail(
      {
        ...lead,
        planning: {
          rythme: "ponctuel",
          dates: ["2026-10-03", "2026-10-04"],
          creneaux: ["morning"],
        },
      },
      ctx,
    );
    expect(ponctuel.text).toContain(
      "Dates demandées : samedi 3 octobre 2026, dimanche 4 octobre 2026",
    );
    expect(ponctuel.text).toContain("Créneaux ces jours-là : Matin");
    const continu = renderTeamEmail(
      { ...lead, planning: { rythme: "24h", dates: ["2026-10-01"], duree: "semaines" } },
      ctx,
    );
    expect(continu.text).toContain("Durée envisagée : Quelques semaines");
    expect(continu.text).toContain("Présence continue 24h/24");
  });

  it("écrit l'accusé de réception de docs/01 §9 sans aucun détail de la demande", () => {
    const ack = renderAcknowledgement(lead, ctx);
    expect(ack.subject).toBe("Nous avons bien reçu votre demande — Youdom Care");
    expect(ack.text).toContain("Bonjour Claire, votre demande est bien arrivée.");
    expect(ack.text).toContain("vous rappelle dès que possible au numéro");
    expect(ack.text).toContain("01 84 80 17 03");
    expect(ack.text).toContain("Vous, chez vous. Nous, à vos côtés.");
    for (const forbidden of ["Alzheimer", "Puteaux", "Nuits", "ascenseur", "Martin"]) {
      expect(ack.text).not.toContain(forbidden);
      expect(ack.html).not.toContain(forbidden);
    }
    expect(
      renderAcknowledgement(lead, { ...ctx, callbackDelay: "sous deux heures" }).text,
    ).toContain("vous rappelle sous deux heures");
    expect(escapeHtml("<b>&</b>")).toBe("&lt;b&gt;&amp;&lt;/b&gt;");
  });
});
