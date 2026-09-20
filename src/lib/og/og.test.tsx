import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { threadIllustrations } from "@/components/ui/Thread/illustrations";
import { fetchGoogleFont, pickTrueTypeUrl, readLocalFont } from "./fonts";
import { OG_COLORS, OgCard, titleFontSize } from "./OgCard";
import { serviceOgImagePath } from "./paths";

const CSS = `
@font-face { font-family: 'Fraunces'; font-weight: 500; src: url(https://fonts.gstatic.com/a.ttf) format('truetype'); }
@font-face { font-family: 'Fraunces'; font-weight: 600; src: url(https://fonts.gstatic.com/b.ttf) format('truetype'); }
`;

describe("carte Open Graph", () => {
  it("adapte la taille du titre à sa longueur, quatre paliers", () => {
    expect(titleFontSize("Court")).toBe(76);
    expect(titleFontSize("a".repeat(60))).toBe(64);
    expect(titleFontSize("a".repeat(90))).toBe(54);
    expect(titleFontSize("a".repeat(140))).toBe(46);
  });

  it("donne l'adresse /og/{chemin}/ de l'image d'une page service", () => {
    expect(serviceOgImagePath("/aidants/")).toBe("/og/aidants/");
    expect(serviceOgImagePath("/maladies-neurodegeneratives/alzheimer/")).toBe(
      "/og/maladies-neurodegeneratives/alzheimer/",
    );
    expect(serviceOgImagePath("aidants")).toBe("/og/aidants/");
    expect(serviceOgImagePath("/")).toBe("/og/");
  });

  it("compose fond papier, titre, marque, signature et fil avec son nœud", () => {
    const html = renderToStaticMarkup(
      <OgCard
        title="Comment ça marche"
        brand="Youdom Care"
        signature="Vous, chez vous. Nous, à vos côtés."
        illustration="tasse"
        fontFamily="Fraunces"
      />,
    );
    expect(html).toContain("Comment ça marche");
    expect(html).toContain("Youdom Care");
    expect(html).toContain("Vous, chez vous. Nous, à vos côtés.");
    expect(html).toContain(`background:${OG_COLORS.paper}`);
    expect(html).toContain(`stroke="${OG_COLORS.teal700}"`);
    expect(html).toContain(`stroke="${OG_COLORS.raspberry500}"`);
    expect(html).toContain(`d="${threadIllustrations.tasse.main}"`);
    expect(html).toContain(`d="${threadIllustrations.tasse.knot}"`);
    expect(html).toContain("font-family:Fraunces");
  });
});

describe("police Open Graph", () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(os.tmpdir(), "og-fonts-"));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("choisit le TTF de la graisse 600 dans la feuille de Google Fonts", () => {
    expect(pickTrueTypeUrl(CSS)).toBe("https://fonts.gstatic.com/b.ttf");
    expect(pickTrueTypeUrl(CSS, 500)).toBe("https://fonts.gstatic.com/a.ttf");
    expect(pickTrueTypeUrl(CSS, 700)).toBe("https://fonts.gstatic.com/a.ttf");
    expect(pickTrueTypeUrl("rien")).toBeNull();
  });

  it("lit un fichier Fraunces de public/fonts s'il existe", async () => {
    expect(await readLocalFont(path.join(dir, "absent"))).toBeNull();
    expect(await readLocalFont(dir)).toBeNull();
    await writeFile(path.join(dir, "Fraunces-Variable.ttf"), Buffer.from([1, 2, 3]));
    const data = await readLocalFont(dir);
    expect(data).not.toBeNull();
    expect(new Uint8Array(data ?? new ArrayBuffer(0))).toEqual(new Uint8Array([1, 2, 3]));
  });

  it("télécharge le TTF via la feuille de style, et renvoie null hors ligne", async () => {
    const online = vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      if (url.startsWith("https://fonts.googleapis.com/")) return new Response(CSS);
      return new Response(new Uint8Array([9, 9]));
    }) as unknown as typeof fetch;
    const data = await fetchGoogleFont(online);
    expect(new Uint8Array(data ?? new ArrayBuffer(0))).toEqual(new Uint8Array([9, 9]));
    expect(vi.mocked(online).mock.calls[1]?.[0]).toBe("https://fonts.gstatic.com/b.ttf");

    const offline = vi.fn(async () => {
      throw new Error("ENOTFOUND");
    }) as unknown as typeof fetch;
    expect(await fetchGoogleFont(offline)).toBeNull();
  });
});
