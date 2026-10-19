"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import interfaceTexts from "@/../content/interface.json";
import { MandataireNotice } from "@/components/blocks/MandataireNotice/MandataireNotice";
import { FoyerMembres } from "@/components/bureau/FoyerMembres/FoyerMembres";
import { Badge } from "@/components/ui/Badge/Badge";
import { Button } from "@/components/ui/Button/Button";
import { Callout } from "@/components/ui/Callout/Callout";
import { Heading } from "@/components/ui/Heading/Heading";
import { ApiError, api, jeton, type Foyer, type SerieDuFoyer } from "@/lib/bureau/api";

/*
 * Un foyer : son identité, qui en fait partie avec ses droits effectifs, et ses séries de planning.
 *
 * Deux règles du projet se tiennent ici :
 *
 * - **le mode d'intervention est toujours dit**, et en mandataire la mention légale de `docs/07`
 *   l'accompagne — c'est la même mention que sur le site public, et elle vient du même fichier de
 *   contenu : deux formulations pour une obligation légale, ce serait une de trop ;
 * - **aucune donnée de santé n'est affichée.** Les comptes rendus et la fiche de vie ne sont pas
 *   ici ; ce qu'on voit d'eux, c'est qui a le droit de les lire.
 */

type Etat =
  | { nom: "chargement" }
  | { nom: "pret"; foyer: Foyer; series: SerieDuFoyer[] }
  | { nom: "erreur"; message: string; introuvable?: true };

const STATUTS_SERIE: Record<string, string> = {
  active: "active",
  suspendue: "suspendue",
  terminee: "terminée",
  remplacee: "remplacée",
};

export default function FoyerPage() {
  const router = useRouter();
  const parametres = useParams<{ id: string }>();
  const id = parametres.id;
  const [etat, setEtat] = useState<Etat>({ nom: "chargement" });

  const charger = useCallback(
    async (householdId: string) => {
      try {
        const [foyer, series] = await Promise.all([
          api.foyer(householdId),
          api.seriesDuFoyer(householdId),
        ]);
        setEtat({ nom: "pret", foyer, series: series.series });
      } catch (cause) {
        if (cause instanceof ApiError && cause.status === 401) {
          jeton.effacer();
          router.push("/bureau/connexion/");
          return;
        }
        /*
         * 404 ne distingue pas « n'existe pas » de « pas pour vous » : c'est volontaire côté API
         * (aucun refus ne révèle une existence). L'écran dit donc la seule chose honnête.
         */
        if (cause instanceof ApiError && cause.status === 404) {
          setEtat({
            nom: "erreur",
            introuvable: true,
            message:
              "Ce foyer n’existe pas, ou il n’appartient pas à une agence que vous suivez. Les deux se répondent pareil, et c’est voulu.",
          });
          return;
        }
        setEtat({
          nom: "erreur",
          message:
            cause instanceof ApiError
              ? cause.message
              : "Le foyer n’a pas pu être chargé. Vérifiez votre connexion.",
        });
      }
    },
    [router],
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- l'état arrive après la réponse réseau, pas dans le corps de l'effet
    void charger(id);
  }, [charger, id]);

  return (
    <>
      <p className="m-0">
        <Link href="/bureau/foyers/" className="underline">
          ← Tous les foyers
        </Link>
      </p>

      {etat.nom === "chargement" ? (
        <p role="status" className="mt-6">
          Chargement du foyer…
        </p>
      ) : null}

      {etat.nom === "erreur" ? (
        <Callout
          variant="attention"
          title={etat.introuvable ? "Foyer introuvable" : "Le foyer n’a pas pu être affiché"}
          className="mt-6"
        >
          <p className="m-0">{etat.message}</p>
          {etat.introuvable ? null : (
            <p className="m-0 mt-3">
              <Button
                variant="outline"
                type="button"
                onClick={() => {
                  setEtat({ nom: "chargement" });
                  void charger(id);
                }}
              >
                Réessayer
              </Button>
            </p>
          )}
        </Callout>
      ) : null}

      {etat.nom === "pret" ? (
        <>
          <Heading level={1} visual={2} className="m-0 mt-4">
            Foyer {etat.foyer.foyer.code}
          </Heading>

          <p className="mt-2 flex flex-wrap items-center gap-2">
            <Badge tone="teal">{etat.foyer.foyer.mode}</Badge>
            {etat.foyer.foyer.gele ? <Badge tone="raspberry">gelé</Badge> : null}
            {etat.foyer.foyer.statut !== "actif" ? (
              <Badge tone="raspberry">{etat.foyer.foyer.statut}</Badge>
            ) : null}
          </p>

          <address className="mt-2 not-italic">
            {etat.foyer.foyer.adresse.ligne1}
            {etat.foyer.foyer.adresse.ligne2 ? <>, {etat.foyer.foyer.adresse.ligne2}</> : null}
            <br />
            {etat.foyer.foyer.adresse.codePostal} {etat.foyer.foyer.adresse.ville}
          </address>

          {etat.foyer.foyer.mode === "mandataire" ? (
            <MandataireNotice texts={interfaceTexts.mandataire_notice} className="mt-4" />
          ) : null}

          <Heading level={2} visual={3} className="mt-8">
            Qui fait partie du foyer, et ce que chacun voit
          </Heading>
          <FoyerMembres
            className="mt-4"
            membres={etat.foyer.membres}
            protections={etat.foyer.protections}
          />

          <Heading level={2} visual={3} className="mt-8">
            Les séries de planning
          </Heading>
          {etat.series.length === 0 ? (
            <p className="mt-4 text-text-soft">
              Aucune série pour ce foyer. Sans série, la semaine reste vide : rien n’est planifié
              d’office.
            </p>
          ) : (
            <ul className="mt-4 grid list-none gap-3 p-0">
              {etat.series.map((serie) => (
                <li key={serie.id} className="rounded-card border border-line p-4">
                  <p className="m-0 flex flex-wrap items-center gap-2">
                    <span className="font-bold">{serie.libelle}</span>
                    <Badge tone={serie.statut === "active" ? "green" : "teal"}>
                      {STATUTS_SERIE[serie.statut] ?? serie.statut}
                    </Badge>
                    {serie.version > 1 ? (
                      <span className="text-small text-text-soft">version {serie.version}</span>
                    ) : null}
                  </p>
                  <p className="m-0 mt-1 text-small text-text-soft">
                    du {serie.du} {serie.au ? `au ${serie.au}` : "— sans fin posée"} ·{" "}
                    {serie.creneaux} créneau{serie.creneaux > 1 ? "x" : ""} par semaine
                    {serie.rythme > 1 ? `, une semaine sur ${serie.rythme}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </>
      ) : null}
    </>
  );
}
