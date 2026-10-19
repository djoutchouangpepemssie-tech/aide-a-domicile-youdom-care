/*
 * Le point d'entrée du service. Il ne fait que trois choses : lire la configuration, ouvrir la
 * base, écouter. Toute la logique est dans `src/http/app.ts`, qui se teste sans réseau.
 */
import { serve } from "@hono/node-server";
import { readEnv } from "./config/env";
import { applyIndexes, createClient } from "./db/client";
import { newId } from "./domaine/ids";
import { createApp } from "./http/app";
import { RecordingNotifier } from "./services/notifier";
import { MemoryRateLimiter } from "./services/rate-limit";
import { mongoAuditJournal, mongoAuditReader, mongoRepositories } from "./store/mongo";
import { RepositoryAuthorizationStore } from "./store/repositories";

const env = readEnv();
const client = createClient(env);
await client.connect();
const db = client.db(env.MONGODB_DB);
await applyIndexes(db);

const repositories = mongoRepositories(db);
const app = createApp({
  repositories,
  authorization: new RepositoryAuthorizationStore(repositories),
  journal: mongoAuditJournal(db),
  auditReader: mongoAuditReader(db),
  // À brancher sur la chaîne de courrier du site et sur un prestataire de SMS (question 15) :
  // d'ici là, le service enregistre ce qu'il a envoyé, et à qui, jamais le secret.
  notifier: new RecordingNotifier(),
  rateLimiter: new MemoryRateLimiter(),
  now: () => new Date(),
  newId,
  pepper: env.AUTH_PEPPER,
  allowedOrigins: env.ALLOWED_ORIGINS,
});

const port = Number(process.env.PORT ?? 8787);
serve({ fetch: app.fetch, port });
console.warn(`API Youdom Care à l'écoute sur le port ${port} (${env.NODE_ENV}).`);

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    void client.close().finally(() => process.exit(0));
  });
}
