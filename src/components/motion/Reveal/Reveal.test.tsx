import { render } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Reveal } from "./Reveal";

type Callback = (entries: Partial<IntersectionObserverEntry>[]) => void;

function installIntersectionObserver() {
  const observers: { callback: Callback; observe: ReturnType<typeof vi.fn>; options?: unknown }[] =
    [];
  class FakeObserver {
    observe = vi.fn();
    disconnect = vi.fn();
    constructor(callback: Callback, options?: unknown) {
      observers.push({ callback, observe: this.observe, options });
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

/** jsdom place tout à (0, 0) avec une taille nulle : on simule une position réelle. */
function placeAt(top: number) {
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockReturnValue({
    top,
    bottom: top + 200,
    left: 0,
    right: 100,
    width: 100,
    height: 200,
    x: 0,
    y: top,
    toJSON: () => ({}),
  });
}

const placeBelowFold = () => placeAt(2000);
const placeOnScreen = () => placeAt(100);

describe("Reveal", () => {
  beforeEach(() => {
    delete document.documentElement.dataset.comfort;
    delete document.documentElement.dataset.motion;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("rend le contenu visible côté serveur, sans attribut d'état", () => {
    const html = renderToString(
      <Reveal>
        <p>Visible</p>
      </Reveal>,
    );
    expect(html).toContain("Visible");
    expect(html).toContain('class="m-reveal m-reveal--rise"');
    expect(html).not.toContain("data-reveal");
  });

  it("ne cache rien sans IntersectionObserver ni en mouvement réduit", () => {
    installMatchMedia(true);
    installIntersectionObserver();
    placeBelowFold();
    const { container } = render(
      <Reveal>
        <p>Visible</p>
      </Reveal>,
    );
    expect(container.firstElementChild).not.toHaveAttribute("data-reveal");

    installMatchMedia(false);
    vi.stubGlobal("IntersectionObserver", undefined);
    const second = render(
      <Reveal>
        <p>Visible</p>
      </Reveal>,
    );
    expect(second.container.firstElementChild).not.toHaveAttribute("data-reveal");
  });

  it("ne cache pas un élément déjà dans l'écran au montage (pas de clignotement)", () => {
    installMatchMedia(false);
    const observers = installIntersectionObserver();
    placeOnScreen();
    const { container } = render(
      <Reveal>
        <p>Au-dessus du pli</p>
      </Reveal>,
    );
    expect(container.firstElementChild).not.toHaveAttribute("data-reveal");
    expect(observers).toHaveLength(0);
  });

  it("passe de « pending » à « in » à l'entrée dans l'écran, une seule fois", () => {
    installMatchMedia(false);
    const observers = installIntersectionObserver();
    placeBelowFold();
    const { container, unmount } = render(
      <Reveal variant="fade" delay={120} threshold={0.4} data-testid="bloc">
        <p>Sous le pli</p>
      </Reveal>,
    );
    const element = container.firstElementChild as HTMLElement;
    expect(element).toHaveAttribute("data-reveal", "pending");
    expect(element).toHaveClass("m-reveal--fade");
    expect(element.style.getPropertyValue("--m-delay")).toBe("120ms");
    expect(observers).toHaveLength(1);
    expect(observers[0]?.options).toEqual({ threshold: 0.4 });
    expect(observers[0]?.observe).toHaveBeenCalledWith(element);

    observers[0]?.callback([{ isIntersecting: false }]);
    expect(element).toHaveAttribute("data-reveal", "pending");
    observers[0]?.callback([{ isIntersecting: true }]);
    expect(element).toHaveAttribute("data-reveal", "in");
    unmount();
  });

  it("numérote les enfants pour la variante stagger et accepte une autre balise", () => {
    installMatchMedia(false);
    installIntersectionObserver();
    placeBelowFold();
    const { container } = render(
      <Reveal as="ul" variant="stagger" stagger={90}>
        <li>Un</li>
        <li>Deux</li>
        <li>Trois</li>
      </Reveal>,
    );
    const list = container.firstElementChild as HTMLElement;
    expect(list.tagName).toBe("UL");
    expect(list.style.getPropertyValue("--m-stagger")).toBe("90ms");
    const items = Array.from(list.children) as HTMLElement[];
    expect(items.map((item) => item.style.getPropertyValue("--m-i"))).toEqual(["0", "1", "2"]);
  });

  it("pose pathLength=1 sur les formes d'un SVG pour la variante draw", () => {
    installMatchMedia(false);
    installIntersectionObserver();
    placeBelowFold();
    const { container } = render(
      <Reveal as="figure" variant="draw">
        <svg viewBox="0 0 10 10">
          <path d="M0 0 L10 10" />
          <path d="M0 10 L10 0" pathLength={2} />
          <circle cx="5" cy="5" r="2" />
        </svg>
      </Reveal>,
    );
    const shapes = container.querySelectorAll("path, circle");
    expect(Array.from(shapes).map((shape) => shape.getAttribute("pathLength"))).toEqual([
      "1",
      "2",
      "1",
    ]);
  });
});
