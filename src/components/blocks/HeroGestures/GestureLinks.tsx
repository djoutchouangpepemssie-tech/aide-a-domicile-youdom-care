import Link from "next/link";
import { useId, type ReactNode } from "react";
import type { HeroTone } from "@/components/blocks/Hero/Hero";
import { Icon } from "@/components/ui/Icon/Icon";
import type { IconName } from "@/components/ui/Icon/icons";
import { cn } from "@/lib/cn";
import { gestureList, gestureQuestion, gestureRow } from "./gesture-row";

/*
 * Geste de hero fait de liens (docs/design/CONCEPT.md §4) : une question, des rangées de 56 px
 * qui mènent au formulaire du cas avec un paramètre de requête (params.ts). Composant serveur :
 * aucun JavaScript, aucun état, rien de conservé. `PlanningShortcuts`, `DischargeChooser`,
 * `CaregiverFirstQuestion` et la variante « Combien de temps ? » de `NightChooser` l'utilisent.
 */

export interface GestureChoice {
  href: string;
  label: string;
  icon?: IconName;
}

export interface GestureLinksProps {
  question: string;
  choices: readonly GestureChoice[];
  tone?: HeroTone;
  /** Mention sous les rangées (« Pas un test médical. Rien n'est conservé. »). */
  note?: ReactNode;
  /** Nom du geste, posé en `data-gesture` (tests, styles). */
  name: string;
  className?: string;
}

export function GestureLinks({
  question,
  choices,
  tone = "clair",
  note,
  name,
  className,
}: GestureLinksProps) {
  const questionId = useId();
  return (
    <div
      role="group"
      aria-labelledby={questionId}
      data-gesture={name}
      className={cn("hero-gesture", className)}
    >
      <p id={questionId} className={gestureQuestion(tone)}>
        {question}
      </p>
      <ul className={gestureList}>
        {choices.map((choice) => (
          <li key={choice.href} className="max-w-none">
            <Link href={choice.href} prefetch={false} className={gestureRow(tone)}>
              {choice.icon ? (
                <Icon name={choice.icon} size="sm" tone={tone === "sombre" ? "white" : "teal"} />
              ) : null}
              <span>{choice.label}</span>
            </Link>
          </li>
        ))}
      </ul>
      {note ? (
        <p
          className={cn(
            "m-0 mt-3 text-small",
            tone === "sombre" ? "text-teal-50" : "text-text-soft",
          )}
        >
          {note}
        </p>
      ) : null}
    </div>
  );
}
