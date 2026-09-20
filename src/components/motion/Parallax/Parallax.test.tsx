import { render, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PARALLAX_MAX_PX, Parallax } from "./Parallax";

describe("Parallax", () => {
  it("rend une couche visible côté serveur, sans JavaScript, avec son amplitude", () => {
    const html = renderToString(<Parallax amount={12}>Couche</Parallax>);
    expect(html).toContain('class="m-parallax"');
    expect(html).toContain("--m-parallax:12px");
    expect(html).toContain("Couche");
  });

  it("borne l'amplitude à 24 px dans les deux sens et garde 16 px par défaut", () => {
    const { rerender } = render(<Parallax data-testid="couche" amount={80} />);
    const layer = screen.getByTestId("couche");
    expect(PARALLAX_MAX_PX).toBe(24);
    expect(layer.style.getPropertyValue("--m-parallax")).toBe("24px");
    rerender(<Parallax data-testid="couche" amount={-80} />);
    expect(layer.style.getPropertyValue("--m-parallax")).toBe("-24px");
    rerender(<Parallax data-testid="couche" />);
    expect(layer.style.getPropertyValue("--m-parallax")).toBe("16px");
  });

  it("accepte une autre balise, une classe et un style", () => {
    render(
      <Parallax as="aside" className="extra" style={{ top: 4 }} aria-label="Décor">
        Décor
      </Parallax>,
    );
    const layer = screen.getByRole("complementary", { name: "Décor" });
    expect(layer).toHaveClass("m-parallax", "extra");
    expect(layer.style.top).toBe("4px");
  });
});
