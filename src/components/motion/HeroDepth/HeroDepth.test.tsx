import { act, fireEvent, render, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FINE_POINTER_QUERY } from "@/lib/motion/pointer-tilt";
import { REDUCED_MOTION_QUERY } from "@/lib/motion/reduced-motion";
import { DEPTH_MAX_DEGREES, HeroDepth } from "./HeroDepth";

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
    width: 400,
    height: 500,
    bottom: 600,
    right: 500,
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

const stageOf = (box: HTMLElement) => box.querySelector<HTMLElement>(".m-depth__stage");

describe("HeroDepth", () => {
  beforeEach(() => {
    delete document.documentElement.dataset.comfort;
    delete document.documentElement.dataset.motion;
    installFrames();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("rend la scène à plat côté serveur, enfants intacts", () => {
    const html = renderToString(
      <HeroDepth>
        <span className="photo-figure">Photo</span>
      </HeroDepth>,
    );
    expect(html).toContain('class="m-depth"');
    expect(html).toContain('class="m-depth__stage"');
    expect(html).toContain('data-max-deg="4"');
    expect(html).not.toContain("--rx");
    expect(html).toContain('<span class="photo-figure">Photo</span>');
  });

  it("charge le moteur au premier survol, pivote vers la souris (4° au plus) et revient", async () => {
    installMatchMedia();
    render(
      <HeroDepth data-testid="scene">
        <a href="#contenu">Lien</a>
      </HeroDepth>,
    );
    const box = screen.getByTestId("scene");
    const stage = stageOf(box);
    placeBox(box);
    expect(DEPTH_MAX_DEGREES).toBe(4);

    move(box, 500, 100); // sans survol préalable : rien n'écoute
    expect(stage?.style.getPropertyValue("--ry")).toBe("");

    await enter(box);
    fireEvent.pointerMove(box, { clientX: 100, clientY: 100, pointerType: "mouse" });
    fireEvent.pointerMove(box, { clientX: 500, clientY: 100, pointerType: "mouse" });
    expect(queue).toHaveLength(1); // deux mouvements, une seule image demandée
    flush(); // coin haut droit
    expect(stage?.dataset.depth).toBe("active");
    expect(stage?.style.getPropertyValue("--rx")).toBe("4.00deg");
    expect(stage?.style.getPropertyValue("--ry")).toBe("4.00deg");

    move(box, 100, 600); // coin bas gauche
    expect(stage?.style.getPropertyValue("--rx")).toBe("-4.00deg");
    expect(stage?.style.getPropertyValue("--ry")).toBe("-4.00deg");

    move(box, 2000, -900); // hors de la boîte : borné
    expect(stage?.style.getPropertyValue("--ry")).toBe("4.00deg");

    fireEvent.pointerLeave(box);
    expect(stage?.dataset.depth).toBeUndefined();
    expect(stage?.style.getPropertyValue("--rx")).toBe("");
    expect(screen.getByRole("link", { name: "Lien" })).toBeVisible();
  });

  it("respecte une limite plus basse (aidants, 2°) et 0 désactive tout", async () => {
    installMatchMedia();
    render(<HeroDepth data-testid="deux" maxDeg={2} />);
    const two = screen.getByTestId("deux");
    placeBox(two);
    await enter(two);
    move(two, 500, 100);
    expect(stageOf(two)?.style.getPropertyValue("--ry")).toBe("2.00deg");
    expect(two).toHaveAttribute("data-max-deg", "2");

    render(<HeroDepth data-testid="zero" maxDeg={0} />);
    const zero = screen.getByTestId("zero");
    placeBox(zero);
    expect(zero).toHaveAttribute("data-max-deg", "0");
    await enter(zero);
    move(zero, 500, 100);
    expect(stageOf(zero)?.style.getPropertyValue("--ry")).toBe("");
    expect(stageOf(zero)?.dataset.depth).toBeUndefined();

    render(<HeroDepth data-testid="trop" maxDeg={40} />);
    const capped = screen.getByTestId("trop");
    placeBox(capped);
    await enter(capped);
    move(capped, 500, 100);
    expect(stageOf(capped)?.style.getPropertyValue("--ry")).toBe("4.00deg");
  });

  it("ne réagit ni au toucher, ni au stylet, ni sans pointeur fin, ni en mouvement réduit, ni au clavier", async () => {
    installMatchMedia();
    render(
      <HeroDepth data-testid="scene">
        <a href="#contenu">Lien</a>
      </HeroDepth>,
    );
    const box = screen.getByTestId("scene");
    const stage = stageOf(box);
    placeBox(box);
    await enter(box, "touch");
    move(box, 500, 100, "touch");
    await enter(box, "pen");
    move(box, 500, 100, "pen");
    expect(stage?.style.getPropertyValue("--ry")).toBe("");

    screen.getByRole("link").focus();
    expect(stage?.style.getPropertyValue("--ry")).toBe("");

    document.documentElement.dataset.comfort = "on";
    await enter(box);
    move(box, 500, 100);
    expect(stage?.style.getPropertyValue("--ry")).toBe("");
    delete document.documentElement.dataset.comfort;

    installMatchMedia({ reduced: true });
    await enter(box);
    move(box, 500, 100);
    expect(stage?.style.getPropertyValue("--ry")).toBe("");

    installMatchMedia({ fine: false });
    await enter(box);
    move(box, 500, 100);
    expect(stage?.style.getPropertyValue("--ry")).toBe("");
  });
});
