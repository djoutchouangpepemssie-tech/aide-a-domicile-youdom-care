import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, describe, expect, it, vi } from "vitest";
import Home, { generateMetadata } from "./page";

/* La page est asynchrone : les situations du panneau viennent des MDX des piliers. */
let home: Awaited<ReturnType<typeof Home>>;

beforeAll(async () => {
  Element.prototype.scrollIntoView = vi.fn();
  home = await Home();
}, 60_000);

describe("Accueil (métadonnées, P5.1)", () => {
  it("porte le titre et la description de docs/01 §8 et une canonique absolue", () => {
    const metadata = generateMetadata();
    expect(metadata.title).toBe("Aide à domicile spécialisée à Paris et en Île-de-France");
    expect(String(metadata.description).length).toBeGreaterThanOrEqual(140);
    expect(String(metadata.description).length).toBeLessThanOrEqual(155);
    expect(metadata.alternates?.canonical).toBe("https://www.youdom-care.com/");
    expect(metadata.openGraph).toMatchObject({ locale: "fr_FR", siteName: "Youdom Care" });
  });
});

describe("Accueil (blocs 1 à 8)", () => {
  it("rend la bannière, les six situations, les engagements et le bloc neuro", () => {
    render(home);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Vivre chez soi, bien accompagné. Même quand la maladie ou le handicap compliquent tout.",
    );
    // Le numéro est formaté avec des espaces insécables : on tolère tout séparateur.
    expect(screen.getByRole("link", { name: /Ou appelez le 01.84.80.17.03/ })).toHaveAttribute(
      "href",
      "tel:+33184801703",
    );

    const situations = screen.getByRole("region", { name: "Que vivez-vous en ce moment ?" });
    expect(within(situations).getAllByRole("article")).toHaveLength(6);
    expect(within(situations).getAllByRole("link")).toHaveLength(6);
    expect(situations.querySelectorAll(".situation-card svg[data-icon]")).toHaveLength(6);

    const engagements = screen.getByRole("region", { name: "Ce qui change avec Youdom Care" });
    expect(within(engagements).getAllByRole("listitem")).toHaveLength(4);

    const neuro = screen.getByRole("region", { name: /un accompagnement qui évolue/ });
    expect(within(neuro).getAllByRole("listitem")).toHaveLength(3);
    expect(within(neuro).getByRole("img")).toHaveAttribute(
      "alt",
      "Un couple âgé lave de la salade dans une cuisine",
    );
  });

  it("propose le parcours « Pour qui cherchez-vous de l'aide ? » et ouvre le panneau du public choisi", async () => {
    const user = userEvent.setup();
    render(home);
    const picker = screen.getByRole("group", { name: "Pour qui cherchez-vous de l'aide ?" });
    const buttons = within(picker).getAllByRole("button");
    expect(buttons.map((b) => b.textContent)).toEqual([
      "Pour un parent âgé",
      "Pour un proche : Alzheimer, Parkinson…",
      "Pour mon enfant",
      "Pour moi : je vis avec un handicap",
      "Pour moi : j'aide un proche",
    ]);
    // Le choix sans panneau mène au rappel avec le motif : la page y affiche son message.
    expect(within(picker).getByRole("link", { name: "Je ne sais pas encore" })).toHaveAttribute(
      "href",
      expect.stringMatching(/^\/etre-rappele\/?\?motif=inconnu$/),
    );

    await user.click(within(picker).getByRole("button", { name: "Pour un parent âgé" }));
    const title = screen.getByRole("heading", {
      level: 2,
      name: "Vous cherchez de l'aide pour votre parent. Que vivez-vous ?",
    });
    expect(title).toHaveFocus();
    const region = screen.getByRole("region", {
      name: "Vous cherchez de l'aide pour votre parent. Que vivez-vous ?",
    });
    const shown = region.querySelector("[data-panel=personne-agee]");
    const links = within(shown as HTMLElement).getAllByRole("link");
    // Trois à cinq situations du pilier, puis « Autre chose ».
    expect(links.length).toBeGreaterThanOrEqual(4);
    expect(links.length).toBeLessThanOrEqual(6);
    expect(links[0]).toHaveTextContent("« Elle est tombée deux fois ce mois-ci. »");
    expect(links[0]).toHaveAttribute(
      "href",
      expect.stringMatching(/^\/personnes-agees\/?#situations$/),
    );
    // Une situation qui a sa destination propre (`href` de l'en-tête) y mène directement.
    const aidant = links.find((link) => /je n'y arrive plus/.test(link.textContent ?? ""));
    expect(aidant).toHaveAttribute("href", expect.stringMatching(/^\/aidants\/?$/));
    expect(links[links.length - 1]).toHaveTextContent("Autre chose : je décris ma situation");
    expect(within(region).getByText("Toutes les situations").tagName).toBe("SUMMARY");
    expect(region.querySelectorAll("details .situation-card")).toHaveLength(6);
  });

  it("rend les semaines types avec le sélecteur segmenté et la photo, les étapes, le prix sans tarif et les proches", async () => {
    const user = userEvent.setup();
    render(home);
    const semaine = screen.getByRole("region", {
      name: "À quoi ressemble une semaine avec nous ?",
    });
    const selector = within(semaine).getByRole("group", { name: "Choisir un exemple" });
    const buttons = within(selector).getAllByRole("button");
    expect(buttons.map((b) => b.textContent)).toEqual([
      "Madeleine, 82 ans, maladie d'Alzheimer",
      "Noé, 8 ans, autisme",
      "Bernard, 74 ans, retour d'hospitalisation",
    ]);
    expect(buttons[0]).toHaveAttribute("aria-pressed", "true");
    expect(buttons[0]?.querySelector('[data-icon="memoire"]')).not.toBeNull();
    const panel = semaine.querySelector("[data-example=madeleine]");
    expect(panel).toHaveTextContent("Exemple illustratif");
    expect(within(panel as HTMLElement).getByRole("img")).toHaveAttribute(
      "alt",
      "Un couple âgé assis à une table de cuisine se tient la main",
    );
    await user.click(buttons[1] as HTMLElement);
    expect(buttons[1]).toHaveAttribute("aria-pressed", "true");
    expect(
      within(semaine.querySelector("[data-example=noe]") as HTMLElement).getByRole("img"),
    ).toHaveAttribute(
      "alt",
      "Les mains d'un enfant, vu de haut, alignent des cubes de bois colorés sur un plancher",
    );
    await user.click(buttons[0] as HTMLElement);
    expect(
      within(semaine).getByRole("link", { name: "Je décris ma situation" }),
    ).toBeInTheDocument();

    const etapes = screen.getByRole("region", { name: "Comment ça commence" });
    const steps = within(etapes).getAllByRole("listitem");
    expect(steps).toHaveLength(4);
    expect(steps[2]).toHaveTextContent("Si le courant ne passe pas, nous changeons.");
    // Icônes des nœuds du fil (accueil.json) : étapes, engagements, stades.
    expect(steps[0]?.querySelector('[data-icon="telephone"]')).not.toBeNull();
    expect(steps[2]?.querySelector('[data-icon="deux-personnes"]')).not.toBeNull();
    expect(
      document.querySelector('[data-engagement="E1"] [data-icon="fiche-de-vie"]'),
    ).not.toBeNull();
    expect(document.querySelector('.stage-cards [data-icon="24h"]')).not.toBeNull();
    expect(within(etapes).getByRole("img")).toHaveAttribute(
      "alt",
      "Une femme âgée ouvre la porte de son appartement sur un palier d'immeuble",
    );

    const prix = screen.getByRole("region", { name: "Combien ça coûte, vraiment ?" });
    expect(prix.querySelector("[data-block=tarifs]")).toBeNull();
    expect(within(prix).getByRole("article", { name: "Les aides possibles" })).toBeInTheDocument();
    expect(within(prix).getByRole("link", { name: "Je découvre les aides" })).toBeInTheDocument();

    const proches = screen.getByRole("region", { name: "Et vous, qui prend soin de vous ?" });
    expect(within(proches).getByRole("link", { name: "J'ai besoin de relais" })).toHaveAttribute(
      "href",
      expect.stringMatching(/^\/aidants\/?$/),
    );
    expect(within(proches).getByRole("img")).toHaveAttribute(
      "alt",
      "Une femme d'une soixantaine d'années, assise sur un rebord de fenêtre, regarde dehors",
    );
    // 27/09/2026 : la bannière porte une photo de fond décorative, sans cadre ni priorité. Les
    // cinq images de la page (fond de bannière, neuro, la semaine affichée, étapes, proches) se
    // chargent donc toutes à la demande.
    const images = Array.from(document.querySelectorAll("main img"));
    expect(images).toHaveLength(5);
    expect(images.filter((img) => img.getAttribute("loading") === "lazy")).toHaveLength(5);
    expect(images[0]).toHaveAttribute("alt", "");
  });
});

describe("Accueil (blocs 9 à 12)", () => {
  it("rend le territoire avec le nombre d'agences calculé, l'appel final et le recrutement", () => {
    render(home);
    const territoire = screen.getByRole("region", { name: "Partout à Paris et en Île-de-France" });
    expect(territoire).toHaveTextContent("6 agences, huit départements.");
    expect(within(territoire).getByRole("combobox")).toBeInTheDocument();
    expect(within(territoire).getByRole("button", { name: "Vérifier" })).toBeInTheDocument();

    expect(screen.queryByRole("region", { name: /Le Fil, le magazine/ })).not.toBeInTheDocument();

    const appel = screen.getByRole("region", { name: "Parlons de votre situation." });
    expect(within(appel).getByRole("link", { name: "Être rappelé(e)" })).toBeInTheDocument();
    expect(
      within(appel).getByRole("link", { name: /J'appelle le 01.84.80.17.03/ }),
    ).toHaveAttribute("href", "tel:+33184801703");

    const recrutement = screen.getByRole("region", { name: "Vous êtes auxiliaire de vie ?" });
    expect(within(recrutement).getByRole("link", { name: "Voir les offres" })).toBeInTheDocument();
  });
});
