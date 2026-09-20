"use client";

import Link from "next/link";
import { CommuneField, type CommuneFieldTexts } from "@/components/forms/CommuneField/CommuneField";
import {
  MultiStepForm,
  type FormStep,
  type MultiStepFormTexts,
} from "@/components/forms/MultiStepForm/MultiStepForm";
import { Select } from "@/components/ui/Select/Select";
import { TextField } from "@/components/ui/TextField/TextField";
import type { CommuneRecord } from "@/lib/geo/geo";
import { buildLead, currentSourcePage, sendLead } from "@/lib/lead/client";
import { formPaths } from "@/lib/lead/forms";
import { normalizeFrenchPhone } from "@/lib/lead/schema";

/*
 * Formulaire de rappel (docs/05 §2) : trente secondes, une seule étape — prénom, nom,
 * téléphone, commune, créneau de rappel préféré. Aucune donnée de santé : le consentement
 * enregistré vaut false pour la santé, l'information sur l'usage des coordonnées est affichée.
 * La demande part avec l'urgence « 48h » : un rappel s'attend vite (engagement E5).
 */

export interface RappelFormTexts extends MultiStepFormTexts {
  titre_etape: string;
  prenom: string;
  nom: string;
  telephone: string;
  commune: string;
  creneau_rappel: string;
  creneau_choisir: string;
  creneaux_rappel: readonly string[];
  /** Contient {champ}. */
  erreur_champ: string;
  champs: { prenom: string; nom: string; telephone: string; commune: string };
  telephone_invalide: string;
  hors_idf: string;
  usage_coordonnees: string;
  confidentialite: string;
  recherche: CommuneFieldTexts;
}

export interface RappelFormProps {
  texts: RappelFormTexts;
  phone: string | null;
  confidentialiteHref: string;
  initialInsee?: string;
}

interface RappelValue {
  prenom: string;
  nom: string;
  telephone: string;
  commune: CommuneRecord | null;
  communeQuery: string;
  creneau: string;
}

const initialValue: RappelValue = {
  prenom: "",
  nom: "",
  telephone: "",
  commune: null,
  communeQuery: "",
  creneau: "",
};

export function validateRappel(value: RappelValue, texts: RappelFormTexts): Record<string, string> {
  const missing = (champ: string) => texts.erreur_champ.replace("{champ}", champ);
  const errors: Record<string, string> = {};
  if (!value.prenom.trim()) errors["prenom"] = missing(texts.champs.prenom);
  if (!value.nom.trim()) errors["nom"] = missing(texts.champs.nom);
  if (!value.telephone.trim()) errors["telephone"] = missing(texts.champs.telephone);
  else if (normalizeFrenchPhone(value.telephone) === null) {
    errors["telephone"] = texts.telephone_invalide;
  }
  if (!value.commune) {
    errors["commune"] = value.communeQuery.trim() ? texts.hors_idf : missing(texts.champs.commune);
  }
  return errors;
}

export function RappelForm({ texts, phone, confidentialiteHref, initialInsee }: RappelFormProps) {
  const step: FormStep<RappelValue> = {
    id: "coordonnees",
    title: texts.titre_etape,
    validate: (value) => validateRappel(value, texts),
    render: ({ value, setValue, errors, fieldId }) => (
      <>
        <TextField
          id={fieldId("prenom")}
          label={texts.prenom}
          autoComplete="given-name"
          value={value.prenom}
          error={errors["prenom"]}
          onChange={(event) => setValue({ ...value, prenom: event.target.value })}
        />
        <TextField
          id={fieldId("nom")}
          label={texts.nom}
          autoComplete="family-name"
          value={value.nom}
          error={errors["nom"]}
          onChange={(event) => setValue({ ...value, nom: event.target.value })}
        />
        <TextField
          id={fieldId("telephone")}
          type="tel"
          label={texts.telephone}
          autoComplete="tel"
          inputMode="tel"
          value={value.telephone}
          error={errors["telephone"]}
          onChange={(event) => setValue({ ...value, telephone: event.target.value })}
        />
        <CommuneField
          id={fieldId("commune")}
          label={texts.commune}
          value={value.commune}
          error={errors["commune"]}
          initialInsee={initialInsee}
          texts={texts.recherche}
          onChange={(commune, query) => setValue({ ...value, commune, communeQuery: query })}
        />
        <Select
          id={fieldId("creneau")}
          label={texts.creneau_rappel}
          optional
          placeholder={texts.creneau_choisir}
          value={value.creneau}
          onChange={(event) => setValue({ ...value, creneau: event.target.value })}
          options={texts.creneaux_rappel.map((label) => ({ value: label, label }))}
        />
        <p className="m-0 text-small text-text-soft">
          {texts.usage_coordonnees} <Link href={confidentialiteHref}>{texts.confidentialite}</Link>
        </p>
      </>
    ),
  };

  return (
    <MultiStepForm<RappelValue>
      form="rappel"
      steps={[step]}
      initialValue={initialValue}
      texts={texts}
      phone={phone}
      successHref={`/merci/rappel/`}
      onSubmit={async (value, meta) => {
        if (!value.commune) throw new Error("commune manquante");
        const lead = buildLead({
          form: "rappel",
          commune: value.commune,
          contact: {
            prenom: value.prenom.trim(),
            nom: value.nom.trim(),
            telephone: value.telephone.trim(),
            ...(value.creneau ? { rappel: value.creneau } : {}),
          },
          urgence: "48h",
          consentSante: false,
          sourcePage: currentSourcePage(),
        });
        await sendLead(lead, meta);
      }}
    />
  );
}

export const rappelPath = formPaths.rappel;
