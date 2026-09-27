import { useId, type ComponentProps, type ReactNode } from "react";
import { cn } from "@/lib/cn";

/*
 * Encart (docs/02 §7) : « À retenir », « Bon à savoir », « Attention », « Ce que nous ne faisons pas ».
 * Rôle `note`, titre relié par aria-labelledby, icône au fil décorative (tracé ouvert, jamais rempli).
 * Couples de couleurs : ceux de docs/02 §2 uniquement.
 * Verre liquide (D-032) : l'encart est une surface de verre teintée (`glass` + `glass-tint-*`,
 * src/styles/glass.css) dont le fond reste la couleur de la variante ; le trait de gauche porte
 * toujours le signal. Contrastes mesurés dans docs/design/LIQUID_GLASS.md §5.
 * Variante `frontiere` (docs/design/CONCEPT.md §5 « Rendre "Ce que nous ne faisons pas" élégant ») :
 * une décision, pas un avertissement. Bloc sable de 28 px de rayon, trait du fil vertical de 3 px
 * teal-700 à gauche, titre en Fraunces, sous-titre, liste à deux colonnes à partir de 48 rem
 * (« nous ne faisons pas » / « qui le fait ») quand un `relais` est fourni, icône croix ouverte au
 * fil par item, ligne de fin facultative. Aucun mouvement, aucun rouge.
 */
export type CalloutVariant =
  "retenir" | "bon-a-savoir" | "attention" | "ne-faisons-pas" | "frontiere";

export interface FrontiereItem {
  /** Ce que nous ne faisons pas (« Les soins infirmiers et les actes médicaux »). */
  texte: string;
  /** Qui le fait (« les infirmiers, le SSIAD, l'HAD ») ; facultatif. */
  relais?: string;
}

/* `ref` accepté comme une propriété ordinaire (React 19) : un formulaire peut déplacer le focus sur
   l'encart d'alerte de panne d'envoi (audit P8.4 R-4). */
export interface CalloutProps extends Omit<ComponentProps<"aside">, "title"> {
  variant?: CalloutVariant;
  /** Titre affiché ; par défaut, le libellé du cahier pour la variante. */
  title?: ReactNode;
  /** `frontiere` : sous-titre sous le titre (« Et avec qui nous travaillons pour cela »). */
  subtitle?: ReactNode;
  /** `frontiere` : les items, à la place ou en plus de `children`. */
  items?: readonly FrontiereItem[];
  /** `frontiere` : en-têtes des deux colonnes (« Nous ne faisons pas » / « Qui le fait »). */
  columns?: { faits: string; relais: string };
  /** `frontiere` : ligne de fin en 15 px. */
  footer?: ReactNode;
}

const defaults: Record<CalloutVariant, { title: string; box: string; heading: string }> = {
  retenir: {
    title: "À retenir",
    box: "glass glass-tint-teal border-teal-700 text-ink",
    heading: "text-teal-900",
  },
  // green-700 sur green-50 ne fait que 4,47 : le titre reste en encre (12,84), la bordure porte le vert.
  "bon-a-savoir": {
    title: "Bon à savoir",
    box: "glass glass-tint-green border-green-700 text-ink",
    heading: "text-ink",
  },
  attention: {
    title: "Attention",
    box: "glass glass-tint-warning border-warning text-warning",
    heading: "text-warning",
  },
  "ne-faisons-pas": {
    title: "Ce que nous ne faisons pas",
    box: "glass glass-tint-framboise border-raspberry-700 text-ink",
    heading: "text-raspberry-700",
  },
  // teal-700 sur sable ne fait que 4,47 : le trait le porte, les textes restent en encre ou teal-800.
  frontiere: {
    title: "Ce que nous ne faisons pas",
    box: "glass glass-tint-sable glass-edge border-teal-700 text-ink",
    heading: "text-teal-900",
  },
};

/* Icônes au fil : un seul tracé ouvert, épaisseur constante, extrémités arrondies. */
const paths: Record<CalloutVariant, string> = {
  retenir: "M4 14c3-8 8-9 10-4s-4 9-2 12M12 3v3",
  "bon-a-savoir": "M12 4v1M12 9c2 0 3 1 3 3v5c0 2-1 3-3 3",
  attention: "M12 4 4 19h16M12 10v4M12 17v.5",
  "ne-faisons-pas": "M7 7c3 3 7 7 10 10M17 7 7 17M12 21c-3 0-4-2-5-3",
  /* Croix ouverte : deux traits qui ne se touchent pas. */
  frontiere: "M6 6l4.5 4.5M13.5 13.5 18 18M18 6l-4.5 4.5M10.5 13.5 6 18",
};

function ThreadIcon({ d, className }: { d: string; className?: string }) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 24 24"
      width="24"
      height="24"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("shrink-0", className)}
      style={{ strokeWidth: "var(--thread-width, 2px)" }}
    >
      <path d={d} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export function Callout({
  variant = "retenir",
  title,
  subtitle,
  items,
  columns,
  footer,
  className,
  children,
  ...rest
}: CalloutProps) {
  const id = useId();
  const config = defaults[variant];

  if (variant === "frontiere") {
    const twoColumns = items?.some((item) => item.relais) ?? false;
    return (
      <aside
        role="note"
        aria-labelledby={id}
        data-variant="frontiere"
        className={cn(
          "callout-frontiere rounded-block border-l-[3px] px-5 py-5 sm:px-8 sm:py-7",
          config.box,
          className,
        )}
        {...rest}
      >
        <p id={id} className={cn("heading-3 m-0 flex items-center gap-3", config.heading)}>
          <ThreadIcon d={paths.frontiere} className="text-teal-700" />
          {title ?? config.title}
        </p>
        {subtitle ? <p className="m-0 mt-1 text-small text-text-soft">{subtitle}</p> : null}
        {items && items.length > 0 ? (
          <ul
            className={cn("m-0 mt-5 list-none divide-y divide-line p-0", twoColumns && "md:mt-4")}
          >
            {twoColumns && columns ? (
              <li
                aria-hidden="true"
                className="hidden gap-6 pb-2 text-small text-text-soft md:grid md:grid-cols-2"
              >
                <span className="pl-9">{columns.faits}</span>
                <span>{columns.relais}</span>
              </li>
            ) : null}
            {items.map((item) => (
              <li
                key={item.texte}
                className={cn(
                  "grid max-w-none gap-1 py-3",
                  twoColumns && "md:grid-cols-2 md:gap-6",
                )}
              >
                <span className="flex items-start gap-3">
                  <ThreadIcon d={paths.frontiere} className="mt-0.5 text-teal-700" />
                  <span>{item.texte}</span>
                </span>
                {item.relais ? (
                  <span className="pl-9 text-teal-800 md:pl-0">
                    {columns ? <span className="sr-only">{columns.relais} : </span> : null}
                    <span aria-hidden="true">→ </span>
                    {item.relais}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        ) : null}
        {children ? <div className="mt-4 [&_p+p]:mt-2">{children}</div> : null}
        {footer ? (
          <p className="m-0 mt-5 border-t border-line pt-4 text-small text-text-soft">{footer}</p>
        ) : null}
      </aside>
    );
  }

  return (
    <aside
      role="note"
      aria-labelledby={id}
      className={cn("rounded-card border-l-4 px-5 py-4", config.box, className)}
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
