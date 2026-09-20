import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import interfaceJson from "../../../../content/interface.json";
import { TextField } from "@/components/ui/TextField/TextField";
import { clearStored, MultiStepForm, storageKey, type FormStep } from "./MultiStepForm";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

interface Demo {
  prenom: string;
  telephone: string;
}

const texts = { ...interfaceJson.formulaires };

const steps: FormStep<Demo>[] = [
  {
    id: "identite",
    title: "Comment vous appelez-vous ?",
    render: ({ value, setValue, errors, fieldId }) => (
      <TextField
        id={fieldId("prenom")}
        label="Votre prénom"
        value={value.prenom}
        error={errors["prenom"]}
        onChange={(event) => setValue({ ...value, prenom: event.target.value })}
      />
    ),
    validate: (value): Record<string, string> =>
      value.prenom.trim() ? {} : { prenom: "Il manque votre prénom." },
  },
  {
    id: "contact",
    title: "Où pouvons-nous vous joindre ?",
    render: ({ value, setValue, fieldId }) => (
      <TextField
        id={fieldId("telephone")}
        label="Votre téléphone"
        value={value.telephone}
        onChange={(event) => setValue({ ...value, telephone: event.target.value })}
      />
    ),
  },
];

function renderForm(onSubmit = vi.fn(async () => {}), initialStep = 0) {
  render(
    <MultiStepForm<Demo>
      form="rappel"
      steps={steps}
      initialValue={{ prenom: "", telephone: "" }}
      texts={texts}
      onSubmit={onSubmit}
      successHref="/merci/rappel/"
      phone="01 84 80 17 03"
      initialStep={initialStep}
    />,
  );
  return onSubmit;
}

describe("MultiStepForm", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    push.mockClear();
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
      cb(0);
      return 0;
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("affiche la progression, bloque l'étape invalide avec un résumé lié au champ", () => {
    renderForm();
    expect(screen.getByText("Étape 1 sur 2")).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "1");
    expect(screen.getByRole("button", { name: "Retour" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Continuer" }));
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("Il manque quelques informations");
    const link = screen.getByRole("link", { name: "Il manque votre prénom." });
    const input = screen.getByLabelText("Votre prénom");
    expect(link).toHaveAttribute("href", `#${input.id}`);
    expect(input).toHaveFocus();
    expect(input).toHaveAccessibleDescription("Il manque votre prénom.");
    expect(screen.getByText("Étape 1 sur 2")).toBeInTheDocument();
  });

  it("avance, revient, conserve les réponses sur l'appareil et les efface après l'envoi", async () => {
    const onSubmit = renderForm();
    fireEvent.change(screen.getByLabelText("Votre prénom"), { target: { value: "Claire" } });
    fireEvent.click(screen.getByRole("button", { name: "Continuer" }));
    expect(screen.getByText("Étape 2 sur 2")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2 })).toHaveFocus();
    expect(JSON.parse(window.sessionStorage.getItem(storageKey("rappel")) ?? "{}")).toEqual({
      step: 1,
      value: { prenom: "Claire", telephone: "" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Retour" }));
    expect(screen.getByLabelText("Votre prénom")).toHaveValue("Claire");
    fireEvent.click(screen.getByRole("button", { name: "Continuer" }));
    fireEvent.change(screen.getByLabelText("Votre téléphone"), {
      target: { value: "06 12 34 56 78" },
    });
    fireEvent.click(screen.getByRole("button", { name: "J'envoie ma demande" }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/merci/rappel/"));
    expect(onSubmit).toHaveBeenCalledWith(
      { prenom: "Claire", telephone: "06 12 34 56 78" },
      expect.objectContaining({ honeypot: "", startedAt: expect.any(String) }),
    );
    expect(window.sessionStorage.getItem(storageKey("rappel"))).toBeNull();
  });

  it("reprend une saisie conservée", async () => {
    window.sessionStorage.setItem(
      storageKey("rappel"),
      JSON.stringify({ step: 1, value: { prenom: "Paul", telephone: "" } }),
    );
    renderForm();
    expect(await screen.findByText("Étape 2 sur 2")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Retour" }));
    expect(screen.getByLabelText("Votre prénom")).toHaveValue("Paul");
    clearStored("rappel");
    expect(window.sessionStorage.getItem(storageKey("rappel"))).toBeNull();
  });

  it("garde les réponses à l'écran et propose le téléphone quand l'envoi échoue", async () => {
    const failing = vi.fn(async () => {
      throw new Error("panne");
    });
    renderForm(failing, 1);
    fireEvent.change(screen.getByLabelText("Votre téléphone"), { target: { value: "06" } });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "J'envoie ma demande" }));
    });
    const alert = await screen.findByText(/L'envoi n'a pas abouti/);
    expect(alert).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /01.84.80.17.03/ })).toHaveAttribute(
      "href",
      "tel:+33184801703",
    );
    expect(screen.getByLabelText("Votre téléphone")).toHaveValue("06");
    expect(push).not.toHaveBeenCalled();
    expect(window.sessionStorage.getItem(storageKey("rappel"))).not.toBeNull();
  });
});
