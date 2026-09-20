import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { getInterfaceTexts } from "@/content/loader";
import { listServicePages } from "@/content/services";
import { RELATED_MAX, RELATED_MIN } from "@/lib/seo/related";
import { ServiceRelated } from "./ServiceRelated";

/* Composant serveur asynchrone : on attend son rendu, comme la page d'accueil dans page.test.tsx. */

describe("ServiceRelated", () => {
  it("calcule « À lire aussi » d'une page réelle à partir des pages construites", async () => {
    const pages = await listServicePages();
    const alzheimer = pages.find(
      (p) => p.meta.chemin === "/maladies-neurodegeneratives/alzheimer/",
    );
    if (!alzheimer) throw new Error("page Alzheimer absente");
    const texts = getInterfaceTexts();
    render(await ServiceRelated({ page: alzheimer.meta, texts: texts.service }));
    const nav = screen.getByRole("navigation", { name: "À lire aussi" });
    const links = within(nav).getAllByRole("link");
    expect(links.length).toBeGreaterThanOrEqual(RELATED_MIN);
    expect(links.length).toBeLessThanOrEqual(RELATED_MAX);
    const hrefs = links.map((link) => link.getAttribute("href") ?? "");
    expect(hrefs).not.toContain("/maladies-neurodegeneratives/alzheimer/");
    // Les sœurs déclarées (Parkinson, corps de Lewy) sont là, avec leurs icônes.
    expect(hrefs.some((href) => /parkinson/.test(href))).toBe(true);
    expect(hrefs.some((href) => /corps-de-lewy/.test(href))).toBe(true);
    expect(
      within(nav).getByRole("link", { name: "Parkinson" }).querySelector("[data-icon]"),
    ).not.toBeNull();
  }, 60_000);
});
