"use client";

import { useId, type ChangeEvent, type ReactNode } from "react";
import { describedBy, FieldShell } from "@/components/ui/FieldShell/FieldShell";
import { cn } from "@/lib/cn";

/*
 * Champ fichier (CV d'une candidature, docs/05 §2) : entrée native `type="file"` pour que le
 * clavier, le lecteur d'écran et le téléphone (appareil photo, fichiers) fonctionnent sans code ;
 * étiquette, aide et erreur liées par `aria-describedby` ; le nom du fichier choisi est repris en
 * clair sous le champ. Le contrôle du fichier (taille, type, signature) est fait par le formulaire.
 */

export interface FileFieldTexts {
  choisir: string;
  /** Contient {nom}. */
  choisi: string;
}

export interface FileFieldProps {
  id?: string;
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  /** Types acceptés, comme l'attribut `accept`. */
  accept: string;
  /** Nom du fichier choisi, affiché sous le champ ; null sans fichier. */
  fileName: string | null;
  texts: FileFieldTexts;
  onChange: (file: File | null) => void;
  className?: string;
}

export function FileField({
  id: givenId,
  label,
  hint,
  error,
  accept,
  fileName,
  texts,
  onChange,
  className,
}: FileFieldProps) {
  const generated = useId();
  const id = givenId ?? generated;
  const statusId = `${id}-fichier`;
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChange(event.target.files?.[0] ?? null);
  };
  return (
    <FieldShell id={id} label={label} hint={hint} error={error}>
      <input
        id={id}
        type="file"
        accept={accept}
        aria-invalid={error ? true : undefined}
        aria-describedby={[
          describedBy(id, Boolean(hint), Boolean(error)),
          fileName ? statusId : null,
        ]
          .filter(Boolean)
          .join(" ")}
        onChange={handleChange}
        className={cn(
          "block w-full rounded-field border border-field-border bg-white px-4 py-3 text-ink",
          "file:mr-4 file:cursor-pointer file:rounded-button file:border-0 file:bg-teal-700 file:px-4 file:py-2 file:font-bold file:text-white",
          "aria-invalid:border-2 aria-invalid:border-danger",
          className,
        )}
      />
      <p id={statusId} className="m-0 mt-2 text-small text-text-soft" aria-live="polite">
        {fileName ? texts.choisi.replace("{nom}", fileName) : texts.choisir}
      </p>
    </FieldShell>
  );
}
