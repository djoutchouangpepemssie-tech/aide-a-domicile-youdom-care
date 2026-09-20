import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { simpleParser } from "mailparser";
import { SMTPServer } from "smtp-server";

/*
 * Serveur SMTP simulé pour les parcours de bout en bout (docs/05 §7, P3.10) : lancé par le
 * globalSetup de Playwright sur 127.0.0.1:2525, il dépose chaque message reçu dans
 * tests/e2e/.mails/ (ignoré par git) ; les tests le lisent avec `readMails`.
 */

export const SMTP_PORT = 2525;
export const MAILS_DIR = path.join(process.cwd(), "tests", "e2e", ".mails");

export interface StoredMail {
  from: string;
  to: string[];
  subject: string;
  text: string;
  html: string;
  replyTo: string | null;
  receivedAt: string;
}

export async function clearMails() {
  await rm(MAILS_DIR, { recursive: true, force: true });
  await mkdir(MAILS_DIR, { recursive: true });
}

export async function readMails(): Promise<StoredMail[]> {
  try {
    const names = (await readdir(MAILS_DIR)).filter((n) => n.endsWith(".json")).sort();
    const mails: StoredMail[] = [];
    for (const name of names) {
      mails.push(JSON.parse(await readFile(path.join(MAILS_DIR, name), "utf8")) as StoredMail);
    }
    return mails;
  } catch {
    return [];
  }
}

export async function startSmtp(): Promise<() => Promise<void>> {
  await clearMails();
  let counter = 0;
  const server = new SMTPServer({
    secure: false,
    disabledCommands: ["AUTH", "STARTTLS"],
    onData(stream, session, callback) {
      const chunks: Buffer[] = [];
      stream.on("data", (chunk: Buffer) => chunks.push(chunk));
      stream.on("end", () => {
        void simpleParser(Buffer.concat(chunks))
          .then(async (parsed) => {
            counter += 1;
            const stored: StoredMail = {
              from: session.envelope.mailFrom ? session.envelope.mailFrom.address : "",
              to: session.envelope.rcptTo.map((r) => r.address),
              subject: parsed.subject ?? "",
              text: parsed.text ?? "",
              html: typeof parsed.html === "string" ? parsed.html : "",
              replyTo: parsed.replyTo?.text ?? null,
              receivedAt: new Date().toISOString(),
            };
            const name = `${Date.now()}-${String(counter).padStart(4, "0")}.json`;
            await writeFile(path.join(MAILS_DIR, name), JSON.stringify(stored, null, 2));
          })
          .finally(() => callback());
      });
    },
  });
  await new Promise<void>((resolve, reject) => {
    server.on("error", reject);
    server.listen(SMTP_PORT, "127.0.0.1", () => resolve());
  });
  return () => new Promise<void>((resolve) => server.close(() => resolve()));
}
