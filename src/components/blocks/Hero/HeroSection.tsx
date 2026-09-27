import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { cn } from "@/lib/cn";
import { heroBackgrounds, heroSectionShell, sceneClass, type HeroSceneName } from "./hero-scene";

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
  /*
   * Fond de bannière. Soit la page en fournit un (l'accueil et sa photo détourée), soit la scène
   * en a un par défaut (`heroBackgrounds`, 27/09/2026). Il est décoratif, derrière le contenu, et
   * effacé vers la gauche par un dégradé : le titre et la promesse restent sur la couleur de
   * scène, jamais sur la photo. Masqué sous 40 rem de large, où il passerait sous le texte —
   * mais **plus** sur la hauteur : le seuil de 42 rem effaçait la photo sur un portable dont la
   * fenêtre fait moins de 672 px de haut, cas très courant, et Arcel ne la voyait jamais.
   */
  const defaut = heroBackgrounds[scene];
  const fond =
    background !== undefined ? (
      <div
        aria-hidden="true"
        data-hero-fond=""
        className="pointer-events-none absolute inset-0 z-0 hidden overflow-hidden sm:block"
      >
        {background}
      </div>
    ) : defaut ? (
      <div
        aria-hidden="true"
        data-hero-fond="scene"
        className="pointer-events-none absolute inset-y-0 right-0 z-0 hidden w-[42%] overflow-hidden sm:block lg:w-[38%]"
        style={{
          backgroundImage: `url(${defaut.src})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          /*
           * Emprise mesurée : la colonne de texte d'une bannière occupe environ 60 % de la largeur
           * au-dessus de 64 rem. Le fond reste donc dans les 38 % de droite, s'efface sur sa
           * moitié gauche, et son opacité le tient sous la lecture : le titre et la promesse ne
           * passent jamais sur la photo, leur contraste mesuré reste celui de la scène.
           */
          opacity: 0.38,
          maskImage: "linear-gradient(to left, rgba(0,0,0,1) 55%, rgba(0,0,0,0) 100%)",
          WebkitMaskImage: "linear-gradient(to left, rgba(0,0,0,1) 55%, rgba(0,0,0,0) 100%)",
        }}
      />
    ) : null;

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
      {fond}
      <div className={cn("container-site relative z-10 w-full", innerClassName)}>{children}</div>
    </section>
  );
}
