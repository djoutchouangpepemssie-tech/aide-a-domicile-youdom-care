"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { Button } from "@/components/ui/Button/Button";
import type { NavigationItem } from "@/content/schemas";
import { cn } from "@/lib/cn";

/*
 * En-tête (docs/02 §7, docs/00 §5) : collant, 80 px puis 64 px au défilement, logo, six entrées,
 * téléphone cliquable, bouton principal « Être rappelé(e) ». Les menus déroulants suivent le motif
 * « disclosure navigation » (bouton aria-expanded + panneau de liens) : Tab parcourt les liens,
 * Échap ferme et rend le focus au bouton, un clic ou un focus hors du menu le ferme.
 * Sur mobile, un bouton « Menu » ouvre un panneau où les groupes sont des details/summary natifs.
 * Le lien d'évitement « Aller au contenu » cible `#contenu` (chaque page pose `<main id="contenu">`).
 */

export interface HeaderTexts {
  aller_au_contenu: string;
  navigation_principale: string;
  accueil: string;
  menu: string;
  fermer_menu: string;
  /** Contient {téléphone}. */
  appeler: string;
}

export interface HeaderProps {
  brandName: string;
  /** Téléphone principal ; null si inconnu (le lien se masque). */
  phone: { display: string; href: string } | null;
  navigation: NavigationItem[];
  callbackHref: string;
  callbackLabel: string;
  texts: HeaderTexts;
  /** Bouton du mode confort de lecture (P1.7), affiché à côté des actions et dans le menu mobile. */
  comfortSlot?: ReactNode;
}

const COMPACT_AFTER_PX = 24;

function PhoneIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0"
    >
      <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" />
    </svg>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn(
        "shrink-0 transition-transform [transition-duration:var(--duration-fast)]",
        open && "rotate-180",
      )}
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

export function Header({
  brandName,
  phone,
  navigation,
  callbackHref,
  callbackLabel,
  texts,
  comfortSlot,
}: HeaderProps) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [compact, setCompact] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  const buttonRefs = useRef(new Map<string, HTMLButtonElement>());
  const mobileButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const update = () => setCompact(window.scrollY > COMPACT_AFTER_PX);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);

  useEffect(() => {
    if (openId === null) return;
    const onPointerDown = (event: PointerEvent) => {
      if (navRef.current && !navRef.current.contains(event.target as Node)) setOpenId(null);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [openId]);

  const closeAndFocus = useCallback((id: string) => {
    setOpenId(null);
    buttonRefs.current.get(id)?.focus();
  }, []);

  const onNavKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === "Escape" && openId !== null) {
      event.preventDefault();
      closeAndFocus(openId);
    }
  };

  // Le menu ouvert se ferme dès que le focus quitte son bouton ou son panneau (même vers une
  // autre entrée de la navigation).
  const onNavBlur = (event: React.FocusEvent<HTMLElement>) => {
    if (openId === null) return;
    const next = event.relatedTarget;
    const openItem = document.getElementById(`menu-${openId}`)?.parentElement;
    if (next instanceof Node && openItem?.contains(next)) return;
    setOpenId(null);
  };

  const onMobileKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === "Escape" && mobileOpen) {
      event.preventDefault();
      setMobileOpen(false);
      mobileButtonRef.current?.focus();
    }
  };

  const phoneLabel = phone ? texts.appeler.replace("{téléphone}", phone.display) : null;

  return (
    <header
      data-compact={compact ? "true" : "false"}
      onKeyDown={onMobileKeyDown}
      className={cn(
        "sticky top-0 z-40 border-b border-line bg-paper/95 backdrop-blur",
        "transition-[box-shadow] [transition-duration:var(--duration-base)] motion-reduce:transition-none",
        compact && "shadow-2",
      )}
    >
      <a
        href="#contenu"
        className="sr-only z-50 rounded-button bg-action px-4 py-3 font-bold text-white focus:not-sr-only focus:absolute focus:top-2 focus:left-2"
      >
        {texts.aller_au_contenu}
      </a>

      <div
        className={cn(
          "container-site flex items-center justify-between gap-4 transition-[height] [transition-duration:var(--duration-base)] motion-reduce:transition-none",
          compact ? "h-16" : "h-20",
        )}
      >
        <Link
          href="/"
          aria-label={texts.accueil}
          className="heading-3 shrink-0 text-teal-900 no-underline hover:text-teal-700"
        >
          {brandName}
        </Link>

        <nav
          ref={navRef}
          aria-label={texts.navigation_principale}
          className="hidden lg:block"
          onKeyDown={onNavKeyDown}
          onBlur={onNavBlur}
        >
          <ul className="m-0 flex list-none items-center gap-1 p-0">
            {navigation.map((item) => {
              const panelId = `menu-${item.id}`;
              const isOpen = openId === item.id;
              if (item.enfants) {
                return (
                  <li key={item.id} className="relative max-w-none">
                    <button
                      ref={(node) => {
                        if (node) buttonRefs.current.set(item.id, node);
                        else buttonRefs.current.delete(item.id);
                      }}
                      type="button"
                      aria-expanded={isOpen}
                      aria-controls={panelId}
                      onClick={() => setOpenId(isOpen ? null : item.id)}
                      className={cn(
                        "inline-flex min-h-12 items-center gap-1 rounded-button px-3 font-bold text-ink hover:bg-teal-50",
                        isOpen && "bg-teal-50 text-teal-900",
                      )}
                    >
                      {item.libelle}
                      <Chevron open={isOpen} />
                    </button>
                    <div
                      id={panelId}
                      hidden={!isOpen}
                      className="absolute top-full left-0 mt-2 w-[min(40rem,calc(100vw-2rem))] rounded-card border border-line bg-white p-4 shadow-2"
                    >
                      <ul className="m-0 grid list-none gap-1 p-0 sm:grid-cols-2">
                        {item.enfants.map((child) => (
                          <li key={child.href} className="max-w-none">
                            <Link
                              href={child.href}
                              className="block rounded-field px-3 py-2 no-underline hover:bg-teal-50"
                              onClick={() => setOpenId(null)}
                            >
                              <span className="block font-bold text-ink">{child.libelle}</span>
                              {child.description ? (
                                <span className="block text-small text-text-soft">
                                  {child.description}
                                </span>
                              ) : null}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </li>
                );
              }
              return (
                <li key={item.id} className="max-w-none">
                  <Link
                    href={item.href ?? "/"}
                    className="inline-flex min-h-12 items-center rounded-button px-3 font-bold text-ink no-underline hover:bg-teal-50"
                  >
                    {item.libelle}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          {comfortSlot ? <div className="hidden xl:block">{comfortSlot}</div> : null}
          {phone && phoneLabel ? (
            <a
              href={phone.href}
              aria-label={phoneLabel}
              className="tabular-figures hidden min-h-12 items-center gap-2 rounded-button px-3 font-bold text-teal-800 no-underline hover:bg-teal-50 md:inline-flex"
            >
              <PhoneIcon />
              <span>{phone.display}</span>
            </a>
          ) : null}
          {/* Conteneur masqué plutôt que classe `hidden` sur le bouton : sa classe `inline-flex` l'emporterait. */}
          <div className="hidden sm:block">
            <Button href={callbackHref} className="min-h-12">
              {callbackLabel}
            </Button>
          </div>
          <button
            ref={mobileButtonRef}
            type="button"
            aria-expanded={mobileOpen}
            aria-controls="menu-mobile"
            onClick={() => setMobileOpen((value) => !value)}
            className="inline-flex min-h-12 min-w-12 items-center justify-center rounded-button px-3 font-bold text-ink hover:bg-teal-50 lg:hidden"
          >
            {mobileOpen ? texts.fermer_menu : texts.menu}
          </button>
        </div>
      </div>

      <div
        id="menu-mobile"
        hidden={!mobileOpen}
        className="max-h-[calc(100dvh-4rem)] overflow-y-auto border-t border-line bg-white lg:hidden"
      >
        <nav aria-label={texts.navigation_principale} className="container-site py-4">
          <ul className="m-0 flex list-none flex-col gap-1 p-0">
            {navigation.map((item) => (
              <li key={item.id} className="max-w-none">
                {item.enfants ? (
                  <details className="group">
                    <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between rounded-button px-3 font-bold hover:bg-teal-50">
                      {item.libelle}
                      <svg
                        aria-hidden="true"
                        viewBox="0 0 24 24"
                        width="16"
                        height="16"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="transition-transform [transition-duration:var(--duration-fast)] group-open:rotate-180"
                      >
                        <path d="m6 9 6 6 6-6" />
                      </svg>
                    </summary>
                    <ul className="m-0 list-none p-0 pb-2 pl-3">
                      {item.enfants.map((child) => (
                        <li key={child.href} className="max-w-none">
                          <Link
                            href={child.href}
                            className="block min-h-12 rounded-field px-3 py-3 no-underline hover:bg-teal-50"
                            onClick={() => setMobileOpen(false)}
                          >
                            <span className="block font-bold text-ink">{child.libelle}</span>
                            {child.description ? (
                              <span className="block text-small text-text-soft">
                                {child.description}
                              </span>
                            ) : null}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </details>
                ) : (
                  <Link
                    href={item.href ?? "/"}
                    className="flex min-h-12 items-center rounded-button px-3 font-bold text-ink no-underline hover:bg-teal-50"
                    onClick={() => setMobileOpen(false)}
                  >
                    {item.libelle}
                  </Link>
                )}
              </li>
            ))}
          </ul>
          <div className="mt-4 flex flex-col gap-3 border-t border-line pt-4">
            {comfortSlot ? <div className="xl:hidden">{comfortSlot}</div> : null}
            {phone && phoneLabel ? (
              <a
                href={phone.href}
                className="tabular-figures inline-flex min-h-12 items-center gap-2 rounded-button px-3 font-bold text-teal-800 no-underline hover:bg-teal-50"
              >
                <PhoneIcon />
                <span>{phoneLabel}</span>
              </a>
            ) : null}
            <div className="sm:hidden">
              <Button href={callbackHref} block>
                {callbackLabel}
              </Button>
            </div>
          </div>
        </nav>
      </div>
    </header>
  );
}
