import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  isSimulatedReducedMotion,
  prefersReducedMotion,
  setSimulatedReducedMotion,
  subscribeReducedMotion,
  useReducedMotion,
} from "./reduced-motion";

function installMatchMedia(reduced: boolean) {
  const listeners = new Set<() => void>();
  const media = {
    matches: reduced,
    addEventListener: vi.fn((_: string, cb: () => void) => listeners.add(cb)),
    removeEventListener: vi.fn((_: string, cb: () => void) => listeners.delete(cb)),
  };
  vi.stubGlobal("matchMedia", vi.fn().mockReturnValue(media));
  return { media, fire: () => listeners.forEach((cb) => cb()) };
}

describe("prefersReducedMotion", () => {
  beforeEach(() => {
    delete document.documentElement.dataset.comfort;
    delete document.documentElement.dataset.motion;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("suit la media query", () => {
    installMatchMedia(false);
    expect(prefersReducedMotion()).toBe(false);
    installMatchMedia(true);
    expect(prefersReducedMotion()).toBe(true);
  });

  it("est vrai en mode confort et sous la simulation, même sans matchMedia", () => {
    expect(prefersReducedMotion()).toBe(false);
    document.documentElement.dataset.comfort = "on";
    expect(prefersReducedMotion()).toBe(true);
    delete document.documentElement.dataset.comfort;
    setSimulatedReducedMotion(true);
    expect(isSimulatedReducedMotion()).toBe(true);
    expect(prefersReducedMotion()).toBe(true);
    setSimulatedReducedMotion(false);
    expect(document.documentElement.dataset.motion).toBeUndefined();
    expect(prefersReducedMotion()).toBe(false);
  });

  it("s'abonne à la media query et aux attributs de <html>, puis se désabonne", async () => {
    const { media, fire } = installMatchMedia(false);
    const onChange = vi.fn();
    const unsubscribe = subscribeReducedMotion(onChange);
    fire();
    expect(onChange).toHaveBeenCalledTimes(1);
    document.documentElement.dataset.comfort = "on";
    await waitFor(() => expect(onChange).toHaveBeenCalledTimes(2));
    unsubscribe();
    expect(media.removeEventListener).toHaveBeenCalled();
    fire();
    expect(onChange).toHaveBeenCalledTimes(2);
  });
});

describe("useReducedMotion", () => {
  beforeEach(() => {
    delete document.documentElement.dataset.comfort;
    delete document.documentElement.dataset.motion;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("lit la source externe et se met à jour quand le mode confort change", async () => {
    installMatchMedia(false);
    const { result } = renderHook(() => useReducedMotion());
    expect(result.current).toBe(false);
    document.documentElement.dataset.comfort = "on";
    await waitFor(() => expect(result.current).toBe(true));
    delete document.documentElement.dataset.comfort;
    await waitFor(() => expect(result.current).toBe(false));
  });

  it("répond « oui » côté serveur (contenu visible et immobile)", async () => {
    const { renderToString } = await import("react-dom/server");
    const { createElement } = await import("react");
    function Probe() {
      return createElement("span", null, useReducedMotion() ? "réduit" : "animé");
    }
    expect(renderToString(createElement(Probe))).toContain("réduit");
  });
});
