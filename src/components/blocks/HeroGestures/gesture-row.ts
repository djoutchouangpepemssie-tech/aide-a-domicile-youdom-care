import type { HeroTone } from "@/components/blocks/Hero/Hero";
import { cn } from "@/lib/cn";

/*
 * Rangée d'un geste de hero (docs/design/CONCEPT.md §4) : 56 px de haut (`--touch-primary`),
 * une par ligne sur mobile, contour bleu canard sur fond clair, blanc sur le ton sombre. Un
 * état enfoncé (`aria-pressed="true"`) remplit la rangée. Les mêmes classes servent aux liens
 * (sans JavaScript, ou quand le geste mène à un formulaire) et aux boutons.
 */

const base =
  "inline-flex min-h-14 w-full items-center gap-3 rounded-button border-2 px-5 text-left font-bold " +
  "no-underline transition-colors [transition-duration:var(--duration-base)] motion-reduce:transition-none " +
  "sm:w-auto";

const tones: Record<HeroTone, string> = {
  clair:
    "border-teal-700 bg-white text-teal-700 hover:bg-teal-50 " +
    "aria-pressed:border-teal-800 aria-pressed:bg-teal-800 aria-pressed:text-white aria-pressed:hover:bg-teal-800",
  sombre:
    "border-white bg-transparent text-white hover:bg-white/10 " +
    "aria-pressed:bg-white aria-pressed:text-teal-900 aria-pressed:hover:bg-white",
};

export function gestureRow(tone: HeroTone = "clair", className?: string): string {
  return cn(base, tones[tone], className);
}

/** Question du geste, au-dessus des rangées. */
export function gestureQuestion(tone: HeroTone = "clair"): string {
  return cn("heading-4 m-0", tone === "sombre" ? "text-white" : "text-teal-900");
}

/** Liste des rangées : une par ligne sur mobile, en ligne à partir de 40 rem. */
export const gestureList = "m-0 mt-3 flex list-none flex-col gap-3 p-0 sm:flex-row sm:flex-wrap";
