import { act, render } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PhotoFigure } from "@/components/ui/PhotoFigure/PhotoFigure";
import { HeroThread, measureReach } from "./HeroThread";
import { heroThreadNames, heroThreads, parseKnot } from "./hero-threads";

function installMatchMedia(reduced: boolean) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockReturnValue({ matches: reduced, addEventListener: vi.fn() }),
  );
}

const queue: FrameRequestCallback[] = [];
function installFrames() {
  queue.length = 0;
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    queue.push(callback);
    return queue.length;
  });
  vi.stubGlobal("cancelAnimationFrame", vi.fn());
}
const flush = () => act(() => queue.splice(0).forEach((callback) => callback(0)));

const rect = (left: number, top: number, width: number, height: number): DOMRect =>
  ({
    left,
    top,
    width,
    height,
    right: left + width,
    bottom: top + height,
    x: left,
    y: top,
    toJSON: () => ({}),
  }) as DOMRect;

/** jsdom n'a pas `Range.getBoundingClientRect` : on le fournit, boîte du dernier mot du H1. */
function placeLastWord(box: DOMRect) {
  Object.defineProperty(Range.prototype, "getBoundingClientRect", {
    value: () => box,
    configurable: true,
    writable: true,
  });
}

function mountHero() {
  return render(
    <div className="hero">
      <h1>
        <span>Vivre chez soi, bien accompagné. </span>
        <span>Même quand la maladie compliquent tout.</span>
      </h1>
      <HeroThread fil="bras-lies" knot="60% 40%">
        <PhotoFigure src="/images/exemples/exemple-hero.jpg" alt="Une pièce claire" ratio="4:5" />
      </HeroThread>
    </div>,
  );
}

describe("HeroThread", () => {
  beforeEach(() => {
    delete document.documentElement.dataset.comfort;
    delete document.documentElement.dataset.motion;
    installFrames();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    delete (Range.prototype as { getBoundingClientRect?: unknown }).getBoundingClientRect;
  });

  it("cinq géométries, ouvertes, qui finissent toutes sur le nœud", () => {
    expect(heroThreadNames).toEqual(["generique", "bras-lies", "main-qui-fait", "album", "tasse"]);
    for (const name of heroThreadNames) {
      const d = heroThreads[name].main(60, 40);
      expect(d, name).not.toMatch(/z/i);
      expect(d, name).toMatch(/^M-3 16/);
    }
    expect(parseKnot("62% 48%")).toEqual([62, 48]);
    expect(parseKnot(undefined)).toEqual([50, 50]);
    expect(parseKnot("cover")).toEqual([50, 50]);
    expect(parseKnot("1% 120%")).toEqual([8, 92]);
  });

  it("rend côté serveur un fil complet, décoratif, en trois couches, avec la photo", () => {
    const html = renderToString(
      <HeroThread fil="tasse" knot="40% 30%" tone="dark">
        <PhotoFigure
          src="/images/exemples/exemple-hero.jpg"
          alt="Une lampe allumée dans un couloir"
          ratio="4:5"
        />
      </HeroThread>,
    );
    expect(html).toContain('data-state="idle"');
    expect(html).toContain('data-fil="tasse"');
    expect(html).toContain("text-white");
    expect(html).toContain('class="m-depth__stage"');
    expect(html).toContain('class="hero-thread__fil"');
    expect(html).toContain("hero-thread__knot text-raspberry-500");
    expect(html).toContain("left:40%;top:30%");
    expect(html).toContain('class="hero-thread__reach"');
    expect(html).toContain('alt="Une lampe allumée dans un couloir"');
    expect(html).not.toContain("<title");
  });

  it("mesure le dernier mot du H1 et le relie à l'entrée du contour", () => {
    const { container } = mountHero();
    const root = container.querySelector<HTMLElement>(".hero-thread");
    if (!root) throw new Error("fil absent");
    expect(measureReach(root)).toBeNull(); // rien de mesurable : pas de trait
    vi.spyOn(root, "getBoundingClientRect").mockReturnValue(rect(600, 100, 400, 500));
    placeLastWord(rect(400, 120, 80, 40));
    // Soulignement de (400, 164) à (480, 164) → unités : x −50 → −30, y 12,8 ; l'entrée descend à
    // la hauteur du mot (16,8) et le trait y arrive en tournant vers le bas.
    expect(measureReach(root)).toEqual({
      d: "M-50 12.8H-30C-16.5 12.8 -3 12.8 -3 16.8",
      entryY: 16.8,
    });
    // Le contour repart de cette hauteur.
    expect(heroThreads.generique.main(60, 40, 16.8)).toMatch(/^M-3 16\.8C-6 38\.8 -6 68 -3 90/);

    // Mobile : le mot est au-dessus de la bande, la courbe descend en S vers l'entrée par défaut.
    vi.spyOn(root, "getBoundingClientRect").mockReturnValue(rect(20, 300, 335, 188));
    placeLastWord(rect(120, 200, 80, 40));
    expect(measureReach(root)).toEqual({
      d: "M29.9 -29.8H53.7C53.7 -6.9 -3 -6.9 -3 16",
      entryY: 16,
    });
  });

  it("se trace une fois la photo chargée, hors mouvement réduit", () => {
    installMatchMedia(false);
    const { container } = mountHero();
    const root = container.querySelector<HTMLElement>(".hero-thread");
    expect(root).toHaveAttribute("data-state", "idle");
    const photo = container.querySelector("img");
    act(() => {
      photo?.dispatchEvent(new Event("load"));
    });
    flush();
    flush();
    expect(root).toHaveAttribute("data-state", "drawn");
  });

  it("reste affiché d'emblée en mouvement réduit et en mode confort", () => {
    installMatchMedia(true);
    const first = mountHero();
    flush();
    flush();
    expect(first.container.querySelector(".hero-thread")).toHaveAttribute("data-state", "idle");
    first.unmount();

    installMatchMedia(false);
    document.documentElement.dataset.comfort = "on";
    const second = mountHero();
    flush();
    flush();
    expect(second.container.querySelector(".hero-thread")).toHaveAttribute("data-state", "idle");
  });
});
