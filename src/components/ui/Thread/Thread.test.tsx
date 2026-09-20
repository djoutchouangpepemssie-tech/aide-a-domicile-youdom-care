import { act, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { threadIllustrationNames, threadIllustrations } from "./illustrations";
import { Thread } from "./Thread";

type Callback = (entries: Partial<IntersectionObserverEntry>[]) => void;

function installIntersectionObserver() {
  const observers: { callback: Callback; observe: ReturnType<typeof vi.fn> }[] = [];
  class FakeObserver {
    observe = vi.fn();
    disconnect = vi.fn();
    constructor(callback: Callback) {
      observers.push({ callback, observe: this.observe });
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

describe("Thread", () => {
  beforeEach(() => {
    delete document.documentElement.dataset.comfort;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("est décoratif, tracé ouvert, un seul nœud, six illustrations", () => {
    expect(threadIllustrationNames).toEqual([
      "maison",
      "mains",
      "tasse",
      "lune",
      "cartable",
      "carnet",
    ]);
    for (const name of threadIllustrationNames) {
      const { main } = threadIllustrations[name];
      expect(main.toLowerCase()).not.toMatch(/z/);
    }
    const { container } = render(<Thread illustration="maison" />);
    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("aria-hidden", "true");
    expect(svg).toHaveAttribute("fill", "none");
    expect(svg).toHaveClass("thread", "text-teal-700");
    expect(container.querySelectorAll("path")).toHaveLength(2);
    expect(container.querySelector(".thread-knot")).toHaveClass("text-raspberry-500");
  });

  it("glisse en parallaxe (16 px, CSS seul) seulement sur demande", () => {
    const { container, rerender } = render(<Thread illustration="mains" />);
    const svg = container.querySelector<SVGSVGElement>("svg");
    expect(svg).not.toHaveClass("m-parallax");
    expect(svg?.style.getPropertyValue("--m-parallax")).toBe("");
    rerender(<Thread illustration="mains" parallax style={{ width: 40 }} />);
    expect(svg).toHaveClass("m-parallax");
    expect(svg?.style.getPropertyValue("--m-parallax")).toBe("16px");
    expect(svg?.style.width).toBe("40px");
  });

  it("reste visible sans IntersectionObserver ni matchMedia (progressive)", () => {
    const { container } = render(<Thread illustration="tasse" tone="dark" />);
    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("data-state", "idle");
    expect(svg).toHaveClass("text-white");
  });

  it("se dessine une fois à l'entrée dans l'écran", () => {
    installMatchMedia(false);
    const observers = installIntersectionObserver();
    const { container } = render(<Thread illustration="lune" />);
    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("data-state", "pending");
    expect(observers[0]?.observe).toHaveBeenCalledWith(svg);
    act(() => observers[0]?.callback([{ isIntersecting: true }]));
    expect(svg).toHaveAttribute("data-state", "drawn");
  });

  it("est affiché d'emblée avec prefers-reduced-motion ou le mode confort", () => {
    installMatchMedia(true);
    installIntersectionObserver();
    const first = render(<Thread illustration="carnet" />);
    expect(first.container.querySelector("svg")).toHaveAttribute("data-state", "idle");
    first.unmount();

    installMatchMedia(false);
    document.documentElement.dataset.comfort = "on";
    const second = render(<Thread illustration="cartable" />);
    expect(second.container.querySelector("svg")).toHaveAttribute("data-state", "idle");
  });
});
