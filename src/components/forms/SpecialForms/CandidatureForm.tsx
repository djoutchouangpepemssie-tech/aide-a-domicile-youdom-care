"use client";

import { useEffect, useState } from "react";
import { MultiStepForm, type FormStep } from "@/components/forms/MultiStepForm/MultiStepForm";
import { Callout } from "@/components/ui/Callout/Callout";
import { FileField } from "@/components/ui/FileField/FileField";
import { RadioCards } from "@/components/ui/RadioCards/RadioCards";
import { Select } from "@/components/ui/Select/Select";
import { Textarea } from "@/components/ui/Textarea/Textarea";
import { TextField } from "@/components/ui/TextField/TextField";
import type { InterfaceTexts, RecruitmentPage } from "@/content/schemas";
import { buildCandidature, checkCvInBrowser, sendCandidature } from "@/lib/candidature/client";
import {
  CANDIDATURE_MAX_MESSAGE,
  CV_MAX_BYTES,
  cvMimeTypes,
  formatFileSize,
  type CvCheck,
  type CvRejection,
} from "@/lib/candidature/schema";
import { currentSourcePage } from "@/lib/lead/client";
import {
  CommuneStepField,
  ConsentField,
  emptyContactValue,
  missingText,
  validateIdentity,
  type CommonFormTexts,
  type ContactValue,
} from "./shared";

/*
 * Candidature (docs/05 §2 : « CV en pièce jointe, 4 Mo au plus, PDF ou DOCX », P8.2) : un écran,
 * deux minutes. Coordonnées (e-mail obligatoire : il reçoit l'accusé et la réponse), département
 * souhaité, commune facultative, disponibilité, mot facultatif sans information de santé, CV,
 * consentement à l'étude de la candidature avec lien vers la politique de confidentialité. Le
 * fichier vit hors de la saisie conservée sur l'appareil (un fichier ne se sérialise pas, il est
 * à rechoisir après un rechargement) ; son contrôle (taille, extension, type, signature) se fait
 * dès le choix puis à l'envoi. `?offre=slug`
 * dans l'adresse rattache la candidature à une offre publiée (aucune donnée personnelle dans l'URL).
 */

export interface CandidatureValue extends ContactValue {
  departement: string;
  disponibilite: string;
}

const initialValue: CandidatureValue = { ...emptyContactValue, departement: "", disponibilite: "" };

export interface CandidatureFormProps {
  texts: CommonFormTexts;
  recrutement: InterfaceTexts["recrutement"];
  page: RecruitmentPage["postuler"];
  /** Départements d'Île-de-France de site.config.json (code, nom). */
  departements: readonly { code: string; nom: string }[];
  /** Titre des offres publiées par slug : nomme l'offre visée par `?offre=`. */
  offres: Readonly<Record<string, string>>;
  phone: string | null;
  confidentialiteHref: string;
}

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function CandidatureForm({
  texts,
  recrutement,
  page,
  departements,
  offres,
  phone,
  confidentialiteHref,
}: CandidatureFormProps) {
  const [cv, setCv] = useState<File | null>(null);
  const [cvCheck, setCvCheck] = useState<CvCheck>({ ok: false, kind: null, reason: "manquant" });
  const [offre, setOffre] = useState<string | null>(null);

  useEffect(() => {
    // Lu côté client pour que la page reste statique ; seul un slug d'offre est accepté.
    const slug = new URLSearchParams(window.location.search).get("offre") ?? "";
    if (/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) queueMicrotask(() => setOffre(slug));
  }, []);

  const cvErrorText = (reason: CvRejection | null): string | undefined => {
    if (!reason) return undefined;
    if (reason === "trop_lourd") {
      return recrutement.cv.trop_lourd.replace("{taille}", formatFileSize(CV_MAX_BYTES));
    }
    return recrutement.cv[reason];
  };

  const step: FormStep<CandidatureValue> = {
    id: "candidature",
    title: page.etape,
    validate: (value) => {
      const errors = validateIdentity(value, texts);
      if (!value.email.trim() || !emailPattern.test(value.email.trim())) {
        errors["email"] = missingText(texts, texts.email.toLocaleLowerCase("fr-FR"));
      }
      if (!value.departement) {
        errors["departement"] = missingText(texts, recrutement.champs.departement);
      }
      if (!value.disponibilite) {
        errors["disponibilite"] = missingText(texts, recrutement.champs.disponibilite);
      }
      if (!cvCheck.ok) errors["cv"] = cvErrorText(cvCheck.reason) ?? recrutement.cv.manquant;
      if (!value.consentement) errors["consentement"] = texts.consentement_requis;
      return errors;
    },
    render: (ctx) => (
      <>
        {offre ? (
          <Callout variant={offres[offre] ? "bon-a-savoir" : "attention"}>
            {offres[offre]
              ? recrutement.offre_ciblee.replace("{titre}", offres[offre] ?? offre)
              : recrutement.offre_inconnue}
          </Callout>
        ) : null}
        <TextField
          id={ctx.fieldId("prenom")}
          label={texts.rappel.prenom}
          autoComplete="given-name"
          value={ctx.value.prenom}
          error={ctx.errors["prenom"]}
          onChange={(event) => ctx.setValue({ ...ctx.value, prenom: event.target.value })}
        />
        <TextField
          id={ctx.fieldId("nom")}
          label={texts.rappel.nom}
          autoComplete="family-name"
          value={ctx.value.nom}
          error={ctx.errors["nom"]}
          onChange={(event) => ctx.setValue({ ...ctx.value, nom: event.target.value })}
        />
        <TextField
          id={ctx.fieldId("telephone")}
          type="tel"
          label={texts.rappel.telephone}
          autoComplete="tel"
          inputMode="tel"
          value={ctx.value.telephone}
          error={ctx.errors["telephone"]}
          onChange={(event) => ctx.setValue({ ...ctx.value, telephone: event.target.value })}
        />
        <TextField
          id={ctx.fieldId("email")}
          type="email"
          label={texts.email}
          hint={recrutement.email_aide}
          autoComplete="email"
          inputMode="email"
          value={ctx.value.email}
          error={ctx.errors["email"]}
          onChange={(event) => ctx.setValue({ ...ctx.value, email: event.target.value })}
        />
        <Select
          id={ctx.fieldId("departement")}
          label={page.departement}
          placeholder={texts.rappel.creneau_choisir}
          options={departements.map((d) => ({ value: d.code, label: `${d.nom} (${d.code})` }))}
          value={ctx.value.departement}
          error={ctx.errors["departement"]}
          onChange={(event) => ctx.setValue({ ...ctx.value, departement: event.target.value })}
        />
        <CommuneStepField ctx={ctx} texts={texts} label={page.commune} />
        <RadioCards
          id={ctx.fieldId("disponibilite")}
          name="disponibilite"
          legend={page.disponibilite}
          error={ctx.errors["disponibilite"]}
          options={recrutement.disponibilites.map((label) => ({ value: label, label }))}
          value={ctx.value.disponibilite}
          onChange={(disponibilite) => ctx.setValue({ ...ctx.value, disponibilite })}
        />
        <Textarea
          id={ctx.fieldId("message")}
          label={page.message}
          hint={page.message_aide}
          optional
          maxLength={CANDIDATURE_MAX_MESSAGE}
          rows={5}
          value={ctx.value.message}
          onChange={(event) => ctx.setValue({ ...ctx.value, message: event.target.value })}
        />
        <FileField
          id={ctx.fieldId("cv")}
          label={page.cv}
          hint={page.cv_aide}
          accept={`.pdf,.docx,${cvMimeTypes.pdf},${cvMimeTypes.docx}`}
          fileName={cv?.name ?? null}
          error={ctx.errors["cv"]}
          texts={recrutement.cv}
          onChange={(file) => {
            setCv(file);
            void checkCvInBrowser(file).then(setCvCheck);
          }}
        />
        <ConsentField
          ctx={ctx}
          texts={{
            ...texts,
            consentement: page.consentement,
            rappel: { ...texts.rappel, confidentialite: page.confidentialite },
          }}
          confidentialiteHref={confidentialiteHref}
        />
      </>
    ),
  };

  return (
    <MultiStepForm<CandidatureValue>
      form="candidature"
      steps={[step]}
      initialValue={initialValue}
      texts={{ ...texts, envoyer: recrutement.envoyer }}
      phone={phone}
      successHref="/merci/candidature/"
      onSubmit={async (value, meta) => {
        const check = await checkCvInBrowser(cv);
        if (!cv || !check.ok) throw new Error("CV manquant ou refusé");
        const candidature = buildCandidature({
          sourcePage: currentSourcePage(),
          offre: offre && offres[offre] ? offre : undefined,
          prenom: value.prenom,
          nom: value.nom,
          telephone: value.telephone,
          email: value.email,
          departement: value.departement,
          commune: value.commune,
          disponibilite: value.disponibilite,
          message: value.message,
        });
        await sendCandidature(candidature, meta, cv);
      }}
    />
  );
}
