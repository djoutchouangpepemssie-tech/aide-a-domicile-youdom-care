"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button/Button";
import { cn } from "@/lib/cn";

/*
 * Rail de conversion (docs/design/CONCEPT.md §7 « Le rail de conversion », §8) : la carte de
 * contact collante des pages intérieures (piliers, services) sur ordinateur, à partir de 64 rem.
 *
 * Contenu, dans l'ordre : le téléphone (Fraunces 560, 28 px, chiffres tabulaires ; masqué si
 * `phone` est null), le bouton contour « Être rappelé(e) », le lien « Je décris ma situation »
 * vers le formulaire de la page (`formHref`), une ligne de réassurance tirée de `content/`.
 * Aucun délai, aucun compteur, aucun avis : rien qui ne vienne de `content/` (docs/07).
 *
 * Comportement :
 * - carte blanche, `shadow-1`, 280 px (17,5 rem), collante sous l'en-tête compact (`top: 88px`) ;
 * - masqué sous 64 rem : la barre mobile porte les mêmes actions ;
 * - masqué quand la section du formulaire est à l'écran (`IntersectionObserver` sur l'élément
 *   `formId`) : le formulaire porte ses propres boutons. Sans JavaScript, ou sans `formId`, le
 *   rail reste visible. Le masquage passe par `inert` (retiré du focus et des lecteurs d'écran)
 *   et un fondu qui s'éteint en mouvement réduit et en mode confort (`--duration-base` à 0).
 *
 * Intégration prévue dans le gabarit service (sections 2 à 11), dans une grille à deux colonnes :
 *
 *   <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_17.5rem] lg:items-start lg:gap-12">
 *     <div>…sections…</div>
 *     <SiteConversionRail formHref="#formulaire" formId="formulaire" />
 *   </div>
 *
 * `SiteConversionRail` (même dossier) branche le composant sur `site.config.json`, `navigation.json`
 * et `interface.json`. Démonstration : /styleguide/rail/.
 */

export interface ConversionRailTexts {
  /** Nom de la région (« Nous joindre »). */
  nom: string;
  /** Contient {téléphone} : nom accessible du lien d'appel. */
  appeler: string;
  /** Libellé du bouton de rappel (docs/01 §6 : « Être rappelé(e) »). */
  rappel: string;
  /** Libellé du lien vers le formulaire (« Je décris ma situation »). */
  demande: string;
  /** Une phrase de réassurance présente dans le contenu du site. */
  reassurance: string;
}

export interface ConversionRailProps {
  /** Téléphone principal ; null si inconnu (le lien se masque). */
  phone: { display: string; href: string } | null;
  callbackHref: string;
  /** Formulaire du cas : ancre de la page (« #formulaire ») ou page dédiée. */
  formHref: string;
  /** `id` de la section du formulaire : le rail se masque quand elle est visible. */
  formId?: string;
  texts: ConversionRailTexts;
  className?: string;
}

function PhoneIcon() {
  return (
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
      className="shrink-0 text-teal-700"
    >
      <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" />
    </svg>
  );
}

/** Vrai tant que l'élément `id` est à l'écran ; faux sans JavaScript, sans observateur ou sans cible. */
function useTargetVisible(id: string | undefined): boolean {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!id || typeof IntersectionObserver === "undefined") return;
    const target = document.getElementById(id);
    if (!target) return;
    const observer = new IntersectionObserver((entries) => {
      setVisible(entries.some((entry) => entry.isIntersecting));
    });
    observer.observe(target);
    return () => observer.disconnect();
  }, [id]);

  return visible;
}

export function ConversionRail({
  phone,
  callbackHref,
  formHref,
  formId,
  texts,
  className,
}: ConversionRailProps) {
  const formVisible = useTargetVisible(formId);
  const phoneLabel = phone ? texts.appeler.replace("{téléphone}", phone.display) : null;

  return (
    <aside
      aria-labelledby="rail-conversion-titre"
      data-print="hide"
      data-state={formVisible ? "hidden" : "visible"}
      inert={formVisible}
      className={cn(
        "sticky top-22 hidden w-70 self-start lg:block",
        "transition-opacity [transition-duration:var(--duration-base)] motion-reduce:transition-none",
        formVisible && "pointer-events-none opacity-0",
        className,
      )}
    >
      <div className="rounded-card border border-line bg-white p-6 shadow-1">
        <p id="rail-conversion-titre" className="m-0 text-small font-bold text-text-soft">
          {texts.nom}
        </p>
        {phone && phoneLabel ? (
          <a
            href={phone.href}
            aria-label={phoneLabel}
            data-mesure="rail"
            className="figure tabular-figures mt-2 inline-flex min-h-12 items-center gap-2 text-[1.75rem] leading-none whitespace-nowrap text-teal-900 no-underline hover:text-teal-700"
          >
            <PhoneIcon />
            <span>{phone.display}</span>
          </a>
        ) : null}
        <div className="mt-4 flex flex-col gap-3">
          <Button variant="outline" href={callbackHref} block>
            {texts.rappel}
          </Button>
          <Link
            href={formHref}
            className="inline-flex min-h-12 items-center justify-center text-center font-bold"
          >
            {texts.demande}
          </Link>
        </div>
        <p className="m-0 mt-4 text-small text-text-soft">{texts.reassurance}</p>
      </div>
    </aside>
  );
}
