"use client";

import { MultiStepForm, type FormStep } from "@/components/forms/MultiStepForm/MultiStepForm";
import { Callout } from "@/components/ui/Callout/Callout";
import { CheckboxGroup } from "@/components/ui/CheckboxGroup/CheckboxGroup";
import { RadioCards } from "@/components/ui/RadioCards/RadioCards";
import { TextField } from "@/components/ui/TextField/TextField";
import type { SpecialForms } from "@/content/schemas";
import { buildLead, currentSourcePage, sendLead } from "@/lib/lead/client";
import type { Urgency } from "@/lib/lead/forms";
import { formatFrenchPhone, toTelHref } from "@/lib/phone";
import {
  CommuneStepField,
  ConsentField,
  contactPayload,
  emptyContactValue,
  IdentityFields,
  MessageField,
  missingText,
  validateCommune,
  validateIdentity,
  type CommonFormTexts,
  type ContactValue,
} from "./shared";

/*
 * Sortie d'hospitalisation (docs/05 §5) : quatre écrans — date de sortie prévue (bandeau
 * « Sortie dans moins de 48 h ? Appelez-nous directement »), hôpital et commune de retour,
 * besoins des premiers jours, coordonnées (proche, personne concernée ou professionnel). Les
 * réponses décrivent une hospitalisation : consentement explicite. L'urgence de la demande se
 * déduit de la date de sortie (moins de trois jours : sous 48 h ; moins de huit : dans la
 * semaine ; sinon dans le mois ; inconnue : dans la semaine).
 */

export interface HospitalValue extends ContactValue {
  dateSortie: string;
  hopital: string;
  besoins: string[];
  role: string;
}

const initialValue: HospitalValue = {
  ...emptyContactValue,
  dateSortie: "",
  hopital: "",
  besoins: [],
  role: "",
};

export function urgencyFromDate(dateSortie: string, now = new Date()): Urgency {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateSortie)) return "semaine";
  const days = (new Date(`${dateSortie}T12:00:00Z`).getTime() - now.getTime()) / 86_400_000;
  if (days < 3) return "48h";
  if (days < 8) return "semaine";
  return "mois";
}

export interface HospitalDischargeFormProps {
  texts: CommonFormTexts;
  page: SpecialForms["sortie_hospitalisation"];
  phone: string | null;
  confidentialiteHref: string;
  initialInsee?: string;
}

export function HospitalDischargeForm({
  texts,
  page,
  phone,
  confidentialiteHref,
  initialInsee,
}: HospitalDischargeFormProps) {
  const telHref = phone ? toTelHref(phone) : null;
  const banner = page.bandeau_texte.split("{téléphone}");

  const steps: FormStep<HospitalValue>[] = [
    {
      id: "date",
      title: page.etape_date,
      render: ({ value, setValue, fieldId }) => (
        <>
          <Callout variant="attention" title={page.bandeau_titre}>
            {banner[0]}
            {phone && telHref ? (
              <a href={telHref} data-mesure="formulaire">
                {formatFrenchPhone(phone)}
              </a>
            ) : null}
            {banner[1]}
          </Callout>
          <TextField
            id={fieldId("dateSortie")}
            type="date"
            label={page.date}
            hint={page.date_aide}
            optional
            value={value.dateSortie}
            onChange={(event) => setValue({ ...value, dateSortie: event.target.value })}
            className="max-w-xs"
          />
        </>
      ),
    },
    {
      id: "lieu",
      title: page.etape_lieu,
      validate: (value) => validateCommune(value, texts),
      render: (ctx) => (
        <>
          <TextField
            id={ctx.fieldId("hopital")}
            label={page.hopital}
            hint={page.hopital_aide}
            optional
            value={ctx.value.hopital}
            onChange={(event) => ctx.setValue({ ...ctx.value, hopital: event.target.value })}
          />
          <CommuneStepField
            ctx={ctx}
            texts={texts}
            label={page.commune}
            initialInsee={initialInsee}
          />
        </>
      ),
    },
    {
      id: "besoins",
      title: page.etape_besoins,
      render: ({ value, setValue, fieldId }) => (
        <CheckboxGroup
          id={fieldId("besoins")}
          name="besoins"
          legend={page.etape_besoins}
          optional
          options={[...page.besoins, texts.choix_ouvert].map((label) => ({ value: label, label }))}
          value={value.besoins}
          onChange={(besoins) => setValue({ ...value, besoins })}
        />
      ),
    },
    {
      id: "coordonnees",
      title: page.etape_coordonnees,
      validate: (value) => {
        const errors = validateIdentity(value, texts);
        if (!value.role) errors["role"] = missingText(texts, texts.champs.pour_qui);
        if (!value.consentement) errors["consentement"] = texts.consentement_requis;
        return errors;
      },
      render: (ctx) => (
        <>
          <RadioCards
            id={ctx.fieldId("role")}
            name="role"
            legend={page.vous_etes}
            error={ctx.errors["role"]}
            options={page.roles.map((label) => ({ value: label, label }))}
            value={ctx.value.role}
            onChange={(role) => ctx.setValue({ ...ctx.value, role })}
          />
          <IdentityFields ctx={ctx} texts={texts} />
          <MessageField ctx={ctx} label={texts.message} hint={texts.message_aide} />
          <ConsentField ctx={ctx} texts={texts} confidentialiteHref={confidentialiteHref} />
        </>
      ),
    },
  ];

  return (
    <MultiStepForm<HospitalValue>
      form="sortie-hospitalisation"
      steps={steps}
      initialValue={initialValue}
      texts={texts}
      phone={phone}
      successHref="/merci/sortie-hospitalisation/"
      onSubmit={async (value, meta) => {
        if (!value.commune) throw new Error("commune manquante");
        const situation: Record<string, string> = {};
        if (value.dateSortie) situation["date_sortie"] = value.dateSortie;
        if (value.hopital.trim()) situation["hopital"] = value.hopital.trim();
        const lead = buildLead({
          form: "sortie-hospitalisation",
          commune: value.commune,
          contact: contactPayload(value),
          urgence: urgencyFromDate(value.dateSortie),
          consentSante: value.consentement,
          sourcePage: currentSourcePage(),
          pourQui: value.role,
          ...(Object.keys(situation).length > 0 ? { situation } : {}),
          ...(value.besoins.length > 0 ? { besoins: value.besoins } : {}),
          message: value.message,
        });
        await sendLead(lead, meta);
      }}
    />
  );
}
