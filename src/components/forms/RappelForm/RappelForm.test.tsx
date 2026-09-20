import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import interfaceJson from "../../../../content/interface.json";
import type * as CommuneFieldModule from "@/components/forms/CommuneField/CommuneField";
import type * as LeadClient from "@/lib/lead/client";
import { RappelForm, validateRappel } from "./RappelForm";

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
  ...interfaceJson.formulaires.rappel,
  recherche: interfaceJson.recherche_commune,
};

describe("RappelForm", () => {
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

  it("réclame les coordonnées avec les messages de docs/01", () => {
    const empty = {
      prenom: "",
      nom: "",
      telephone: "",
      commune: null,
      communeQuery: "",
      creneau: "",
    };
    expect(validateRappel(empty, texts)).toEqual({
      prenom: "Il manque votre prénom. Nous en avons besoin pour vous rappeler.",
      nom: "Il manque votre nom. Nous en avons besoin pour vous rappeler.",
      telephone: "Il manque votre téléphone. Nous en avons besoin pour vous rappeler.",
      commune: "Il manque votre commune. Nous en avons besoin pour vous rappeler.",
    });
    expect(
      validateRappel(
        { ...empty, prenom: "A", nom: "B", telephone: "06 12", communeQuery: "Lyon" },
        texts,
      ),
    ).toEqual({
      telephone: "Ce numéro semble incomplet. Pouvez-vous le vérifier ?",
      commune: expect.stringMatching(/^Nous intervenons à Paris et en Île-de-France/),
    });
  });

  it("se remplit au clavier, valide, envoie une demande conforme et ouvre la page merci", async () => {
    render(
      <RappelForm
        texts={texts}
        phone="01 84 80 17 03"
        confidentialiteHref="/politique-de-confidentialite/"
      />,
    );
    expect(screen.getByText("Étape 1 sur 1")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "J'envoie ma demande" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Il manque quelques informations");
    expect(screen.getByLabelText("Votre prénom")).toHaveFocus();

    fireEvent.change(screen.getByLabelText("Votre prénom"), { target: { value: "Claire" } });
    fireEvent.change(screen.getByLabelText("Votre nom"), { target: { value: "Martin" } });
    fireEvent.change(screen.getByLabelText("Votre téléphone"), {
      target: { value: "06 12 34 56 78" },
    });
    const commune = screen.getByRole("combobox", { name: "Votre commune ou votre code postal" });
    fireEvent.focus(commune);
    fireEvent.change(commune, { target: { value: "Put" } });
    await waitFor(() => expect(screen.getByRole("option", { name: /Puteaux/ })).toBeVisible());
    fireEvent.keyDown(commune, { key: "ArrowDown" });
    fireEvent.keyDown(commune, { key: "Enter" });
    fireEvent.change(screen.getByLabelText(/Quand préférez-vous être rappelé/), {
      target: { value: "Le matin" },
    });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "J'envoie ma demande" }));
    });
    await waitFor(() => expect(push).toHaveBeenCalledWith("/merci/rappel/"));
    expect(sendLead).toHaveBeenCalledTimes(1);
    const [lead, meta] = sendLead.mock.calls[0] as unknown as [
      Record<string, unknown>,
      Record<string, unknown>,
    ];
    expect(lead).toMatchObject({
      form: "rappel",
      urgence: "48h",
      commune: { insee: "92062", nom: "Puteaux" },
      agenceProche: "puteaux",
      contact: { prenom: "Claire", nom: "Martin", telephone: "06 12 34 56 78", rappel: "Le matin" },
      consentement: { sante: false },
    });
    expect(String(lead["sourcePage"])).not.toContain("?");
    expect(meta).toMatchObject({ honeypot: "" });
  });
});
