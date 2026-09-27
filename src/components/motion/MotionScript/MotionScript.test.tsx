import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { PAGE_THREAD_EXCLUDED } from "@/lib/motion/page-thread";
import { MotionScript } from "./MotionScript";

vi.mock("next/navigation", () => ({ usePathname: () => "/" }));

/*
 * L'amorce du mouvement : le script en ligne (deux signaux sur `<html>`) et le fondu de page, qui
 * ne rend rien. Ni l'un ni l'autre n'écrit de contenu visible : le HTML du layout reste complet.
 */

describe("MotionScript", () => {
  it("pose `data-js` et n'ajoute aucun contenu visible", () => {
    const html = renderToString(<MotionScript />);
    expect(html).toContain('d.dataset.js=""');
    expect(html.startsWith("<script>")).toBe(true);
    expect(html.endsWith("</script>")).toBe(true);
  });

  it("coupe le fil conducteur sur les chemins exclus, avant le premier rendu", () => {
    const html = renderToString(<MotionScript />);
    for (const prefix of PAGE_THREAD_EXCLUDED) {
      expect(html).toContain(prefix.replace(/\//g, "\\/"));
    }
    expect(html).toContain('d.dataset.pthread="off"');
  });

  it("reste un script court (budget)", () => {
    const html = renderToString(<MotionScript />);
    const script = html.replace(/^<script>|<\/script>$/g, "");
    expect(script.length).toBeLessThan(220);
  });
});
