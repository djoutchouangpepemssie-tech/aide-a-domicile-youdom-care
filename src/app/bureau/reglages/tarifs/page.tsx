"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import interfaceTexts from "@/../content/interface.json";
import { MandataireNotice } from "@/components/blocks/MandataireNotice/MandataireNotice";
import { Badge } from "@/components/ui/Badge/Badge";
import { Button } from "@/components/ui/Button/Button";
import { Callout } from "@/components/ui/Callout/Callout";
import { Heading } from "@/components/ui/Heading/Heading";
import { TextField } from "@/components/ui/TextField/TextField";
import { ApiError, api, jeton, type Tarifs } from "@/lib/bureau/api";
import { euros, pourcentage, resteACharge } from "@/lib/bureau/montants";

/*
 * Les tarifs de l'agence.
 *
 * Aucune grille n'est livrée (MY-11) : les prestations sont créées par Youdom Care, versionnées par
 * date d'effet, et un prix ne se modifie pas — on ferme une version et on en ouvre une autre.
 *
 * Deux règles d'affichage qui viennent du projet et ne se négocient pas :
 *
 * 1. **le prix TTC avant avantage fiscal est l'information principale** ; le montant après crédit
 *    d'impôt s'affiche à part, plus petit, et seulement si l'agence a saisi un taux. Sans taux,
 *    aucune estimation — un chiffre inventé sur une facture est une promesse qu'on ne tiendra pas ;
 * 2. **le mode d'intervention est indiqué pour chaque prestation**, et la mention légale du
 *    mandataire accompagne tout prix en mandataire (docs/07 §1).
 */

type Etat =
  { nom: "chargement" } | { nom: "pret"; tarifs: Tarifs } | { nom: "erreur"; message: string };

export default function TarifsPage() {
  const router = useRouter();
  const [etat, setEtat] = useState<Etat>({ nom: "chargement" });
  const [agencyId, setAgencyId] = useState<string | null>(null);
  const [taux, setTaux] = useState("");
  const [enCours, setEnCours] = useState(false);
  const [message, setMessage] = useState<{ ton: "ok" | "erreur"; texte: string } | null>(null);

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
      const tarifs = await api.tarifs(agence.agencyId);
      setTaux(tarifs.creditImpotTaux === null ? "" : String(tarifs.creditImpotTaux * 100));
      setEtat({ nom: "pret", tarifs });
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
            : "Les tarifs n’ont pas pu être chargés. Vérifiez votre connexion.",
      });
    }
  }, [router]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- l'état arrive après la réponse réseau, pas dans le corps de l'effet
    void charger();
  }, [charger]);

  async function enregistrerTaux(evenement: React.FormEvent) {
    evenement.preventDefault();
    if (!agencyId) return;
    const saisi = taux.trim().replace(",", ".");
    const valeur = saisi === "" ? null : Number.parseFloat(saisi);
    if (valeur !== null && (Number.isNaN(valeur) || valeur < 0 || valeur > 100)) {
      setMessage({ ton: "erreur", texte: "Le taux s’écrit en pourcentage, entre 0 et 100." });
      return;
    }
    setEnCours(true);
    setMessage(null);
    try {
      await api.enregistrerTauxCreditImpot(agencyId, valeur === null ? null : valeur / 100);
      const tarifs = await api.tarifs(agencyId);
      setEtat({ nom: "pret", tarifs });
      setMessage({
        ton: "ok",
        texte:
          valeur === null
            ? "Taux retiré : plus aucune estimation de crédit d’impôt ne sera affichée."
            : "Taux enregistré. Les estimations s’affichent à côté du prix TTC, plus petites.",
      });
    } catch (cause) {
      setMessage({
        ton: "erreur",
        texte:
          cause instanceof ApiError
            ? cause.message
            : "L’enregistrement n’a pas abouti. Vérifiez votre connexion.",
      });
    } finally {
      setEnCours(false);
    }
  }

  const mandataire =
    etat.nom === "pret" && etat.tarifs.prestations.some((p) => p.mode === "mandataire");

  return (
    <>
      <Heading level={1} visual={2} className="m-0">
        Les tarifs
      </Heading>
      <p className="mt-2">
        Aucune grille n’est livrée avec le logiciel : vos prestations et vos prix sont les vôtres.
        Un prix ne se modifie pas — on ferme une version à une date et on en ouvre une autre, pour
        que les factures déjà émises restent justes.
      </p>

      {etat.nom === "chargement" ? (
        <p role="status" className="mt-6">
          Chargement des tarifs…
        </p>
      ) : null}

      {etat.nom === "erreur" ? (
        <Callout variant="attention" title="Les tarifs n’ont pas pu être affichés" className="mt-6">
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
          <Heading level={2} visual={3} className="mt-8">
            Le crédit d’impôt
          </Heading>
          <form className="mt-4 grid max-w-md gap-3" onSubmit={(e) => void enregistrerTaux(e)}>
            <TextField
              label="Taux du crédit d’impôt (en %)"
              hint="Laissez vide pour n’afficher aucune estimation. Sans taux saisi, le logiciel n’en invente pas."
              type="text"
              inputMode="decimal"
              value={taux}
              onChange={(evenement) => setTaux(evenement.target.value)}
            />
            <p className="m-0">
              <Button type="submit" disabled={enCours}>
                {enCours ? "Enregistrement…" : "Enregistrer le taux"}
              </Button>
            </p>
          </form>

          {message ? (
            <Callout
              variant={message.ton === "ok" ? "bon-a-savoir" : "attention"}
              title={message.ton === "ok" ? "C’est enregistré" : "L’enregistrement a échoué"}
              className="mt-4"
            >
              <p className="m-0">{message.texte}</p>
            </Callout>
          ) : null}

          <Heading level={2} visual={3} className="mt-8">
            Vos prestations
          </Heading>

          {etat.tarifs.aucunTarifSaisi ? (
            <Callout
              variant="bon-a-savoir"
              title="Aucun tarif n’est saisi pour l’instant"
              className="mt-4"
            >
              <p className="m-0">
                Aucun devis ni aucune facture ne peut donc être chiffré. Les prestations se créent
                depuis l’API ; cet écran les montrera dès qu’elles existeront.
              </p>
            </Callout>
          ) : (
            <>
              {mandataire ? (
                <MandataireNotice texts={interfaceTexts.mandataire_notice} className="mt-4" />
              ) : null}

              <ul className="mt-4 grid list-none gap-3 p-0">
                {etat.tarifs.prestations.map((prestation) => {
                  const reste = resteACharge(
                    prestation.prixTtcCentimes,
                    etat.tarifs.creditImpotTaux,
                  );
                  return (
                    <li key={prestation.id} className="rounded-card border border-line p-4">
                      <p className="m-0 flex flex-wrap items-center gap-2">
                        <span className="font-bold">{prestation.libelle}</span>
                        <span className="text-small text-text-soft">{prestation.code}</span>
                        <Badge tone="teal">{prestation.mode}</Badge>
                        {prestation.au === null ? null : (
                          <Badge tone="raspberry">fermée le {prestation.au}</Badge>
                        )}
                      </p>

                      {/* Le prix TTC d'abord, en grand. L'avantage fiscal après, plus petit. */}
                      <p className="m-0 mt-2 text-h4 font-bold">
                        {euros(prestation.prixTtcCentimes)}
                        <span className="text-small font-normal text-text-soft">
                          {" "}
                          TTC par {prestation.unite}
                        </span>
                      </p>
                      {reste === null ? (
                        prestation.creditImpotEligible ? (
                          <p className="m-0 text-small text-text-soft">
                            Éligible au crédit d’impôt — aucune estimation sans taux saisi.
                          </p>
                        ) : null
                      ) : prestation.creditImpotEligible ? (
                        <p className="m-0 text-small text-text-soft">
                          soit environ {euros(reste)} après crédit d’impôt de{" "}
                          {pourcentage(etat.tarifs.creditImpotTaux ?? 0)}, si vous y avez droit
                        </p>
                      ) : (
                        <p className="m-0 text-small text-text-soft">
                          non éligible au crédit d’impôt
                        </p>
                      )}

                      <p className="m-0 mt-2 text-small text-text-soft">
                        en vigueur depuis le {prestation.du}
                      </p>

                      {prestation.majorations.length > 0 ? (
                        <ul className="m-0 mt-2 flex list-none flex-wrap gap-x-4 gap-y-1 p-0 text-small">
                          {prestation.majorations.map((majoration) => (
                            <li key={`${majoration.libelle}-${majoration.quand}`}>
                              {majoration.libelle} : +{majoration.pourcentage} %
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </>
      ) : null}
    </>
  );
}
