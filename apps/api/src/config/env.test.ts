/** @vitest-environment node */
import { describe, expect, it } from "vitest";
import { readEnv } from "./env";

const base = {
  MONGODB_URI: "mongodb+srv://exemple",
  AUTH_PEPPER: "un-poivre-de-tests-suffisamment-long-0123456789",
};

describe("la configuration", () => {
  it("refuse de démarrer sans poivre d'authentification", () => {
    expect(() => readEnv({ MONGODB_URI: base.MONGODB_URI })).toThrow(/AUTH_PEPPER/);
  });

  it("refuse un poivre trop court", () => {
    expect(() => readEnv({ ...base, AUTH_PEPPER: "trop-court" })).toThrow();
  });

  it("refuse la production si l'hébergement certifié n'est pas confirmé", () => {
    expect(() => readEnv({ ...base, NODE_ENV: "production" })).toThrow(/HDS/);
  });

  it("accepte la production une fois l'hébergement confirmé", () => {
    const env = readEnv({
      ...base,
      NODE_ENV: "production",
      HDS_HOSTING_CONFIRMED: "true",
    });
    expect(env.HDS_HOSTING_CONFIRMED).toBe(true);
  });

  it("lit la liste des origines autorisées", () => {
    const env = readEnv({
      ...base,
      ALLOWED_ORIGINS: "https://youdom-care.fr, https://mon.youdom-care.fr",
    });
    expect(env.ALLOWED_ORIGINS).toEqual(["https://youdom-care.fr", "https://mon.youdom-care.fr"]);
  });
});
