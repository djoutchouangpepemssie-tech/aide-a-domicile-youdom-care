import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier/flat";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/consistent-type-imports": ["error", { prefer: "type-imports" }],
      "@typescript-eslint/no-non-null-assertion": "error",
      eqeqeq: ["error", "always", { null: "ignore" }],
      "no-console": ["error", { allow: ["warn", "error"] }],
      "prefer-const": "error",
      "no-var": "error",
    },
  },
  {
    // Les scripts d'outillage (contrôles, pipelines de données) écrivent sur la sortie standard.
    files: ["scripts/**/*.{ts,mts,js,mjs}"],
    rules: { "no-console": "off" },
  },
  prettier,
  // Sorties d'outils, jamais du code du projet : le rapport HTML de Playwright embarque son
  // propre JavaScript minifié, qui faisait remonter des milliers d'erreurs dès qu'on lançait les
  // parcours en local (la CI ne le voyait pas, son lint passe avant Playwright).
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "coverage/**",
    "test-results/**",
    "test-results-*/**",
    "playwright-report/**",
    ".lighthouseci/**",
  ]),
]);

export default eslintConfig;
