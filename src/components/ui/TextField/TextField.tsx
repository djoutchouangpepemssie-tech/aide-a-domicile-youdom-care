import { useId, type ComponentPropsWithoutRef, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { controlClasses, describedBy, FieldShell } from "@/components/ui/FieldShell/FieldShell";

export interface TextFieldProps extends Omit<ComponentPropsWithoutRef<"input">, "id"> {
  id?: string;
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  optional?: boolean;
}

/** Champ texte, e-mail, téléphone, date… avec étiquette, aide et erreur liées (docs/05 §6). */
export function TextField({
  id: givenId,
  label,
  hint,
  error,
  optional,
  className,
  type = "text",
  ...rest
}: TextFieldProps) {
  const generated = useId();
  const id = givenId ?? generated;
  return (
    <FieldShell id={id} label={label} hint={hint} error={error} optional={optional}>
      <input
        id={id}
        type={type}
        className={cn(controlClasses, type === "tel" && "tabular-figures", className)}
        aria-describedby={describedBy(id, Boolean(hint), Boolean(error))}
        aria-invalid={error ? true : undefined}
        {...rest}
      />
    </FieldShell>
  );
}
