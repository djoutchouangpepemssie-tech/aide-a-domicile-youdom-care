import type { ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/cn";
import { icons, type IconName } from "./icons";

/*
 * Icône « au fil » (docs/02 §1, docs/design/ICONES.md).
 * - Tracé de 24 × 24, trait d'épaisseur constante (`--thread-width` : 2 px ordinateur,
 *   1,75 px mobile) grâce à `vector-effect="non-scaling-stroke"`, extrémités rondes, jamais rempli.
 * - Trois tons : `teal` (teal-700, fond clair), `white` (fond sombre), `ink` (encre, à côté du
 *   texte). Le nœud reste `raspberry-500` dans les trois cas.
 * - Décorative par défaut (`aria-hidden`). Avec `label`, elle devient une image nommée
 *   (`role="img"`, `aria-label`). Une icône ne porte jamais seule une information : le texte
 *   voisin la dit toujours.
 */

export type IconSize = "sm" | "md" | "lg";
export type IconTone = "teal" | "white" | "ink";

export interface IconProps extends Omit<ComponentPropsWithoutRef<"svg">, "children" | "name"> {
  name: IconName;
  /** `sm` 20 px (texte courant, boutons), `md` 24 px (cartes), `lg` 32 px (titres de section). */
  size?: IconSize;
  tone?: IconTone;
  /** Nom de l'icône pour les lecteurs d'écran. Sans libellé, l'icône est décorative. */
  label?: string;
}

const sizes: Record<IconSize, { px: number; className: string }> = {
  sm: { px: 20, className: "size-5" },
  md: { px: 24, className: "size-6" },
  lg: { px: 32, className: "size-8" },
};

const tones: Record<IconTone, string> = {
  teal: "text-teal-700",
  white: "text-white",
  ink: "text-ink",
};

export function Icon({
  name,
  size = "md",
  tone = "teal",
  label,
  className,
  style,
  ...rest
}: IconProps) {
  const { main, knot } = icons[name];
  const { px, className: sizeClass } = sizes[size];
  const a11y = label
    ? { role: "img", "aria-label": label }
    : { "aria-hidden": true as const, focusable: "false" as const };

  return (
    <svg
      viewBox="0 0 24 24"
      width={px}
      height={px}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      data-icon={name}
      className={cn(
        "icon inline-block shrink-0 overflow-visible",
        sizeClass,
        tones[tone],
        className,
      )}
      style={{ strokeWidth: "var(--thread-width, 2px)", ...style }}
      {...a11y}
      {...rest}
    >
      <path d={main} vectorEffect="non-scaling-stroke" />
      {knot ? (
        <path d={knot} vectorEffect="non-scaling-stroke" className="icon-knot text-raspberry-500" />
      ) : null}
    </svg>
  );
}
