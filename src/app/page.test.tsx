import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Home from "./page";

describe("Accueil (test de fumée)", () => {
  it("affiche un titre de niveau 1 et la signature de marque", () => {
    render(<Home />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Youdom Care");
    expect(screen.getByText("Vous, chez vous. Nous, à vos côtés.")).toBeInTheDocument();
  });
});
