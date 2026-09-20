"use client";

import { useId, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";

/*
 * Sélecteur segmenté des exemples de semaine (docs/design/CONCEPT.md §3 bloc 5) : une rangée de
 * boutons `aria-pressed` (un par exemple), un seul panneau affiché. Les panneaux sont rendus par
 * le serveur (photo + récit) et passés ici tout faits : l'île ne porte que l'état. Le premier
 * exemple est affiché d'emblée, sans JavaScript.
 */

export interface WeekStoryPanel {
  id: string;
  label: string;
  /** Icône décorative (24 px) déjà rendue par le serveur. */
  icon?: ReactNode;
  content: ReactNode;
}

export interface WeekStorySwitcherProps {
  panels: readonly WeekStoryPanel[];
  /** Nom accessible du groupe de boutons (« Choisir un exemple »). */
  label: string;
  className?: string;
}

export function WeekStorySwitcher({ panels, label, className }: WeekStorySwitcherProps) {
  const baseId = useId();
  const [selected, setSelected] = useState(0);
  const current = panels[selected] ?? panels[0];

  return (
    <div className={cn("week-story-switcher", className)}>
      <div
        role="group"
        aria-label={label}
        className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:thin] sm:flex-wrap"
      >
        {panels.map((panel, index) => {
          const active = index === selected;
          return (
            <button
              key={panel.id}
              type="button"
              aria-pressed={active}
              aria-controls={`${baseId}-panel`}
              onClick={() => setSelected(index)}
              className={cn(
                "inline-flex min-h-12 shrink-0 items-center gap-2 rounded-button border-2 px-4 font-bold whitespace-nowrap transition-colors [transition-duration:var(--duration-fast)] motion-reduce:transition-none",
                active
                  ? "border-teal-800 bg-teal-800 text-white"
                  : "border-line bg-white text-ink hover:border-teal-700 hover:bg-teal-50",
              )}
            >
              {panel.icon ? (
                <span aria-hidden="true" className="inline-flex [&_svg]:text-current">
                  {panel.icon}
                </span>
              ) : null}
              {panel.label}
            </button>
          );
        })}
      </div>
      <div id={`${baseId}-panel`} className="mt-6" data-example={current?.id}>
        {current?.content}
      </div>
    </div>
  );
}
