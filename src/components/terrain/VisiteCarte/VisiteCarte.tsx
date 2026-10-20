"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/Badge/Badge";
import { Button } from "@/components/ui/Button/Button";
import { TextField } from "@/components/ui/TextField/TextField";
import { cn } from "@/lib/cn";
import type { VisiteDuJour } from "@/lib/bureau/api";
import { prochainGeste, type PointageSource, type PointageType } from "@/lib/terrain/pointages";

/*
 * Une visite de la tournée, et son pointage.
 *
 * Un seul geste est proposé à la fois — celui que le terrain attend ensuite : en route, j'arrive,
 * je repars. Afficher les trois boutons en permanence, c'est inviter à pointer un départ avant une
 * arrivée depuis une poche.
 *
 * Le pointage par badge (NFC) n'est proposé que si le navigateur sait le lire : sur un téléphone
 * qui ne l'a pas, un bouton « badge » qui ne répond jamais est pire que pas de bouton. Le pointage
 * **manuel reste toujours accessible, avec un motif obligatoire** (MY-02) : un badge se décolle,
 * et sans porte de sortie les intervenants trouveront la leur — elle sera pire.
 */

const GESTES: Record<PointageType, { bouton: string; fait: string }> = {
  en_route: { bouton: "Je suis en route", fait: "en route" },
  arrivee: { bouton: "Je suis arrivée", fait: "arrivée" },
  depart: { bouton: "Je repars", fait: "départ" },
};

const NATURES: Record<VisiteDuJour["nature"], string> = {
  jour: "jour",
  nuit_calme: "nuit calme",
  nuit_active: "nuit active",
  continu: "24 h/24",
};

/** L'heure parisienne d'un instant ISO, en « 9 h 05 » — jamais « 09:05:00 ». */
export function heure(iso: string): string {
  const date = new Date(iso);
  const parties = new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(date);
  const h = parties.find((partie) => partie.type === "hour")?.value ?? "";
  const m = parties.find((partie) => partie.type === "minute")?.value ?? "";
  return `${Number.parseInt(h, 10)} h ${m}`;
}

export function VisiteCarte({
  visite,
  enAttente,
  nfcDisponible,
  onPointer,
  className,
}: {
  visite: VisiteDuJour;
  /** Les pointages de cette visite qui n'ont pas encore pu partir. */
  enAttente: { type: string; essais: number }[];
  nfcDisponible: boolean;
  onPointer: (type: PointageType, source: PointageSource, motif?: string) => void;
  className?: string;
}) {
  const [motifOuvert, setMotifOuvert] = useState(false);
  const [motif, setMotif] = useState("");

  // Ce qui est pointé : ce que l'API connaît, plus ce qui attend encore de partir.
  const pointes = [...visite.pointages, ...enAttente];
  const geste = prochainGeste(pointes);

  return (
    <li className={cn("rounded-card border border-line bg-white p-4", className)}>
      <p className="m-0 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="text-h4 font-bold">
          {heure(visite.debut)} – {heure(visite.fin)}
        </span>
        <Badge tone="teal">{NATURES[visite.nature]}</Badge>
        {geste === "termine" ? <Badge tone="green">visite pointée</Badge> : null}
      </p>

      <p className="m-0 mt-1 font-bold">{visite.foyer.code ?? "Foyer"}</p>
      {visite.adresse ? (
        <address className="m-0 mt-1 not-italic">
          {visite.adresse.line1}
          {visite.adresse.line2 ? <>, {visite.adresse.line2}</> : null}
          <br />
          {visite.adresse.postalCode} {visite.adresse.city}
        </address>
      ) : null}

      {pointes.length > 0 ? (
        <ul className="m-0 mt-3 flex list-none flex-wrap gap-x-4 gap-y-1 p-0 text-small">
          {visite.pointages.map((pointage) => (
            <li key={`${pointage.type}-${pointage.at}`}>
              {GESTES[pointage.type as PointageType]?.fait ?? pointage.type} à {heure(pointage.at)}
            </li>
          ))}
          {enAttente.map((pointage, index) => (
            <li key={`attente-${pointage.type}-${index}`}>
              {GESTES[pointage.type as PointageType]?.fait ?? pointage.type}{" "}
              <Badge tone="raspberry">en attente d’envoi</Badge>
              {pointage.essais > 1 ? <> ({pointage.essais} essais)</> : null}
            </li>
          ))}
        </ul>
      ) : null}

      {geste === "termine" ? null : (
        <div className="mt-4 grid gap-2">
          {nfcDisponible ? (
            <Button type="button" onClick={() => onPointer(geste, "nfc")}>
              {GESTES[geste].bouton} — badge
            </Button>
          ) : null}

          {motifOuvert ? (
            <div className="grid gap-2">
              <TextField
                label="Pourquoi un pointage manuel ?"
                hint="Badge illisible, téléphone sans NFC, oubli… Une phrase suffit, et elle reste dans le journal."
                value={motif}
                onChange={(evenement) => setMotif(evenement.target.value)}
              />
              <Button
                type="button"
                disabled={motif.trim().length < 3}
                onClick={() => {
                  onPointer(geste, "manuel", motif.trim());
                  setMotif("");
                  setMotifOuvert(false);
                }}
              >
                {GESTES[geste].bouton}
              </Button>
              <Button variant="link" type="button" onClick={() => setMotifOuvert(false)}>
                Annuler
              </Button>
            </div>
          ) : (
            <Button
              variant={nfcDisponible ? "outline" : "primary"}
              type="button"
              onClick={() => setMotifOuvert(true)}
            >
              {GESTES[geste].bouton}
              {nfcDisponible ? " — à la main" : ""}
            </Button>
          )}
        </div>
      )}
    </li>
  );
}
