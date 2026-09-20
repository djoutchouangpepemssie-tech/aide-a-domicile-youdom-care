"use client";

import { PhotoFigure, photoSizes } from "@/components/ui/PhotoFigure/PhotoFigure";
import type { Photo } from "@/content/schemas";
import { cn } from "@/lib/cn";
import { useReader } from "./ReaderContext";

/*
 * Photo du hero qui suit le sélecteur de lecteur (docs/design/CONCEPT.md §4, pilier personnes
 * âgées) : deux photos superposées, fondu croisé de 300 ms (`--duration-slow`, ramené à 0 ms par
 * `prefers-reduced-motion`, le mode confort et la simulation du styleguide : src/styles/tokens.css).
 * La photo « pour un proche » est rendue en premier et chargée en priorité (LCP) ; l'autre est
 * masquée aux technologies d'assistance tant qu'elle n'est pas affichée.
 */

export interface ReaderPhotoProps {
  proche: Photo;
  soi: Photo;
}

const layer =
  "transition-opacity [transition-duration:var(--duration-slow)] [transition-timing-function:var(--ease-out)] motion-reduce:transition-none";

export function ReaderPhoto({ proche, soi }: ReaderPhotoProps) {
  const { reader } = useReader();
  return (
    <div className="relative" data-reader-photo={reader}>
      <div
        className={cn(layer, reader === "proche" ? "opacity-100" : "opacity-0")}
        aria-hidden={reader !== "proche"}
      >
        <PhotoFigure
          src={proche.src}
          alt={proche.alt}
          focal={proche.focal}
          ratio="4:5"
          mobileRatio="16:9"
          radius={28}
          sizes={photoSizes.hero}
          priority
        />
      </div>
      <div
        className={cn("absolute inset-0", layer, reader === "soi" ? "opacity-100" : "opacity-0")}
        aria-hidden={reader !== "soi"}
      >
        <PhotoFigure
          src={soi.src}
          alt={soi.alt}
          focal={soi.focal}
          ratio="4:5"
          mobileRatio="16:9"
          radius={28}
          sizes={photoSizes.hero}
          className="h-full"
        />
      </div>
    </div>
  );
}
