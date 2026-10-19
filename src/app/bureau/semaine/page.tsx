"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { SemaineJours } from "@/components/bureau/SemaineJours/SemaineJours";
import { Badge } from "@/components/ui/Badge/Badge";
import { Button } from "@/components/ui/Button/Button";
import { Callout } from "@/components/ui/Callout/Callout";
import { Heading } from "@/components/ui/Heading/Heading";
import { ApiError, api, jeton, type Intervenant, type Moi, type Semaine } from "@/lib/bureau/api";
import { ajouterJours, aujourdhui, libelleSemaine, semaineDe } from "@/lib/bureau/semaine";

/*
 * La semaine de l'agence — le premier écran qui change la vie d'un coordinateur.
 *
 * Ce qu'il montre, dans cet ordre, parce que c'est l'ordre dans lequel on s'en sert :
 * 1. **ce qui manque** : les créneaux à pourvoir, comptés, en haut ;
 * 2. **ce qui cloche** : ce que les règles de l'agence signalent, et rien si aucune n'est saisie ;
 * 3. **la semaine**, jour par jour.
 *
 * Tout est lu depuis le navigateur, directement sur l'API certifiée. Aucun appel ne passe par
 * Vercel (`ARCHITECTURE.md` §4.2).
 */

type Etat =
  | { nom: "chargement" }
  | { nom: "pret"; moi: Moi; semaine: Semaine; intervenants: Intervenant[] }
  | { nom: "erreur"; message: string };

export default function SemainePage() {
  const router = useRouter();
  const [debut, setDebut] = useState(() => semaineDe(aujourdhui()).from);
  const [etat, setEtat] = useState<Etat>({ nom: "chargement" });

  /*
   * Le chargement ne pose pas lui-même l'état « chargement » : c'est le geste qui l'a demandé qui
   * le fait (les boutons de navigation, le bouton « Réessayer »). Autrement dit, aucun `setState`
   * synchrone dans l'effet — ce que React 19 reproche à juste titre, et ce que ce découpage évite
   * sans rien changer pour la personne devant l'écran.
   */
  const charger = useCallback(
    async (lundi: string) => {
      try {
        const moi = await api.moi();
        const agence = moi.agences[0];
        if (!agence) {
          setEtat({
            nom: "erreur",
            message:
              "Votre compte n’est rattaché à aucune agence. Demandez à votre responsable de vous rattacher.",
          });
          return;
        }
        const fenetre = { from: lundi, to: ajouterJours(lundi, 6) };
        const [semaine, intervenants] = await Promise.all([
          api.semaine(agence.agencyId, fenetre.from, fenetre.to),
          api.intervenants(agence.agencyId),
        ]);
        setEtat({ nom: "pret", moi, semaine, intervenants: intervenants.intervenants });
      } catch (cause) {
        if (cause instanceof ApiError && cause.status === 401) {
          jeton.effacer();
          router.push("/bureau/connexion/");
          return;
        }
        setEtat({
          nom: "erreur",
          message:
            cause instanceof ApiError
              ? cause.message
              : "La semaine n’a pas pu être chargée. Vérifiez votre connexion.",
        });
      }
    },
    [router],
  );

  /*
   * `react-hooks/set-state-in-effect` voit que `charger` appelle `setEtat` et le refuse. Il a
   * raison en général, et tort ici : l'état n'est posé qu'**après** la réponse du réseau, donc
   * dans une continuation, ce que la règle autorise explicitement (« calling setState in a
   * callback function when external state changes ») — mais l'analyse est statique et ne voit pas
   * la frontière de l'`await`.
   *
   * L'alternative serait `use()` avec un cache de promesses par (agence, semaine) et une frontière
   * Suspense : plus de code, un cache à invalider, et un risque d'erreur bien réel pour un écran
   * interne. On garde l'effet, et on le dit.
   */
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- l'état arrive après la réponse réseau, pas dans le corps de l'effet
    void charger(debut);
  }, [charger, debut]);

  /** Changer de semaine : on annonce le chargement, puis on déplace la fenêtre. */
  function allerA(lundi: string) {
    setEtat({ nom: "chargement" });
    setDebut(lundi);
  }

  const fenetre = { from: debut, to: ajouterJours(debut, 6) };

  return (
    <>
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <Heading level={1} visual={2} className="m-0">
          La semaine <span className="font-normal">{libelleSemaine(fenetre)}</span>
        </Heading>
        <nav aria-label="Changer de semaine" className="flex flex-wrap gap-2">
          <Button variant="outline" type="button" onClick={() => allerA(ajouterJours(debut, -7))}>
            Semaine précédente
          </Button>
          <Button
            variant="outline"
            type="button"
            onClick={() => allerA(semaineDe(aujourdhui()).from)}
          >
            Cette semaine
          </Button>
          <Button variant="outline" type="button" onClick={() => allerA(ajouterJours(debut, 7))}>
            Semaine suivante
          </Button>
        </nav>
      </div>

      {etat.nom === "chargement" ? (
        <p role="status" className="mt-6">
          Chargement de la semaine…
        </p>
      ) : null}

      {etat.nom === "erreur" ? (
        <Callout variant="attention" title="La semaine n’a pas pu être affichée" className="mt-6">
          <p className="m-0">{etat.message}</p>
          <p className="m-0 mt-3">
            <Button
              variant="outline"
              type="button"
              onClick={() => {
                setEtat({ nom: "chargement" });
                void charger(debut);
              }}
            >
              Réessayer
            </Button>
          </p>
        </Callout>
      ) : null}

      {etat.nom === "pret" ? (
        <>
          <p className="mt-4 flex flex-wrap items-center gap-3">
            {/* Zéro prend le singulier en français : « 0 visite prévue », jamais « 0 visites ». */}
            <span>
              {etat.semaine.occurrences.length} visite
              {etat.semaine.occurrences.length > 1 ? "s" : ""} prévue
              {etat.semaine.occurrences.length > 1 ? "s" : ""}
            </span>
            {etat.semaine.aPourvoir > 0 ? (
              <Badge tone="raspberry">
                {etat.semaine.aPourvoir} créneau{etat.semaine.aPourvoir > 1 ? "x" : ""} à pourvoir
              </Badge>
            ) : (
              <Badge tone="green">Tous les créneaux sont pourvus</Badge>
            )}
          </p>

          {etat.semaine.aucuneRegleSaisie ? (
            <Callout
              variant="bon-a-savoir"
              title="Aucune règle de planification n’est saisie"
              className="mt-4"
            >
              <p className="m-0">
                Rien n’est donc signalé : ni amplitude, ni repos, ni chevauchement. Vos règles se
                saisissent une fois, avec leur seuil et leur sévérité — et c’est vous qui décidez de
                chacune.
              </p>
            </Callout>
          ) : etat.semaine.signalements.length > 0 ? (
            <Callout
              variant="attention"
              title={`${etat.semaine.signalements.length} signalement${etat.semaine.signalements.length === 1 ? "" : "s"} sur la période jugée`}
              className="mt-4"
            >
              <ul className="m-0 grid list-none gap-2 p-0">
                {etat.semaine.signalements.slice(0, 8).map((signalement, index) => (
                  <li key={`${signalement.regle}-${index}`}>
                    <Badge tone={signalement.severite === "bloquant" ? "raspberry" : "teal"}>
                      {signalement.severite === "bloquant" ? "Bloquant" : "À regarder"}
                    </Badge>{" "}
                    {signalement.message}
                  </li>
                ))}
              </ul>
              <p className="m-0 mt-3 text-small">
                Période jugée : du {etat.semaine.fenetreJugee.from} au{" "}
                {etat.semaine.fenetreJugee.to}.
              </p>
            </Callout>
          ) : (
            <p className="mt-4">
              <Badge tone="green">Aucun signalement</Badge>
            </p>
          )}

          <SemaineJours
            className="mt-6"
            semaine={fenetre}
            occurrences={etat.semaine.occurrences}
            intervenants={etat.intervenants}
            signalements={etat.semaine.signalements}
            aujourdhui={aujourdhui()}
          />
        </>
      ) : null}
    </>
  );
}
