"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { VisiteCarte } from "@/components/terrain/VisiteCarte/VisiteCarte";
import { Badge } from "@/components/ui/Badge/Badge";
import { Button } from "@/components/ui/Button/Button";
import { Callout } from "@/components/ui/Callout/Callout";
import { Heading } from "@/components/ui/Heading/Heading";
import { ApiError, api, jeton, type VisiteDuJour } from "@/lib/bureau/api";
import {
  file,
  identifiantLocal,
  type PointageEnAttente,
  type PointageSource,
  type PointageType,
} from "@/lib/terrain/pointages";

/*
 * Ma tournée — l'écran de l'intervenante.
 *
 * Ce qu'il sait faire et que peu d'applications de télégestion font :
 *
 * 1. **un pointage n'est jamais perdu.** Il part avec l'heure du geste ; si le réseau manque, il
 *    attend dans le téléphone et repart à la reconnexion, au retour sur l'onglet, ou au pointage
 *    suivant. L'écran dit ce qui attend encore ;
 * 2. **le pointage manuel est toujours là**, avec son motif (MY-02) ;
 * 3. **aucune donnée de santé** : le code du foyer, l'adresse, l'horaire, la nature de la visite.
 *    De quoi arriver et pointer, rien de plus.
 */

type Etat =
  | { nom: "chargement" }
  | { nom: "pret"; visites: VisiteDuJour[] }
  | { nom: "erreur"; message: string };

export default function TourneePage() {
  const router = useRouter();
  const [etat, setEtat] = useState<Etat>({ nom: "chargement" });
  const [attente, setAttente] = useState<PointageEnAttente[]>([]);
  const [nfc, setNfc] = useState(false);

  const vider = useCallback(async (): Promise<number> => {
    let restants = file.lire();
    for (const pointage of restants) {
      try {
        await api.pointer(pointage.visitId, {
          type: pointage.type,
          source: pointage.source,
          at: pointage.at,
          motif: pointage.motif,
        });
        restants = file.retirer(pointage.id);
      } catch {
        // Toujours pas de réseau, ou l'API refuse : on compte l'essai et on garde le pointage.
        restants = file.marquerEssai(pointage.id);
      }
    }
    setAttente(restants);
    return restants.length;
  }, []);

  const charger = useCallback(async () => {
    try {
      await vider();
      setEtat({ nom: "pret", visites: (await api.tournee()).visites });
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) {
        jeton.effacer();
        router.push("/terrain/connexion/");
        return;
      }
      setEtat({
        nom: "erreur",
        message:
          cause instanceof ApiError
            ? cause.message
            : "La tournée n’a pas pu être chargée. Vos pointages, eux, sont gardés.",
      });
    }
  }, [router, vider]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- l'état arrive après la réponse réseau, pas dans le corps de l'effet
    void charger();
  }, [charger]);

  /*
   * Le badge n'est proposé que si le navigateur sait le lire (Web NFC : Android, Chrome). Ailleurs,
   * un bouton « badge » qui ne répondrait jamais serait pire que son absence — et le pointage
   * manuel, lui, est toujours là.
   */
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- détection d'une capacité du navigateur, une fois au montage
    setNfc("NDEFReader" in globalThis);
  }, []);

  /** Le réseau revient, ou l'onglet redevient visible : on tente de vider la file. */
  useEffect(() => {
    const reprendre = () => void vider();
    globalThis.addEventListener?.("online", reprendre);
    globalThis.document?.addEventListener("visibilitychange", reprendre);
    return () => {
      globalThis.removeEventListener?.("online", reprendre);
      globalThis.document?.removeEventListener("visibilitychange", reprendre);
    };
  }, [vider]);

  async function pointer(
    visitId: string,
    type: PointageType,
    source: PointageSource,
    motif?: string,
  ) {
    // L'heure du geste, prise maintenant : c'est elle qui compte, pas celle de l'envoi.
    const at = new Date().toISOString();
    const id = identifiantLocal();
    setAttente(file.ajouter({ id, visitId, type, source, at, motif }));
    const restants = await vider();
    if (restants === 0) {
      try {
        setEtat({ nom: "pret", visites: (await api.tournee()).visites });
      } catch {
        /* la tournée se rafraîchira au prochain passage : le pointage, lui, est parti. */
      }
    }
  }

  const enAttentePour = (visitId: string) =>
    attente
      .filter((pointage) => pointage.visitId === visitId)
      .map((pointage) => ({ type: pointage.type, essais: pointage.essais }));

  return (
    <>
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <Heading level={1} visual={2} className="m-0">
          Ma tournée
        </Heading>
        {/*
         * `outline` et non `link` : la couleur de lien sur fond sable est mesurée à 4,46, sous le
         * seuil AA, et la règle `.sur-sable` ne rattrape pas un bouton (voir globals.css).
         */}
        <Button
          variant="outline"
          type="button"
          onClick={() => {
            api.deconnecter();
            router.push("/terrain/connexion/");
          }}
        >
          Se déconnecter
        </Button>
      </div>

      {attente.length > 0 ? (
        <Callout
          variant="attention"
          title="Des pointages attendent d’être envoyés"
          className="mt-4"
        >
          <p className="m-0">
            {attente.length} pointage{attente.length > 1 ? "s" : ""}{" "}
            {attente.length > 1 ? "sont" : "est"} enregistré{attente.length > 1 ? "s" : ""} dans ce
            téléphone, avec {attente.length > 1 ? "leur" : "son"} heure exacte. Ils partiront dès
            que le réseau revient — gardez cette page ouverte.
          </p>
          <p className="m-0 mt-3">
            <Button variant="outline" type="button" onClick={() => void vider()}>
              Essayer maintenant
            </Button>
          </p>
        </Callout>
      ) : null}

      {etat.nom === "chargement" ? (
        <p role="status" className="mt-6">
          Chargement de la tournée…
        </p>
      ) : null}

      {etat.nom === "erreur" ? (
        <Callout variant="attention" title="La tournée n’a pas pu être affichée" className="mt-6">
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
        etat.visites.length === 0 ? (
          <p className="mt-6">
            <Badge tone="green">Aucune visite aujourd’hui</Badge>
          </p>
        ) : (
          <>
            <p className="mt-2">
              {etat.visites.length} visite{etat.visites.length > 1 ? "s" : ""} aujourd’hui.
            </p>
            <ul className="mt-4 grid list-none gap-4 p-0">
              {etat.visites.map((visite) => (
                <VisiteCarte
                  key={visite.id}
                  visite={visite}
                  enAttente={enAttentePour(visite.id)}
                  nfcDisponible={nfc}
                  onPointer={(type, source, motif) => void pointer(visite.id, type, source, motif)}
                />
              ))}
            </ul>
          </>
        )
      ) : null}
    </>
  );
}
