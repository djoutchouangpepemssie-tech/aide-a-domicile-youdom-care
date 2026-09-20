import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import neuroJson from "../../../../content/formulaires/neuro.json";
import interfaceJson from "../../../../content/interface.json";
import type * as CommuneFieldModule from "@/components/forms/CommuneField/CommuneField";
import { formDefinitionSchema } from "@/content/schemas";
import type * as LeadClient from "@/lib/lead/client";
import { leadPayloadSchema } from "@/lib/lead/schema";
import {
  cleanSituation,
  DetailedForm,
  emptyDetailedValue,
  validateCoordinates,
} from "./DetailedForm";

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

const definition = formDefinitionSchema.parse(neuroJson);
const texts = {
  ...interfaceJson.formulaires,
  recherche: interfaceJson.recherche_commune,
  planningTexts: {
    semaine_type: interfaceJson.semaine_type,
    formulaires: interfaceJson.formulaires,
    planning: interfaceJson.planning,
  },
};

function renderForm() {
  render(
    <DetailedForm
      definition={definition}
      texts={texts}
      phone="01 84 80 17 03"
      confidentialiteHref="/politique-de-confidentialite/"
    />,
  );
}

describe("DetailedForm", () => {
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

  it("nettoie la situation et exige l'accord aux coordonnées", () => {
    expect(
      cleanSituation(
        { maladie: "Je préfère en parler", vit: "", pese: [], pro: ["Infirmier"] },
        "Je préfère en parler",
      ),
    ).toEqual({ pro: ["Infirmier"] });
    expect(cleanSituation({}, "x")).toBeUndefined();
    const errors = validateCoordinates(
      {
        ...emptyDetailedValue,
        prenom: "A",
        nom: "B",
        telephone: "06 12 34 56 78",
        email: "pas-un-mail",
      },
      texts,
    );
    expect(errors).toMatchObject({
      email: "Il manque votre e-mail. Nous en avons besoin pour vous rappeler.",
      commune: "Il manque votre commune. Nous en avons besoin pour vous rappeler.",
      consentement: texts.consentement_requis,
    });
  });

  it("déroule les cinq étapes, bloque sans « pour qui », envoie une demande de santé conforme", async () => {
    renderForm();
    expect(screen.getByText("Étape 1 sur 5")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Continuer" }));
    expect(screen.getByRole("alert")).toHaveTextContent("pour qui vous cherchez de l'aide");
    fireEvent.click(screen.getByRole("radio", { name: "Mon père ou ma mère" }));
    fireEvent.click(screen.getByRole("button", { name: "Continuer" }));

    expect(screen.getByText("Étape 2 sur 5")).toBeInTheDocument();
    expect(screen.getAllByRole("radio", { name: "Je préfère en parler" })).toHaveLength(4);
    fireEvent.click(screen.getByRole("radio", { name: "Alzheimer ou apparentée" }));
    fireEvent.click(screen.getAllByRole("radio", { name: "Je préfère en parler" })[1] as Element);
    fireEvent.click(screen.getByRole("checkbox", { name: "Les nuits difficiles" }));
    fireEvent.click(screen.getByRole("button", { name: "Continuer" }));

    expect(screen.getByText("Étape 3 sur 5")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("checkbox", { name: "Nuits" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "À définir ensemble" }));
    fireEvent.click(screen.getByRole("button", { name: "Continuer" }));

    expect(screen.getByText("Étape 4 sur 5")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Continuer" }));
    expect(screen.getByRole("alert")).toHaveTextContent("le rythme souhaité");
    fireEvent.click(screen.getByRole("radio", { name: "Régulier, chaque semaine" }));
    fireEvent.click(screen.getByRole("button", { name: "Toutes les nuits" }));
    fireEvent.click(screen.getByRole("radio", { name: /^Nuit active/ }));
    fireEvent.click(screen.getByRole("radio", { name: "Dans la semaine" }));
    fireEvent.click(screen.getByRole("button", { name: "Continuer" }));

    expect(screen.getByText("Étape 5 sur 5")).toBeInTheDocument();
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
    fireEvent.change(screen.getByLabelText(/Ce que vous souhaitez nous dire/), {
      target: { value: "Elle habite au 3e sans ascenseur." },
    });
    fireEvent.click(screen.getByRole("button", { name: "J'envoie ma demande" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Il manque votre accord");
    const consent = screen.getByRole("checkbox", { name: /J'accepte que Youdom Care utilise/ });
    expect(consent).not.toBeChecked();
    fireEvent.click(consent);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "J'envoie ma demande" }));
    });
    await waitFor(() => expect(push).toHaveBeenCalledWith("/merci/neuro/"));
    const [lead] = sendLead.mock.calls[0] as unknown as [Record<string, unknown>];
    expect(leadPayloadSchema.safeParse(lead).success).toBe(true);
    expect(lead).toMatchObject({
      form: "neuro",
      pourQui: "Mon père ou ma mère",
      situation: { maladie: "Alzheimer ou apparentée", ce_qui_pese: ["Les nuits difficiles"] },
      besoins: ["Nuits", "À définir ensemble"],
      planning: { rythme: "regulier", heuresParSemaine: 63, nuit: "active" },
      urgence: "semaine",
      message: "Elle habite au 3e sans ascenseur.",
      consentement: { sante: true },
    });
    expect((lead["situation"] as Record<string, unknown>)["autonomie"]).toBeUndefined();
    expect(within(document.body).queryByText("Étape")).toBeNull();
  });
});
