import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { getFormDefinitionBySlug, listFormDefinitions } from "@/content/form-definitions";
import RequestPage, {
  generateMetadata as requestMetadata,
  generateStaticParams,
} from "./[cas]/page";
import RequestIndexPage, { generateMetadata as indexMetadata } from "./page";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  notFound: () => {
    throw new Error("notFound");
  },
}));

function expectSeo(metadata: { title?: unknown; description?: unknown }) {
  expect(String(metadata.title).length).toBeGreaterThanOrEqual(50);
  expect(String(metadata.title).length).toBeLessThanOrEqual(60);
  expect(String(metadata.description).length).toBeGreaterThanOrEqual(140);
  expect(String(metadata.description).length).toBeLessThanOrEqual(155);
}

describe("Pages de demande", () => {
  it("connaît les deux formulaires de P3.6 avec des balises SEO aux bonnes longueurs", async () => {
    expect(listFormDefinitions().map((d) => d.slug)).toEqual([
      "maladie-neurodegenerative",
      "personne-agee",
      "adulte-handicap",
      "enfant-handicap",
      "relais-aidant",
      "nuit-et-24h",
    ]);
    expect(generateStaticParams()).toHaveLength(6);
    expect(getFormDefinitionBySlug("inconnu")).toBeNull();
    expectSeo(indexMetadata());
    for (const definition of listFormDefinitions()) {
      expectSeo(
        await requestMetadata({
          params: Promise.resolve({ cas: definition.slug }),
        }),
      );
    }
  });

  it("liste les cas disponibles et propose le rappel", () => {
    render(<RequestIndexPage />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Décrire votre situation");
    expect(screen.getByRole("link", { name: /Maladie neurodégénérative/ })).toHaveAttribute(
      "href",
      expect.stringMatching(/^\/demande\/maladie-neurodegenerative\/?$/),
    );
    expect(screen.getByRole("link", { name: "Être rappelé(e)" })).toBeInTheDocument();
  });

  it("rend un formulaire détaillé et refuse un cas inconnu", async () => {
    render(
      await RequestPage({
        params: Promise.resolve({ cas: "personne-agee" }),
      }),
    );
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("personne âgée");
    expect(screen.getByRole("form")).toBeInTheDocument();
    await expect(
      RequestPage({
        params: Promise.resolve({ cas: "inconnu" }),
      }),
    ).rejects.toThrow("notFound");
  });
});
