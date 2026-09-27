import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { isOnScreen, observeOnce, resetSharedObservers, sharedObserverCount } from "./viewport";

type Entry = Partial<IntersectionObserverEntry>;
type Callback = (entries: Entry[]) => void;

interface Fake {
  callback: Callback;
  options?: unknown;
  observe: ReturnType<typeof vi.fn>;
  unobserve: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
}

function installIntersectionObserver() {
  const observers: Fake[] = [];
  class FakeObserver {
    observe = vi.fn();
    unobserve = vi.fn();
    disconnect = vi.fn();
    constructor(callback: Callback, options?: unknown) {
      observers.push({
        callback,
        options,
        observe: this.observe,
        unobserve: this.unobserve,
        disconnect: this.disconnect,
      });
    }
  }
  vi.stubGlobal("IntersectionObserver", FakeObserver);
  return observers;
}

function block(className: string): HTMLElement {
  const element = document.createElement("div");
  element.className = className;
  document.body.append(element);
  return element;
}

describe("observeOnce (fabrique partagée)", () => {
  beforeEach(() => resetSharedObservers());

  afterEach(() => {
    resetSharedObservers();
    document.body.innerHTML = "";
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("n'ouvre qu'un observateur par seuil, quel que soit le nombre d'éléments", () => {
    const observers = installIntersectionObserver();
    const first = block("a");
    const second = block("b");
    const third = block("c");
    observeOnce(first, 0.15, () => {});
    observeOnce(second, 0.15, () => {});
    observeOnce(third, 0.5, () => {});
    expect(observers).toHaveLength(2);
    expect(observers[0]?.options).toEqual({ threshold: 0.15 });
    expect(observers[1]?.options).toEqual({ threshold: 0.5 });
    expect(sharedObserverCount()).toBe(2);
  });

  it("prévient une seule fois, puis se désabonne et détruit l'observateur vide", () => {
    const observers = installIntersectionObserver();
    const element = block("a");
    const other = block("b");
    const enter = vi.fn();
    observeOnce(element, 0.15, enter);
    observeOnce(other, 0.15, () => {});
    const notify = observers[0]?.callback;

    notify?.([{ isIntersecting: false, target: element }]);
    expect(enter).not.toHaveBeenCalled();
    notify?.([{ isIntersecting: true, target: element }]);
    expect(enter).toHaveBeenCalledTimes(1);
    expect(observers[0]?.unobserve).toHaveBeenCalledWith(element);
    // Il reste `other` : l'observateur vit encore.
    expect(observers[0]?.disconnect).not.toHaveBeenCalled();

    notify?.([{ isIntersecting: true, target: element }]);
    expect(enter).toHaveBeenCalledTimes(1);

    notify?.([{ isIntersecting: true, target: other }]);
    expect(observers[0]?.disconnect).toHaveBeenCalledTimes(1);
    expect(sharedObserverCount()).toBe(0);
  });

  it("le désabonnement rend la main avant l'entrée dans l'écran (démontage)", () => {
    const observers = installIntersectionObserver();
    const element = block("a");
    const enter = vi.fn();
    const unobserve = observeOnce(element, 0.2, enter);
    unobserve();
    expect(observers[0]?.unobserve).toHaveBeenCalledWith(element);
    expect(sharedObserverCount()).toBe(0);
    observers[0]?.callback([{ isIntersecting: true, target: element }]);
    expect(enter).not.toHaveBeenCalled();
    // Deux désabonnements de suite ne font rien de plus.
    unobserve();
    expect(observers[0]?.unobserve).toHaveBeenCalledTimes(1);
  });

  it("ne fait rien, sans échouer, sans IntersectionObserver", () => {
    vi.stubGlobal("IntersectionObserver", undefined);
    const element = block("a");
    const enter = vi.fn();
    expect(() => observeOnce(element, 0.15, enter)()).not.toThrow();
    expect(enter).not.toHaveBeenCalled();
    expect(sharedObserverCount()).toBe(0);
  });
});

describe("isOnScreen (mesure groupée)", () => {
  afterEach(() => {
    resetSharedObservers();
    document.body.innerHTML = "";
    vi.restoreAllMocks();
  });

  it("mesure toute la famille en une passe, sans relire pour chacun", () => {
    const first = block("m-reveal");
    const second = block("m-reveal");
    const third = block("m-reveal");
    const rect = vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(function (
      this: Element,
    ) {
      const top = this === first ? 10 : 4000;
      return {
        top,
        bottom: top + 100,
        left: 0,
        right: 100,
        width: 100,
        height: 100,
        x: 0,
        y: top,
        toJSON: () => ({}),
      };
    });

    expect(isOnScreen(first, ".m-reveal")).toBe(true);
    expect(isOnScreen(second, ".m-reveal")).toBe(false);
    expect(isOnScreen(third, ".m-reveal")).toBe(false);
    // Trois questions, trois mesures : celles de la seule passe de groupe.
    expect(rect).toHaveBeenCalledTimes(3);
  });

  it("mesure l'élément seul quand il n'appartient à aucune famille", () => {
    const alone = document.createElement("div");
    vi.spyOn(Element.prototype, "getBoundingClientRect").mockReturnValue({
      top: 20,
      bottom: 120,
      left: 0,
      right: 10,
      width: 10,
      height: 100,
      x: 0,
      y: 20,
      toJSON: () => ({}),
    });
    expect(isOnScreen(alone)).toBe(true);
    expect(isOnScreen(alone, ".m-reveal")).toBe(true);
  });
});
