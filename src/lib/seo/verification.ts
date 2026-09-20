import type { Metadata } from "next";

/*
 * Balises de vérification des consoles moteurs (docs/04 §2, P5.6), lues au build depuis
 * `GOOGLE_SITE_VERIFICATION` (Search Console, `google-site-verification`) et
 * `BING_SITE_VERIFICATION` (Bing Webmaster Tools, `msvalidate.01`). Une variable vide ne
 * produit aucune balise. Voir .env.example.
 */
export function siteVerification(
  env: Readonly<Record<string, string | undefined>> = process.env,
): Metadata["verification"] {
  const google = env.GOOGLE_SITE_VERIFICATION?.trim();
  const bing = env.BING_SITE_VERIFICATION?.trim();
  if (!google && !bing) return undefined;
  return {
    ...(google ? { google } : {}),
    ...(bing ? { other: { "msvalidate.01": bing } } : {}),
  };
}
