import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import interfaceJson from "../../../../content/interface.json";
import specialJson from "../../../../content/pages/formulaires-speciaux.json";
import type * as CommuneFieldModule from "@/components/forms/CommuneField/CommuneField";
import type * as LeadClient from "@/lib/lead/client";
import { leadPayloadSchema } from "@/lib/lead/schema";
import { ContactForm } from "./ContactForm";
import { HospitalDischargeForm, urgencyFromDate } from "./HospitalDischargeForm";
import { ProfessionalForm } from "./ProfessionalForm";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
const sendLead = vi.fn(async () => {});
vi.mock("@/lib/lead/client", async (importOriginal) => {
  const original = await importOriginal<typeof LeadClient>();
  return { ...original, sendLead: (...args: unknown[]) => sendLead(...(args as [])) };
});
vi.mock("@/components/forms/CommuneField/CommuneField", async (importOriginal) => {
  const original = await importOriginal<typeof CommuneFieldModule>();
  const rows = [["92062", "Puteaux", "92800", "92", "puteaux"]] as const;
  return {
    ...original,
    CommuneField: (props: Parameters<typeof original.CommuneField>[0]) => (
      <original.CommuneField {...props} loadCommunes={async () => rows.map((r) => [...r])} />
    ),
  };
});

const texts = {
  ...interfaceJson.formulaires,
  recherche: interfaceJson.recherche_commune,
  planning: interfaceJson.planning,
};
const common = {
  texts,
  phone: "01 84 80 17 03",
  confidentialiteHref: "/politique-de-confidentialite/",
};

function fillIdentity() {
  fireEvent.change(screen.getByLabelText("Votre prénom"), { target: { value: "Claire" } });
  fireEvent.change(screen.getByLabelText("Votre nom"), { target: { value: "Martin" } });
  fireEvent.change(screen.getByLabelText(/Votre téléphone/), {
    target: { value: "06 12 34 56 78" },
  });
}

async function pickCommune(label: string) {
  const commune = screen.getByRole("combobox", { name: label });
  fireEvent.focus(commune);
  fireEvent.change(commune, { target: { value: "Put" } });
  await waitFor(() => expect(screen.getByRole("option", { name: /Puteaux/ })).toBeVisible());
  fireEvent.keyDown(commune, { key: "ArrowDown" });
  fireEvent.keyDown(commune, { key: "Enter" });
}

function lastLead(): Record<string, unknown> {
  const [lead] = sendLead.mock.calls[0] as unknown as [Record<string, unknown>];
  expect(leadPayloadSchema.safeParse(lead).success).toBe(true);
  return lead;
}

describe("formulaires spéciaux", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    push.mockClear();
    sendLead.mockClear();
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
      cb(0);
      return 0;
    });
  });
  afterEach(() => vi.unstubAllGlobals());

  it("déduit l'urgence de la date de sortie", () => {
    const now = new Date("2026-10-01T09:00:00Z");
    expect(urgencyFromDate("", now)).toBe("semaine");
    expect(urgencyFromDate("2026-10-02", now)).toBe("48h");
    expect(urgencyFromDate("2026-10-06", now)).toBe("semaine");
    expect(urgencyFromDate("2026-10-20", now)).toBe("mois");
  });

  it("sortie d'hospitalisation : quatre écrans, bandeau 48 h, consentement, demande conforme", async () => {
    render(<HospitalDischargeForm {...common} page={specialJson.sortie_hospitalisation} />);
    expect(screen.getByText("Étape 1 sur 4")).toBeInTheDocument();
    expect(screen.getByText("Sortie dans moins de 48 h ?")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /01.84.80.17.03/ })).toHaveAttribute(
      "href",
      "tel:+33184801703",
    );
    fireEvent.change(screen.getByLabelText(/Date de sortie prévue/), {
      target: { value: "2099-01-10" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Continuer" }));
    expect(screen.getByText("Étape 2 sur 4")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Continuer" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Il manque votre commune");
    fireEvent.change(screen.getByLabelText(/Hôpital ou clinique/), {
      target: { value: "Hôpital Foch" },
    });
    await pickCommune("Commune de retour");
    fireEvent.click(screen.getByRole("button", { name: "Continuer" }));
    expect(screen.getByText("Étape 3 sur 4")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("checkbox", { name: "Courses et pharmacie" }));
    fireEvent.click(screen.getByRole("button", { name: "Continuer" }));
    expect(screen.getByText("Étape 4 sur 4")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("radio", { name: "Un proche" }));
    fillIdentity();
    fireEvent.click(screen.getByRole("checkbox", { name: /J'accepte que Youdom Care utilise/ }));
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "J'envoie ma demande" }));
    });
    await waitFor(() => expect(push).toHaveBeenCalledWith("/merci/sortie-hospitalisation/"));
    expect(lastLead()).toMatchObject({
      form: "sortie-hospitalisation",
      urgence: "mois",
      pourQui: "Un proche",
      situation: { date_sortie: "2099-01-10", hopital: "Hôpital Foch" },
      besoins: ["Courses et pharmacie"],
      consentement: { sante: true },
    });
  });

  it("professionnel : structure obligatoire, mention d'anonymat, aucune case de consentement santé", async () => {
    render(<ProfessionalForm {...common} page={specialJson.professionnel} />);
    fireEvent.click(screen.getByRole("button", { name: "Continuer" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Il manque votre structure");
    fireEvent.change(screen.getByLabelText("Votre structure"), {
      target: { value: "Hôpital Foch" },
    });
    fillIdentity();
    fireEvent.click(screen.getByRole("button", { name: "Continuer" }));
    expect(screen.getByText("Étape 2 sur 2")).toBeInTheDocument();
    expect(
      screen.getAllByText(/ni nom ni information permettant d'identifier/).length,
    ).toBeGreaterThan(0);
    expect(
      screen.queryByRole("checkbox", { name: /J'accepte que Youdom Care utilise/ }),
    ).toBeNull();
    await pickCommune("Commune de la personne");
    fireEvent.click(screen.getByRole("radio", { name: "Sortie d'hospitalisation" }));
    fireEvent.click(screen.getByRole("radio", { name: "Dès que possible (sous 48 h)" }));
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "J'envoie ma demande" }));
    });
    await waitFor(() => expect(push).toHaveBeenCalledWith("/merci/professionnel/"));
    expect(lastLead()).toMatchObject({
      form: "professionnel",
      urgence: "48h",
      situation: { structure: "Hôpital Foch", type_besoin: "Sortie d'hospitalisation" },
      consentement: { sante: false },
    });
  });

  it("contact : message obligatoire, sans commune", async () => {
    render(<ContactForm {...common} page={specialJson.contact} />);
    fillIdentity();
    fireEvent.click(screen.getByRole("button", { name: "J'envoie ma demande" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Il manque votre message");
    fireEvent.change(screen.getByRole("textbox", { name: /^Votre message/ }), {
      target: { value: "Bonjour, une question." },
    });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "J'envoie ma demande" }));
    });
    await waitFor(() => expect(push).toHaveBeenCalledWith("/merci/contact/"));
    const lead = lastLead();
    expect(lead).toMatchObject({
      form: "contact",
      urgence: "information",
      message: "Bonjour, une question.",
    });
    expect(lead["commune"]).toBeUndefined();
  });
});
