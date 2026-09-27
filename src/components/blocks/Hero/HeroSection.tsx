import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { cn } from "@/lib/cn";
import { heroSectionShell, sceneClass, type HeroSceneName } from "./hero-scene";

/*
 * Section d'un hero (brief docs/design/BRIEF_LIQUID_GLASS.md §4, D-032) : le fond de scène coloré du
 * gabarit, la hauteur visible (`100svh` moins l'en-tête et, sous 64 rem, la barre d'action), le
 * contenu centré. Les cinq gabarits (accueil, service, locale, agence, article) passent par ici :
 * même hauteur, même compaction, une couleur par public ou par gabarit.
 *
 * Le fond vient de `src/styles/scenes.css` (agent design system) : la classe `scene` peint la
 * couleur de base, le dégradé, deux halos, la trame au fil et le grain ; `scene-<nom>` choisit la
 * palette ; `scene-soutenu` en donne la version la plus présente, réservée aux heros. Toutes les
 * couches sont des mélanges vers `--scene-deep` et `--scene-accent` : le contraste du texte est
 * borné et mesuré (scripts/validate/check-contrast.ts). Mode confort, mouvement réduit, simulation
 * et impression aplatissent la scène à sa seule couleur de base : rien ici ne l'en empêche.
 *
 * Cette section ne passe pas par `Section` : une classe utilitaire de fond (`bg-bg`, `bg-white`)
 * écraserait la couleur de la scène. Elle en reprend le conteneur (`container-site`) et son propre
 * espacement vertical. `data-scene` nomme la scène (repère des parcours Playwright, et second
 * sélecteur de scenes.css).
 */

export interface HeroSectionProps extends ComponentPropsWithoutRef<"section"> {
  /** Scène du gabarit ou du public (`hero-scene.ts`, `src/styles/scenes.css`). */
  scene: HeroSceneName;
  /** Classe du conteneur intérieur, si la page a besoin d'y toucher. */
  innerClassName?: string;
  /** Image de fond décorative, posée derrière le contenu (aucune alternative textuelle). */
  background?: ReactNode;
}

export function HeroSection({
  scene,
  className,
  innerClassName,
  background,
  children,
  ...rest
}: HeroSectionProps) {
  return (
    <section
      className={cn(sceneClass(scene), heroSectionShell, "relative", className)}
      data-hero-section=""
      data-scene={scene}
      {...rest}
    >
      {/*
       * Fond d'image (27/09/2026) : décoratif, derrière le contenu, sans jamais le gêner. Il est
       * masqué sous 40 rem de large et sous 42 rem de haut, où le hero est déjà compacté et où une
       * image passerait sous le texte. `aria-hidden` et `pointer-events-none` : rien à lire, rien
       * à cliquer.
       */}
      {background ? (
        <div
          aria-hidden="true"
          data-hero-fond=""
          className="pointer-events-none absolute inset-0 z-0 hidden overflow-hidden sm:block [@media(max-height:42rem)]:hidden"
        >
          {background}
        </div>
      ) : null}
      <div className={cn("container-site relative z-10 w-full", innerClassName)}>{children}</div>
    </section>
  );
}
