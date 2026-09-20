import { useId, type ComponentPropsWithoutRef, type ReactNode } from "react";
import { cn } from "@/lib/cn";

/*
 * Encart (docs/02 §7) : « À retenir », « Bon à savoir », « Attention », « Ce que nous ne faisons pas ».
 * Rôle `note`, titre relié par aria-labelledby, icône au fil décorative (tracé ouvert, jamais rempli).
 * Couples de couleurs : ceux de docs/02 §2 uniquement.
 */
export type CalloutVariant = "retenir" | "bon-a-savoir" | "attention" | "ne-faisons-pas";

export interface CalloutProps extends Omit<ComponentPropsWithoutRef<"aside">, "title"> {
  variant?: CalloutVariant;
  /** Titre affiché ; par défaut, le libellé du cahier pour la variante. */
  title?: ReactNode;
}

const defaults: Record<CalloutVariant, { title: string; box: string; heading: string }> = {
  retenir: {
    title: "À retenir",
    box: "border-teal-700 bg-tint-teal text-ink",
    heading: "text-teal-900",
  },
  // green-700 sur green-50 ne fait que 4,47 : le titre reste en encre (12,84), la bordure porte le vert.
  "bon-a-savoir": {
    title: "Bon à savoir",
    box: "border-green-700 bg-tint-green text-ink",
    heading: "text-ink",
  },
  attention: {
    title: "Attention",
    box: "border-warning bg-warning-bg text-warning",
    heading: "text-warning",
  },
  "ne-faisons-pas": {
    title: "Ce que nous ne faisons pas",
    box: "border-raspberry-700 bg-tint-raspberry text-ink",
    heading: "text-raspberry-700",
  },
};

/* Icônes au fil : un seul tracé ouvert, épaisseur constante, extrémités arrondies. */
const paths: Record<CalloutVariant, string> = {
  retenir: "M4 14c3-8 8-9 10-4s-4 9-2 12M12 3v3",
  "bon-a-savoir": "M12 4v1M12 9c2 0 3 1 3 3v5c0 2-1 3-3 3",
  attention: "M12 4 4 19h16M12 10v4M12 17v.5",
  "ne-faisons-pas": "M7 7c3 3 7 7 10 10M17 7 7 17M12 21c-3 0-4-2-5-3",
};

export function Callout({
  variant = "retenir",
  title,
  className,
  children,
  ...rest
}: CalloutProps) {
  const id = useId();
  const config = defaults[variant];
  return (
    <aside
      role="note"
      aria-labelledby={id}
      className={cn("rounded-card border-l-4 px-5 py-4 shadow-1", config.box, className)}
      {...rest}
    >
      <p id={id} className={cn("flex items-center gap-2 font-bold", config.heading)}>
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          width="24"
          height="24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="shrink-0"
        >
          <path d={paths[variant]} />
        </svg>
        {title ?? config.title}
      </p>
      <div className="mt-2 [&_p+p]:mt-2">{children}</div>
    </aside>
  );
}
