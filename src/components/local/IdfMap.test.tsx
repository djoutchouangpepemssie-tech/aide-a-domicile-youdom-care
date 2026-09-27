import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { getInterfaceTexts, getSiteConfig } from "@/content/loader";
import { IdfMap, type MapDepartment } from "./IdfMap";

const texts = getInterfaceTexts().local.carte;

function departments(withPage: readonly string[]): MapDepartment[] {
  return getSiteConfig().zones.map((zone) => ({
    code: zone.code,
    nom: zone.nom,
    href: withPage.includes(zone.code) ? `/aide-a-domicile/${zone.slug}/` : null,
    label: `Aide à domicile en ${zone.nom}`,
  }));
}

describe("IdfMap", () => {
  it("rend une image SVG nommée et décrite, avec une forme par département", () => {
    render(<IdfMap departments={departments(["92"])} texts={texts} />);
    const image = screen.getByRole("img", { name: texts.titre });
    expect(image.tagName).toBe("svg");
    expect(image).toHaveAccessibleDescription(texts.description);
    expect(image.querySelectorAll("[data-departement]")).toHaveLength(8);
    expect(image.querySelectorAll("a")).toHaveLength(0);
  });

  it("propose la liste équivalente : un lien par département construit, le nom seul sinon", () => {
    render(<IdfMap departments={departments(["92", "75"])} texts={texts} />);
    const list = screen.getByRole("navigation", { name: texts.liste });
    const items = within(list).getAllByRole("listitem");
    expect(items).toHaveLength(8);
    const links = within(list).getAllByRole("link");
    expect(links.map((link) => link.textContent)).toEqual([
      "Aide à domicile en Paris",
      "Aide à domicile en Hauts-de-Seine",
    ]);
    expect(links[1]?.getAttribute("href")).toMatch(/^\/aide-a-domicile\/hauts-de-seine/);
    expect(within(list).getByText("Seine-et-Marne")).toBeInTheDocument();
  });

  it("place la liste équivalente devant la carte sur téléphone (P9.6)", () => {
    render(<IdfMap departments={departments(["92"])} texts={texts} />);
    // La carte n'est qu'une image : au doigt, seule la liste est utilisable, donc elle passe
    // en premier jusqu'à 64 rem (`order-1`), la carte reprenant sa place à partir de là.
    expect(screen.getByRole("navigation", { name: texts.liste })).toHaveClass(
      "order-1",
      "lg:order-2",
    );
    expect(screen.getByRole("img", { name: texts.titre })).toHaveClass("order-2", "lg:order-1");
  });
});
