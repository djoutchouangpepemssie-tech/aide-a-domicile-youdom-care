"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";

/*
 * Barre d'action mobile (docs/02 §7, docs/design/CONCEPT.md §7) : fixe en bas, trois voies de
 * contact toujours visibles (Appeler · Être rappelé(e) · Ma demande). Les libellés affichés sont les
 * libellés courts de `barre_mobile.court` (« Appeler · Rappel · Ma demande »), sur une ligne à
 * 375 px (texte 15 px, icônes 22 px) ; le libellé complet reste le nom accessible (`aria-label`).
 * Chaque cible fait 56 px de haut, la barre ajoute `safe-area-inset-bottom`. L'élément du milieu
 * est le seul framboise. Elle se retire dès qu'un champ de saisie a le focus pour ne jamais le
 * masquer. Cachée à partir de 64 rem (le rail de conversion prend le relais sur ordinateur).
 */

export interface MobileActionBarTexts {
  nom: string;
  appeler: string;
  rappel: string;
  demande: string;
  /** Libellés courts affichés ; les libellés complets ci-dessus restent le nom accessible. */
  court: {
    appeler: string;
    rappel: string;
    demande: string;
  };
}

export interface MobileActionBarProps {
  phone: { display: string; href: string } | null;
  callbackHref: string;
  requestHref: string;
  texts: MobileActionBarTexts;
}

const textEntry = new Set(["INPUT", "TEXTAREA", "SELECT"]);

function isTextEntry(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && textEntry.has(target.tagName);
}

const itemClass =
  "flex min-h-14 flex-1 flex-col items-center justify-center gap-1 px-2 text-small leading-none font-bold whitespace-nowrap no-underline";

const iconProps = {
  "aria-hidden": true,
  viewBox: "0 0 24 24",
  width: 22,
  height: 22,
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  className: "shrink-0",
} as const;

/** Quand le libellé court diffère du complet, le complet devient le nom accessible. */
function accessibleName(full: string, short: string): string | undefined {
  return short === full ? undefined : full;
}

export function MobileActionBar({ phone, callbackHref, requestHref, texts }: MobileActionBarProps) {
  const [fieldActive, setFieldActive] = useState(false);

  useEffect(() => {
    const onFocusIn = (event: FocusEvent) => setFieldActive(isTextEntry(event.target));
    const onFocusOut = () => setFieldActive(false);
    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("focusout", onFocusOut);
    return () => {
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("focusout", onFocusOut);
    };
  }, []);

  // `inert` retire la barre du focus et de l'arbre d'accessibilité tant qu'un champ est actif.
  return (
    <nav
      aria-label={texts.nom}
      data-print="hide"
      data-field-active={fieldActive ? "true" : "false"}
      className={cn(
        "fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white/95 shadow-2 backdrop-blur lg:hidden",
        "pb-[env(safe-area-inset-bottom)] transition-transform [transition-duration:var(--duration-base)] motion-reduce:transition-none",
        fieldActive && "translate-y-full",
      )}
      inert={fieldActive}
    >
      <ul className="m-0 flex list-none items-stretch p-0">
        {phone ? (
          <li className="max-w-none flex-1">
            <a
              href={phone.href}
              aria-label={accessibleName(texts.appeler, texts.court.appeler)}
              data-mesure="barre-mobile"
              className={cn(itemClass, "text-teal-800")}
            >
              <svg {...iconProps}>
                <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" />
              </svg>
              {texts.court.appeler}
            </a>
          </li>
        ) : null}
        <li className="max-w-none flex-1">
          <Link
            href={callbackHref}
            prefetch={false}
            aria-label={accessibleName(texts.rappel, texts.court.rappel)}
            className={cn(itemClass, "bg-action text-white")}
          >
            <svg {...iconProps}>
              <path d="M4 12a8 8 0 0 1 14-5l2 2M20 4v5h-5M20 12a8 8 0 0 1-14 5l-2-2M4 20v-5h5" />
            </svg>
            {texts.court.rappel}
          </Link>
        </li>
        <li className="max-w-none flex-1">
          <Link
            href={requestHref}
            prefetch={false}
            aria-label={accessibleName(texts.demande, texts.court.demande)}
            className={cn(itemClass, "text-teal-800")}
          >
            <svg {...iconProps}>
              <path d="M7 3h7l5 5v13H7zM14 3v5h5M10 13h6M10 17h6" />
            </svg>
            {texts.court.demande}
          </Link>
        </li>
      </ul>
    </nav>
  );
}
