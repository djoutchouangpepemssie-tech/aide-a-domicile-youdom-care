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

  it("rend le titre, le formulaire et le téléphone", async () => {
    render(<CallbackPage />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("trente secondes");
    expect(screen.getByRole("form")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /01.84.80.17.03/ })).toHaveAttribute(
      "href",
      "tel:+33184801703",
    );
  });
});
