import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { FAQ } from "./FAQ";

describe("FAQ", () => {
  it("rend un details/summary natif par question, fermé par défaut", async () => {
    render(
      <FAQ
        items={[
          {
            id: "q1",
            question: "Comment se passe la première rencontre ?",
            answer: <p>Chez vous.</p>,
          },
          { question: "Peut-on arrêter ?", answer: <p>À tout moment.</p> },
        ]}
      />,
    );
    const groups = screen.getAllByRole("group");
    expect(groups).toHaveLength(2);
    expect(groups[0]).toHaveAttribute("id", "q1");
    expect(groups[0]).not.toHaveAttribute("open");

    const summary = screen.getByText("Comment se passe la première rencontre ?");
    await userEvent.click(summary);
    expect(groups[0]).toHaveAttribute("open");
    expect(screen.getByText("Chez vous.")).toBeVisible();
  });
});
