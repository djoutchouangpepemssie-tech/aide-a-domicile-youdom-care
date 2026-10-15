import { randomBytes } from "node:crypto";

/*
 * Les identifiants sont des chaînes de 24 hexadécimaux — la forme d'un ObjectId MongoDB, mais
 * produite par nous. Deux conséquences utiles : un document relu depuis la base n'a aucune
 * conversion à subir (`_id` est déjà une chaîne, dans les schémas comme dans la base), et
 * l'application peut créer un identifiant avant d'écrire, ce dont les files de synchronisation
 * hors ligne de l'application intervenant auront besoin en vague 2.
 */
export function newId(): string {
  return randomBytes(12).toString("hex");
}
