import { useId, type ComponentPropsWithoutRef, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { controlClasses, describedBy, FieldShell } from "@/components/ui/FieldShell/FieldShell";

export interface TextareaProps extends Omit<ComponentPropsWithoutRef<"textarea">, "id"> {
  id?: string;
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  optional?: boolean;
}

/** Champ libre. Les formulaires rappellent de ne pas détailler l'état de santé (docs/05 §8). */
export function Textarea({
  id: givenId,
  label,
  hint,
  error,
  optional,
  className,
  rows = 4,
  ...rest
}: TextareaProps) {
  const generated = useId();
  const id = givenId ?? generated;
  return (
    <FieldShell id={id} label={label} hint={hint} error={error} optional={optional}>
      <textarea
        id={id}
        rows={rows}
        className={cn(controlClasses, "resize-y", className)}
        aria-describedby={describedBy(id, Boolean(hint), Boolean(error))}
        aria-invalid={error ? true : undefined}
        {...rest}
      />
    </FieldShell>
  );
}
