import {
  threadIllustrations,
  type ThreadIllustrationName,
} from "@/components/ui/Thread/illustrations";

/*
 * Carte Open Graph 1200 × 630 (docs/04 §2) : fond `paper`, titre en Fraunces, fil décoratif
 * (un tracé de illustrations.ts en teal-700, nœud raspberry-500), marque et signature. Rendue
 * par satori (`ImageResponse`) : styles en ligne seulement, `display: flex` sur tout conteneur
 * qui a plusieurs enfants, pas de classes Tailwind. Aucun logo n'existe encore (Q-CONTENU-6) :
 * la marque est le nom « Youdom Care » composé en Fraunces.
 */

/** Jetons de docs/02 §2 repris en dur : satori ne lit pas les variables CSS du site. */
export const OG_COLORS = {
  paper: "#FBF8F3",
  ink: "#0F2F38",
  inkSoft: "#47626B",
  teal700: "#00788D",
  teal900: "#0B4753",
  raspberry500: "#EF3F6B",
} as const;

export interface OgCardProps {
  title: string;
  brand: string;
  signature: string;
  illustration?: ThreadIllustrationName;
  fontFamily: string;
}

/** Taille du titre selon sa longueur : quatre lignes au plus sur 720 px. */
export function titleFontSize(title: string): number {
  const length = title.length;
  if (length <= 40) return 76;
  if (length <= 70) return 64;
  if (length <= 100) return 54;
  return 46;
}

export function OgCard({
  title,
  brand,
  signature,
  illustration = "maison",
  fontFamily,
}: OgCardProps) {
  const shape = threadIllustrations[illustration];
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "60px 72px 56px",
        background: OG_COLORS.paper,
        color: OG_COLORS.ink,
        fontFamily,
        position: "relative",
      }}
    >
      {/* Le fil : une ligne qui entre par la gauche et rejoint l'illustration. */}
      <svg
        viewBox="0 0 1200 630"
        width={1200}
        height={630}
        style={{ position: "absolute", left: 0, top: 0 }}
        fill="none"
        stroke={OG_COLORS.teal700}
        strokeWidth={2.5}
        strokeLinecap="round"
      >
        <path d="M-10 478C200 478 260 456 420 456S620 500 740 478" />
      </svg>
      <svg
        viewBox="0 0 120 120"
        width={400}
        height={400}
        style={{ position: "absolute", right: 64, top: 96 }}
        fill="none"
        stroke={OG_COLORS.teal700}
        strokeWidth={1.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d={shape.main} />
        {shape.knot ? (
          <path d={shape.knot} stroke={OG_COLORS.raspberry500} strokeWidth={1.7} />
        ) : null}
      </svg>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          fontSize: 34,
          color: OG_COLORS.teal900,
        }}
      >
        <div
          style={{
            width: 14,
            height: 14,
            borderRadius: 7,
            background: OG_COLORS.raspberry500,
            marginRight: 16,
          }}
        />
        {brand}
      </div>
      <div
        style={{
          display: "flex",
          width: 720,
          fontSize: titleFontSize(title),
          lineHeight: 1.1,
          fontWeight: 600,
          letterSpacing: -0.5,
        }}
      >
        {title}
      </div>
      <div style={{ display: "flex", fontSize: 28, color: OG_COLORS.inkSoft }}>{signature}</div>
    </div>
  );
}
