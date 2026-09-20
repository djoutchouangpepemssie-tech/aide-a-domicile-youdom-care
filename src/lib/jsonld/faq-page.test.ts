import { describe, expect, it } from "vitest";
import { faqPage } from "./faq-page";

const faq = [
  { question: "Question une ?", reponse: "Réponse une." },
  { question: "Question deux ?", reponse: "Réponse deux." },
];

describe("jsonld/faqPage", () => {
  it("reprend les questions et réponses telles quelles", () => {
    expect(faqPage(faq, { chemin: "/exemple/", siteUrl: "https://www.example.org" })).toEqual({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "@id": "https://www.example.org/exemple/#faq",
      url: "https://www.example.org/exemple/",
      mainEntity: [
        {
          "@type": "Question",
          name: "Question une ?",
          acceptedAnswer: { "@type": "Answer", text: "Réponse une." },
        },
        {
          "@type": "Question",
          name: "Question deux ?",
          acceptedAnswer: { "@type": "Answer", text: "Réponse deux." },
        },
      ],
    });
  });

  it("fonctionne sans adresse de page", () => {
    const node = faqPage(faq);
    expect(node).not.toHaveProperty("url");
    expect(node).not.toHaveProperty("@id");
    expect(node?.mainEntity).toHaveLength(2);
  });

  it("renvoie null sans question ou dès qu'un texte manque", () => {
    expect(faqPage([])).toBeNull();
    expect(faqPage([{ question: "Q ?", reponse: " " }])).toBeNull();
    expect(faqPage([{ question: "", reponse: "R." }])).toBeNull();
  });
});
