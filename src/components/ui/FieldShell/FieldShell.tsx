import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/*
 * Enveloppe commune des champs (docs/05 §6) : étiquette visible, aide facultative, message
 * d'erreur sous le champ. Le contrôle reçoit `aria-describedby` (aide + erreur) et `aria-invalid`.
 * Pour un groupe (`as="legend"`), la légende est rendue en premier enfant du `fieldset` : c'est
 * ce qui lui donne son nom accessible.
 */

export interface FieldShellProps {
  /** Identifiant du contrôle (pour `htmlFor`). */
  id: string;
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  /** Mention « facultatif » : les questions de santé ne sont jamais obligatoires (docs/05 §8). */
  optional?: boolean;
  /** Rend l'étiquette comme un `legend` (groupes) plutôt qu'un `label`. */
  as?: "label" | "legend";
  className?: string;
  children: ReactNode;
}

export function fieldIds(id: string) {
  return { hintId: `${id}-aide`, errorId: `${id}-erreur` };
}

/** Compose la valeur d'`aria-describedby` à partir de l'aide et de l'erreur présentes. */
export function describedBy(id: string, hasHint: boolean, hasError: boolean): string | undefined {
  const { hintId, errorId } = fieldIds(id);
  const ids = [hasHint ? hintId : null, hasError ? errorId : null].filter(Boolean);
  return ids.length > 0 ? ids.join(" ") : undefined;
}

export function FieldShell({
  id,
  label,
  hint,
  error,
  optional = false,
  as = "label",
  className,
  children,
}: FieldShellProps) {
  const { hintId, errorId } = fieldIds(id);
  const labelContent = (
    <>
      {label}
      {/* Espace réel avant la mention : le nom accessible se lit « … ? (facultatif) » (P9.2). */}
      {optional ? (
        <>
          {" "}
          <span className="ml-1 font-normal text-text-soft">(facultatif)</span>
        </>
      ) : null}
    </>
  );
  const body = (
    <>
      {hint ? (
        <p id={hintId} className="text-small text-text-soft">
          {hint}
        </p>
      ) : null}
      {children}
      {error ? (
        <p id={errorId} className="flex items-start gap-2 text-small font-bold text-danger">
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            width="20"
            height="20"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="mt-0.5 shrink-0"
          >
            <path d="M12 4 4 19h16M12 10v4M12 17v.5" />
          </svg>
          <span>{error}</span>
        </p>
      ) : null}
    </>
  );

  if (as === "legend") {
    return (
      <>
        <legend className="mb-2 p-0 font-bold">{labelContent}</legend>
        <div className={cn("flex flex-col gap-2", className)}>{body}</div>
      </>
    );
  }

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <label htmlFor={id} className="font-bold">
        {labelContent}
      </label>
      {body}
    </div>
  );
}

/**
 * Classes communes aux contrôles de saisie : verre discret (`glass-quiet`, D-032), bordure
 * `field-border` (3,63 sur le verre posé sur papier : le contour reste perceptible), rayon 10 px,
 * cible 48 px. Le champ désactivé repasse en sable plein.
 */
export const controlClasses =
  "min-h-12 w-full rounded-field glass-quiet border border-field-border px-4 py-3 text-ink " +
  "placeholder:text-text-soft disabled:cursor-not-allowed disabled:bg-sand disabled:text-text-soft " +
  "aria-invalid:border-2 aria-invalid:border-danger";
