import type { NextConfig } from "next";

/*
 * L'origine de l'API du CRM (« Mon Youdom »), à autoriser dans `connect-src`.
 *
 * Le back-office appelle l'API depuis le navigateur, et cette API vit sur **une autre origine** :
 * l'hébergeur certifié HDS, jamais Vercel (docs/portal/ARCHITECTURE.md). Sans cette origine dans
 * la politique de sécurité de contenu, le navigateur refuse l'appel — ce qui est le bon réflexe
 * par défaut, et ce qui a bloqué les écrans du bureau jusqu'à ce que l'adresse soit déclarée ici.
 *
 * Seule l'origine est autorisée (ni chemin, ni joker), et seulement si l'adresse est posée au
 * build. Une adresse illisible arrête le build : mieux vaut un échec net qu'un bureau muet.
 */
const apiOrigin = (() => {
  const brute = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
  if (!brute) return "";
  try {
    return new URL(brute).origin;
  } catch {
    throw new Error(
      `NEXT_PUBLIC_API_BASE_URL n'est pas une adresse valide : « ${brute} ». ` +
        "Attendu : une origine complète, par exemple https://api.youdomcare.fr",
    );
  }
})();

// Le site est statique : pas de nonce CSP possible (il imposerait un rendu dynamique, voir D-013).
// Les scripts et styles en ligne générés par Next restent donc autorisés, tout le reste est fermé.
const contentSecurityPolicy = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  `connect-src 'self'${apiOrigin ? ` ${apiOrigin}` : ""}`,
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
// D-035 : indexation ouverte par défaut ; `SITE_INDEXABLE="false"` la referme (prévisualisations).
const indexable = process.env.SITE_INDEXABLE !== "false";
const robotsHeaders = indexable ? [] : [{ key: "X-Robots-Tag", value: "noindex, nofollow" }];

/*
 * Redirections permanentes des adresses de l'ancien site (D-069).
 *
 * L'audit du 12/10/2026 a trouvé ces adresses en 404 : les liens entrants qui les visaient — un
 * annuaire, un article, un partage — n'arrivent nulle part, et leur valeur de référencement est
 * perdue. Une 301 la transfère à la page équivalente.
 *
 * **La liste des anciennes adresses vient de l'audit, pas d'une vérification de notre part** :
 * l'ancien site n'est plus en ligne et l'environnement d'exécution n'a pas d'accès sortant. Si une
 * adresse n'a jamais existé, sa redirection ne coûte rien — elle répondait 404 de toute façon.
 * Les correspondances, elles, sont un choix : chacune mène à la page qui traite le même sujet.
 *
 * `/services` n'y figure pas : cette adresse existe désormais pour de bon (D-064).
 */
const legacyRedirects: { source: string; destination: string }[] = [
  { source: "/functioning", destination: "/comment-ca-marche/" },
  { source: "/about", destination: "/a-propos/" },
  { source: "/quality", destination: "/a-propos/nos-engagements/" },
  { source: "/devis/create", destination: "/demande/" },
  { source: "/devis", destination: "/demande/" },
  { source: "/contact/create", destination: "/contact/" },
  { source: "/cgu", destination: "/conditions-generales/" },
  { source: "/cgv", destination: "/conditions-generales/" },
  { source: "/confidentialite", destination: "/politique-de-confidentialite/" },
  { source: "/mentions", destination: "/mentions-legales/" },
  { source: "/metiers", destination: "/recrutement/" },
  { source: "/recrutement/offres", destination: "/recrutement/" },
  { source: "/services-pour-personnes-agees", destination: "/personnes-agees/" },
  {
    source: "/services-pour-personnes-handicapees",
    destination: "/adultes-en-situation-de-handicap/",
  },
  { source: "/tarifs", destination: "/tarifs-et-aides/" },
  { source: "/blog", destination: "/magazine/" },
  { source: "/actualites", destination: "/magazine/" },
];

const nextConfig: NextConfig = {
  trailingSlash: true,
  poweredByHeader: false,
  // Photos (docs/design/PHOTOS.md, D-024) : AVIF d'abord, WebP en repli ; qualités 60 (hero) et 75
  // (sections) par PhotoFigure. Le hero est l'élément du LCP : chaque kilo-octet compte.
  images: { formats: ["image/avif", "image/webp"], qualities: [60, 75] },
  async headers() {
    return [{ source: "/(.*)", headers: [...securityHeaders, ...robotsHeaders] }];
  },
  /*
   * Une seule forme déclarée, avec la barre finale, et c'est une contrainte et non un choix :
   * `trailingSlash: true` normalise AVANT d'appliquer ces règles. `/about` reçoit donc d'abord un
   * 308 vers `/about/`, puis le 308 vers `/a-propos/` — deux sauts, mesurés sur le build. Déclarer
   * aussi la forme sans barre ne supprime pas le premier saut : la règle n'est jamais atteinte, et
   * c'était du code mort (vérifié : `/about` partait vers `/about/`, pas vers `/a-propos/`).
   *
   * Next répond 308 et non 301 pour `permanent: true`. Les deux sont permanents et Google les
   * traite de même ; le 308 conserve en plus la méthode HTTP.
   */
  async redirects() {
    return legacyRedirects.map(({ source, destination }) => ({
      source: `${source}/`,
      destination,
      permanent: true,
    }));
  },
};

export default nextConfig;
