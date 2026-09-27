import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { getAgenciesPage, getInterfaceTexts, getSiteConfig } from "@/content/loader";
import type { Agency } from "@/content/schemas";
import { AgencyTemplate, type AgencyTemplateData } from "./AgencyTemplate";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

function agency(patch: Partial<Agency> = {}): Agency {
  const base = getSiteConfig().agences.find((a) => a.id === "puteaux");
  if (!base) throw new Error("agence puteaux absente de site.config.json");
  return { ...base, ...patch };
}

function data(overrides: Partial<AgencyTemplateData> = {}): AgencyTemplateData {
  return {
    agency: agency(),
    texts: getInterfaceTexts(),
    page: getAgenciesPage().page,
    indexLabel: getAgenciesPage().index.ariane,
    phone: "01 84 80 17 03",
    lieu: "dans les Hauts-de-Seine",
    departementHref: "/aide-a-domicile/hauts-de-seine/",
    communes: [
      {
        code: "92062",
        nom: "Puteaux",
        chemin: "/aide-a-domicile/hauts-de-seine/puteaux/",
        distance_km: 0.4,
      },
      {
        code: "92050",
        nom: "Nanterre",
        chemin: "/aide-a-domicile/hauts-de-seine/nanterre/",
        distance_km: 3.1,
      },
    ],
    confidentialiteHref: "/politique-de-confidentialite/",
    ...overrides,
  };
}

describe("AgencyTemplate (P6.6)", () => {
  it("affiche le nom, l'adresse, les communes suivies et le formulaire ; masque les champs nuls et tout itinéraire", async () => {
    render(<AgencyTemplate data={data()} />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Youdom Care Hauts-de-Seine",
    );
    expect(screen.getByText(/49-51 quai de Dion-Bouton, 92800 Puteaux\./)).toBeInTheDocument();
    expect(document.querySelector("main")).toHaveAttribute("data-agence-page", "puteaux");
    // Téléphone et horaires de l'agence sont null dans site.config.json : ni affichés, ni inventés.
    expect(screen.queryByText("Téléphone de l'agence")).not.toBeInTheDocument();
    expect(screen.queryByText("Horaires")).not.toBeInTheDocument();
    expect(document.querySelector("[data-agence-horaires]")).toBeNull();
    // Le standard, lui, est connu et proposé.
    expect(screen.getByText("Standard")).toBeInTheDocument();
    // D-036 : plus aucun lien d'itinéraire, ni dans le hero, ni dans l'encart d'agence.
    expect(screen.queryByRole("link", { name: /Itinéraire/ })).not.toBeInTheDocument();
    expect(document.querySelector("[data-agence-itineraire]")).toBeNull();
    expect(document.querySelector('a[href*="openstreetmap"]')).toBeNull();
    const communes = document.querySelector("[data-agence-communes]");
    const items = within(communes as HTMLElement).getAllByRole("listitem");
    // 27/09/2026 : aucun kilométrage affiché nulle part sur le site.
    expect(items.map((item) => item.textContent)).toEqual(["Puteaux", "Nanterre"]);
    expect(
      screen
        .getByRole("link", { name: "Aide à domicile dans les Hauts-de-Seine" })
        .getAttribute("href"),
    ).toMatch(/^\/aide-a-domicile\/hauts-de-seine/);
    // Formulaire à hydratation différée (D-030) : il arrive après le premier rendu, le temps que
    // l'`import()` se résolve — délai large parce que Vitest transforme la chaîne de modules du
    // formulaire à la volée quand aucun autre test du lot ne l'a déjà importée.
    expect(await screen.findByRole("form", {}, { timeout: 20_000 })).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/\bnull\b|\bundefined\b|\{[a-z_]+\}/);
  }, 30_000);

  it("sans commune suivie ni page de département, dit qu'il n'y a pas encore de page et garde les liens sûrs", () => {
    render(<AgencyTemplate data={data({ communes: [], departementHref: null, phone: null })} />);
    expect(document.querySelector("[data-agence-communes]")).toBeNull();
    expect(screen.getByText(/pages locales de ce secteur/)).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Aide à domicile dans/ })).not.toBeInTheDocument();
    expect(screen.queryByText("Standard")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Territoires" })).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/\bnull\b|\bundefined\b/);
  });

  it("affiche les horaires et le téléphone propres à l'agence quand ils sont renseignés", () => {
    render(
      <AgencyTemplate
        data={data({
          agency: agency({
            telephone: "01 00 00 00 00",
            horaires: "Du lundi au vendredi, de 9h à 18h",
          }),
        })}
      />,
    );
    expect(screen.getByText("Téléphone de l'agence")).toBeInTheDocument();
    expect(screen.getByText("Du lundi au vendredi, de 9h à 18h")).toBeInTheDocument();
  });
});
