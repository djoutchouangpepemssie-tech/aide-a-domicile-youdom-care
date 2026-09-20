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
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()",
  },
];

// Tant que la phase 9 n'est pas validée, tout est en noindex : c'est Arcel qui passe SITE_INDEXABLE à "true".
const indexable = process.env.SITE_INDEXABLE === "true";
const robotsHeaders = indexable ? [] : [{ key: "X-Robots-Tag", value: "noindex, nofollow" }];

const nextConfig: NextConfig = {
  trailingSlash: true,
  poweredByHeader: false,
  async headers() {
    return [{ source: "/(.*)", headers: [...securityHeaders, ...robotsHeaders] }];
  },
};

export default nextConfig;
