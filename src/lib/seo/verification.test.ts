import { describe, expect, it } from "vitest";
import { siteVerification } from "./verification";

describe("siteVerification", () => {
  it("ne produit rien quand les variables sont absentes ou vides", () => {
    expect(siteVerification({})).toBeUndefined();
    expect(
      siteVerification({ GOOGLE_SITE_VERIFICATION: "  ", BING_SITE_VERIFICATION: "" }),
    ).toBeUndefined();
  });

  it("relaie Google et Bing quand ils sont renseignés", () => {
    expect(siteVerification({ GOOGLE_SITE_VERIFICATION: "abc" })).toEqual({ google: "abc" });
    expect(siteVerification({ BING_SITE_VERIFICATION: "xyz" })).toEqual({
      other: { "msvalidate.01": "xyz" },
    });
    expect(
      siteVerification({ GOOGLE_SITE_VERIFICATION: "abc", BING_SITE_VERIFICATION: "xyz" }),
    ).toEqual({ google: "abc", other: { "msvalidate.01": "xyz" } });
  });
});
