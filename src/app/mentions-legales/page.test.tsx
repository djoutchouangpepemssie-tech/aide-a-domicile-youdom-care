import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import ConditionsGeneralesPage, {
  generateMetadata as conditionsMetadata,
} from "../conditions-generales/page";
import CookiesPage, { generateMetadata as cookiesMetadata } from "../cookies/page";
import PolitiquePage, {
  generateMetadata as politiqueMetadata,
} from "../politique-de-confidentialite/page";
import MentionsLegalesPage, { generateMetadata as mentionsMetadata } from "./page";

function expectSeo(metadata: { title?: unknown; description?: unknown }) {
  expect(String(metadata.title).length).toBeGreaterThanOrEqual(50);
  expect(String(metadata.title).length).toBeLessThanOrEqual(60);
  expect(String(metadata.description).length).toBeGreaterThanOrEqual(140);
  expect(String(metadata.description).length).toBeLessThanOrEqual(155);
}

const forbidden = /à compl[ée]ter|\bnull\b|\bundefined\b|\{[a-z_]+\}/i;

describe("Pages légales (P8.3)", () => {
  it("les quatre pages ont des balises SEO aux longueurs de docs/01 §8 et des canoniques distinctes", async () => {
    const all = [mentionsMetadata(), politiqueMetadata(), cookiesMetadata(), conditionsMetadata()];
    for (const metadata of all) expectSeo(metadata);
    expect(new Set(all.map((m) => String(m.alternates?.canonical))).size).toBe(4);
    expect(String(all[0]?.alternates?.canonical)).toMatch(/\/mentions-legales\/$/);
  });

  it("mentions légales : champs renseignés affichés, champs null masqués, crédits et licences", async () => {
    const { container } = render(await MentionsLegalesPage());
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(container.textContent).not.toMatch(forbidden);
    expect(container.querySelector("[data-maj] time")).toHaveAttribute("dateTime", "2026-09-27");

    const editeur = screen.getByRole("region", { name: "Éditeur du site" });
    expect(within(editeur).getByText("Nom commercial")).toBeInTheDocument();
    expect(within(editeur).getByText("Youdom Care")).toBeInTheDocument();
    expect(within(editeur).getByText("918 366 600 00016")).toBeInTheDocument();
    expect(within(editeur).getByText("8810A")).toBeInTheDocument();
    for (const label of [
      "Raison sociale",
      "Forme juridique",
      "Capital social",
      "Siège social",
      "Immatriculation",
      "TVA intracommunautaire",
      "Directeur de la publication",
    ]) {
      expect(within(editeur).queryByText(label)).not.toBeInTheDocument();
    }
    expect(within(editeur).getByRole("link", { name: "contact@youdom-care.com" })).toHaveAttribute(
      "href",
      "mailto:contact@youdom-care.com",
    );

    expect(screen.getByRole("region", { name: "Services à la personne" })).toHaveTextContent(
      "SAP918366600",
    );
    expect(container.querySelector("[data-fait=autorisations]")).toBeNull();
    expect(screen.getByRole("region", { name: "Hébergement" })).toHaveTextContent("Vercel Inc.");
    expect(screen.queryByRole("region", { name: "Médiation de la consommation" })).toBeNull();

    const credits = container.querySelectorAll("[data-credits] > li");
    expect(credits.length).toBeGreaterThanOrEqual(30);
    expect(screen.getByRole("link", { name: "Pexels" })).toHaveAttribute(
      "href",
      "https://www.pexels.com/license/",
    );
    expect(container.querySelectorAll("[data-donnees-ouvertes] > li")).toHaveLength(7);
    expect(
      screen.getAllByRole("link", { name: "Licence Ouverte / Open Licence 2.0 (Etalab)" }).length,
    ).toBe(6);
    expect(screen.getByRole("link", { name: "Open Database License (ODbL) 1.0" })).toHaveAttribute(
      "href",
      "https://opendatacommons.org/licenses/odbl/1-0/",
    );
  });

  it("politique de confidentialité : responsable sans champ null, six formulaires, contact et CNIL", async () => {
    const { container } = render(await PolitiquePage());
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(container.textContent).not.toMatch(forbidden);
    const responsable = screen.getByRole("region", { name: "Qui est responsable de vos données" });
    expect(within(responsable).getByText("Youdom Care")).toBeInTheDocument();
    expect(within(responsable).queryByText("Raison sociale")).not.toBeInTheDocument();
    expect(within(responsable).queryByText("Siège social")).not.toBeInTheDocument();
    expect(container.querySelectorAll("[data-finalites] tbody tr")).toHaveLength(6);
    expect(container.textContent).toContain("consentement explicite");
    expect(
      within(container.querySelector("[data-exercice]") as HTMLElement).getByRole("link", {
        name: "contact@youdom-care.com",
      }),
    ).toHaveAttribute("href", "mailto:contact@youdom-care.com");
    expect(screen.getByRole("link", { name: /cnil\.fr/i })).toHaveAttribute(
      "href",
      "https://www.cnil.fr/fr/plaintes",
    );
    expect(
      screen.getByRole("note", { name: "Durées proposées, en attente de validation" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Lire la page sur les cookies" })).toHaveAttribute(
      "href",
      expect.stringMatching(/^\/cookies\/?$/),
    );
  });

  it("cookies : aucun traceur listé, deux réglages locaux, pas de tableau", async () => {
    const { container } = render(await CookiesPage());
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(container.textContent).not.toMatch(forbidden);
    expect(container.querySelector('[data-traceurs="0"]')).not.toBeNull();
    expect(container.querySelector("table")).toBeNull();
    expect(container.querySelectorAll("[data-reglages-locaux] dt")).toHaveLength(2);
    expect(container.textContent).toContain("Do Not Track");
  });

  it("conditions générales : aucun document, texte d'attente et mention mandataire repérable", async () => {
    const { container } = render(await ConditionsGeneralesPage());
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(container.textContent).not.toMatch(forbidden);
    expect(container.querySelector('[data-documents="0"]')).not.toBeNull();
    expect(container.querySelector('a[type="application/pdf"]')).toBeNull();
    expect(container.textContent).toContain("remises avec chaque devis");
    const mandataire = container.querySelector('[data-mode="mandataire"]');
    expect(mandataire?.querySelector('[data-notice="mandataire"]')).not.toBeNull();
    expect(container.textContent).toContain("contrat de placement de travailleurs");
  });
});
