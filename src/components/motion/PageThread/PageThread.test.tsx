import { act, fireEvent, render, waitFor } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { isPageThreadExcluded, PAGE_THREAD_EXCLUDED } from "@/lib/motion/page-thread";
import { PageThread } from "./PageThread";
import { measurePage, PageThreadEngine } from "./PageThreadEngine";

let pathname = "/personnes-agees/";
vi.mock("next/navigation", () => ({ usePathname: () => pathname }));

function installMatchMedia(wide: boolean) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockReturnValue({
      matches: wide,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }),
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

/** jsdom ne mesure rien : chaque élément déclare sa boîte par `data-rect="top,height"`. */
function installRects() {
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(function (this: Element) {
    const [top = 0, height = 0, width = 600] = (this.getAttribute("data-rect") ?? "0,0")
      .split(",")
      .map(Number);
    return {
      top,
      height,
      width,
      left: 0,
      right: width,
      bottom: top + height,
      x: 0,
      y: top,
      toJSON: () => ({}),
    };
  });
}

function mountPage() {
  document.body.innerHTML = `
    <main data-rect="80,2000">
      <h2 data-rect="300,48">Premier</h2>
      <h2 data-rect="900,96" style="line-height:48px">Deuxième, sur deux lignes</h2>
      <h2 data-rect="1200,1,1" class="sr-only">Titre masqué</h2>
      <details><h2 data-rect="0,0,0">Replié</h2></details>
    </main>`;
}

describe("PageThreadEngine", () => {
  beforeEach(() => {
    installFrames();
    installRects();
    vi.stubGlobal("ResizeObserver", undefined);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    document.body.innerHTML = "";
    delete document.documentElement.dataset.pthread;
  });

  it("mesure `main` et pose un nœud par H2 visible, au milieu de sa première ligne", () => {
    installMatchMedia(true);
    mountPage();
    expect(measurePage("main", "h2")).toEqual({
      top: 80,
      height: 2000,
      below: 0,
      knots: [244, 844],
    });
    const { container } = render(<PageThreadEngine root="main" headings="h2" />);
    expect(container.querySelector(".m-pthread")).toBeNull();
    flush();
    const thread = container.querySelector<HTMLElement>(".m-pthread");
    expect(thread).toHaveAttribute("aria-hidden", "true");
    expect(thread).toHaveAttribute("data-knots", "2");
    expect(thread?.style.getPropertyValue("--m-pt-top")).toBe("80px");
    expect(thread?.style.getPropertyValue("--m-pt-height")).toBe("2000px");
    expect(thread?.style.getPropertyValue("--m-pt-below")).toBe("0px");
    expect(container.querySelector(".m-pthread__line")).not.toBeNull();
    const knots = container.querySelectorAll<HTMLElement>(".m-pthread__knot");
    expect(knots).toHaveLength(2);
    expect(knots[0]?.style.top).toBe("244px");
    expect(knots[1]?.style.top).toBe("844px");
    // Nœud ouvert, jamais fermé ; le trait statique de la coquille est retiré.
    expect(knots[0]?.querySelector("path")?.getAttribute("d")).not.toMatch(/z/i);
    expect(document.documentElement.dataset.pthread).toBe("on");
  });

  it("ne mesure rien sous 64 rem", () => {
    installMatchMedia(false);
    mountPage();
    const { container } = render(<PageThreadEngine root="main" headings="h2" />);
    flush();
    expect(container.querySelector(".m-pthread")).toBeNull();
    expect(document.documentElement.dataset.pthread).toBeUndefined();
  });
});

describe("PageThread (coquille)", () => {
  beforeEach(() => {
    pathname = "/personnes-agees/";
    installRects();
    vi.stubGlobal("ResizeObserver", undefined);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    document.body.innerHTML = "";
    delete document.documentElement.dataset.pthread;
  });

  it("ne rend rien côté serveur ni avant un signe d'usage", () => {
    expect(renderToString(<PageThread />)).toBe("");
    installMatchMedia(true);
    mountPage();
    const { container } = render(<PageThread />);
    expect(container.innerHTML).toBe("");
  });

  it("charge le moteur au premier défilement, sur un écran large seulement", async () => {
    installMatchMedia(true);
    mountPage();
    const { container } = render(<PageThread />);
    fireEvent.scroll(window);
    await waitFor(() => expect(container.querySelector(".m-pthread")).not.toBeNull());
    expect(container.querySelector(".m-pthread")).toHaveAttribute("data-knots", "2");

    installMatchMedia(false);
    const narrow = render(<PageThread />);
    fireEvent.scroll(window);
    fireEvent.pointerMove(window);
    await act(async () => {
      await Promise.resolve();
    });
    expect(narrow.container.innerHTML).toBe("");
  });

  it("se retire sur le styleguide et les pages de formulaire (data-pthread=off), sauf exclusion vide", async () => {
    installMatchMedia(true);
    mountPage();
    expect(PAGE_THREAD_EXCLUDED).toEqual([
      "/styleguide/",
      "/demande/",
      "/etre-rappele/",
      "/contact/",
    ]);
    expect(isPageThreadExcluded("/demande/sortie-d-hospitalisation/")).toBe(true);
    expect(isPageThreadExcluded("/aidants/")).toBe(false);
    for (const path of ["/styleguide/mouvement/", "/demande/", "/etre-rappele/", "/contact/"]) {
      pathname = path;
      const { container, unmount } = render(<PageThread />);
      fireEvent.scroll(window);
      expect(container.innerHTML, path).toBe("");
      expect(document.documentElement.dataset.pthread, path).toBe("off");
      unmount();
      expect(document.documentElement.dataset.pthread).toBeUndefined();
    }
    pathname = "/styleguide/mouvement/";
    const { container } = render(<PageThread exclude={[]} headings="h2" eager />);
    await waitFor(() => expect(container.querySelector(".m-pthread")).not.toBeNull());
  });
});
