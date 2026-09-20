import { render } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  RAIL_STEP_MS,
  ThreadConnector,
  ThreadKnot,
  ThreadRail,
  railItemStyle,
} from "./ThreadConnector";

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

/** jsdom place tout à (0, 0) : on simule un rail sous le pli. */
function placeBelowFold() {
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockReturnValue({
    top: 2000,
    bottom: 2200,
    left: 0,
    right: 100,
    width: 100,
    height: 200,
    x: 0,
    y: 2000,
    toJSON: () => ({}),
  });
}

describe("ThreadConnector", () => {
  beforeEach(() => {
    delete document.documentElement.dataset.comfort;
    delete document.documentElement.dataset.motion;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("est un tracé du fil décoratif, ouvert, étiré sans mesure JavaScript", () => {
    const { container } = render(<ThreadConnector orientation="vertical" className="top-6" />);
    const box = container.firstElementChild as HTMLElement;
    expect(box.tagName).toBe("SPAN");
    expect(box).toHaveAttribute("aria-hidden", "true");
    expect(box).toHaveAttribute("data-orientation", "vertical");
    expect(box).toHaveClass("t-connector", "text-teal-700", "top-6");
    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("aria-hidden", "true");
    expect(svg).toHaveAttribute("preserveAspectRatio", "none");
    expect(svg).toHaveAttribute("fill", "none");
    expect(svg).toHaveAttribute("stroke-linecap", "round");
    expect(svg).toHaveClass("size-full");
    expect(svg?.style.strokeWidth).toBe("var(--thread-width, 2px)");
    const paths = container.querySelectorAll("path");
    expect(paths).toHaveLength(1);
    expect(paths[0]).toHaveAttribute("d", "M1 0V2");
    expect(paths[0]).toHaveAttribute("pathLength", "1");
    expect(paths[0]).toHaveAttribute("vector-effect", "non-scaling-stroke");
    expect(paths[0]?.getAttribute("d")?.toLowerCase()).not.toContain("z");
  });

  it("porte deux tracés en `responsive` : vertical sous le point de rupture, horizontal au-delà", () => {
    const { container } = render(<ThreadConnector tone="dark" breakpoint="lg" />);
    const [vertical, horizontal] = Array.from(container.querySelectorAll("path"));
    expect(container.firstElementChild).toHaveClass("text-white");
    expect(vertical).toHaveAttribute("d", "M1 0V2");
    expect(vertical).toHaveClass("lg:hidden");
    expect(horizontal).toHaveAttribute("d", "M0 1H2");
    expect(horizontal).toHaveClass("hidden", "lg:block");
  });

  it("pose le délai et la part de durée du tracé sur le segment", () => {
    const { container } = render(
      <ThreadConnector orientation="horizontal" delay={260} fraction={0.2} />,
    );
    const path = container.querySelector("path") as SVGPathElement;
    expect(path.style.getPropertyValue("--m-delay")).toBe("260ms");
    expect(path.style.transitionDuration).toBe("calc(var(--thread-duration, 800ms) * 0.2)");
  });

  it("ThreadKnot : un anneau ouvert, framboise pour le nœud, autour d'un numéro", () => {
    const { container } = render(
      <ThreadKnot size={48} tone="raspberry" delay={400}>
        3
      </ThreadKnot>,
    );
    const knot = container.firstElementChild as HTMLElement;
    expect(knot).toHaveAttribute("aria-hidden", "true");
    expect(knot).toHaveClass("t-knot", "size-12", "text-raspberry-500", "bg-white");
    expect(knot.style.getPropertyValue("--m-delay")).toBe("400ms");
    expect(knot).toHaveTextContent("3");
    const ring = knot.querySelector("path");
    expect(ring?.getAttribute("d")?.toLowerCase()).not.toContain("z");
    expect(ring).toHaveAttribute("pathLength", "1");
  });

  it("railItemStyle : délai de 200 ms par jalon, profondeur facultative", () => {
    expect(RAIL_STEP_MS).toBe(200);
    expect(railItemStyle(0)).toEqual({});
    expect(railItemStyle(2)).toEqual({ "--m-delay": "400ms" });
    expect(railItemStyle(1, 12)).toEqual({ "--m-delay": "200ms", "--t-depth": "12px" });
  });

  it("ThreadRail : rendu serveur complet, visible, sans attribut d'état", () => {
    const html = renderToString(
      <ThreadRail as="ol" aria-label="Jalons">
        <li className="t-rail__item">Un</li>
      </ThreadRail>,
    );
    expect(html).toContain("<ol");
    expect(html).toContain('class="m-reveal m-reveal--draw t-rail"');
    expect(html).toContain("Un");
    expect(html).not.toContain("data-reveal");
  });

  it("ThreadRail : se trace une fois à l'entrée dans l'écran, jamais en mouvement réduit", () => {
    installMatchMedia(false);
    const observers = installIntersectionObserver();
    placeBelowFold();
    const { container, unmount } = render(
      <ThreadRail as="ul">
        <li className="t-rail__item">
          <ThreadConnector orientation="vertical" />
        </li>
      </ThreadRail>,
    );
    const rail = container.firstElementChild as HTMLElement;
    expect(rail).toHaveAttribute("data-reveal", "pending");
    observers[0]?.callback([{ isIntersecting: true }]);
    expect(rail).toHaveAttribute("data-reveal", "in");
    unmount();

    document.documentElement.dataset.motion = "reduce";
    const reduced = render(
      <ThreadRail as="ul">
        <li className="t-rail__item">Visible</li>
      </ThreadRail>,
    );
    expect(reduced.container.firstElementChild).not.toHaveAttribute("data-reveal");
  });
});
