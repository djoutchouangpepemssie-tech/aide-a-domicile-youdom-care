"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/Badge/Badge";
import { Button } from "@/components/ui/Button/Button";
import { Callout } from "@/components/ui/Callout/Callout";
import { Heading } from "@/components/ui/Heading/Heading";
import { ApiError, api, jeton, type FoyerListe } from "@/lib/bureau/api";

/*
 * Les foyers de l'agence.
 *
 * Le foyer technique de l'agence — celui par lequel les salariés tiennent leur portée — est écarté
 * de la liste et annoncé en une ligne : le confondre avec un foyer accompagné ferait compter un
 * foyer de trop dans tout ce qui suit.
 */

type Etat =
  | { nom: "chargement" }
  | { nom: "pret"; foyers: FoyerListe[]; technique: number }
  | { nom: "erreur"; message: string };

export default function FoyersPage() {
  const router = useRouter();
  const [etat, setEtat] = useState<Etat>({ nom: "chargement" });

  const charger = useCallback(async () => {
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
      const { foyers } = await api.foyers(agence.agencyId);
      setEtat({
        nom: "pret",
        foyers: foyers.filter((foyer) => !foyer.technique),
        technique: foyers.filter((foyer) => foyer.technique).length,
      });
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
            : "La liste n’a pas pu être chargée. Vérifiez votre connexion.",
      });
    }
  }, [router]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- l'état arrive après la réponse réseau, pas dans le corps de l'effet
    void charger();
  }, [charger]);

  return (
    <>
      <Heading level={1} visual={2} className="m-0">
        Les foyers
      </Heading>

      {etat.nom === "chargement" ? (
        <p role="status" className="mt-6">
          Chargement des foyers…
        </p>
      ) : null}

      {etat.nom === "erreur" ? (
        <Callout variant="attention" title="La liste n’a pas pu être affichée" className="mt-6">
          <p className="m-0">{etat.message}</p>
          <p className="m-0 mt-3">
            <Button
              variant="outline"
              type="button"
              onClick={() => {
                setEtat({ nom: "chargement" });
                void charger();
              }}
            >
              Réessayer
            </Button>
          </p>
        </Callout>
      ) : null}

      {etat.nom === "pret" ? (
        <>
          <p className="mt-4">
            {etat.foyers.length} foyer{etat.foyers.length > 1 ? "s" : ""} accompagné
            {etat.foyers.length > 1 ? "s" : ""}
            {etat.technique > 0 ? (
              <span className="text-text-soft">
                {" "}
                — le foyer technique de l’agence n’est pas compté.
              </span>
            ) : null}
          </p>

          {etat.foyers.length === 0 ? (
            <p className="mt-4 text-text-soft">
              Aucun foyer pour l’instant. Le premier se crée depuis l’API ; cet écran le montrera
              dès qu’il existera.
            </p>
          ) : (
            <ul className="mt-4 grid list-none gap-3 p-0">
              {etat.foyers.map((foyer) => (
                <li key={foyer.id} className="rounded-card border border-line p-4">
                  <p className="m-0 flex flex-wrap items-center gap-2">
                    <Link href={`/bureau/foyers/${foyer.id}/`} className="font-bold underline">
                      {foyer.code}
                    </Link>
                    <Badge tone="teal">{foyer.mode}</Badge>
                    {foyer.gele ? <Badge tone="raspberry">gelé</Badge> : null}
                    {foyer.statut !== "actif" ? (
                      <Badge tone="raspberry">{foyer.statut}</Badge>
                    ) : null}
                  </p>
                  <p className="m-0 mt-1 text-small text-text-soft">
                    {foyer.codePostal} {foyer.ville}
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
