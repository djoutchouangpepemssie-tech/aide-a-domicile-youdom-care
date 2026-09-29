"use client";

import { useId, type ComponentPropsWithoutRef, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import type { ChoiceOption } from "@/components/ui/CheckboxGroup/CheckboxGroup";
import { describedBy, FieldShell } from "@/components/ui/FieldShell/FieldShell";

export interface RadioCardsProps extends Omit<
  ComponentPropsWithoutRef<"fieldset">,
  "id" | "onChange" | "defaultValue"
> {
  id?: string;
  name: string;
  legend: ReactNode;
  /** Légende gardée pour les lecteurs d'écran, retirée de l'affichage. */
  legendHidden?: boolean;
  hint?: ReactNode;
  error?: ReactNode;
  optional?: boolean;
  options: readonly ChoiceOption[];
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  /** Colonnes à partir de 640 px (1 par défaut sur mobile). */
  columns?: 1 | 2 | 3;
}

const columnClasses = { 1: "", 2: "sm:grid-cols-2", 3: "sm:grid-cols-3" } as const;

/**
 * Choix unique présenté en cartes (« Pour qui cherchez-vous de l'aide ? »). Boutons radio natifs :
 * flèches pour changer de choix, Espace pour cocher, un seul arrêt de tabulation par groupe.
 * Verre liquide (D-032) : chaque carte est une surface de verre ; la carte cochée devient un aplat
 * teal-50 plein bordé de 2 px (le choix est un signal, il ne passe pas par du verre).
 */
export function RadioCards({
  id: givenId,
  name,
  legend,
  legendHidden,
  hint,
  error,
  optional,
  options,
  value,
  defaultValue,
  onChange,
  columns = 2,
  className,
  disabled,
  ...rest
}: RadioCardsProps) {
  const generated = useId();
  const id = givenId ?? generated;

  return (
    <fieldset
      id={id}
      role="radiogroup"
      className={cn("m-0 min-w-0 border-0 p-0", className)}
      aria-describedby={describedBy(id, Boolean(hint), Boolean(error))}
      aria-invalid={error ? true : undefined}
      disabled={disabled}
      {...rest}
    >
      <FieldShell
        id={id}
        as="legend"
        label={legend}
        labelHidden={legendHidden}
        hint={hint}
        error={error}
        optional={optional}
      >
        <ul className={cn("m-0 grid list-none gap-3 p-0", columnClasses[columns])}>
          {options.map((option) => {
            const optionId = `${id}-${option.value}`;
            const checkedProps =
              value !== undefined
                ? { checked: value === option.value }
                : { defaultChecked: defaultValue === option.value };
            return (
              <li key={option.value} className="max-w-none">
                <label
                  htmlFor={optionId}
                  className={cn(
                    "glass glass-sheen flex min-h-14 cursor-pointer items-start gap-3 rounded-card border border-field-border px-4 py-3",
                    "transition-[border-color,background-color,box-shadow] [transition-duration:var(--duration-base)] motion-reduce:transition-none",
                    "hover:shadow-2 has-[:checked]:border-2 has-[:checked]:border-teal-700 has-[:checked]:bg-teal-50",
                    "has-[:disabled]:cursor-not-allowed has-[:disabled]:bg-sand has-[:disabled]:shadow-none",
                    "has-[:focus-visible]:outline has-[:focus-visible]:outline-[3px] has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-focus",
                  )}
                >
                  <input
                    id={optionId}
                    type="radio"
                    name={name}
                    value={option.value}
                    disabled={option.disabled}
                    onChange={onChange ? () => onChange(option.value) : undefined}
                    className="mt-0.5 size-5 shrink-0 accent-teal-700 focus-visible:outline-none"
                    {...checkedProps}
                  />
                  <span>
                    <span className="block font-bold">{option.label}</span>
                    {option.description ? (
                      <span className="block text-small text-text-soft">{option.description}</span>
                    ) : null}
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      </FieldShell>
    </fieldset>
  );
}
