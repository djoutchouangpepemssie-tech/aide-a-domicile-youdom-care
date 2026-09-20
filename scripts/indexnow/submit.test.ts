import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildIndexNowPayload,
  collectSitemapUrls,
  describeStatus,
  INDEXNOW_ENDPOINT,
  maskKey,
  parseArgs,
  run,
  writeKeyFile,
} from "./submit";

const KEY = "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6";
const SITE = "https://www.youdom-care.com";
const URLS = [`${SITE}/`, `${SITE}/comment-ca-marche/`];

function fetchMock(status = 200) {
  return vi.fn(async () => new Response("", { status })) as unknown as typeof fetch;
}

describe("indexnow : charge utile", () => {
  it("construit host, key, keyLocation et urlList sans doublon", () => {
    const payload = buildIndexNowPayload({ siteUrl: SITE, key: KEY, urls: [...URLS, URLS[0]] });
    expect(payload).toEqual({
      host: "www.youdom-care.com",
      key: KEY,
      keyLocation: `${SITE}/${KEY}.txt`,
      urlList: URLS,
    });
  });

  it("refuse une clé mal formée, une liste vide ou une adresse hors domaine", () => {
    expect(() => buildIndexNowPayload({ siteUrl: SITE, key: "court", urls: URLS })).toThrow(
      /INDEXNOW_KEY/,
    );
    expect(() => buildIndexNowPayload({ siteUrl: SITE, key: "clé accentuée", urls: URLS })).toThrow(
      /INDEXNOW_KEY/,
    );
    expect(() => buildIndexNowPayload({ siteUrl: SITE, key: KEY, urls: [] })).toThrow(
      /aucune adresse/,
    );
    expect(() =>
      buildIndexNowPayload({ siteUrl: SITE, key: KEY, urls: ["https://autre.fr/"] }),
    ).toThrow(/hors de www\.youdom-care\.com/);
  });

  it("lit les options et rejette les inconnues", () => {
    expect(parseArgs([])).toEqual({ dryRun: false, writeKey: false });
    expect(parseArgs(["--dry-run"])).toEqual({ dryRun: true, writeKey: false });
    expect(parseArgs(["--write-key"])).toEqual({ dryRun: false, writeKey: true });
    expect(() => parseArgs(["--force"])).toThrow(/option inconnue/);
  });

  it("masque la clé dans les journaux et décrit les statuts", () => {
    expect(maskKey(KEY)).toBe("a1b2…(32 caractères)");
    expect(maskKey(KEY)).not.toContain(KEY.slice(4));
    expect(describeStatus(200)).toBe("reçu");
    expect(describeStatus(403)).toMatch(/clé refusée/);
    expect(describeStatus(418)).toBe("réponse inattendue");
  });

  it("prend les adresses des plans de site, absolues, sans zone noindex", async () => {
    const urls = await collectSitemapUrls();
    expect(urls).toContain(`${SITE}/comment-ca-marche/`);
    expect(urls).toContain(`${SITE}/`);
    for (const url of urls) {
      expect(url.startsWith(`${SITE}/`)).toBe(true);
      expect(url.endsWith("/")).toBe(true);
      expect(url).not.toMatch(/\/(merci|styleguide|api)\//);
    }
  });
});

describe("indexnow : exécution", () => {
  let dir: string;
  const lines: string[] = [];
  const log = (line: string) => {
    lines.push(line);
  };

  beforeEach(async () => {
    dir = await mkdtemp(path.join(os.tmpdir(), "indexnow-"));
    lines.length = 0;
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("simule sans clé : rien n'est envoyé, le journal résume", async () => {
    const fetchImpl = fetchMock();
    const result = await run({ argv: [], env: {}, fetchImpl, log, urls: async () => URLS });
    expect(result).toEqual({ mode: "dry-run", payload: null, urls: URLS });
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(lines[0]).toMatch(/simulation, INDEXNOW_KEY absente.*2 adresse\(s\)/);
  });

  it("simule avec clé et --dry-run : la charge utile est construite mais pas envoyée", async () => {
    const fetchImpl = fetchMock();
    const result = await run({
      argv: ["--dry-run"],
      env: { INDEXNOW_KEY: KEY },
      fetchImpl,
      log,
      urls: async () => URLS,
    });
    expect(result.mode).toBe("dry-run");
    if (result.mode === "dry-run") expect(result.payload?.keyLocation).toBe(`${SITE}/${KEY}.txt`);
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(lines.join("\n")).not.toContain(KEY);
  });

  it("envoie la charge utile en JSON à l'API quand la clé est là", async () => {
    const fetchImpl = fetchMock(202);
    const result = await run({
      argv: [],
      env: { INDEXNOW_KEY: KEY },
      fetchImpl,
      log,
      urls: async () => URLS,
    });
    expect(result.mode).toBe("submitted");
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, init] = vi.mocked(fetchImpl).mock.calls[0] as [string, RequestInit];
    expect(url).toBe(INDEXNOW_ENDPOINT);
    expect(init.method).toBe("POST");
    expect(init.headers).toEqual({ "Content-Type": "application/json; charset=utf-8" });
    expect(JSON.parse(String(init.body))).toEqual({
      host: "www.youdom-care.com",
      key: KEY,
      keyLocation: `${SITE}/${KEY}.txt`,
      urlList: URLS,
    });
    expect(lines.at(-1)).toMatch(/HTTP 202/);
  });

  it("échoue sur un statut d'erreur", async () => {
    await expect(
      run({
        argv: [],
        env: { INDEXNOW_KEY: KEY },
        fetchImpl: fetchMock(403),
        log,
        urls: async () => URLS,
      }),
    ).rejects.toThrow(/HTTP 403/);
  });

  it("--write-key : sans clé ne fait rien, avec clé écrit public/<clé>.txt", async () => {
    const skipped = await run({ argv: ["--write-key"], env: {}, log, publicDir: dir });
    expect(skipped).toEqual({ mode: "key-skipped" });

    const written = await run({
      argv: ["--write-key"],
      env: { INDEXNOW_KEY: ` ${KEY} ` },
      log,
      publicDir: dir,
    });
    expect(written.mode).toBe("key-written");
    expect(await readFile(path.join(dir, `${KEY}.txt`), "utf8")).toBe(KEY);
    await expect(writeKeyFile(dir, "trop court")).rejects.toThrow(/INDEXNOW_KEY/);
  });
});
