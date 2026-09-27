"use client";

import Image from "next/image";
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
 * Jusqu'à 80 rem (1 280 px), un bouton « Menu » ouvre un panneau où les groupes sont des
 * details/summary natifs : en dessous, la barre ne peut pas loger six entrées, le téléphone et le
 * bouton sans replier les libellés (docs/design/CONCEPT.md §1, point 9).
 * À partir de 80 rem, la barre affiche les entrées sur une ligne (`whitespace-nowrap`, `text-small`)
 * et utilise `libelle_court` quand il existe ; le libellé complet reste le nom accessible
 * (`aria-label`) et le libellé du menu mobile. Le conteneur plafonne à 75 rem : la place ne grandit
 * plus au-delà. La racine fait 18 px sur ordinateur et 20,25 px en mode confort : à ce dernier
 * réglage la barre ne loge plus ses six entrées avant 96 rem, le menu reprend entre les deux
 * (variante `[[data-comfort=on]_&]`).
 * Le lien d'évitement « Aller au contenu » cible `#contenu` (chaque page pose `<main id="contenu">`).
 */

/*
 * Entre 80 et 96 rem, le mode confort (texte × 1,125) rebascule sur le menu. Classes écrites en
 * toutes lettres : Tailwind les lit dans la source, une chaîne composée ne serait pas générée.
 */
const desktopOnly = "hidden xl:block xl:max-2xl:[[data-comfort=on]_&]:hidden";
const menuButtonOnly = "xl:hidden xl:max-2xl:[[data-comfort=on]_&]:inline-flex";
const menuPanelOnly = "xl:hidden xl:max-2xl:[[data-comfort=on]_&]:block";

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
  /** Bouton du mode confort de lecture (P1.7), affiché dans le menu mobile. */
  comfortSlot?: ReactNode;
  /** Variante compacte du même bouton pour la barre à partir de 80 rem ; à défaut, `comfortSlot`. */
  comfortSlotCompact?: ReactNode;
}

const COMPACT_AFTER_PX = 24;

function PhoneIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      width="18"
      height="18"
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
  comfortSlotCompact,
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

  // Le panneau du menu recouvre le contenu : quand la tabulation en sort vers la page, il se
  // ferme, sinon le focus se retrouve derrière lui, invisible (audit P8.4, WCAG 2.2 2.4.11).
  const onMobileBlur = (event: React.FocusEvent<HTMLElement>) => {
    const next = event.relatedTarget;
    if (!mobileOpen || !(next instanceof Node) || event.currentTarget.contains(next)) return;
    setMobileOpen(false);
  };

  const phoneLabel = phone ? texts.appeler.replace("{téléphone}", phone.display) : null;

  return (
    <header
      data-compact={compact ? "true" : "false"}
      onKeyDown={onMobileKeyDown}
      onBlur={onMobileBlur}
      className={cn(
        // Verre (D-032 §3) : `glass` au repos, `glass-strong` dès que la page défile, liseré
        // lumineux en bas. Les bordures latérales et haute du verre sont retirées : l'en-tête
        // occupe toute la largeur, seule la ligne du bas dessine la limite.
        "glass glass-edge sticky top-0 z-40 border-x-0 border-t-0 border-b border-line",
        "transition-[box-shadow,background-color] [transition-duration:var(--duration-base)] motion-reduce:transition-none",
        compact && "glass-strong",
      )}
      data-edge="bottom"
    >
      <a
        href="#contenu"
        className="sr-only z-50 rounded-button bg-action px-4 py-3 font-bold text-white focus:not-sr-only focus:absolute focus:top-2 focus:left-2"
      >
        {texts.aller_au_contenu}
      </a>

      <div
        className={cn(
          "container-site flex items-center justify-between gap-2 transition-[height] [transition-duration:var(--duration-base)] motion-reduce:transition-none",
          compact ? "h-16" : "h-20",
        )}
      >
        {/* Marque en Fraunces à la taille du H4 : la barre est comptée au pixel à 80 rem.
            `min-h-11` : cible de 44 px de haut (WCAG 2.5.8) ; le lien mesurait 21 px (P9.6). */}
        {/*
         * 27/09/2026 : le vrai logo de l'entreprise remplace le nom en toutes lettres. Il ramène
         * à l'accueil depuis toutes les pages, sur mobile comme sur ordinateur — le nom écrit ne
         * se lisait pas comme un logo, et Arcel ne pensait pas à cliquer dessus. Le nom reste
         * dans le nom accessible du lien, pour les lecteurs d'écran.
         */}
        <Link
          href="/"
          aria-label={texts.accueil}
          className="inline-flex min-h-11 shrink-0 items-center no-underline"
        >
          <Image
            src="/images/marque/logo-youdom-care.png"
            alt={brandName}
            width={797}
            height={308}
            priority
            className={cn(
              "h-auto w-auto transition-[max-height] [transition-duration:var(--duration-base)] motion-reduce:transition-none",
              compact ? "max-h-9" : "max-h-11",
            )}
          />
        </Link>

        <nav
          ref={navRef}
          aria-label={texts.navigation_principale}
          className={desktopOnly}
          onKeyDown={onNavKeyDown}
          onBlur={onNavBlur}
        >
          <ul className="m-0 flex list-none flex-nowrap items-center gap-0 p-0">
            {navigation.map((item) => {
              const panelId = `menu-${item.id}`;
              const isOpen = openId === item.id;
              const shortLabel = item.libelle_court ?? item.libelle;
              const ariaLabel = item.libelle_court ? item.libelle : undefined;
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
                      aria-label={ariaLabel}
                      onClick={() => setOpenId(isOpen ? null : item.id)}
                      className={cn(
                        "inline-flex min-h-12 items-center gap-0.5 rounded-button px-1.5 text-small font-bold whitespace-nowrap text-ink hover:bg-teal-50",
                        isOpen && "bg-teal-50 text-teal-900",
                      )}
                    >
                      {shortLabel}
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
                    aria-label={ariaLabel}
                    className="inline-flex min-h-12 items-center rounded-button px-1.5 text-small font-bold whitespace-nowrap text-ink no-underline hover:bg-teal-50"
                  >
                    {shortLabel}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          {comfortSlot ? (
            <div className="hidden xl:block">{comfortSlotCompact ?? comfortSlot}</div>
          ) : null}
          {phone && phoneLabel ? (
            <a
              href={phone.href}
              aria-label={phoneLabel}
              data-mesure="en-tete"
              className="tabular-figures hidden min-h-12 items-center gap-1.5 rounded-button px-2 text-small font-bold whitespace-nowrap text-teal-800 no-underline hover:bg-teal-50 md:inline-flex"
            >
              <PhoneIcon />
              <span>{phone.display}</span>
            </a>
          ) : null}
          {/* Conteneur masqué plutôt que classe `hidden` sur le bouton : sa classe `inline-flex` l'emporterait. */}
          <div className="hidden sm:block">
            <Button href={callbackHref} className="min-h-12 px-3">
              {callbackLabel}
            </Button>
          </div>
          <button
            ref={mobileButtonRef}
            type="button"
            aria-expanded={mobileOpen}
            aria-controls="menu-mobile"
            onClick={() => setMobileOpen((value) => !value)}
            className={cn(
              "inline-flex min-h-12 min-w-12 items-center justify-center rounded-button px-3 font-bold text-ink hover:bg-teal-50",
              menuButtonOnly,
            )}
          >
            {mobileOpen ? texts.fermer_menu : texts.menu}
          </button>
        </div>
      </div>

      <div
        id="menu-mobile"
        hidden={!mobileOpen}
        className={cn(
          "glass-strong max-h-[calc(100dvh-4rem)] overflow-y-auto border-x-0 border-b-0 border-t border-line",
          menuPanelOnly,
        )}
      >
        {/* La barre d'action mobile recouvre 4 rem en bas de l'écran : le panneau réserve la
            place pour que son dernier lien reste atteignable au pouce (D-032 §6). */}
        <nav
          aria-label={texts.navigation_principale}
          className="container-site pt-4 pb-[calc(4rem+env(safe-area-inset-bottom))] lg:pb-4"
        >
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
                data-mesure="en-tete"
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
