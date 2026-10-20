"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/Badge/Badge";
import { Button } from "@/components/ui/Button/Button";
import { Select } from "@/components/ui/Select/Select";
import { TextField } from "@/components/ui/TextField/TextField";
import { cn } from "@/lib/cn";
import type { Regle, RegleCatalogue } from "@/lib/bureau/api";

/*
 * Les règles de planification de l'agence.
 *
 * Le logiciel n'en impose aucune (MY-10). Il sait vérifier dix choses ; **lesquelles**, à partir de
 * **quel seuil**, et si le dépassement **bloque ou avertit**, c'est l'agence qui le dit. Ce qui en
 * découle pour cet écran :
 *
 * - une règle est inactive par défaut, et une agence qui n'en saisit aucune n'est pas en faute ;
 * - la valeur proposée est affichée comme une **suggestion**, jamais préremplie : un seuil
 *   prérempli serait un seuil imposé, et personne ne relit un champ déjà rempli ;
 * - une règle active sans seuil ne part pas : l'API la refuserait, et un refus réseau sur un
 *   formulaire de dix lignes est pénible — on le dit ici, à la ligne concernée.
 */

export type Erreurs = Record<string, string>;

/** Les règles qui ne prennent pas de seuil : elles constatent un fait, il n'y a rien à régler. */
const BINAIRES = new Set(["chevauchement", "absence_intervenant"]);

export function valider(catalogue: RegleCatalogue[], regles: Record<string, Regle>): Erreurs {
  const erreurs: Erreurs = {};
  for (const entree of catalogue) {
    const regle = regles[entree.key];
    if (!regle?.active) continue;
    if (BINAIRES.has(entree.key)) continue;
    if (regle.valeur === null || Number.isNaN(regle.valeur)) {
      erreurs[entree.key] = "Une règle active a besoin de son seuil.";
    } else if (regle.valeur <= 0) {
      erreurs[entree.key] = "Le seuil doit être supérieur à zéro.";
    }
  }
  return erreurs;
}

export function ReglesForm({
  catalogue,
  initiales,
  onEnregistrer,
  enCours,
  className,
}: {
  catalogue: RegleCatalogue[];
  initiales: Record<string, Regle>;
  onEnregistrer: (regles: Record<string, Regle>) => void;
  enCours?: boolean;
  className?: string;
}) {
  const [regles, setRegles] = useState<Record<string, Regle>>(initiales);
  const [erreurs, setErreurs] = useState<Erreurs>({});

  function modifier(key: string, champ: Partial<Regle>) {
    setRegles((precedentes) => {
      // Une règle absente du jeu reçu part du même point qu'une agence neuve : rien n'est vérifié.
      const base: Regle = precedentes[key] ?? {
        active: false,
        severite: "avertissement",
        valeur: null,
      };
      return { ...precedentes, [key]: { ...base, ...champ } };
    });
  }

  return (
    <form
      className={cn("grid gap-4", className)}
      onSubmit={(evenement) => {
        evenement.preventDefault();
        const trouvees = valider(catalogue, regles);
        setErreurs(trouvees);
        if (Object.keys(trouvees).length === 0) onEnregistrer(regles);
      }}
    >
      {catalogue.map((entree) => {
        const regle = regles[entree.key] ?? {
          active: false,
          severite: "avertissement" as const,
          valeur: null,
        };
        const binaire = BINAIRES.has(entree.key);
        return (
          <fieldset key={entree.key} className="m-0 rounded-card border border-line p-4">
            <legend className="px-1 font-bold">{entree.libelle}</legend>
            <p className="m-0 text-small text-text-soft">{entree.verifie}</p>

            {/*
             * Les dix lignes portent les mêmes libellés visibles. Un lecteur d'écran qui énumère
             * les champs annoncerait donc « Vérifier cette règle » dix fois : le nom accessible
             * reprend le texte visible **et** la règle concernée (WCAG 2.5.3 : le nom contient
             * l'étiquette visible). C'est un test qui l'a montré, en trouvant deux cases
             * indiscernables.
             */}
            <label className="mt-3 flex items-center gap-2">
              <input
                type="checkbox"
                aria-label={`Vérifier cette règle : ${entree.libelle}`}
                checked={regle.active}
                onChange={(evenement) => modifier(entree.key, { active: evenement.target.checked })}
              />
              <span>Vérifier cette règle</span>
            </label>

            {regle.active ? (
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {binaire ? (
                  <p className="m-0 text-small">
                    <Badge tone="teal">sans seuil</Badge> cette règle constate un fait : il n’y a
                    rien à régler.
                  </p>
                ) : (
                  <TextField
                    label={`Seuil${entree.unite ? ` (en ${entree.unite})` : ""}`}
                    aria-label={`Seuil${entree.unite ? ` (en ${entree.unite})` : ""} : ${entree.libelle}`}
                    type="number"
                    min={1}
                    inputMode="numeric"
                    value={regle.valeur ?? ""}
                    error={erreurs[entree.key]}
                    hint={
                      entree.suggestion === null
                        ? undefined
                        : `Souvent ${entree.suggestion} ${entree.unite ?? ""} — à vous de décider.`
                    }
                    onChange={(evenement) =>
                      modifier(entree.key, {
                        valeur:
                          evenement.target.value === ""
                            ? null
                            : Number.parseInt(evenement.target.value, 10),
                      })
                    }
                  />
                )}

                <Select
                  label="En cas de dépassement"
                  aria-label={`En cas de dépassement : ${entree.libelle}`}
                  value={regle.severite}
                  options={[
                    { value: "avertissement", label: "Avertir (le planning reste enregistrable)" },
                    { value: "bloquant", label: "Bloquer (l’enregistrement est refusé)" },
                  ]}
                  onChange={(evenement) =>
                    modifier(entree.key, {
                      severite:
                        evenement.target.value === "bloquant" ? "bloquant" : "avertissement",
                    })
                  }
                />
              </div>
            ) : null}
          </fieldset>
        );
      })}

      <p className="m-0">
        <Button type="submit" disabled={enCours}>
          {enCours ? "Enregistrement…" : "Enregistrer les règles"}
        </Button>
      </p>
    </form>
  );
}
