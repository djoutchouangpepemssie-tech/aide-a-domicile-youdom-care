/*
 * Lighthouse CI (`pnpm lhci`, voir scripts/lhci.ts) : pages témoins, mobile et réseau 4G
 * simulé, budgets bloquants de docs/07 §5. INP ne se mesure pas en laboratoire : il est suivi
 * en conditions réelles, le temps de blocage total sert de garde-fou ici. Les rapports restent
 * sur le disque (.lighthouseci/, ignoré par git) : rien n'est téléversé.
 */

const KO = 1024;

module.exports = {
  ci: {
    collect: {
      startServerCommand: "pnpm start -p 3102",
      startServerReadyPattern: "Ready",
      // Pages témoins : l'accueil (page de contenu) et le rappel (page avec formulaire).
      url: ["http://localhost:3102/", "http://localhost:3102/etre-rappele/"],
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
      // Budgets communs, puis le JavaScript initial selon le type de page (docs/07 §5, D-019).
      assertMatrix: [
        {
          matchingUrlPattern: ".*",
          aggregationMethod: "median",
          assertions: {
            "categories:performance": ["error", { minScore: 0.95 }],
            "categories:accessibility": ["error", { minScore: 1 }],
            "categories:best-practices": ["error", { minScore: 1 }],
            "categories:seo": ["error", { minScore: 1 }],
            "largest-contentful-paint": ["error", { maxNumericValue: 2000 }],
            "cumulative-layout-shift": ["error", { maxNumericValue: 0.05 }],
            "total-blocking-time": ["error", { maxNumericValue: 150 }],
            "total-byte-weight": ["error", { maxNumericValue: 900 * KO }],
            "resource-summary:font:size": ["error", { maxNumericValue: 180 * KO }],
            "resource-summary:font:count": ["error", { maxNumericValue: 2 }],
          },
        },
        {
          matchingUrlPattern: "http://localhost:3102/$",
          aggregationMethod: "median",
          assertions: {
            "resource-summary:script:size": ["error", { maxNumericValue: 160 * KO }],
          },
        },
        {
          matchingUrlPattern: "/etre-rappele/",
          aggregationMethod: "median",
          assertions: {
            "resource-summary:script:size": ["error", { maxNumericValue: 220 * KO }],
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
