"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Reveal } from "@/components/motion/Reveal/Reveal";
import { Button } from "@/components/ui/Button/Button";
import { Card } from "@/components/ui/Card/Card";
import { Heading } from "@/components/ui/Heading/Heading";
import { Lead } from "@/components/ui/Lead/Lead";
import { cn } from "@/lib/cn";
import { useParcours } from "./ParcoursProvider";

/*
 * Bloc 2 de l'accueil (docs/design/CONCEPT.md §3) : « Que vivez-vous en ce moment ? ».
 * - Sans choix : le titre d'origine et les six cartes de situation, révélées en cascade.
 * - Quand un public a été choisi dans la bannière : le titre devient « Vous cherchez de l'aide
 *   {pour}. Que vivez-vous ? », puis les trois à cinq situations du pilier (lues côté serveur
 *   dans les MDX, chacune un lien vers la page ou le formulaire), puis « Autre chose : je décris
 *   ma situation ». Les six cartes restent, repliées sous « Toutes les situations ».
 * Tout le contenu de tous les publics est rendu côté serveur et masqué par l'attribut `hidden`
 * (jamais absent) : la page fonctionne sans JavaScript et reste testable. Le panneau est une
 * zone `aria-live="polite"` ; le titre reçoit le focus (`tabIndex={-1}`) après un choix.
 */

export interface PanelSituation {
  titre: string;
  texte: string;
  href: string;
}

export interface PanelPublic {
  /** Identifiant du choix de la bannière (`banniere.parcours.choix[].id`). */
  id: string;
  /** Complément du titre : « pour votre parent », « pour vous-même »… */
  pour: string;
  situations: readonly PanelSituation[];
}

export interface SituationPanelTexts {
  /** Contient {pour}. */
  titre_panneau: string;
  autre: string;
  toutes: string;
}

export interface SituationPanelProps {
  /** Identifiant du titre : cible du focus et de `aria-labelledby` de la section. */
  titleId: string;
  /** Titre sans choix (« Que vivez-vous en ce moment ? »). */
  heading: string;
  lead: string;
  texts: SituationPanelTexts;
  publics: readonly PanelPublic[];
  /** Page « Je décris ma situation ». */
  autreHref: string;
  /** Les six cartes de situation, chacune dans un `li`. */
  children: ReactNode;
}

const gridClass = "m-0 grid list-none gap-6 p-0 sm:grid-cols-2 lg:grid-cols-3";

export function SituationPanel({
  titleId,
  heading,
  lead,
  texts,
  publics,
  autreHref,
  children,
}: SituationPanelProps) {
  const { selected } = useParcours();
  const current = publics.find((p) => p.id === selected);

  return (
    <div className="situation-panel" data-public={current?.id}>
      <Heading level={2} id={titleId} tabIndex={-1}>
        {current ? texts.titre_panneau.replace("{pour}", current.pour) : heading}
      </Heading>
      <Lead className="mt-3">{lead}</Lead>

      <div aria-live="polite">
        {publics.map((pub) => (
          <div
            key={pub.id}
            hidden={pub.id !== current?.id}
            data-panel={pub.id}
            className="mt-8 [&[hidden]]:hidden"
          >
            <ul className="m-0 grid list-none gap-4 p-0 md:grid-cols-2">
              {pub.situations.map((situation) => (
                <li key={situation.titre} className="max-w-none">
                  <Card as="article" interactive className="relative flex h-full flex-col">
                    <p className="heading-4 m-0">
                      <Link
                        href={situation.href}
                        className="text-teal-900 no-underline after:absolute after:inset-0 after:rounded-card after:content-['']"
                      >
                        {situation.titre}
                      </Link>
                    </p>
                    <p className="m-0 mt-3">{situation.texte}</p>
                  </Card>
                </li>
              ))}
            </ul>
            <p className="m-0 mt-6">
              <Button href={autreHref} variant="outline">
                {texts.autre}
              </Button>
            </p>
          </div>
        ))}
      </div>

      {current ? (
        <details className="mt-8">
          <summary className="inline-flex min-h-12 cursor-pointer list-none items-center gap-2 font-bold text-teal-900 marker:hidden [&::-webkit-details-marker]:hidden">
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
              className="shrink-0 text-teal-700 [details[open]_&]:rotate-180"
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
            {texts.toutes}
          </summary>
          <ul className={cn(gridClass, "mt-6")}>{children}</ul>
        </details>
      ) : (
        <Reveal as="ul" variant="stagger" className={cn(gridClass, "mt-8")}>
          {children}
        </Reveal>
      )}
    </div>
  );
}
