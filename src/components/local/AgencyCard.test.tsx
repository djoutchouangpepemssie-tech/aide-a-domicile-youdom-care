import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { getInterfaceTexts, getSiteConfig } from "@/content/loader";
import type { Agency } from "@/content/schemas";
import { AgencyCard, fullAddress } from "./AgencyCard";

const texts = getInterfaceTexts().local.agence;

function agency(patch: Partial<Agency> = {}): Agency {
  const base = getSiteConfig().agences.find((a) => a.id === "puteaux");
  if (!base) throw new Error("agence puteaux absente de site.config.json");
  return { ...base, ...patch };
}

describe("AgencyCard", () => {
  it("affiche le nom et l'adresse ; masque téléphone, horaires nuls et tout itinéraire", () => {
    render(<AgencyCard agency={agency()} texts={texts} href="/agences/puteaux/" />);
    expect(screen.getByRole("heading", { level: 3 })).toHaveTextContent(
      "Youdom Care Hauts-de-Seine",
    );
    expect(screen.getByText("49-51 quai de Dion-Bouton, 92800 Puteaux")).toBeInTheDocument();
    expect(screen.queryByText("Téléphone de l'agence")).not.toBeInTheDocument();
    expect(screen.queryByText("Standard")).not.toBeInTheDocument();
    expect(screen.queryByText("Horaires")).not.toBeInTheDocument();
    // D-036 : plus aucun lien vers un service de carte externe.
    expect(screen.queryByRole("link", { name: /Itinéraire/ })).not.toBeInTheDocument();
    expect(document.querySelector('a[href*="openstreetmap"]')).toBeNull();
    expect(
      screen
        .getByRole("link", { name: "Voir l'agence Youdom Care Hauts-de-Seine" })
        .getAttribute("href"),
    ).toMatch(/^\/agences\/puteaux/);
    expect(document.body.textContent).not.toMatch(/\bnull\b|\bundefined\b/);
  });

  it("affiche le standard quand l'agence n'a pas de numéro, le numéro propre sinon, et les horaires renseignés", () => {
    const { rerender } = render(
      <AgencyCard agency={agency()} texts={texts} standardPhone="01 84 80 17 03" />,
    );
    expect(screen.getByText("Standard")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /01.84.80.17.03/ })).toHaveAttribute(
      "href",
      "tel:+33184801703",
    );
    expect(screen.queryByRole("link", { name: /Voir l'agence/ })).not.toBeInTheDocument();

    rerender(
      <AgencyCard
        agency={agency({
          telephone: "01 00 00 00 00",
          horaires: "Du lundi au vendredi, de 9h à 18h",
        })}
        texts={texts}
        standardPhone="01 84 80 17 03"
      />,
    );
    expect(screen.getByText("Téléphone de l'agence")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /01.00.00.00.00/ })).toBeInTheDocument();
    expect(screen.queryByText(/01.84.80.17.03/)).not.toBeInTheDocument();
    expect(screen.getByText("Horaires")).toBeInTheDocument();
    expect(screen.getByText("Du lundi au vendredi, de 9h à 18h")).toBeInTheDocument();
  });

  it("compose l'adresse, et n'affiche rien sans adresse de voie", () => {
    expect(fullAddress(agency())).toBe("49-51 quai de Dion-Bouton, 92800 Puteaux");
    // D-036 : ni voie, ni code postal, ni commune quand l'agence ne publie pas d'adresse.
    expect(fullAddress(agency({ adresse: null }))).toBeNull();
    render(<AgencyCard agency={agency({ adresse: null })} texts={texts} />);
    expect(screen.queryByText("Adresse")).not.toBeInTheDocument();
    expect(screen.queryByText(/92800/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Puteaux,/)).not.toBeInTheDocument();
  });
});
