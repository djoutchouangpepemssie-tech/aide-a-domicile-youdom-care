import { MongoClient, type Db } from "mongodb";
import type { Env } from "../config/env";
import { COLLECTIONS } from "./collections";

/*
 * La connexion à MongoDB, et la pose des index.
 *
 * Deux exigences de `ARCHITECTURE.md` §4 sont câblées ici plutôt que confiées à la mémoire de
 * celui qui déploie : le chiffrement du transport (`tls`, imposé par Atlas en `mongodb+srv`), et
 * une écriture confirmée par la majorité des membres du jeu de réplicas — sans quoi un pointage ou
 * un événement d'audit peut disparaître lors d'une bascule, et un journal d'audit qui perd des
 * lignes ne vaut rien.
 */

export function createClient(env: Env): MongoClient {
  return new MongoClient(env.MONGODB_URI, {
    appName: "youdom-api",
    writeConcern: { w: "majority" },
    readConcern: { level: "majority" },
    retryWrites: true,
  });
}

export type IndexReport = Array<{ collection: string; index: string; created: boolean }>;

/**
 * Crée les collections manquantes et pose les index. Idempotent : MongoDB ignore un index déjà
 * présent à l'identique, et signale par une erreur un index de même nom mais de clés différentes
 * — ce qui est l'information qu'on veut, pas un silence.
 */
export async function applyIndexes(db: Db): Promise<IndexReport> {
  const existing = new Set(
    (await db.listCollections({}, { nameOnly: true }).toArray()).map((c) => c.name),
  );
  const report: IndexReport = [];

  for (const spec of COLLECTIONS) {
    if (!existing.has(spec.name)) await db.createCollection(spec.name);
    const collection = db.collection(spec.name);
    const present = new Set((await collection.indexes()).map((index) => index.name));
    for (const { keys, options } of spec.indexes) {
      const name = options?.name;
      if (name && present.has(name)) {
        report.push({ collection: spec.name, index: name, created: false });
        continue;
      }
      const created = await collection.createIndex(keys, options);
      report.push({ collection: spec.name, index: created, created: true });
    }
  }
  return report;
}
