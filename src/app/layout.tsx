import type { Metadata } from "next";
import { Atkinson_Hyperlegible_Next, Fraunces } from "next/font/google";
import { ComfortScript } from "@/components/layout/ComfortScript/ComfortScript";
import { SiteFooter } from "@/components/layout/SiteFooter/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader/SiteHeader";
import { SiteMobileActionBar } from "@/components/layout/SiteMobileActionBar/SiteMobileActionBar";
import { AppelClicListener } from "@/components/mesure/AppelClicListener/AppelClicListener";
import { MotionScript } from "@/components/motion/MotionScript/MotionScript";
import { PageThread } from "@/components/motion/PageThread/PageThread";
import { getSiteConfig } from "@/content/loader";
import { isIndexable } from "@/lib/seo/indexable";
import { siteVerification } from "@/lib/seo/verification";
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
const verification = siteVerification();

// Valeurs de repli : chaque page fournit les siennes par `pageMetadata` (src/lib/seo/metadata.ts).
export const metadata: Metadata = {
  metadataBase: new URL(marque.url),
  title: marque.nom,
  description: marque.description_courte,
  robots: isIndexable() ? undefined : { index: false, follow: false },
  ...(verification ? { verification } : {}),
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="fr-FR"
      className={`${fraunces.variable} ${atkinson.variable}`}
      suppressHydrationWarning
    >
      {/* La place de la barre d'action mobile est réservée par le pied de page lui-même (P9.6) :
          le fond teal descend ainsi jusqu'au bas du document, sans bande de papier dessous. */}
      <body>
        <ComfortScript />
        <MotionScript />
        <SiteHeader />
        {/* Le fil conducteur mesure `main` et se retire seul du styleguide et des formulaires. */}
        <PageThread />
        {children}
        <SiteFooter />
        <SiteMobileActionBar />
        {/* Mesure des clics sur les numéros de téléphone (D-029) : aucun rendu, aucun cookie. */}
        <AppelClicListener />
      </body>
    </html>
  );
}
