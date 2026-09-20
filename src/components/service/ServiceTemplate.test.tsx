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
import type { ServicePage } from "@/content/service-schema";
import { ServiceTemplate, type ServiceTemplateData } from "./ServiceTemplate";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

/** `next/link` retire la barre finale hors de Next (trailingSlash) : on compare sans elle. */
const bare = (value: string | null | undefined) => (value ?? "").replace(/\/(?=\?|$)/, "");
function expectHref(element: HTMLElement, expected: string) {
  expect(bare(element.getAttribute("href"))).toBe(bare(expected));
}

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
    linkedIcons: { "/exemple/": "public-neuro", "/exemple/soeur-un/": "memoire" },
    sousPages: [],
    caregiverQuestion: null,
    confidentialiteHref: "/politique-de-confidentialite/",
    tarifsHref: "/tarifs-et-aides/",
    ...overrides,
  };
}

function withHero(hero: Partial<NonNullable<ServicePage["hero"]>>): ServicePage {
  const base = serviceExemple.hero;
  if (!base) throw new Error("fixture sans hero");
  return { ...serviceExemple, hero: { ...base, ...hero } };
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
    // La section 12 porte l'identifiant que vise le rail et l'ancre « #formulaire ».
    expect(document.getElementById("formulaire")?.tagName).toBe("SECTION");
  });

  it("signale une page non relue, cite auteur et sources, maille pilier et sœurs", () => {
    render(<ServiceTemplate data={data()} />);
    expect(screen.getByText(/attend sa relecture/)).toBeInTheDocument();
    expect(screen.getByText(/Écrit par Auteur fictif, rédaction/)).toBeInTheDocument();
    expect(screen.getByText(/Mise à jour le 20 septembre 2026/)).toBeInTheDocument();
    const nav = screen.getByRole("navigation", { name: "Pages proches" });
    const pilier = within(nav).getByRole("link", { name: /Pilier fictif/ });
    expect(pilier).toHaveAttribute("href", expect.stringMatching(/^\/exemple\/?$/));
    // Icônes des pages liées (docs/design/CONCEPT.md §5) : celle du pilier et celle de la sœur.
    expect(pilier.querySelector('[data-icon="public-neuro"]')).not.toBeNull();
    expect(
      within(nav).getByRole("link", { name: "Sœur une" }).querySelector('[data-icon="memoire"]'),
    ).not.toBeNull();
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

  it("pose les icônes des situations, des rubriques d'action et du formulaire", () => {
    render(<ServiceTemplate data={data()} />);
    const situations = document.querySelectorAll("[data-situation]");
    expect(situations).toHaveLength(3);
    // Une seule situation de la fixture a une icône : les autres cartes restent sans icône.
    expect(situations[0]?.querySelector('[data-icon="tasse"]')).toBeNull();
    expect(document.querySelectorAll("[data-situation] [data-icon]")).toHaveLength(0);
    for (const [rubrique, icon] of [
      ["gestes", "action-gestes"],
      ["presence", "action-presence"],
      ["lien", "action-lien"],
      ["coordination", "action-coordination"],
    ]) {
      expect(
        document.querySelector(`[data-rubrique="${rubrique}"] [data-icon="${icon}"]`),
      ).not.toBeNull();
    }
    // Icône de la page dans l'en-tête du formulaire (section 12).
    expect(document.querySelector('#formulaire [data-icon="maison"]')).not.toBeNull();
  });

  it("affiche une icône de situation quand elle existe dans le registre", () => {
    render(
      <ServiceTemplate
        data={data({
          page: {
            ...serviceExemple,
            situations: [
              { titre: "Une", texte: "Texte.", icone: "repas" },
              { titre: "Deux", texte: "Texte.", icone: "inconnue" },
              { titre: "Trois", texte: "Texte." },
            ],
          },
        })}
      />,
    );
    const icons = document.querySelectorAll("[data-situation] [data-icon]");
    expect(icons).toHaveLength(1);
    expect(icons[0]).toHaveAttribute("data-icon", "repas");
    expect(icons[0]).toHaveAttribute("data-size", "48");
  });

  it("rend les photos de section 3 et 7 quand elles existent", () => {
    render(
      <ServiceTemplate
        data={data({
          page: {
            ...serviceExemple,
            photos: {
              actions: { src: "/images/exemples/a.jpg", alt: "Un couloir lumineux" },
              proches: { src: "/images/exemples/b.jpg", alt: "Un balcon au soleil" },
            },
          },
        })}
      />,
    );
    expect(screen.getByAltText("Un couloir lumineux").closest('[data-ratio="3:2"]')).not.toBeNull();
    expect(screen.getByAltText("Un balcon au soleil").closest('[data-ratio="4:5"]')).not.toBeNull();
  });

  it("insère le rail de conversion à droite des sections 2 à 11, hors du hero", () => {
    render(<ServiceTemplate data={data()} />);
    const rail = screen.getByRole("complementary", { name: "Nous joindre" });
    const zone = document.querySelector("[data-rail-zone]");
    expect(zone).not.toBeNull();
    expect(zone?.contains(rail)).toBe(true);
    expect(zone?.querySelector("#situations")).not.toBeNull();
    expect(zone?.querySelector("#faq")).not.toBeNull();
    expect(zone?.querySelector("#formulaire")).toBeNull();
    expect(zone?.contains(screen.getByRole("heading", { level: 1 }))).toBe(false);
    expect(within(rail).getByRole("link", { name: "Je décris ma situation" })).toHaveAttribute(
      "href",
      "#formulaire",
    );
    // Les sections réservent la colonne du rail ; le sélecteur de lecteur n'est pas dans la zone.
    expect(document.querySelector("#situations")?.closest("section")?.className).toContain("pr-82");
  });

  it("révèle les grilles au défilement et incline les cartes, sans rien cacher au rendu", () => {
    render(<ServiceTemplate data={data()} />);
    const reveals = document.querySelectorAll(".m-reveal");
    expect(reveals.length).toBeGreaterThanOrEqual(5);
    expect(document.querySelectorAll("[data-reveal]")).toHaveLength(0);
    expect(document.querySelectorAll("[data-situation].m-tilt")).toHaveLength(3);
    expect(
      screen.getByRole("navigation", { name: "Pages proches" }).querySelectorAll(".m-tilt").length,
    ).toBeGreaterThanOrEqual(3);
  });

  it("choisit le geste du hero selon `hero.geste`", () => {
    const { unmount } = render(<ServiceTemplate data={data()} />);
    // La fixture demande `stades` : les trois choix visent les jalons de la section 4.
    const stades = screen.getByRole("group", { name: "Où en est la maladie ?" });
    expect(stades).toHaveAttribute("data-gesture", "stades");
    expect(document.getElementById("stade-1")).not.toBeNull();
    expect(document.getElementById("stade-2")).not.toBeNull();
    unmount();

    render(<ServiceTemplate data={data({ page: withHero({ geste: "planning" }) })} />);
    const planning = screen.getByRole("group", { name: "Quand voulez-vous de l'aide ?" });
    expectHref(
      within(planning).getByRole("link", { name: "En semaine" }),
      "/demande/maladie-neurodegenerative/?planning=semaine",
    );
  });

  it("rend le geste enfants, aidants, nuit, 24h/24 et sortie avec leurs liens", () => {
    const { unmount } = render(
      <ServiceTemplate
        data={data({ page: { ...withHero({ geste: "fiche-de-vie" }), public: "enfant-handicap" } })}
      />,
    );
    expect(screen.getByText("La fiche de vie de votre enfant")).toBeInTheDocument();
    const enfant = screen.getAllByRole("link", { name: "Je décris les besoins de mon enfant" })[0];
    if (!enfant) throw new Error("bouton enfant absent");
    expectHref(enfant, "/demande/enfant-handicap/");
    unmount();

    const { unmount: unmountAidant } = render(
      <ServiceTemplate
        data={data({
          page: { ...withHero({ geste: "questionnaire" }), public: "aidant" },
          caregiverQuestion: {
            question: "Dormez-vous ?",
            reponses: [
              { valeur: 0, libelle: "Rarement" },
              { valeur: 2, libelle: "Souvent" },
            ],
            href: "/aidants/ou-en-etes-vous/",
          },
        })}
      />,
    );
    expectHref(screen.getByRole("link", { name: "Souvent" }), "/aidants/ou-en-etes-vous/?q1=2");
    expect(screen.getByText("Pas un test médical. Rien n'est conservé.")).toBeInTheDocument();
    // Le bouton framboise du pilier Aidants est « J'ai besoin de relais ».
    expect(screen.getAllByRole("link", { name: "J'ai besoin de relais" }).length).toBeGreaterThan(
      0,
    );
    unmountAidant();

    const { unmount: unmountNuit } = render(
      <ServiceTemplate
        data={data({
          page: {
            ...withHero({ geste: "nuit", ton: "sombre" }),
            chemin: "/services/garde-de-nuit/",
          },
        })}
      />,
    );
    expectHref(
      screen.getByRole("link", { name: "Nuit calme" }),
      "/demande/nuit-et-24h/?nuit=calme",
    );
    expect(document.querySelector('[data-hero-tone="sombre"]')).not.toBeNull();
    unmountNuit();

    const { unmount: unmount24 } = render(
      <ServiceTemplate
        data={data({
          page: { ...withHero({ geste: "nuit" }), chemin: "/services/presence-24h-24/" },
        })}
      />,
    );
    expectHref(
      screen.getByRole("link", { name: "Quelques semaines" }),
      "/demande/nuit-et-24h/?duree=semaines",
    );
    unmount24();

    render(
      <ServiceTemplate
        data={data({
          page: { ...withHero({ geste: "sortie" }), formulaire: "sortie-hospitalisation" },
        })}
      />,
    );
    expectHref(
      screen.getByRole("link", { name: "Cette semaine" }),
      "/demande/sortie-d-hospitalisation/?sortie=semaine",
    );
    expect(
      screen.getAllByRole("link", { name: "Je prépare un retour à domicile" }).length,
    ).toBeGreaterThan(0);
  });

  it("aligne les liens-icônes vers les sous-pages sous le hero d'un pilier", () => {
    const { unmount } = render(
      <ServiceTemplate
        data={data({
          page: { ...serviceExemple, type: "pilier", pilier: undefined },
          sousPages: [
            { chemin: "/exemple/a/", libelle: "Page A", icone: "memoire" },
            { chemin: "/exemple/b/", libelle: "Page B" },
          ],
        })}
      />,
    );
    const nav = screen.getByRole("navigation", { name: "Aller à la page qui vous concerne" });
    const a = within(nav).getByRole("link", { name: "Page A" });
    expectHref(a, "/exemple/a/");
    expect(a.querySelector('[data-icon="memoire"]')).not.toBeNull();
    expect(
      within(nav).getByRole("link", { name: "Page B" }).querySelector("[data-icon]"),
    ).toBeNull();
    unmount();

    // Pas de rangée sur une sous-page, ni sur un pilier sans sous-pages.
    render(<ServiceTemplate data={data()} />);
    expect(
      screen.queryByRole("navigation", { name: "Aller à la page qui vous concerne" }),
    ).toBeNull();
  });
});
