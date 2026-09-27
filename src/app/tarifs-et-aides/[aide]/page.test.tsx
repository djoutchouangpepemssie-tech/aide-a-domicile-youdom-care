import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { getAidPage, listAidPageIds } from "@/content/aid-pages";
import AidDetailPage, { generateMetadata, generateStaticParams } from "./page";

describe("Pages par aide", () => {
  it("chaque page d'aide de aides.json a sa page détaillée, et réciproquement", async () => {
    const { getAids } = await import("@/content/loader");
    const ids = getAids().aides.map((a) => a.id);
    expect([...ids].sort()).toEqual([...listAidPageIds()].sort());
    for (const aid of getAids().aides) {
      expect(aid.page).toBe(`/tarifs-et-aides/${aid.id}/`);
    }
  });

  it("expose six pages statiques valides avec des balises SEO aux bonnes longueurs", async () => {
    expect(generateStaticParams().map((p) => p.aide)).toEqual([
      "credit-d-impot-et-avance-immediate",
      "apa",
      "pch",
      "aeeh",
      "cesu",
      "aides-apres-hospitalisation",
    ]);
    for (const id of listAidPageIds()) {
      const metadata = await generateMetadata({ params: Promise.resolve({ aide: id }) });
      expect(String(metadata.title).length).toBeGreaterThanOrEqual(50);
      expect(String(metadata.title).length).toBeLessThanOrEqual(60);
      expect(String(metadata.description).length).toBeGreaterThanOrEqual(140);
      expect(String(metadata.description).length).toBeLessThanOrEqual(155);
      expect(getAidPage(id)?.sources.every((s) => s.consulte_le === "2026-09-20")).toBe(true);
    }
  });

  it("rend la page APA : montants sourcés, avertissement, démarche, sources datées", async () => {
    render(await AidDetailPage({ params: Promise.resolve({ aide: "apa" }) } as never));
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("APA à domicile");
    expect(screen.getByText("Page mise à jour le 20 septembre 2026")).toBeInTheDocument();
    expect(screen.getByRole("note", { name: "Attention" })).toHaveTextContent(
      /sources officielles/,
    );

    const combien = screen.getByRole("region", { name: "Combien ?" });
    expect(
      within(combien)
        .getAllByRole("term")
        .map((t) => t.textContent),
    ).toEqual(["GIR 1", "GIR 2", "GIR 3", "GIR 4"]);
    expect(within(combien).getByText("2 080,33 € par mois")).toBeInTheDocument();

    expect(screen.getByRole("note", { name: "À retenir" })).toBeInTheDocument();
    expect(
      within(screen.getByRole("region", { name: "La démarche, pas à pas" })).getAllByRole(
        "listitem",
      ),
    ).toHaveLength(3);

    const sources = screen.getByRole("region", { name: "Sources officielles" });
    // 27/09/2026 : les sources officielles sont nommées et datées, sans lien sortant.
    expect(sources.querySelector('a[href^="https://www.service-public"]')).toBeNull();
    expect(within(sources).getAllByText(/service-public\.gouv\.fr/).length).toBeGreaterThan(0);
    expect(within(sources).getByText(/vérifiée le 1 juin 2026/)).toBeInTheDocument();
    expect(within(sources).getByRole("link", { name: "Toutes les aides" })).toBeInTheDocument();
  });

  it("retourne des métadonnées vides pour une aide inconnue", async () => {
    expect(await generateMetadata({ params: Promise.resolve({ aide: "inconnue" }) })).toEqual({});
  });
});
