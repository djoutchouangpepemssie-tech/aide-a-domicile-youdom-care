import type { NextConfig } from "next";

// Le site est statique : pas de nonce CSP possible (il imposerait un rendu dynamique, voir D-013).
// Les scripts et styles en ligne générés par Next restent donc autorisés, tout le reste est fermé.
const contentSecurityPolicy = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "connect-src 'self'",
  "frame-src 'none'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Permissions-Policy minimale (docs/07 §6). `browsing-topics` remplace `interest-cohort`
  // (FLoC, retiré des navigateurs) : Chrome signalait l'ancienne directive comme inconnue (D-029).
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()",
  },
  // Le site n'ouvre aucune fenêtre secondaire : isoler son contexte de navigation ne coûte rien (D-029).
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
];

// Tant que la phase 9 n'est pas validée, tout est en noindex : c'est Arcel qui passe SITE_INDEXABLE à "true".
const indexable = process.env.SITE_INDEXABLE === "true";
const robotsHeaders = indexable ? [] : [{ key: "X-Robots-Tag", value: "noindex, nofollow" }];

const nextConfig: NextConfig = {
  trailingSlash: true,
  poweredByHeader: false,
  // Photos (docs/design/PHOTOS.md, D-024) : AVIF d'abord, WebP en repli ; qualités 60 (hero) et 75
  // (sections) par PhotoFigure. Le hero est l'élément du LCP : chaque kilo-octet compte.
  images: { formats: ["image/avif", "image/webp"], qualities: [60, 75] },
  async headers() {
    return [{ source: "/(.*)", headers: [...securityHeaders, ...robotsHeaders] }];
  },
};

export default nextConfig;
