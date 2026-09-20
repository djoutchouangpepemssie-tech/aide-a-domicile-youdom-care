import type { ServicePage } from "@/content/service-schema";

/*
 * En-tête de page service fictif, pour les tests du gabarit et du schéma seulement : aucun
 * fait sur Youdom Care, prénom fictif, textes neutres. Jamais rendu sur le site.
 */

const mots = (n: number) =>
  Array.from({ length: n }, (_, i) => (i % 2 === 0 ? "mot" : "suivant")).join(" ") + ".";

export const serviceExemple: ServicePage = {
  titre: "Exemple de page service pour les tests unitaires du gabarit",
  description:
    "Un en-tête fictif utilisé par les tests unitaires du gabarit des pages services et pathologies, sans aucun fait réel sur les personnes ou sur Youdom Care.",
  chemin: "/exemple/page-test/",
  type: "pathologie",
  public: "neuro",
  pilier: "/exemple/",
  soeurs: ["/exemple/soeur-un/", "/exemple/soeur-deux/"],
  h1: "Exemple de page service",
  chapo: "Un chapô fictif pour les tests.",
  promesse: ["Première phrase de promesse.", "Seconde phrase de promesse."],
  reassurance: ["Réassurance une", "Réassurance deux"],
  situations: [
    { titre: "Situation une", texte: "Texte une." },
    { titre: "Situation deux", texte: "Texte deux." },
    { titre: "Situation trois", texte: "Texte trois." },
  ],
  actions: [
    { rubrique: "gestes", exemples: ["Exemple geste un", "Exemple geste deux"] },
    { rubrique: "presence", exemples: ["Exemple présence un", "Exemple présence deux"] },
    { rubrique: "lien", exemples: ["Exemple lien un", "Exemple lien deux"] },
    {
      rubrique: "coordination",
      exemples: ["Exemple coordination un", "Exemple coordination deux"],
    },
  ],
  stades: [
    { titre: "Au début", texte: "Texte du début." },
    { titre: "Plus tard", texte: "Texte de plus tard." },
  ],
  semaine_type: { exemple: "madeleine", recit: mots(90) },
  proches: { texte: "Texte pour les proches." },
  intervenants: { texte: "Texte sur les intervenants." },
  ne_faisons_pas: ["Les soins infirmiers", "Les décisions médicales"],
  aides: ["apa", "credit-d-impot-et-avance-immediate"],
  faq: Array.from({ length: 6 }, (_, i) => ({
    question: `Question fictive numéro ${i + 1} ?`,
    reponse: mots(50),
  })),
  formulaire: "neuro",
  sources: [
    { libelle: "Source une", href: "https://example.org/une", consulte_le: "2026-09-20" },
    {
      libelle: "Source deux",
      href: "https://example.org/deux",
      verifie_le: "2026-01-01",
      consulte_le: "2026-09-20",
    },
  ],
  auteur: { nom: "Auteur fictif", fonction: "rédaction" },
  relu_par: null,
  statut: "a_relire",
  maj: "2026-09-20",
};
