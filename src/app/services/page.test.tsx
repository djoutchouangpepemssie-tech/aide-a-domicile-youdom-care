import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { getNavigation, getServicesPage } from "@/content/loader";
import ServicesPage, { generateMetadata, SERVICES_PATH } from "./page";

/** `next/link` retire la barre finale hors de Next : on compare sans elle. */
const bare = (value: string | null | undefined) => (value ?? "").replace(/\/(?=\?|$)/, "");

describe("/services/", () => {
  it("a des balises titre et description dans les longueurs de docs/01 §8, canonique sur /services/", () => {
    const metadata = generateMetadata();
    const title = String(metadata.title);
    expect(title.length).toBeGreaterThanOrEqual(50);
    expect(title.length).toBeLessThanOrEqual(60);
    expect(String(metadata.description).length).toBeGreaterThanOrEqual(140);
    expect(String(metadata.description).length).toBeLessThanOrEqual(155);
    expect(String(metadata.alternates?.canonical)).toMatch(/\/services\/$/);
  });

  it("montre chaque service du menu une fois et une seule, groupé, avec son lien", async () => {
    render(await ServicesPage());
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Nos services d'aide et d'accompagnement à domicile",
    );

    /*
     * Le cœur de la page (D-064) : aucun service du menu ne manque, aucun n'apparaît deux fois.
     * C'est ce qui lui était demandé — une vue d'ensemble complète — et c'est ce qui se perd le
     * plus facilement en ajoutant une prestation au menu sans y penser. L'index lui-même
     * (« Tous nos services ») n'est pas une carte : il ne se liste pas.
     */
    const menu = (getNavigation().principale.find((item) => item.id === "services")?.enfants ?? [])
      .filter((child) => child.href !== SERVICES_PATH)
      .map((child) => child.href);
    const cards = screen.getAllByRole("article");
    const linked = cards.map((card) => within(card).getByRole("link").getAttribute("href"));
    // L'ORDRE n'est pas celui du menu, et c'est le propos de la page : les groupes réordonnent
    // par besoin (la nuit avec le 24h/24, le retour d'hospitalisation avec les vacances). Ce qui
    // est vérifié ici, c'est l'exhaustivité et l'unicité, pas la séquence.
    expect([...linked].sort()).toEqual([...menu.map(bare)].sort());
    expect(new Set(linked).size).toBe(linked.length);

    // Chaque carte porte le libellé du menu, pas un titre réécrit à la main.
    const page = getServicesPage();
    for (const groupe of page.groupes) {
      const region = screen.getByRole("region", { name: groupe.h2 });
      for (const service of groupe.services) {
        const label = (
          getNavigation().principale.find((item) => item.id === "services")?.enfants ?? []
        ).find((child) => child.href === service.href)?.libelle;
        expect(label, service.href).toBeTruthy();
        expect(within(region).getByRole("link", { name: label })).toHaveAttribute(
          "href",
          bare(service.href),
        );
      }
    }
  });

  it("nomme les prestations traitées à l'intérieur d'une page (Q-OFFRE-7)", async () => {
    render(await ServicesPage());
    /*
     * « Aide pour les repas et les courses » et « Entretien du cadre de vie » n'ont pas de page à
     * eux : ils sont traités dans « Aide à la vie quotidienne ». Sans ce champ, deux des dix
     * services demandés par Arcel seraient invisibles sur la page qui prétend les montrer tous.
     */
    const card = screen
      .getAllByRole("article")
      .find((a) => a.textContent?.includes("Aide à la vie quotidienne"));
    expect(card).toBeDefined();
    expect(card).toHaveTextContent("Aide pour les repas et les courses");
    expect(card).toHaveTextContent("Entretien du cadre de vie");
  });

  it("renvoie vers les deux modes d'intervention plutôt que d'en afficher un (Q-TARIFS-1)", async () => {
    render(await ServicesPage());
    expect(
      screen.getByRole("link", { name: "Comprendre les deux modes d'intervention" }),
    ).toHaveAttribute("href", bare("/comment-ca-marche/prestataire-ou-mandataire/"));
    // Aucun mode annoncé par carte : content/tarifs.json ne le sait pas encore.
    for (const card of screen.getAllByRole("article")) {
      expect(card.textContent).not.toMatch(/mode (prestataire|mandataire)/i);
    }
  });

  it("mène vers chaque public et vers les trois niveaux d'engagement", async () => {
    render(await ServicesPage());
    const publics = screen.getByRole("region", { name: getServicesPage().public_h2 });
    const pourQui =
      getNavigation().principale.find((item) => item.id === "pour-qui")?.enfants ?? [];
    expect(pourQui.length).toBeGreaterThan(0);
    for (const child of pourQui) {
      expect(within(publics).getByRole("link", { name: child.libelle })).toHaveAttribute(
        "href",
        bare(child.href),
      );
    }

    const appel = screen.getByRole("region", { name: getServicesPage().appel_h2 });
    expect(within(appel).getByRole("link", { name: /01.84.80.17.03/ })).toHaveAttribute(
      "href",
      "tel:+33184801703",
    );
  });
});
