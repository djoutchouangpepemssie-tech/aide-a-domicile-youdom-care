import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ConversionRail, type ConversionRailProps } from "./ConversionRail";

type Callback = (entries: Partial<IntersectionObserverEntry>[]) => void;

function installIntersectionObserver() {
  const observers: { callback: Callback; observe: ReturnType<typeof vi.fn> }[] = [];
  class FakeObserver {
    observe = vi.fn();
    disconnect = vi.fn();
    constructor(callback: Callback) {
      observers.push({ callback, observe: this.observe });
    }
  }
  vi.stubGlobal("IntersectionObserver", FakeObserver);
  return observers;
}

const props: ConversionRailProps = {
  phone: { display: "01 84 80 17 03", href: "tel:+33184801703" },
  callbackHref: "/etre-rappele/",
  formHref: "#formulaire",
  texts: {
    nom: "Nous joindre",
    appeler: "Appeler le {téléphone}",
    rappel: "Être rappelé(e)",
    demande: "Je décris ma situation",
    reassurance: "Évaluation à domicile gratuite, sans engagement.",
  },
};

describe("ConversionRail", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("propose le téléphone, le rappel, le formulaire et la réassurance, dans cet ordre", () => {
    render(<ConversionRail {...props} />);
    const rail = screen.getByRole("complementary", { name: "Nous joindre" });
    expect(rail).toHaveAttribute("data-state", "visible");
    expect(rail).not.toHaveAttribute("inert");

    // next/link retire la barre finale hors production : on tolère les deux formes.
    const hrefs = screen.getAllByRole("link").map((link) => link.getAttribute("href"));
    expect(hrefs).toHaveLength(3);
    expect(hrefs[0]).toBe("tel:+33184801703");
    expect(hrefs[1]).toMatch(/^\/etre-rappele\/?$/);
    expect(hrefs[2]).toBe("#formulaire");
    expect(screen.getByRole("link", { name: "Appeler le 01 84 80 17 03" })).toHaveTextContent(
      "01 84 80 17 03",
    );
    expect(screen.getByRole("link", { name: "Être rappelé(e)" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Je décris ma situation" })).toBeInTheDocument();
    expect(
      screen.getByText("Évaluation à domicile gratuite, sans engagement."),
    ).toBeInTheDocument();
  });

  it("masque le téléphone quand il est inconnu", () => {
    render(<ConversionRail {...props} phone={null} />);
    expect(screen.queryByRole("link", { name: /Appeler le/ })).not.toBeInTheDocument();
    expect(screen.getAllByRole("link")).toHaveLength(2);
  });

  it("reste visible sans IntersectionObserver (progressif)", () => {
    vi.stubGlobal("IntersectionObserver", undefined);
    render(
      <>
        <section id="formulaire" />
        <ConversionRail {...props} formId="formulaire" />
      </>,
    );
    expect(screen.getByRole("complementary")).toHaveAttribute("data-state", "visible");
  });

  it("se retire quand le formulaire est à l'écran, puis revient", () => {
    const observers = installIntersectionObserver();
    render(
      <>
        <section id="formulaire" />
        <ConversionRail {...props} formId="formulaire" />
      </>,
    );
    const rail = screen.getByRole("complementary");
    expect(observers[0]?.observe).toHaveBeenCalledWith(document.getElementById("formulaire"));

    act(() => observers[0]?.callback([{ isIntersecting: true }]));
    expect(rail).toHaveAttribute("data-state", "hidden");
    expect(rail).toHaveAttribute("inert");

    act(() => observers[0]?.callback([{ isIntersecting: false }]));
    expect(rail).toHaveAttribute("data-state", "visible");
    expect(rail).not.toHaveAttribute("inert");
  });

  it("n'observe rien sans formId ni cible", () => {
    const observers = installIntersectionObserver();
    render(<ConversionRail {...props} />);
    render(<ConversionRail {...props} formId="absent" />);
    expect(observers).toHaveLength(0);
  });
});
