import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { flush, mesureEnabled, MESURE_ENDPOINT, track } from "./client";

/* Le client n'envoie que si NEXT_PUBLIC_MESURE_ACTIVE vaut "true" et si le visiteur n'a rien refusé. */

describe("client de la mesure (D-029)", () => {
  const original = process.env.NEXT_PUBLIC_MESURE_ACTIVE;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubEnv("NEXT_PUBLIC_MESURE_ACTIVE", "true");
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    if (original === undefined) delete process.env.NEXT_PUBLIC_MESURE_ACTIVE;
  });

  it("est inactive sans la variable de build", () => {
    vi.stubEnv("NEXT_PUBLIC_MESURE_ACTIVE", "");
    expect(mesureEnabled({})).toBe(false);
    vi.stubEnv("NEXT_PUBLIC_MESURE_ACTIVE", "true");
    expect(mesureEnabled({})).toBe(true);
  });

  it("respecte Do Not Track et Global Privacy Control", () => {
    expect(mesureEnabled({ doNotTrack: "1" })).toBe(false);
    expect(mesureEnabled({ globalPrivacyControl: true })).toBe(false);
    expect(mesureEnabled({ doNotTrack: "0" })).toBe(true);
  });

  it("envoie par sendBeacon, en JSON, avec le chemin sans paramètres", async () => {
    const sendBeacon = vi.fn(() => true);
    Object.defineProperty(navigator, "sendBeacon", { value: sendBeacon, configurable: true });
    window.history.replaceState(null, "", "/demande/neuro/?commune=92062#etape");

    track("demande_etape_vue", { formulaire: "neuro", etape: 2 });
    expect(sendBeacon).not.toHaveBeenCalled();
    vi.runAllTimers();

    expect(sendBeacon).toHaveBeenCalledTimes(1);
    const [url, blob] = sendBeacon.mock.calls[0] as unknown as [string, Blob];
    expect(url).toBe(MESURE_ENDPOINT);
    expect(blob.type).toBe("application/json");
    expect(JSON.parse(await blob.text())).toEqual({
      event: "demande_etape_vue",
      props: { formulaire: "neuro", etape: 2 },
      page: "/demande/neuro/",
    });
  });

  it("se replie sur fetch keepalive quand sendBeacon manque", () => {
    Object.defineProperty(navigator, "sendBeacon", { value: undefined, configurable: true });
    const fetchMock = vi.fn(async () => new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);
    window.history.replaceState(null, "", "/");

    track("appel_clic", { emplacement: "rail" });
    flush();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(MESURE_ENDPOINT);
    expect(init.method).toBe("POST");
    expect(init.keepalive).toBe(true);
    expect(JSON.parse(String(init.body))).toMatchObject({ event: "appel_clic" });
  });

  it("n'envoie rien quand le visiteur refuse le suivi", () => {
    const sendBeacon = vi.fn(() => true);
    Object.defineProperty(navigator, "sendBeacon", { value: sendBeacon, configurable: true });
    Object.defineProperty(navigator, "doNotTrack", { value: "1", configurable: true });

    track("rappel_envoye", {});
    vi.runAllTimers();

    expect(sendBeacon).not.toHaveBeenCalled();
    Object.defineProperty(navigator, "doNotTrack", { value: undefined, configurable: true });
  });
});
