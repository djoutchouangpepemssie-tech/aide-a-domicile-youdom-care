import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import interfaceJson from "../../../../content/interface.json";
import { TextField } from "@/components/ui/TextField/TextField";
import { clearStored, MultiStepForm, storageKey, type FormStep } from "./MultiStepForm";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
const { track } = vi.hoisted(() => ({ track: vi.fn() }));
vi.mock("@/lib/mesure/client", () => ({ track }));

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

  it("met le focus sur le premier contrôle d'un groupe en erreur (le fieldset porte l'identifiant)", () => {
    const groupSteps: FormStep<Demo>[] = [
      {
        id: "groupe",
        title: "Pour qui cherchez-vous de l'aide ?",
        render: ({ value, setValue, errors, fieldId }) => (
          <fieldset
            id={fieldId("choix")}
            aria-describedby={errors["choix"] ? `${fieldId("choix")}-erreur` : undefined}
          >
            <legend>Pour qui ?</legend>
            <label>
              <input
                type="radio"
                name="choix"
                checked={value.prenom === "moi"}
                onChange={() => setValue({ ...value, prenom: "moi" })}
              />
              Moi-même
            </label>
            <label>
              <input
                type="radio"
                name="choix"
                checked={value.prenom === "parent"}
                onChange={() => setValue({ ...value, prenom: "parent" })}
              />
              Mon père ou ma mère
            </label>
            {errors["choix"] ? <p id={`${fieldId("choix")}-erreur`}>{errors["choix"]}</p> : null}
          </fieldset>
        ),
        validate: (value): Record<string, string> =>
          value.prenom ? {} : { choix: "Il manque pour qui vous cherchez de l'aide." },
      },
      ...steps.slice(1),
    ];
    render(
      <MultiStepForm<Demo>
        form="rappel"
        steps={groupSteps}
        initialValue={{ prenom: "", telephone: "" }}
        texts={texts}
        onSubmit={vi.fn(async () => {})}
        successHref="/merci/rappel/"
        phone={null}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Continuer" }));
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Il manque pour qui vous cherchez de l'aide.",
    );
    expect(screen.getByRole("radio", { name: "Moi-même" })).toHaveFocus();
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

  it("compte chaque étape affichée une seule fois, même après la reprise d'une saisie (D-029)", async () => {
    track.mockClear();
    window.sessionStorage.setItem(
      storageKey("rappel"),
      JSON.stringify({ step: 1, value: { prenom: "Paul", telephone: "" } }),
    );
    renderForm();
    expect(await screen.findByText("Étape 2 sur 2")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Retour" }));
    // Pas d'étape 1 fantôme pendant le montage : l'étape reprise, puis celle où l'on revient.
    expect(track.mock.calls).toEqual([
      ["demande_etape_vue", { formulaire: "rappel", etape: 2 }],
      ["demande_etape_vue", { formulaire: "rappel", etape: 1 }],
    ]);
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
    // Audit P8.4 R-4 : l'alerte reçoit le focus, sans entrer dans l'ordre de tabulation.
    const callout = alert.closest('[role="alert"]');
    expect(callout).toHaveAttribute("tabindex", "-1");
    await waitFor(() => expect(callout).toHaveFocus());
    expect(screen.getByRole("link", { name: /01.84.80.17.03/ })).toHaveAttribute(
      "href",
      "tel:+33184801703",
    );
    expect(screen.getByLabelText("Votre téléphone")).toHaveValue("06");
    expect(push).not.toHaveBeenCalled();
    expect(window.sessionStorage.getItem(storageKey("rappel"))).not.toBeNull();
  });
});
