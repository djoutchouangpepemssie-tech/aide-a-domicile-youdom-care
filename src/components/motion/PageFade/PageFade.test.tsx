import { render } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MOTION_EASE_OUT } from "@/lib/motion/grid";
import { PAGE_FADE_DURATION, PageFade } from "./PageFade";

let pathname = "/";
vi.mock("next/navigation", () => ({ usePathname: () => pathname }));

interface Played {
  keyframes: unknown;
  options: KeyframeAnimationOptions;
  cancel: ReturnType<typeof vi.fn>;
  finish: () => void;
}

/** `Element.animate` de test : chaque appel est enregistré, la fin est jouée à la demande. */
function installAnimate() {
  const played: Played[] = [];
  const animate = vi.fn(function (
    this: Element,
    keyframes: unknown,
    options: KeyframeAnimationOptions,
  ) {
    const listeners = new Map<string, () => void>();
    const record: Played = {
      keyframes,
      options,
      cancel: vi.fn(() => listeners.get("cancel")?.()),
      finish: () => listeners.get("finish")?.(),
    };
    played.push(record);
    return {
      cancel: record.cancel,
      addEventListener: (type: string, listener: () => void) => listeners.set(type, listener),
    } as unknown as Animation;
  });
  Object.defineProperty(Element.prototype, "animate", {
    value: animate,
    configurable: true,
    writable: true,
  });
  return played;
}

function installMatchMedia(reduced: boolean) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockReturnValue({ matches: reduced, addEventListener: vi.fn() }),
  );
}

const main = () => document.querySelector("main") as HTMLElement;

describe("PageFade", () => {
  beforeEach(() => {
    pathname = "/";
    delete document.documentElement.dataset.comfort;
    delete document.documentElement.dataset.motion;
    document.body.innerHTML = "<header>En-tête</header><main>Contenu</main>";
  });

  afterEach(() => {
    document.body.innerHTML = "";
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    Reflect.deleteProperty(Element.prototype, "animate");
  });

  it("ne rend rien, côté serveur comme côté client", () => {
    installMatchMedia(false);
    expect(renderToString(<PageFade />)).toBe("");
    const { container } = render(<PageFade />);
    expect(container.innerHTML).toBe("");
  });

  it("ne joue aucun fondu au premier affichage (le LCP n'attend pas)", () => {
    installMatchMedia(false);
    const played = installAnimate();
    render(<PageFade />);
    expect(played).toHaveLength(0);
    expect(main().style.opacity).toBe("");
  });

  it("ne joue rien quand le chemin ne change pas (mode strict, mise à jour à chaud)", () => {
    installMatchMedia(false);
    const played = installAnimate();
    const { rerender } = render(<PageFade />);
    rerender(<PageFade />);
    rerender(<PageFade />);
    expect(played).toHaveLength(0);
    expect(main().style.opacity).toBe("");
  });

  it("fond le contenu principal au changement de page, 150 ms, opacité seule", () => {
    installMatchMedia(false);
    const played = installAnimate();
    const { rerender } = render(<PageFade />);
    pathname = "/aidants/";
    rerender(<PageFade />);

    expect(played).toHaveLength(1);
    expect(played[0]?.keyframes).toEqual({ opacity: [0, 1] });
    expect(played[0]?.options).toEqual({
      duration: PAGE_FADE_DURATION,
      easing: MOTION_EASE_OUT,
      fill: "forwards",
    });
    expect(PAGE_FADE_DURATION).toBe(150);
    // L'opacité de départ est posée avant la peinture, puis retirée à la fin.
    expect(main().style.opacity).toBe("0");
    played[0]?.finish();
    expect(main().style.opacity).toBe("");
    expect(played[0]?.cancel).toHaveBeenCalled();

    // L'en-tête n'est jamais touché.
    expect(document.querySelector("header")?.getAttribute("style")).toBeNull();
  });

  it("rend la main sans effet en mouvement réduit, en mode confort et sous la simulation", () => {
    installMatchMedia(true);
    const played = installAnimate();
    const { rerender } = render(<PageFade />);
    pathname = "/aidants/";
    rerender(<PageFade />);
    expect(played).toHaveLength(0);

    installMatchMedia(false);
    document.documentElement.dataset.comfort = "on";
    pathname = "/a-propos/";
    rerender(<PageFade />);
    expect(played).toHaveLength(0);

    delete document.documentElement.dataset.comfort;
    document.documentElement.dataset.motion = "reduce";
    pathname = "/agences/";
    rerender(<PageFade />);
    expect(played).toHaveLength(0);
    expect(main().style.opacity).toBe("");
  });

  it("rend la main sans effet là où `Element.animate` manque", () => {
    installMatchMedia(false);
    const { rerender } = render(<PageFade />);
    pathname = "/aidants/";
    expect(() => rerender(<PageFade />)).not.toThrow();
    expect(main().style.opacity).toBe("");
  });

  it("annule le fondu au démontage et ne laisse jamais `main` invisible", () => {
    installMatchMedia(false);
    const played = installAnimate();
    const { rerender, unmount } = render(<PageFade />);
    pathname = "/aidants/";
    rerender(<PageFade />);
    expect(main().style.opacity).toBe("0");
    unmount();
    expect(played[0]?.cancel).toHaveBeenCalled();
    expect(main().style.opacity).toBe("");
  });
});
