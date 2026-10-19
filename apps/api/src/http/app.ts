import { Hono } from "hono";
import { cors } from "hono/cors";
import { secureHeaders } from "hono/secure-headers";
import { authenticate, requireRoles, CLIENT_SURFACE } from "./authenticate";
import { fail } from "./errors";
import { adminSurface } from "./surfaces/admin";
import { planningSurface } from "./surfaces/planning";
import { authSurface } from "./surfaces/auth";
import { fieldSurface } from "./surfaces/field";
import { portalSurface } from "./surfaces/portal";
import { chargerActeur, ROLES_AGENCE } from "./trace";
import type { ApiDeps, AppEnv } from "./types";

/*
 * L'API, et ses quatre surfaces séparées (`ARCHITECTURE.md` §5, principe 1) :
 *
 *   /auth/v1    se connecter (ouverte)
 *   /portal/v1  les familles et les bénéficiaires
 *   /field/v1   les intervenants
 *   /admin/v1   l'agence
 *
 * Chaque surface vérifie la famille de rôles à son entrée, et chaque route vérifie ensuite le
 * foyer et le module. Les deux, pas l'un ou l'autre : la première barrière dit « vous n'êtes pas
 * de ce côté du produit », la seconde « ce foyer ne vous est pas partagé ».
 *
 * Aucune réponse ne porte de donnée de santé rendue par un serveur Vercel : l'interface appelle
 * cette API **depuis le navigateur** (`ARCHITECTURE.md` §4.2). C'est pourquoi les origines
 * autorisées sont une liste fermée, et pourquoi il n'y a pas de cookie — un jeton porté par
 * l'en-tête `Authorization` ne part pas tout seul vers un tiers.
 */

export function createApp(deps: ApiDeps) {
  const app = new Hono<AppEnv>();

  app.use("*", async (context, next) => {
    const entrant = context.req.header("x-request-id");
    context.set("requestId", entrant && entrant.length <= 64 ? entrant : deps.newId());
    await next();
    context.header("x-request-id", context.get("requestId"));
  });

  app.use(
    "*",
    secureHeaders({
      // Une API ne rend aucune page : rien à afficher, rien à encadrer, rien à charger.
      contentSecurityPolicy: { defaultSrc: ["'none'"], frameAncestors: ["'none'"] },
      referrerPolicy: "no-referrer",
      xFrameOptions: "DENY",
    }),
  );

  app.use(
    "*",
    cors({
      origin: (origin) => (deps.allowedOrigins.includes(origin) ? origin : null),
      allowMethods: ["GET", "POST", "DELETE", "OPTIONS"],
      allowHeaders: ["authorization", "content-type", "x-request-id", "x-motif-astreinte"],
      maxAge: 600,
      // Pas de cookie, donc pas d'identifiants à joindre : le jeton voyage dans l'en-tête.
      credentials: false,
    }),
  );

  app.get("/health", (context) => context.json({ ok: true }));

  app.route("/auth/v1", authSurface(deps));

  const portal = new Hono<AppEnv>();
  portal.use("*", authenticate(deps), requireRoles(deps, CLIENT_SURFACE));
  portal.route("/", portalSurface(deps));
  app.route("/portal/v1", portal);

  const field = new Hono<AppEnv>();
  field.use("*", authenticate(deps), requireRoles(deps, ["intervenant"]));
  field.route("/", fieldSurface(deps));
  app.route("/field/v1", field);

  const admin = new Hono<AppEnv>();
  admin.use("*", authenticate(deps), requireRoles(deps, ROLES_AGENCE), chargerActeur(deps));
  admin.route("/", adminSurface(deps));
  // Planning et tarifs : même surface, même garde, un fichier par sujet.
  admin.route("/", planningSurface(deps));
  app.route("/admin/v1", admin);

  app.notFound((context) => fail(context, "introuvable"));

  app.onError((error, context) => {
    // Le détail d'une erreur interne ne sort jamais : il peut contenir un fragment de requête,
    // donc une donnée de santé. Il part dans la sortie d'erreur du service, avec le requestId.
    console.error(`[${context.get("requestId")}]`, error instanceof Error ? error.message : error);
    return fail(context, "erreur_interne");
  });

  return app;
}
