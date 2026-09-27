import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import accessibilite from "../../../content/pages/accessibilite.json";
import siteConfig from "../../../content/site.config.json";
import AccessibilityPage, { ACCESSIBILITY_PATH, generateMetadata } from "./page";

describe("Déclaration d'accessibilité (P8.4)", () => {
  it("a des balises titre et description dans les longueurs de docs/01 §8, canonique sur /accessibilite/, indexable", async () => {
    const metadata = generateMetadata();
    const title = String(metadata.title);
    expect(title.length).toBeGreaterThanOrEqual(50);
    expect(title.length).toBeLessThanOrEqual(60);
    expect(String(metadata.description).length).toBeGreaterThanOrEqual(140);
    expect(String(metadata.description).length).toBeLessThanOrEqual(155);
    expect(String(metadata.alternates?.canonical)).toMatch(/\/accessibilite\/$/);
    expect(ACCESSIBILITY_PATH).toBe("/accessibilite/");
  });

  it("suit le modèle RGAA : éditeur, état de conformité honnête, résultats, contenus non accessibles, établissement, contact, recours", async () => {
    render(await AccessibilityPage());
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Déclaration d'accessibilité",
    );
    expect(
      screen.getByRole("navigation", { name: "Fil d’Ariane" }).querySelector("[aria-current=page]"),
    ).toHaveTextContent("Accessibilité");

    // Éditeur et adresse du site, depuis site.config.json.
    expect(screen.getByText(/s'engage à rendre son site accessible/)).toHaveTextContent(
      `${siteConfig.marque.nom} s'engage`,
    );
    expect(screen.getByText(/s'engage à rendre son site accessible/)).toHaveTextContent(
      siteConfig.marque.url,
    );

    // État de conformité : « non conforme » tant qu'aucun audit complet n'existe, décompte cohérent.
    const etat = screen.getByRole("region", { name: accessibilite.etat.h2 });
    expect(etat).toHaveTextContent(/est non conforme avec le référentiel/);
    expect(etat.querySelector("[data-statut]")).toHaveAttribute("data-statut", "non_conforme");
    const {
      criteres_testes,
      criteres_conformes,
      criteres_non_conformes,
      criteres_non_applicables,
    } = accessibilite.etat;
    expect(criteres_conformes + criteres_non_conformes + criteres_non_applicables).toBe(
      criteres_testes,
    );
    expect(etat).toHaveTextContent(`Critères réellement testés : ${criteres_testes}.`);

    // Date de la déclaration, lisible par une machine.
    const times = document.querySelectorAll(`time[datetime="${accessibilite.date}"]`);
    expect(times.length).toBeGreaterThanOrEqual(1);
    expect(times[0]).toHaveTextContent("27 septembre 2026");

    // Contenus non accessibles : chaque point porte son critère, son état et sa correction.
    const nonAccessibles = screen.getByRole("region", { name: accessibilite.non_accessibles.h2 });
    const items = nonAccessibles.querySelectorAll("li[data-etat]");
    expect(items).toHaveLength(accessibilite.non_accessibles.items.length);
    expect(within(nonAccessibles).getByText(/Corrigé · RGAA 11\.10/)).toBeInTheDocument();

    // Établissement : les pages vérifiées sont des liens internes.
    const etablissement = screen.getByRole("region", { name: accessibilite.etablissement.h2 });
    expect(within(etablissement).getByRole("link", { name: "Plan du site" })).toHaveAttribute(
      "href",
      expect.stringContaining("/plan-du-site"),
    );

    // Contact : courriel et téléphone de site.config.json.
    const contact = screen.getByRole("region", { name: accessibilite.contact.h2 });
    expect(within(contact).getByRole("link", { name: siteConfig.contact.email })).toHaveAttribute(
      "href",
      `mailto:${siteConfig.contact.email}`,
    );
    expect(within(contact).getByRole("link", { name: /01.84.80.17.03/ })).toHaveAttribute(
      "href",
      "tel:+33184801703",
    );

    // Voies de recours : Défenseur des droits, liens signalés comme externes, adresse postale.
    const recours = screen.getByRole("region", { name: accessibilite.recours.h2 });
    const online = within(recours).getByRole("link", { name: /Écrire au Défenseur des droits/ });
    expect(online).toHaveAttribute("href", "https://www.defenseurdesdroits.fr/nous-contacter-355");
    expect(online).toHaveAccessibleName(/lien externe/);
    expect(recours).toHaveTextContent("Libre réponse 71120");
    expect(recours).toHaveTextContent("75342 Paris CEDEX 07");

    // JSON-LD BreadcrumbList émis par le fil d'Ariane.
    const jsonLd = Array.from(document.querySelectorAll('script[type="application/ld+json"]')).map(
      (s) => s.textContent ?? "",
    );
    expect(jsonLd.some((s) => s.includes('"BreadcrumbList"'))).toBe(true);
  });
});
