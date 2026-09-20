import { defineConfig, devices } from "@playwright/test";

const port = 3100;
const baseURL = `http://localhost:${port}`;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  // Serveur SMTP simulé (tests/e2e/smtp.ts) : les demandes envoyées pendant les parcours y arrivent.
  globalSetup: "./tests/e2e/global-setup.ts",
  use: {
    baseURL,
    locale: "fr-FR",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "mobile", use: { ...devices["Pixel 7"] } },
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
  ],
  // Le site est statique : les parcours tournent sur le build de production (`pnpm build` avant).
  // La messagerie pointe vers le serveur SMTP simulé, sans chiffrement (local seulement).
  webServer: {
    command: `pnpm start -p ${port}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
    env: {
      ...Object.fromEntries(
        Object.entries(process.env).filter(
          (entry): entry is [string, string] => entry[1] !== undefined,
        ),
      ),
      SMTP_HOST: "127.0.0.1",
      SMTP_PORT: "2525",
      SMTP_ALLOW_INSECURE: "true",
      LEADS_FROM: "Youdom Care (test) <no-reply@test.local>",
      LEADS_TO: "equipe@test.local",
      // Les parcours envoient plus de cinq demandes depuis la même adresse.
      LEAD_RATE_LIMIT: "1000",
    },
  },
});
