import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Lead } from "./Lead";

describe("Lead", () => {
  it("rend un paragraphe de chapô", () => {
    render(<Lead className="mt-4">Vous, chez vous. Nous, à vos côtés.</Lead>);
    const lead = screen.getByText("Vous, chez vous. Nous, à vos côtés.");
    expect(lead.tagName).toBe("P");
    expect(lead).toHaveClass("lead", "mt-4");
  });
});
