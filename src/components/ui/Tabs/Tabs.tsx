"use client";

import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { cn } from "@/lib/cn";

/*
 * Onglets accessibles (motif WAI-ARIA « tabs », activation automatique) : un seul arrêt de
 * tabulation sur la liste, flèches gauche/droite, Début/Fin pour changer d'onglet, panneau relié
 * par aria-labelledby. Sans JavaScript, tous les panneaux restent lisibles (le premier est
 * affiché ; les autres sont masqués seulement après montage).
 */

export interface TabItem {
  id: string;
  label: string;
  content: ReactNode;
}

export interface TabsProps {
  items: readonly TabItem[];
  /** Nom accessible de la liste d'onglets. */
  label: string;
  className?: string;
}

export function Tabs({ items, label, className }: TabsProps) {
  const baseId = useId();
  const [selected, setSelected] = useState(0);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const focusTab = (index: number) => {
    const next = (index + items.length) % items.length;
    setSelected(next);
    tabRefs.current[next]?.focus();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const keys: Record<string, () => void> = {
      ArrowRight: () => focusTab(index + 1),
      ArrowLeft: () => focusTab(index - 1),
      Home: () => focusTab(0),
      End: () => focusTab(items.length - 1),
    };
    const action = keys[event.key];
    if (action) {
      event.preventDefault();
      action();
    }
  };

  return (
    <div className={cn("tabs", className)}>
      <div
        role="tablist"
        aria-label={label}
        className="flex flex-wrap gap-2 border-b border-line pb-3"
      >
        {items.map((item, index) => {
          const active = index === selected;
          return (
            <button
              key={item.id}
              ref={(node) => {
                tabRefs.current[index] = node;
              }}
              type="button"
              role="tab"
              id={`${baseId}-tab-${item.id}`}
              aria-selected={active}
              aria-controls={`${baseId}-panel-${item.id}`}
              tabIndex={active ? 0 : -1}
              onClick={() => setSelected(index)}
              onKeyDown={(event) => onKeyDown(event, index)}
              className={cn(
                "min-h-12 rounded-button border-2 px-4 font-bold transition-colors [transition-duration:var(--duration-fast)] motion-reduce:transition-none",
                active
                  ? "border-teal-800 bg-teal-800 text-white"
                  : "border-line bg-white text-ink hover:border-teal-700 hover:bg-teal-50",
              )}
            >
              {item.label}
            </button>
          );
        })}
      </div>
      {items.map((item, index) => (
        <div
          key={item.id}
          role="tabpanel"
          id={`${baseId}-panel-${item.id}`}
          aria-labelledby={`${baseId}-tab-${item.id}`}
          hidden={index !== selected}
          tabIndex={0}
          className="pt-6 focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-focus"
        >
          {item.content}
        </div>
      ))}
    </div>
  );
}
