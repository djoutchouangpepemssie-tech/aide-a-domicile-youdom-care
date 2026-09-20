import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { serviceExemple } from "../../../tests/fixtures/service-exemple";
import { listFormDefinitions } from "@/content/form-definitions";
import {
  getAids,
  getCommitments,
  getInterfaceTexts,
  getNavigation,
  getPricing,
  getSpecialForms,
  getWeekExamples,
} from "@/content/loader";
import { ServiceTemplate, type ServiceTemplateData } from "./ServiceTemplate";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

function data(overrides: Partial<ServiceTemplateData> = {}): ServiceTemplateData {
  return {
    page: serviceExemple,
    Body: () => <p>Corps MDX de test.</p>,
    texts: getInterfaceTexts(),
    navigation: getNavigation(),
    phone: "01 84 80 17 03",
    weekExample: getWeekExamples().exemples.find((e) => e.id === "madeleine") ?? null,
    commitments: getCommitments(),
    aids: getAids().aides,
    pricing: getPricing(),
    definition: listFormDefinitions().find((d) => d.id === "neuro") ?? null,
    specialForms: getSpecialForms(),
    budget: null,
    linkedTitles: { "/exemple/": "Pilier fictif", "/exemple/soeur-un/": "Sœur une" },
    confidentialiteHref: "/politique-de-confidentialite/",
    tarifsHref: "/tarifs-et-aides/",
    ...overrides,
  };
}

describe("ServiceTemplate", () => {
  it("rend les 13 sections dans l'ordre de docs/03 §2", () => {
    render(<ServiceTemplate data={data()} />);
    // Les titres des étapes du formulaire (section 12) ne comptent pas parmi les sections.
    const headings = screen
      .getAllByRole("heading", { level: 2 })
      .filter((h) => h.closest("form") === null)
      .map((h) => h.textContent);
    expect(headings).toEqual([
      "Vous vous reconnaissez ?",
      "Ce que nous faisons, concrètement",
      "Un accompagnement qui évolue",
      "Exemple de semaine",
      "Le suivi",
      "Et pour vous, les proches",
      "Qui intervient ?",
      "Ce que nous ne faisons pas",
      "Combien ça coûte, quelles aides ?",
      "Questions fréquentes",
      "Décrire votre situation",
      "Sources et relecture",
    ]);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Exemple de page service");
    expect(screen.getByText("Corps MDX de test.")).toBeInTheDocument();
    expect(screen.getAllByText("Exemple illustratif").length).toBeGreaterThan(0);
    expect(document.querySelector('[data-section="ne-faisons-pas"]')).toHaveTextContent(
      "Les soins infirmiers",
    );
    expect(screen.getByRole("form")).toBeInTheDocument();
    expect(screen.queryByText(/par mois TTC|TTC/)).toBeNull();
    expect(
      screen.getAllByRole("link", { name: /Voir la démarche|Combien/ }).length,
    ).toBeGreaterThan(0);
  });

  it("signale une page non relue, cite auteur et sources, maille pilier et sœurs", () => {
    render(<ServiceTemplate data={data()} />);
    expect(screen.getByText(/attend sa relecture/)).toBeInTheDocument();
    expect(screen.getByText(/Écrit par Auteur fictif, rédaction/)).toBeInTheDocument();
    expect(screen.getByText(/Mise à jour le 20 septembre 2026/)).toBeInTheDocument();
    const nav = screen.getByRole("navigation", { name: "Pages proches" });
    expect(within(nav).getByRole("link", { name: /Pilier fictif/ })).toHaveAttribute(
      "href",
      expect.stringMatching(/^\/exemple\/?$/),
    );
    expect(within(nav).getByRole("link", { name: "Sœur une" })).toBeInTheDocument();
    expect(within(nav).getByRole("link", { name: "/exemple/soeur-deux/" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Source deux/ })).toHaveAttribute(
      "href",
      "https://example.org/deux",
    );
  });

  it("n'affiche pas le bandeau pour une page relue et publiée", () => {
    render(
      <ServiceTemplate
        data={data({
          page: {
            ...serviceExemple,
            statut: "publie",
            relu_par: { nom: "Relectrice fictive", fonction: "infirmière", date: "2026-09-19" },
          },
        })}
      />,
    );
    expect(screen.queryByText(/attend sa relecture/)).toBeNull();
    expect(
      screen.getByText(/Relu par Relectrice fictive, infirmière, le 19 septembre 2026/),
    ).toBeInTheDocument();
  });
});
