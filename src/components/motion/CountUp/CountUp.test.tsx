import { render } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MOTION_MAX_DURATION } from "@/lib/motion/grid";
import { resetSharedObservers } from "@/lib/motion/viewport";
import { COUNT_UP_DURATION, CountUp, formatCount } from "./CountUp";

type Entry = Partial<IntersectionObserverEntry>;
type Callback = (entries: Entry[]) => void;

function installIntersectionObserver() {
  const observers: {
    callback: Callback;
    unobserve: ReturnType<typeof vi.fn>;
    disconnect: ReturnType<typeof vi.fn>;
  }[] = [];
  class FakeObserver {
    observe = vi.fn();
    unobserve = vi.fn();
    disconnect = vi.fn();
    constructor(callback: Callback) {
      observers.push({ callback, unobserve: this.unobserve, disconnect: this.disconnect });
    }
  }
  vi.stubGlobal("IntersectionObserver", FakeObserver);
  return observers;
}

function installMatchMedia(reduced: boolean) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockReturnValue({ matches: reduced, addEventListener: vi.fn() }),
  );
}

/** Images contrôlées : chaque `tick(now)` joue les rappels en attente avec cet horodatage. */
function installFrames() {
  const queue: FrameRequestCallback[] = [];
  const cancel = vi.fn();
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    queue.push(callback);
    return queue.length;
  });
  vi.stubGlobal("cancelAnimationFrame", cancel);
  return {
    cancel,
    tick(now: number) {
      queue.splice(0).forEach((callback) => callback(now));
    },
    pending: () => queue.length,
  };
}

const digits = (container: HTMLElement) =>
  container.querySelector(".m-count__digits")?.textContent ?? "";

describe("CountUp", () => {
  beforeEach(() => {
    delete document.documentElement.dataset.comfort;
    delete document.documentElement.dataset.motion;
    resetSharedObservers();
  });

  afterEach(() => {
    resetSharedObservers();
    vi.unstubAllGlobals();
  });

  it("formate en français, avec décimales", () => {
    expect(formatCount(1268)).toBe((1268).toLocaleString("fr-FR"));
    expect(formatCount(12.5, 1)).toBe("12,5");
    expect(formatCount(3, 2)).toBe("3,00");
  });

  it("rend la valeur finale côté serveur, lisible et en chiffres tabulaires", () => {
    const html = renderToString(<CountUp value={1268} prefix="+" suffix=" %" />);
    const final = formatCount(1268);
    expect(html).toContain(`class="m-count"`);
    expect(html).toContain(`aria-hidden="true"`);
    expect(html).toContain(`class="sr-only">${final}<`);
    expect(html.startsWith(`<span class="m-count">+`)).toBe(true);
    expect(html.endsWith(` %</span>`)).toBe(true);
    expect(html).toContain(`--m-count-width:${final.length}ch`);
  });

  it("affiche la valeur finale immédiatement en mouvement réduit", () => {
    installMatchMedia(true);
    const observers = installIntersectionObserver();
    const { container } = render(<CountUp value={50} suffix=" %" />);
    expect(digits(container)).toBe("50");
    expect(observers).toHaveLength(0);
  });

  it("se compte de 0 à la valeur exacte en 600 ms à l'apparition, une seule fois", () => {
    installMatchMedia(false);
    const observers = installIntersectionObserver();
    const frames = installFrames();
    const { container } = render(<CountUp value={1000} />);
    const target = container.querySelector(".m-count__digits") as Element;
    expect(COUNT_UP_DURATION).toBe(MOTION_MAX_DURATION);
    expect(digits(container)).toBe(formatCount(1000));

    observers[0]?.callback([{ isIntersecting: false, target }]);
    expect(digits(container)).toBe(formatCount(1000));

    observers[0]?.callback([{ isIntersecting: true, target }]);
    expect(observers[0]?.unobserve).toHaveBeenCalledWith(target);
    expect(observers[0]?.disconnect).toHaveBeenCalled();
    expect(digits(container)).toBe("0");

    frames.tick(10_000);
    expect(digits(container)).toBe("0");
    frames.tick(10_300);
    const half = Number(digits(container).replace(/\D/g, ""));
    expect(half).toBeGreaterThan(700);
    expect(half).toBeLessThan(1000);
    frames.tick(10_600);
    expect(digits(container)).toBe(formatCount(1000));
    expect(frames.pending()).toBe(0);
    expect(container.querySelector(".sr-only")?.textContent).toBe(formatCount(1000));
  });

  it("annule l'image en attente et rétablit la valeur finale au démontage", () => {
    installMatchMedia(false);
    const observers = installIntersectionObserver();
    const frames = installFrames();
    const { container, unmount } = render(<CountUp value={80} />);
    const target = container.querySelector(".m-count__digits") as Element;
    observers[0]?.callback([{ isIntersecting: true, target }]);
    frames.tick(0);
    frames.tick(100);
    const element = container.querySelector(".m-count__digits");
    unmount();
    expect(frames.cancel).toHaveBeenCalled();
    expect(element?.textContent).toBe("80");
  });
});
