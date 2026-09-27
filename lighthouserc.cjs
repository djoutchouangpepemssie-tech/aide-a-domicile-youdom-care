/*
 * Lighthouse CI (`pnpm lhci`, voir scripts/lhci.ts) : pages témoins, mobile et réseau 4G
 * simulé, budgets bloquants de docs/07 §5 (tolérances de D-026). INP ne se mesure pas en
 * laboratoire : il est suivi en conditions réelles, le temps de blocage total sert de garde-fou
 * ici. Les rapports restent sur le disque (.lighthouseci/, ignoré par git) : rien n'est téléversé.
 */

const KO = 1024;

// Pages services en statut a_relire : noindex voulu (docs/03 §1) tant que la relecture
// professionnelle manque, ce qui fait échouer le seul audit « is-crawlable » et plafonne la
// catégorie SEO à 0,69. Elles sortent de cette liste quand elles passent en « publie ».
// Page locale (phase 6) : a_relire tant qu'Arcel n'a pas relu (docs/04 §4).
const pageLocale = "/aide-a-domicile/hauts-de-seine/puteaux/";
const nonIndexees = ["/personnes-agees/", "/services/garde-de-nuit/", pageLocale];
// Page d'agence (phase 6) : indexable, avec formulaire de rappel.
const agence = "/agences/puteaux/";
const nonIndexeesPattern = nonIndexees.map((p) => p.replace(/\//g, "\\/")).join("|");

// Budgets communs (docs/07 §5, D-019, tolérances D-026 après les photos et le mouvement de la
// phase 4b : LCP 2,1 s, temps de blocage 200 ms, objectifs 2,0 s et 150 ms conservés en cible).
const communs = {
  "categories:performance": ["error", { minScore: 0.95 }],
  "categories:accessibility": ["error", { minScore: 1 }],
  "categories:best-practices": ["error", { minScore: 1 }],
  "largest-contentful-paint": ["error", { maxNumericValue: 2100 }],
  "cumulative-layout-shift": ["error", { maxNumericValue: 0.05 }],
  "total-blocking-time": ["error", { maxNumericValue: 200 }],
  "total-byte-weight": ["error", { maxNumericValue: 900 * KO }],
  "resource-summary:font:size": ["error", { maxNumericValue: 180 * KO }],
  "resource-summary:font:count": ["error", { maxNumericValue: 2 }],
};

module.exports = {
  ci: {
    collect: {
      startServerCommand: "pnpm start -p 3102",
      startServerReadyPattern: "Ready",
      // Pages témoins : l'accueil (page de contenu), le rappel (page avec formulaire), puis,
      // depuis la phase 4b (D-024), un pilier et une page service enrichis de photos, d'icônes
      // et de mouvement ; ces pages portent le formulaire détaillé en section 12.
      url: [
        "http://localhost:3102/",
        "http://localhost:3102/etre-rappele/",
        ...nonIndexees.map((p) => `http://localhost:3102${p}`),
        `http://localhost:3102${agence}`,
      ],
      numberOfRuns: 3,
      settings: {
        // Chromium ouvert par scripts/lhci.ts.
        port: 9222,
        // Étranglement appliqué pendant la mesure (4G, processeur ×4) plutôt que simulé
        // après coup : la simulation attribue à la première peinture tout ce qui s'est
        // chargé avant elle sur un poste rapide (scripts compris) et surestime le LCP.
        throttlingMethod: "devtools",
      },
    },
    assert: {
      // Budgets communs, SEO selon l'indexabilité, puis le JavaScript initial selon le type de
      // page (docs/07 §5, D-019, D-026).
      assertMatrix: [
        {
          matchingUrlPattern: `^(?!.*(${nonIndexeesPattern})).*`,
          aggregationMethod: "median",
          assertions: { ...communs, "categories:seo": ["error", { minScore: 1 }] },
        },
        {
          matchingUrlPattern: nonIndexeesPattern,
          aggregationMethod: "median",
          assertions: {
            ...communs,
            "categories:seo": ["error", { minScore: 0.65 }],
            "is-crawlable": "off",
          },
        },
        {
          matchingUrlPattern: "http://localhost:3102/$",
          aggregationMethod: "median",
          assertions: {
            "resource-summary:script:size": ["error", { maxNumericValue: 165 * KO }],
          },
        },
        {
          matchingUrlPattern: "/etre-rappele/|\\/personnes-agees\\/|\\/services\\/garde-de-nuit\\/",
          aggregationMethod: "median",
          assertions: {
            "resource-summary:script:size": ["error", { maxNumericValue: 225 * KO }],
          },
        },
        {
          // Pages locale et agence (phase 6, D-028) : formulaire de rappel, recherche de commune et
          // semaine type sur la même page ; cible 220 Ko conservée (docs/07 §5, dette DP.1).
          matchingUrlPattern: `${pageLocale.replace(/\//g, "\\/")}|${agence.replace(/\//g, "\\/")}`,
          aggregationMethod: "median",
          assertions: {
            "resource-summary:script:size": ["error", { maxNumericValue: 235 * KO }],
          },
        },
      ],
    },
    upload: {
      target: "filesystem",
      outputDir: ".lighthouseci",
    },
  },
};
