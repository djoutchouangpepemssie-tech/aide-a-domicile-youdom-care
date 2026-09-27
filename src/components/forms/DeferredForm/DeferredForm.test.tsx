import { act, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { hydrateRoot, type Root } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createDeferredForm, DEFERRED_FORM_ROOT_MARGIN } from "./DeferredForm";

/*
 * Moteur d'hydratation différée (D-030) : sans HTML du serveur, le module se charge tout de
 * suite ; avec le HTML du serveur, il attend l'approche de la section (ou un focus, un toucher),
 * puis React hydrate le formulaire déjà en place sans le remplacer.
 */

function FakeForm({ label }: { label: string }) {
  const [count, setCount] = useState(0);
  return (
    <form aria-label={label}>
      <label>
        Prénom
        <input type="text" />
      </label>
      <button type="button" onClick={() => setCount((c) => c + 1)}>
        Compter
      </button>
      <output>{count}</output>
    </form>
  );
}

type IOCallback = (entries: IntersectionObserverEntry[], observer: IntersectionObserver) => void;

class FakeIntersectionObserver {
  static instances: FakeIntersectionObserver[] = [];
  observed: Element[] = [];
  constructor(
    public callback: IOCallback,
    public options?: IntersectionObserverInit,
  ) {
    FakeIntersectionObserver.instances.push(this);
  }
  observe(element: Element) {
    this.observed.push(element);
  }
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
  trigger(isIntersecting: boolean) {
    this.callback(
      this.observed.map((target) => ({ isIntersecting, target }) as IntersectionObserverEntry),
      this as unknown as IntersectionObserver,
    );
  }
}

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

/** HTML tel que le serveur le rend : le module est chargé sans attendre, le balisage est complet. */
async function serverHtml(): Promise<string> {
  const Server = createDeferredForm(async () => ({ default: FakeForm }), "Server");
  Server.preload();
  // Le premier rendu déclenche l'import ; le second, une fois le module arrivé, rend le formulaire.
  renderToString(<Server label="Test" />);
  await tick();
  const html = renderToString(<Server label="Test" />);
  expect(html).toContain("<form");
  expect(html).toContain('data-deferred-form="attente"');
  return html;
}

describe("createDeferredForm", () => {
  let root: Root | null = null;
  let container: HTMLDivElement | null = null;

  beforeEach(() => {
    FakeIntersectionObserver.instances = [];
    vi.stubGlobal("IntersectionObserver", FakeIntersectionObserver);
  });

  afterEach(async () => {
    if (root) {
      const current = root;
      await act(async () => current.unmount());
      root = null;
    }
    container?.remove();
    container = null;
    vi.unstubAllGlobals();
  });

  it("sans HTML du serveur (navigation côté client), charge le module tout de suite", async () => {
    const load = vi.fn(async () => ({ default: FakeForm }));
    const Lazy = createDeferredForm(load, "Lazy");
    render(<Lazy label="Rappel" />);
    expect(await screen.findByRole("form", { name: "Rappel" })).toBeInTheDocument();
    expect(load).toHaveBeenCalledTimes(1);
    // Aucun observateur n'a été posé : il n'y avait rien à attendre.
    expect(FakeIntersectionObserver.instances).toHaveLength(0);
  });

  it("avec le HTML du serveur, garde le formulaire en place, attend l'approche de la section, puis hydrate", async () => {
    const html = await serverHtml();
    container = document.createElement("div");
    container.innerHTML = html;
    document.body.appendChild(container);
    const formBefore = container.querySelector("form");
    expect(formBefore).not.toBeNull();

    const load = vi.fn(async () => ({ default: FakeForm }));
    const Client = createDeferredForm(load, "Client");
    const target = container;
    await act(async () => {
      root = hydrateRoot(target, <Client label="Test" />);
    });
    await tick();

    // Rien chargé : le HTML du serveur reste tel quel, observé avec une hauteur d'écran d'avance.
    expect(load).not.toHaveBeenCalled();
    expect(container.querySelector("form")).toBe(formBefore);
    expect(container.querySelector("[data-deferred-form]")).toHaveAttribute(
      "data-deferred-form",
      "attente",
    );
    const observer = FakeIntersectionObserver.instances[0];
    expect(observer?.options?.rootMargin).toBe(DEFERRED_FORM_ROOT_MARGIN);
    expect(observer?.observed[0]).toBe(container.querySelector("[data-deferred-form]"));

    // Hors écran : toujours rien.
    act(() => observer?.trigger(false));
    expect(load).not.toHaveBeenCalled();

    // La section approche : le module se charge, le formulaire est hydraté sans être remplacé.
    act(() => observer?.trigger(true));
    expect(container.querySelector("[data-deferred-form]")).toHaveAttribute(
      "data-deferred-form",
      "chargement",
    );
    await waitFor(() => expect(load).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(container?.querySelector("[data-deferred-form]")).toHaveAttribute(
        "data-deferred-form",
        "pret",
      ),
    );
    const button = container.querySelector("button");
    await act(async () => button?.click());
    expect(container.querySelector("output")).toHaveTextContent("1");
    expect(container.querySelector("form")).toBe(formBefore);
  });

  it("un focus ou un toucher dans la section charge le module sans attendre l'observateur", async () => {
    const html = await serverHtml();
    container = document.createElement("div");
    container.innerHTML = html;
    document.body.appendChild(container);

    const load = vi.fn(async () => ({ default: FakeForm }));
    const Client = createDeferredForm(load, "Client");
    const target = container;
    await act(async () => {
      root = hydrateRoot(target, <Client label="Test" />);
    });
    await tick();
    expect(load).not.toHaveBeenCalled();

    expect(FakeIntersectionObserver.instances).toHaveLength(1);
    // React arrête la propagation des événements visant une frontière déshydratée : l'écoute se
    // fait sur `window` en capture, l'événement est donc vu même s'il ne remonte pas.
    const input = container.querySelector("input");
    act(() => {
      input?.dispatchEvent(new window.FocusEvent("focusin", { bubbles: true }));
    });
    await waitFor(() => expect(load).toHaveBeenCalledTimes(1));
    expect(await screen.findByRole("form", { name: "Test" })).toBeInTheDocument();
  });

  it("retient un envoi natif tant que le formulaire n'est pas hydraté", async () => {
    const html = await serverHtml();
    container = document.createElement("div");
    container.innerHTML = html;
    document.body.appendChild(container);

    const load = vi.fn(async () => ({ default: FakeForm }));
    const Client = createDeferredForm(load, "Client");
    const target = container;
    await act(async () => {
      root = hydrateRoot(target, <Client label="Test" />);
    });
    await tick();

    const form = container.querySelector("form");
    const submit = new window.Event("submit", { bubbles: true, cancelable: true });
    act(() => {
      form?.dispatchEvent(submit);
    });
    // Sans cela le navigateur rechargerait la page avec une chaîne de requête.
    expect(submit.defaultPrevented).toBe(true);
    await waitFor(() => expect(load).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(container?.querySelector("[data-deferred-form]")).toHaveAttribute(
        "data-deferred-form",
        "pret",
      ),
    );
    // Hydraté : l'envoi n'est plus retenu par l'enveloppe (le formulaire réel s'en charge).
    const later = new window.Event("submit", { bubbles: true, cancelable: true });
    act(() => {
      form?.dispatchEvent(later);
    });
    expect(later.defaultPrevented).toBe(false);
  });

  it("preload() déclenche le chargement sans signal", async () => {
    const load = vi.fn(async () => ({ default: FakeForm }));
    const Lazy = createDeferredForm(load, "Lazy");
    expect(load).not.toHaveBeenCalled();
    Lazy.preload();
    // L'import ne part qu'au premier rendu : la porte est ouverte, le module attend d'être demandé.
    render(<Lazy label="Rappel" />);
    expect(await screen.findByRole("form", { name: "Rappel" })).toBeInTheDocument();
    expect(load).toHaveBeenCalledTimes(1);
    expect(Lazy.displayName).toBe("Lazy");
  });
});
