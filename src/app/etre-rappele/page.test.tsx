import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import CallbackPage, { generateMetadata } from "./page";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

describe("Page être rappelé(e)", () => {
  it("a des balises SEO aux bonnes longueurs et une canonique", () => {
    const metadata = generateMetadata();
    expect(String(metadata.title).length).toBeGreaterThanOrEqual(50);
    expect(String(metadata.title).length).toBeLessThanOrEqual(60);
    expect(String(metadata.description).length).toBeGreaterThanOrEqual(140);
    expect(String(metadata.description).length).toBeLessThanOrEqual(155);
    expect(metadata.alternates?.canonical).toBe("/etre-rappele/");
  });

  it("rend le titre, le formulaire et le téléphone, sans message de motif", async () => {
    window.history.replaceState({}, "", "/etre-rappele/");
    render(<CallbackPage />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("trente secondes");
    expect(screen.getByRole("form")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /01.84.80.17.03/ })).toHaveAttribute(
      "href",
      "tel:+33184801703",
    );
    expect(screen.queryByText(/C'est normal/)).toBeNull();
    expect(document.querySelector("[data-motif]")).toBeNull();
  });

  it("affiche le message du motif « inconnu » au-dessus du formulaire, et rien pour un motif inconnu", () => {
    window.history.replaceState({}, "", "/etre-rappele/?motif=inconnu");
    const { unmount } = render(<CallbackPage />);
    const notice = screen.getByText(
      "Vous ne savez pas encore de quoi vous avez besoin ? C'est normal : l'évaluation à domicile, gratuite, sert à cela.",
    );
    expect(notice).toHaveAttribute("data-motif", "inconnu");
    // Le message précède le formulaire dans l'ordre de lecture.
    const form = screen.getByRole("form");
    expect(notice.compareDocumentPosition(form) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    unmount();

    window.history.replaceState({}, "", "/etre-rappele/?motif=autre");
    render(<CallbackPage />);
    expect(document.querySelector("[data-motif]")).toBeNull();
    window.history.replaceState({}, "", "/etre-rappele/");
  });
});
