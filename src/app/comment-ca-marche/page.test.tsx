import { render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import HowItWorksPage, { generateMetadata } from "./page";

describe("Comment ça marche", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("a des balises titre et description dans les longueurs de docs/01 §8", async () => {
    const metadata = generateMetadata();
    const title = String(metadata.title);
    expect(title.length).toBeGreaterThanOrEqual(50);
    expect(title.length).toBeLessThanOrEqual(60);
    expect(String(metadata.description).length).toBeGreaterThanOrEqual(140);
    expect(String(metadata.description).length).toBeLessThanOrEqual(155);
  });

  it("rend le fil d'Ariane, les quatre étapes, le suivi, les recours, la FAQ et l'appel", async () => {
    render(await HowItWorksPage());
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Comment ça marche");
    expect(
      screen.getByRole("navigation", { name: "Fil d’Ariane" }).querySelector("[aria-current=page]"),
    ).toHaveTextContent("Comment ça marche");

    const etapes = screen.getByRole("region", { name: "Comment ça commence" });
    const steps = within(etapes).getAllByRole("listitem");
    expect(steps).toHaveLength(4);
    expect(steps[2]).toHaveTextContent("Si le courant ne passe pas, nous changeons.");

    const suivi = screen.getByRole("region", { name: "Le suivi, concrètement" });
    expect(within(suivi).getAllByRole("listitem")).toHaveLength(3);

    const recours = screen.getByRole("region", { name: "Et si ça ne va pas ?" });
    expect(within(recours).getAllByRole("listitem")).toHaveLength(3);
    expect(within(recours).getByRole("link", { name: /01.84.80.17.03/ })).toHaveAttribute(
      "href",
      "tel:+33184801703",
    );

    const faq = screen.getByRole("region", { name: "Questions fréquentes" });
    expect(within(faq).getAllByRole("group")).toHaveLength(5);
    expect(within(faq).getByRole("link", { name: "Comparer les deux modes" })).toBeInTheDocument();

    expect(screen.getByRole("link", { name: "Être rappelé(e)" })).toBeInTheDocument();
  });

  it("masque en production les phrases liées à un engagement non validé", async () => {
    vi.stubEnv("VERCEL_ENV", "production");
    render(await HowItWorksPage());
    expect(screen.queryByText(/Si le courant ne passe pas/)).not.toBeInTheDocument();
    expect(screen.getByText("Dites-le à votre référent, sans détour.")).toBeInTheDocument();
  });
});
