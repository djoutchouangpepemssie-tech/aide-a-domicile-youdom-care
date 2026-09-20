import { useId, type ComponentPropsWithoutRef, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { controlClasses, describedBy, FieldShell } from "@/components/ui/FieldShell/FieldShell";

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends Omit<ComponentPropsWithoutRef<"select">, "id" | "children"> {
  id?: string;
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  optional?: boolean;
  options: readonly SelectOption[];
  /** Première option vide, sélectionnée par défaut (« Choisissez… »). */
  placeholder?: string;
}

/** Liste déroulante native : clavier, lecteur d'écran et mobile pris en charge par le navigateur. */
export function Select({
  id: givenId,
  label,
  hint,
  error,
  optional,
  options,
  placeholder,
  className,
  ...rest
}: SelectProps) {
  const generated = useId();
  const id = givenId ?? generated;
  return (
    <FieldShell id={id} label={label} hint={hint} error={error} optional={optional}>
      <select
        id={id}
        className={cn(controlClasses, "cursor-pointer appearance-auto", className)}
        aria-describedby={describedBy(id, Boolean(hint), Boolean(error))}
        aria-invalid={error ? true : undefined}
        {...rest}
      >
        {placeholder !== undefined ? <option value="">{placeholder}</option> : null}
        {options.map((option) => (
          <option key={option.value} value={option.value} disabled={option.disabled}>
            {option.label}
          </option>
        ))}
      </select>
    </FieldShell>
  );
}
