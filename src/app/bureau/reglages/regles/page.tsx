"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ReglesForm } from "@/components/bureau/ReglesForm/ReglesForm";
import { Button } from "@/components/ui/Button/Button";
import { Callout } from "@/components/ui/Callout/Callout";
import { Heading } from "@/components/ui/Heading/Heading";
import { ApiError, api, jeton, type Regle, type Regles } from "@/lib/bureau/api";

/*
 * Les règles de planification, saisies par l'agence.
 *
 * L'écran ne cache pas ce qu'il en est : tant qu'aucune règle n'est saisie, **rien n'est signalé**
 * nulle part, et c'est dit en haut. C'est la contrepartie honnête d'un logiciel qui n'impose
 * aucune règle (MY-10) : il ne peut pas laisser croire qu'il surveille ce qu'on ne lui a pas
 * demandé de surveiller.
 */

type Etat =
  | { nom: "chargement" }
  | { nom: "pret"; regles: Regles; enregistre: number | null }
  | { nom: "erreur"; message: string };

export default function ReglesPage() {
  const router = useRouter();
  const [etat, setEtat] = useState<Etat>({ nom: "chargement" });
  const [agencyId, setAgencyId] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);
  const [erreurEnvoi, setErreurEnvoi] = useState<string | null>(null);

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
      setAgencyId(agence.agencyId);
      setEtat({ nom: "pret", regles: await api.regles(agence.agencyId), enregistre: null });
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
            : "Les règles n’ont pas pu être chargées. Vérifiez votre connexion.",
      });
    }
  }, [router]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- l'état arrive après la réponse réseau, pas dans le corps de l'effet
    void charger();
  }, [charger]);

  async function enregistrer(regles: Record<string, Regle>) {
    if (!agencyId) return;
    setEnCours(true);
    setErreurEnvoi(null);
    try {
      const reponse = await api.enregistrerRegles(agencyId, regles);
      const fraiches = await api.regles(agencyId);
      setEtat({ nom: "pret", regles: fraiches, enregistre: reponse.version });
    } catch (cause) {
      setErreurEnvoi(
        cause instanceof ApiError
          ? cause.message
          : "L’enregistrement n’a pas abouti. Vérifiez votre connexion.",
      );
    } finally {
      setEnCours(false);
    }
  }

  return (
    <>
      <Heading level={1} visual={2} className="m-0">
        Les règles de planification
      </Heading>
      <p className="mt-2">
        Le logiciel sait vérifier dix choses. Lesquelles, à partir de quel seuil, et si le
        dépassement bloque ou avertit : c’est vous qui le dites. Rien n’est appliqué d’office.
      </p>

      {etat.nom === "chargement" ? (
        <p role="status" className="mt-6">
          Chargement des règles…
        </p>
      ) : null}

      {etat.nom === "erreur" ? (
        <Callout
          variant="attention"
          title="Les règles n’ont pas pu être affichées"
          className="mt-6"
        >
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
          {etat.regles.aucuneRegleSaisie ? (
            <Callout
              variant="bon-a-savoir"
              title="Aucune règle n’est saisie pour l’instant"
              className="mt-4"
            >
              <p className="m-0">
                Tant que c’est le cas, aucun planning n’est signalé : ni amplitude, ni repos, ni
                chevauchement. Ce n’est pas une faute, c’est un choix — mais il faut le savoir.
              </p>
            </Callout>
          ) : (
            <p className="mt-4 text-small text-text-soft">
              Version {etat.regles.version} des règles. Chaque enregistrement crée une version :
              l’ancienne reste lisible dans le journal.
            </p>
          )}

          {etat.enregistre !== null ? (
            <Callout variant="bon-a-savoir" title="Règles enregistrées" className="mt-4">
              <p className="m-0">
                Version {etat.enregistre}. Les plannings sont jugés avec ces règles dès maintenant,
                sur les quatre semaines à venir.
              </p>
            </Callout>
          ) : null}

          {erreurEnvoi ? (
            <Callout variant="attention" title="L’enregistrement a échoué" className="mt-4">
              <p className="m-0">{erreurEnvoi}</p>
            </Callout>
          ) : null}

          <ReglesForm
            className="mt-6"
            key={etat.regles.version}
            catalogue={etat.regles.catalogue}
            initiales={etat.regles.regles}
            enCours={enCours}
            onEnregistrer={(regles) => void enregistrer(regles)}
          />
        </>
      ) : null}
    </>
  );
}
