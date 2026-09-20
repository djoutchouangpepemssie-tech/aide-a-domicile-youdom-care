import { act, fireEvent, render, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FINE_POINTER_QUERY } from "@/lib/motion/pointer-tilt";
import { REDUCED_MOTION_QUERY } from "@/lib/motion/reduced-motion";
import { Tilt } from "./Tilt";

/** `matchMedia` de test : pointeur fin ou non, mouvement réduit ou non. */
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

function placeCard(element: Element) {
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
    await Promise.resolve();
    await Promise.resolve();
  });
}

function move(element: Element, clientX: number, clientY: number, pointerType = "mouse") {
  fireEvent.pointerMove(element, { clientX, clientY, pointerType });
  flush();
}

describe("Tilt", () => {
  beforeEach(() => {
    delete document.documentElement.dataset.comfort;
    delete document.documentElement.dataset.motion;
    installFrames();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("rend une carte sans transformation côté serveur", () => {
    const html = renderToString(
      <Tilt>
        <a href="#contenu">Lien</a>
      </Tilt>,
    );
    expect(html).toContain('class="m-tilt"');
    expect(html).not.toContain("style=");
    expect(html).toContain("Lien");
  });

  it("charge le moteur au premier survol, s'incline vers la souris, 6° au plus, et revient", async () => {
    installMatchMedia();
    render(
      <Tilt data-testid="carte">
        <button type="button">Action</button>
      </Tilt>,
    );
    const card = screen.getByTestId("carte");
    placeCard(card);

    // Sans survol préalable, rien n'écoute : un mouvement seul ne fait rien.
    move(card, 300, 100);
    expect(card.style.transform).toBe("");

    await enter(card);
    fireEvent.pointerMove(card, { clientX: 100, clientY: 100, pointerType: "mouse" });
    fireEvent.pointerMove(card, { clientX: 300, clientY: 100, pointerType: "mouse" });
    expect(queue).toHaveLength(1); // deux mouvements, une seule image demandée
    flush(); // coin haut droit
    expect(card.dataset.tilt).toBe("active");
    expect(card.style.transform).toBe("perspective(800px) rotateX(6.00deg) rotateY(6.00deg)");

    move(card, 100, 200); // coin bas gauche
    expect(card.style.transform).toBe("perspective(800px) rotateX(-6.00deg) rotateY(-6.00deg)");

    move(card, 900, -500); // hors de la carte : borné
    expect(card.style.transform).toBe("perspective(800px) rotateX(6.00deg) rotateY(6.00deg)");

    fireEvent.pointerLeave(card);
    expect(card.dataset.tilt).toBeUndefined();
    expect(card.style.transform).toBe("");
    expect(screen.getByRole("button", { name: "Action" })).toBeVisible();
  });

  it("respecte une limite plus basse et l'ignore au-delà de 6°", async () => {
    installMatchMedia();
    const { rerender } = render(<Tilt data-testid="carte" max={3} />);
    const card = screen.getByTestId("carte");
    placeCard(card);
    await enter(card);
    move(card, 300, 100);
    expect(card.style.transform).toBe("perspective(800px) rotateX(3.00deg) rotateY(3.00deg)");
    rerender(<Tilt data-testid="carte" max={45} />);
    // Le moteur posé au premier survol garde sa limite ; une nouvelle carte plafonne à 6°.
    const { getByTestId } = render(<Tilt data-testid="autre" max={45} />);
    const other = getByTestId("autre");
    placeCard(other);
    await enter(other);
    move(other, 300, 100);
    expect(other.style.transform).toBe("perspective(800px) rotateX(6.00deg) rotateY(6.00deg)");
  });

  it("ne réagit ni au toucher, ni au stylet, ni sans pointeur fin, ni en mouvement réduit, ni au clavier", async () => {
    installMatchMedia();
    render(
      <Tilt data-testid="carte">
        <a href="#contenu">Lien</a>
      </Tilt>,
    );
    const card = screen.getByTestId("carte");
    placeCard(card);
    await enter(card, "touch");
    move(card, 300, 100, "touch");
    await enter(card, "pen");
    move(card, 300, 100, "pen");
    expect(card.style.transform).toBe("");

    screen.getByRole("link").focus();
    expect(card.style.transform).toBe("");

    document.documentElement.dataset.comfort = "on";
    await enter(card);
    move(card, 300, 100);
    expect(card.style.transform).toBe("");
    delete document.documentElement.dataset.comfort;

    installMatchMedia({ reduced: true });
    await enter(card);
    move(card, 300, 100);
    expect(card.style.transform).toBe("");

    installMatchMedia({ fine: false });
    await enter(card);
    move(card, 300, 100);
    expect(card.style.transform).toBe("");
  });

  it("un changement de réglage coupe un moteur déjà chargé", async () => {
    installMatchMedia();
    render(<Tilt data-testid="carte" />);
    const card = screen.getByTestId("carte");
    placeCard(card);
    await enter(card);
    move(card, 300, 100);
    expect(card.style.transform).not.toBe("");
    fireEvent.pointerLeave(card);
    document.documentElement.dataset.motion = "reduce";
    move(card, 300, 100);
    expect(card.style.transform).toBe("");
  });

  it("accepte une balise de liste", () => {
    render(
      <ul>
        <Tilt as="li">Élément</Tilt>
      </ul>,
    );
    expect(screen.getByRole("listitem")).toHaveClass("m-tilt");
  });
});
