import type { ComponentPropsWithoutRef } from "react";
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
}

export function HeroSection({
  scene,
  className,
  innerClassName,
  children,
  ...rest
}: HeroSectionProps) {
  return (
    <section
      className={cn(sceneClass(scene), heroSectionShell, className)}
      data-hero-section=""
      data-scene={scene}
      {...rest}
    >
      <div className={cn("container-site w-full", innerClassName)}>{children}</div>
    </section>
  );
}
