import { fireEvent, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AppelClicListener, placementOf } from "./AppelClicListener";

const track = vi.fn();
vi.mock("@/lib/mesure/client", () => ({ track: (...args: unknown[]) => track(...args) }));

describe("AppelClicListener (appel_clic, D-029)", () => {
  afterEach(() => track.mockClear());

  it("relève l'emplacement d'un lien tel: depuis data-mesure, sur le lien ou un ancêtre", () => {
    // jsdom ne sait pas naviguer : on annule la navigation des liens, l'écouteur délégué reste appelé.
    const cancel = (event: Event) => event.preventDefault();
    document.addEventListener("click", cancel);
    render(
      <>
        <AppelClicListener />
        <a href="tel:+33184801703" data-mesure="en-tete">
          <span>01 84 80 17 03</span>
        </a>
        <nav data-mesure="barre-mobile">
          <a href="tel:+33184801703">Appeler</a>
        </nav>
        <a href="tel:+33184801703">Sans emplacement</a>
        <a href="mailto:contact@example.test" data-mesure="rail">
          Pas un appel
        </a>
      </>,
    );
    fireEvent.click(document.querySelector("a[data-mesure='en-tete'] span") as Element);
    fireEvent.click(document.querySelector("nav a") as Element);
    fireEvent.click(document.querySelector("a[href^='mailto:']") as Element);
    fireEvent.click(document.querySelectorAll("a[href^='tel:']")[2] as Element);
    document.removeEventListener("click", cancel);

    expect(track.mock.calls).toEqual([
      ["appel_clic", { emplacement: "en-tete" }],
      ["appel_clic", { emplacement: "barre-mobile" }],
    ]);
  });

  it("ignore un emplacement hors liste", () => {
    const link = document.createElement("a");
    link.href = "tel:+33184801703";
    link.dataset["mesure"] = "Appelez vite";
    expect(placementOf(link)).toBeNull();
    expect(placementOf(null)).toBeNull();
  });
});
