import Link from "next/link";
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { cn } from "@/lib/cn";

/*
 * Bouton (docs/02 §4 et §7, docs/01 §6).
 * - `primary` : framboise, la seule couleur d'action. Un seul bouton `primary` par écran visible.
 * - `secondary` : bleu canard plein ; `outline` : contour bleu canard ; `link` : lien souligné.
 * - Libellés : bibliothèque de docs/01 §6 (content/interface.json). Jamais « Envoyer », « Valider »,
 *   « Cliquez ici », « En savoir plus ».
 * - Cible tactile de 48 px, 56 px pour le principal. Rayon 14 px, jamais en pilule complète.
 *
 * Verre liquide (D-032, src/styles/glass.css) : le bouton principal garde son aplat framboise et
 * son sens ; il gagne l'élévation 2 (3 au survol) et un liseré lumineux (`glass-edge`). Il ne
 * reçoit **pas** de reflet mobile : un voile blanc de 10 % ferait tomber le texte blanc à 4,34.
 * Le bouton secondaire devient du verre sombre (`glass glass-dark`, teal-900 à 88 %) : son texte
 * blanc reste à 7,35 au minimum sur n'importe quel fond, photo comprise. Le bouton fantôme devient
 * du verre discret (`glass-quiet`) et garde son contour de 2 px teal-700.
 */

export type ButtonVariant = "primary" | "secondary" | "outline" | "link";

interface BaseProps {
  variant?: ButtonVariant;
  /** Occupe toute la largeur disponible (mobile). */
  block?: boolean;
  /** Icône décorative placée avant le libellé. */
  icon?: ReactNode;
  className?: string;
  children: ReactNode;
}

export type ButtonAsButtonProps = BaseProps &
  Omit<ComponentPropsWithoutRef<"button">, keyof BaseProps> & { href?: undefined };

export type ButtonAsLinkProps = BaseProps &
  Omit<ComponentPropsWithoutRef<"a">, keyof BaseProps | "href"> & { href: string };

export type ButtonProps = ButtonAsButtonProps | ButtonAsLinkProps;

const base =
  "inline-flex items-center justify-center gap-2 rounded-button px-6 text-button font-bold leading-button " +
  "no-underline transition-[background-color,color,box-shadow,transform] [transition-duration:var(--duration-base)] [transition-timing-function:var(--ease-out)] " +
  "active:translate-y-px motion-reduce:transition-none motion-reduce:active:translate-y-0 " +
  "disabled:cursor-not-allowed disabled:opacity-60 aria-disabled:cursor-not-allowed aria-disabled:opacity-60";

const variants: Record<ButtonVariant, string> = {
  primary:
    "min-h-14 bg-action text-white glass-edge shadow-2 hover:bg-action-hover hover:shadow-3 disabled:hover:bg-action aria-disabled:hover:bg-action",
  secondary:
    "min-h-12 glass glass-dark glass-edge glass-sheen text-white hover:shadow-3 disabled:hover:shadow-2 aria-disabled:hover:shadow-2",
  outline:
    "min-h-12 glass-quiet glass-sheen border-2 border-teal-700 text-teal-700 hover:bg-teal-50 hover:text-teal-800 disabled:hover:bg-transparent aria-disabled:hover:bg-transparent",
  link: "min-h-12 px-1 text-link underline decoration-[0.08em] underline-offset-[0.15em] hover:text-teal-800",
};

export function Button(props: ButtonProps) {
  const { variant = "primary", block = false, icon, className, children } = props;
  const classes = cn(base, variants[variant], block && "flex w-full", className);
  const iconNode = icon ? (
    <span aria-hidden="true" className="inline-flex shrink-0">
      {icon}
    </span>
  ) : null;

  if (props.href !== undefined) {
    const { href, variant: _v, block: _b, icon: _i, className: _c, children: _ch, ...rest } = props;
    // Les appels à l'action mènent surtout aux formulaires (JavaScript lourd) : pas de
    // préchargement, la page se charge au clic.
    return (
      <Link href={href} prefetch={false} className={classes} {...rest}>
        {iconNode}
        {children}
      </Link>
    );
  }

  const {
    type = "button",
    variant: _v,
    block: _b,
    icon: _i,
    className: _c,
    children: _ch,
    ...rest
  } = props;
  return (
    <button type={type} className={classes} {...rest}>
      {iconNode}
      {children}
    </button>
  );
}
