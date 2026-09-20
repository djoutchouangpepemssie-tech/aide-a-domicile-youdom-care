"use client";

import { useId, type ChangeEvent, type ComponentPropsWithoutRef, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { describedBy, FieldShell } from "@/components/ui/FieldShell/FieldShell";

export interface ChoiceOption {
  value: string;
  label: string;
  /** Précision courte sous le libellé. */
  description?: string;
  disabled?: boolean;
}

export interface CheckboxGroupProps extends Omit<
  ComponentPropsWithoutRef<"fieldset">,
  "id" | "onChange" | "defaultValue"
> {
  id?: string;
  /** Nom commun des cases (une valeur par case cochée à l'envoi). */
  name: string;
  legend: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  optional?: boolean;
  options: readonly ChoiceOption[];
  /** Valeurs cochées (contrôlé) ou cochées au départ (`defaultValue`). */
  value?: readonly string[];
  defaultValue?: readonly string[];
  onChange?: (values: string[]) => void;
}

/**
 * Cases à cocher groupées dans un `fieldset` avec `legend` (docs/05 §4 : « Plusieurs choix
 * possibles »). Chaque case est une cible de 48 px ; aide et erreur sont reliées au groupe.
 */
export function CheckboxGroup({
  id: givenId,
  name,
  legend,
  hint,
  error,
  optional,
  options,
  value,
  defaultValue,
  onChange,
  className,
  disabled,
  ...rest
}: CheckboxGroupProps) {
  const generated = useId();
  const id = givenId ?? generated;

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (!onChange) return;
    const form = event.currentTarget.form;
    const checked = form
      ? Array.from(form.querySelectorAll<HTMLInputElement>(`input[name="${name}"]:checked`)).map(
          (input) => input.value,
        )
      : [];
    onChange(checked);
  };

  return (
    <fieldset
      id={id}
      className={cn("m-0 min-w-0 border-0 p-0", className)}
      aria-describedby={describedBy(id, Boolean(hint), Boolean(error))}
      disabled={disabled}
      {...rest}
    >
      <FieldShell id={id} as="legend" label={legend} hint={hint} error={error} optional={optional}>
        <ul className="m-0 grid list-none gap-2 p-0 sm:grid-cols-2">
          {options.map((option) => {
            const optionId = `${id}-${option.value}`;
            const checkedProps =
              value !== undefined
                ? { checked: value.includes(option.value) }
                : { defaultChecked: defaultValue?.includes(option.value) ?? false };
            return (
              <li key={option.value} className="max-w-none">
                <label
                  htmlFor={optionId}
                  className={cn(
                    "flex min-h-12 cursor-pointer items-start gap-3 rounded-field border border-field-border bg-white px-4 py-3",
                    "has-[:checked]:border-teal-700 has-[:checked]:bg-teal-50 has-[:disabled]:cursor-not-allowed has-[:disabled]:bg-sand",
                    "has-[:focus-visible]:outline has-[:focus-visible]:outline-[3px] has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-focus",
                  )}
                >
                  <input
                    id={optionId}
                    type="checkbox"
                    name={name}
                    value={option.value}
                    disabled={option.disabled}
                    onChange={handleChange}
                    className="mt-0.5 size-5 shrink-0 accent-teal-700 focus-visible:outline-none"
                    {...checkedProps}
                  />
                  <span>
                    <span className="block">{option.label}</span>
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
