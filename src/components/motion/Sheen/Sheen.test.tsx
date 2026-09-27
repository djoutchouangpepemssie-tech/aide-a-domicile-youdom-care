import { act, fireEvent, render, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetFrames } from "@/lib/motion/frame";
import { FINE_POINTER_QUERY } from "@/lib/motion/grid";
import { REDUCED_MOTION_QUERY } from "@/lib/motion/reduced-motion";
import { Sheen } from "./Sheen";

function installMatchMedia({ fine = true, reduced = false } = {}) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn((query: string) => ({
      matches:
        query === FINE_POINTER_QUERY ? fine : query === REDUCED_MOTION_QUERY ? reduced : false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
}

/** Comme un navigateur : l'image est jouée après le gestionnaire, jamais pendant. */
const queue: FrameRequestCallback[] = [];
function installFrames() {
  queue.length = 0;
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    queue.push(callback);
    return queue.length;
  });
  vi.stubGlobal("cancelAnimationFrame", vi.fn());
}
const flush = () => queue.splice(0).forEach((callback) => callback(0));

function placeBox(element: Element) {
  vi.spyOn(element, "getBoundingClientRect").mockReturnValue({
    top: 100,
    left: 100,
    width: 200,
    height: 100,
    bottom: 200,
    right: 300,
    x: 100,
    y: 100,
    toJSON: () => ({}),
  });
}

/** Premier survol : l'île charge le moteur (import dynamique), on attend qu'il soit posé. */
async function enter(element: Element, pointerType = "mouse") {
  fireEvent.pointerEnter(element, { pointerType });
  await act(async () => {
    // Le moteur est chargé à la demande : on attend le même module que l'île.
    await import("@/lib/motion/pointer");
    await Promise.resolve();
    await Promise.resolve();
  });
}

function move(element: Element, clientX: number, clientY: number, pointerType = "mouse") {
  fireEvent.pointerMove(element, { clientX, clientY, pointerType });
  flush();
}

const vars = (element: HTMLElement) => [
  element.style.getPropertyValue("--sheen-x"),
  element.style.getPropertyValue("--sheen-y"),
];

describe("Sheen", () => {
  beforeEach(() => {
    delete document.documentElement.dataset.comfort;
    delete document.documentElement.dataset.motion;
    resetFrames();
    installFrames();
  });

  afterEach(() => {
    resetFrames();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("rend la surface sans style côté serveur (le verre est au design system)", () => {
    const html = renderToString(
      <Sheen className="glass glass-sheen">
        <a href="#contenu">Lien</a>
      </Sheen>,
    );
    expect(html).toContain('class="m-sheen glass glass-sheen"');
    expect(html).not.toContain("style=");
    expect(html).not.toContain("data-sheen");
  });

  it("suit le pointeur en pourcentage de la boîte et s'éteint à la sortie", async () => {
    installMatchMedia();
    render(
      <Sheen data-testid="carte" className="glass-sheen">
        <button type="button">Action</button>
      </Sheen>,
    );
    const card = screen.getByTestId("carte");
    placeBox(card);

    // Sans survol préalable, rien n'écoute.
    move(card, 200, 150);
    expect(vars(card)).toEqual(["", ""]);

    await enter(card);
    fireEvent.pointerMove(card, { clientX: 150, clientY: 125, pointerType: "mouse" });
    fireEvent.pointerMove(card, { clientX: 200, clientY: 150, pointerType: "mouse" });
    expect(queue).toHaveLength(1); // deux mouvements, une seule image demandée
    flush();
    expect(card.dataset.sheen).toBe("active");
    expect(vars(card)).toEqual(["50.0%", "50.0%"]);

    move(card, 300, 100); // coin haut droit
    expect(vars(card)).toEqual(["100.0%", "0.0%"]);

    move(card, 900, -500); // hors de la boîte : borné
    expect(vars(card)).toEqual(["100.0%", "0.0%"]);

    fireEvent.pointerLeave(card);
    expect(card.dataset.sheen).toBeUndefined();
    expect(vars(card)).toEqual(["", ""]);
    expect(screen.getByRole("button", { name: "Action" })).toBeVisible();
  });

  it("s'éteint dès qu'un élément prend le focus au clavier", async () => {
    installMatchMedia();
    render(
      <Sheen data-testid="carte">
        <a href="#contenu">Lien</a>
      </Sheen>,
    );
    const card = screen.getByTestId("carte");
    placeBox(card);
    await enter(card);
    move(card, 200, 150);
    expect(card.dataset.sheen).toBe("active");
    screen.getByRole("link").focus();
    expect(card.dataset.sheen).toBeUndefined();
    expect(vars(card)).toEqual(["", ""]);
  });

  it("ne réagit ni au toucher, ni au stylet, ni sans pointeur fin, ni en mouvement réduit", async () => {
    installMatchMedia();
    render(<Sheen data-testid="carte" />);
    const card = screen.getByTestId("carte");
    placeBox(card);
    await enter(card, "touch");
    move(card, 200, 150, "touch");
    await enter(card, "pen");
    move(card, 200, 150, "pen");
    expect(vars(card)).toEqual(["", ""]);

    document.documentElement.dataset.comfort = "on";
    await enter(card);
    move(card, 200, 150);
    expect(vars(card)).toEqual(["", ""]);
    delete document.documentElement.dataset.comfort;

    installMatchMedia({ reduced: true });
    await enter(card);
    move(card, 200, 150);
    expect(vars(card)).toEqual(["", ""]);

    installMatchMedia({ fine: false });
    await enter(card);
    move(card, 200, 150);
    expect(vars(card)).toEqual(["", ""]);
  });

  it("retire ses écouteurs au démontage", async () => {
    installMatchMedia();
    const { unmount } = render(<Sheen data-testid="carte" />);
    const card = screen.getByTestId("carte");
    placeBox(card);
    await enter(card);
    move(card, 200, 150);
    expect(card.dataset.sheen).toBe("active");
    unmount();
    move(card, 300, 100);
    expect(card.dataset.sheen).toBeUndefined();
  });
});
