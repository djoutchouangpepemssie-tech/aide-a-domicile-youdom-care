import { startSmtp } from "./smtp";

/* Démarre le serveur SMTP simulé avant les parcours et l'arrête après. */
export default async function globalSetup() {
  const stop = await startSmtp();
  return stop;
}
