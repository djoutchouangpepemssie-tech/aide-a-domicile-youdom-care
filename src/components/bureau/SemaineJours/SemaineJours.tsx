import { Badge } from "@/components/ui/Badge/Badge";
import { Card } from "@/components/ui/Card/Card";
import { Heading } from "@/components/ui/Heading/Heading";
import { cn } from "@/lib/cn";
import type { Intervenant, Occurrence, Signalement } from "@/lib/bureau/api";
import { joursDe, libelleJour } from "@/lib/bureau/semaine";

/*
 * La semaine de l'agence : **une liste par jour**, et non un tableau à sept colonnes.
 *
 * Pourquoi pas le tableau de la semaine type du site : là-bas, les créneaux sont fixes et la
 * grille a du sens. Ici les heures varient, un jour peut porter dix visites, et un coordinateur
 * lit sa journée de haut en bas. Un tableau obligerait à faire défiler horizontalement un écran
 * qu'on consulte toute la journée — c'est exactement ce que docs/02 interdit.
 *
 * Trois règles d'affichage tenues ici :
 * - **jamais la couleur seule** : « à pourvoir » est écrit, pas seulement coloré ;
 * - **prénom et initiale**, jamais le nom complet d'un intervenant (`PERMISSIONS.md` §8) ;
 * - un jour sans visite le dit, au lieu de laisser une case vide qu'on interprète mal.
 */

export interface SemaineJoursProps {
  semaine: { from: string; to: string };
  occurrences: readonly Occurrence[];
  intervenants: readonly Intervenant[];
  signalements: readonly Signalement[];
  /** Jour mis en avant (aujourd'hui), au format `AAAA-MM-JJ`. */
  aujourdhui?: string;
  className?: string;
}

const NATURES: Record<Occurrence["kind"], string> = {
  jour: "jour",
  nuit_calme: "nuit calme",
  nuit_active: "nuit active",
  continu: "24 h/24",
};

function clef(occurrence: Occurrence): string {
  return `${occurrence.serieId}#${occurrence.date}#${occurrence.slotIndex}`;
}

export function SemaineJours({
  semaine,
  occurrences,
  intervenants,
  signalements,
  aujourdhui,
  className,
}: SemaineJoursProps) {
  const parIntervenant = new Map(intervenants.map((personne) => [personne.id, personne]));
  const signalementsParVisite = new Map<string, Signalement[]>();
  for (const signalement of signalements) {
    for (const visite of signalement.visites) {
      signalementsParVisite.set(visite, [
        ...(signalementsParVisite.get(visite) ?? []),
        signalement,
      ]);
    }
  }

  return (
    <ol className={cn("m-0 grid list-none gap-4 p-0 lg:grid-cols-2 xl:grid-cols-3", className)}>
      {joursDe(semaine).map((jour) => {
        const duJour = occurrences
          .filter((occurrence) => occurrence.date === jour)
          .sort((a, b) => a.start.localeCompare(b.start));
        return (
          <li key={jour}>
            <Card
              as="section"
              padding="md"
              className={cn(jour === aujourdhui && "border-2 border-teal-700")}
            >
              <Heading level={3} visual={4} className="m-0 first-letter:uppercase">
                {libelleJour(jour)}
                {jour === aujourdhui ? <span className="sr-only"> (aujourd’hui)</span> : null}
              </Heading>

              {duJour.length === 0 ? (
                <p className="mt-2 mb-0 text-small text-text-soft">Aucune visite prévue.</p>
              ) : (
                <ol className="m-0 mt-3 grid list-none gap-2 p-0">
                  {duJour.map((occurrence) => {
                    const personne = occurrence.workerId
                      ? parIntervenant.get(occurrence.workerId)
                      : null;
                    const alertes = signalementsParVisite.get(clef(occurrence)) ?? [];
                    return (
                      <li
                        key={clef(occurrence)}
                        className="rounded-field border border-line bg-white p-3"
                      >
                        <p className="m-0 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                          <strong>
                            {occurrence.start}–{occurrence.end}
                          </strong>
                          <span className="text-small text-text-soft">
                            {NATURES[occurrence.kind]}
                          </span>
                          {occurrence.origine === "exception" ? (
                            <Badge tone="azure">modifiée</Badge>
                          ) : null}
                        </p>
                        <p className="m-0 mt-1">
                          {occurrence.workerId ? (
                            personne ? (
                              <>
                                {personne.prenom} {personne.initiale}.
                              </>
                            ) : (
                              "intervenant inconnu"
                            )
                          ) : (
                            <Badge tone="raspberry">À pourvoir</Badge>
                          )}
                        </p>
                        {occurrence.motif ? (
                          <p className="m-0 mt-1 text-small text-text-soft">{occurrence.motif}</p>
                        ) : null}
                        {alertes.length > 0 ? (
                          <ul className="m-0 mt-2 grid list-none gap-1 p-0 text-small">
                            {alertes.map((alerte, index) => (
                              <li key={`${alerte.regle}-${index}`}>
                                <Badge tone={alerte.severite === "bloquant" ? "raspberry" : "teal"}>
                                  {alerte.severite === "bloquant" ? "Bloquant" : "À regarder"}
                                </Badge>{" "}
                                {alerte.message}
                              </li>
                            ))}
                          </ul>
                        ) : null}
                      </li>
                    );
                  })}
                </ol>
              )}
            </Card>
          </li>
        );
      })}
    </ol>
  );
}
