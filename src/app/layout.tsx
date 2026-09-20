import type { Metadata } from "next";
import { Atkinson_Hyperlegible_Next, Fraunces } from "next/font/google";
import { getSiteConfig } from "@/content/loader";
import { isIndexable } from "@/lib/seo/indexable";
import "@/styles/globals.css";

// Deux fichiers variables au plus, sous-ensemble latin, display swap (docs/02 §3).
const fraunces = Fraunces({
  subsets: ["latin"],
  weight: "variable",
  style: "normal",
  axes: ["SOFT", "opsz"],
  display: "swap",
  variable: "--font-fraunces",
});

// next/font n'a pas les métriques de cette police : sans `fallback` explicite, le build
// avertit qu'il ne peut pas générer de repli ajusté — voir D-008.
const atkinson = Atkinson_Hyperlegible_Next({
  subsets: ["latin"],
  weight: "variable",
  style: "normal",
  display: "swap",
  variable: "--font-atkinson",
  adjustFontFallback: false,
  fallback: ["Atkinson Hyperlegible", "system-ui", "sans-serif"],
});

const { marque } = getSiteConfig();

export const metadata: Metadata = {
  metadataBase: new URL(marque.url),
  title: marque.nom,
  description: marque.description_courte,
  robots: isIndexable() ? undefined : { index: false, follow: false },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" className={`${fraunces.variable} ${atkinson.variable}`}>
      <body>{children}</body>
    </html>
  );
}
