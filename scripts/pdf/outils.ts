import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { mkdir, readFile, stat } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { chromium } from "@playwright/test";
import { listToolIds, toolPath } from "../../src/content/tool-pages";

/*
 * `pnpm pdf:outils` (docs/06 §7, P7.7) : génère les PDF balisés des outils à imprimer depuis le
 * site construit (`pnpm build` d'abord). Le script démarre lui-même `next start` sur le port
 * 3109, attend qu'il réponde, imprime chaque page /outils/{slug}/ en A4 avec Chromium
 * (`tagged: true` : structure lisible par les lecteurs d'écran, `outline: true` : signets
 * d'après les titres, langue et titre du document repris de la page), écrit
 * public/outils/{slug}.pdf, puis arrête le serveur. Chaque PDF doit peser moins de 500 Ko,
 * porter un titre, une langue et un arbre de structure, et tenir sur deux pages au plus ;
 * sinon le script sort en erreur. Les PDF sont versionnés : on les régénère quand le contenu
 * d'un outil, la feuille d'impression ou les polices changent.
 */

const PORT = 3109;
const ORIGIN = `http://127.0.0.1:${PORT}`;
const MAX_BYTES = 500 * 1024;
const MAX_PAGES = 2;
const ROOT = path.resolve(process.cwd());
const OUT_DIR = path.join(ROOT, "public", "outils");

const require = createRequire(import.meta.url);

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForServer(url: string, timeoutMs: number): Promise<void> {
  const started = Date.now();
  let lastError = "";
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(url, { redirect: "manual" });
      if (response.status === 200) return;
      lastError = `HTTP ${response.status}`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
    await sleep(500);
  }
  throw new Error(`Le serveur ne répond pas sur ${url} après ${timeoutMs} ms (${lastError}).`);
}

function startServer(): ChildProcess {
  const nextBin = require.resolve("next/dist/bin/next");
  const child = spawn(process.execPath, [nextBin, "start", "-p", String(PORT)], {
    cwd: ROOT,
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, PORT: String(PORT) },
  });
  child.stderr?.on("data", (chunk: Buffer) => {
    const text = chunk.toString().trim();
    if (text) console.error(`[next start] ${text}`);
  });
  return child;
}

function stopServer(child: ChildProcess): void {
  if (child.exitCode !== null || child.pid === undefined) return;
  if (process.platform === "win32") {
    spawnSync("taskkill", ["/pid", String(child.pid), "/T", "/F"], { stdio: "ignore" });
  } else {
    child.kill("SIGTERM");
  }
}

export interface PdfFacts {
  bytes: number;
  pages: number;
  hasTitle: boolean;
  tagged: boolean;
  lang: string | null;
}

/** Faits vérifiables sans dépendance : taille, pages, titre, balisage, langue. */
export function inspectPdf(buffer: Buffer): PdfFacts {
  const text = buffer.toString("latin1");
  const pages = (text.match(/\/Type\s*\/Page(?![s\w])/g) ?? []).length;
  const hasTitle = /\/Title\s*[(<]/.test(text);
  const tagged = /\/StructTreeRoot\b/.test(text) && /\/Marked\s+true/.test(text);
  const lang = /\/Lang\s*\(([^)]*)\)/.exec(text)?.[1] ?? null;
  return { bytes: buffer.byteLength, pages, hasTitle, tagged, lang };
}

export function pdfProblems(facts: PdfFacts): string[] {
  const problems: string[] = [];
  if (facts.bytes >= MAX_BYTES) problems.push(`${Math.round(facts.bytes / 1024)} Ko ≥ 500 Ko`);
  if (facts.pages > MAX_PAGES) problems.push(`${facts.pages} pages > ${MAX_PAGES}`);
  if (!facts.hasTitle) problems.push("aucun titre de document");
  if (!facts.tagged) problems.push("PDF non balisé (StructTreeRoot absent)");
  if (!facts.lang) problems.push("langue absente");
  return problems;
}

async function main(): Promise<void> {
  try {
    await stat(path.join(ROOT, ".next", "BUILD_ID"));
  } catch {
    throw new Error("Aucun site construit : lancez `pnpm build` avant `pnpm pdf:outils`.");
  }
  await mkdir(OUT_DIR, { recursive: true });

  const server = startServer();
  let failures = 0;
  try {
    await waitForServer(`${ORIGIN}${toolPath(listToolIds()[0] ?? "")}`, 90_000);
    const browser = await chromium.launch();
    try {
      const context = await browser.newContext({ locale: "fr-FR" });
      const page = await context.newPage();
      for (const id of listToolIds()) {
        const url = `${ORIGIN}${toolPath(id)}`;
        const response = await page.goto(url, { waitUntil: "networkidle" });
        if (!response || response.status() !== 200) {
          throw new Error(`${url} → HTTP ${response?.status() ?? "sans réponse"}`);
        }
        await page.emulateMedia({ media: "print" });
        await page.evaluate(() => document.fonts.ready.then(() => undefined));
        const file = path.join(OUT_DIR, `${id}.pdf`);
        await page.pdf({
          path: file,
          format: "A4",
          printBackground: true,
          displayHeaderFooter: false,
          preferCSSPageSize: true,
          tagged: true,
          outline: true,
        });
        const facts = inspectPdf(await readFile(file));
        const problems = pdfProblems(facts);
        const mark = problems.length === 0 ? "✔" : "✖";
        console.log(
          `${mark} public/outils/${id}.pdf — ${Math.round(facts.bytes / 1024)} Ko, ${facts.pages} page(s), ` +
            `titre ${facts.hasTitle ? "oui" : "non"}, balisé ${facts.tagged ? "oui" : "non"}, langue ${facts.lang ?? "absente"}`,
        );
        for (const problem of problems) console.log(`  ✖ ${problem}`);
        if (problems.length > 0) failures += 1;
      }
    } finally {
      await browser.close();
    }
  } finally {
    stopServer(server);
  }
  if (failures > 0) {
    throw new Error(`${failures} PDF hors critères (voir ci-dessus).`);
  }
  console.log(`\n${listToolIds().length} PDF écrits dans public/outils/.`);
}

const isDirectRun = process.argv[1] !== undefined && /outils\.ts$/.test(process.argv[1]);
if (isDirectRun) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
