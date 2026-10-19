import { Hono } from "hono";
import * as z from "zod";
import { createChallenge, verifyChallenge } from "../../auth/challenges";
import { createSession, revokeSession } from "../../auth/sessions";
import { authenticate } from "../authenticate";
import { parseBody } from "../body";
import { fail, notFound } from "../errors";
import type { ApiDeps, AppEnv } from "../types";

/*
 * `/auth/v1` — la seule surface ouverte sans jeton.
 *
 * Deux propriétés qui se perdent facilement et qu'on tient ici :
 *
 * 1. **aucune énumération de comptes.** Une demande de connexion répond la même chose, avec la
 *    même forme et le même code, que l'adresse soit connue ou non. Sans cela, le portail devient
 *    un service de vérification : « cette personne est-elle accompagnée par Youdom Care ? » est
 *    une question à laquelle il ne doit jamais répondre ;
 * 2. **le second facteur est un geste séparé.** Il n'est pas demandé à chaque connexion, mais il
 *    est exigé pour la santé, l'argent et l'accès au logement, et il se périme en une heure.
 */

const identifierSchema = z
  .strictObject({
    email: z.email().optional(),
    phone: z
      .string()
      .regex(/^\+33[1-9]\d{8}$/)
      .optional(),
  })
  .refine((body) => Boolean(body.email) !== Boolean(body.phone), {
    error: "une adresse e-mail ou un numéro, pas les deux",
  });

const sessionSchema = z.strictObject({
  challengeId: z.string().min(1).max(64),
  secret: z.string().min(1).max(256),
  device: z.strictObject({ label: z.string().min(1).max(60) }),
});

export function authSurface(deps: ApiDeps) {
  const app = new Hono<AppEnv>();

  app.post("/challenges", async (context) => {
    const body = await parseBody(context, identifierSchema);
    if (!body.ok) return body.response;

    const now = deps.now();
    const clef = `defi:${body.value.email ?? body.value.phone}`;
    const limite = deps.rateLimiter.take(clef, now);
    if (!limite.allowed) return fail(context, "trop_de_demandes");

    const member = await deps.repositories.members.findByIdentifier(body.value);
    if (!member) {
      // Réponse en trompe-l'œil : même forme, même code, identifiant non enregistré.
      return context.json({ challengeId: deps.newId(), expiresIn: 600 }, 202);
    }

    const kind = body.value.email ? "lien_magique" : "code_sms";
    const { challenge, secret } = createChallenge({
      id: deps.newId(),
      memberId: member._id,
      kind,
      now,
      pepper: deps.pepper,
    });
    await deps.repositories.challenges.insert(challenge);
    await deps.notifier.send({
      kind,
      to: { email: member.email, phone: member.phone },
      secret,
      expiresAt: challenge.expiresAt,
    });

    return context.json(
      {
        challengeId: challenge._id,
        expiresIn: Math.round((challenge.expiresAt.getTime() - now.getTime()) / 1000),
      },
      202,
    );
  });

  app.post("/sessions", async (context) => {
    const body = await parseBody(context, sessionSchema);
    if (!body.ok) return body.response;

    const now = deps.now();
    if (!deps.rateLimiter.take(`session:${body.value.challengeId}`, now).allowed) {
      return fail(context, "trop_de_demandes");
    }

    const challenge = await deps.repositories.challenges.findById(body.value.challengeId);
    if (!challenge) return fail(context, "non_authentifie");

    const verdict = verifyChallenge(challenge, body.value.secret, now, deps.pepper);
    await deps.repositories.challenges.save(verdict.challenge);
    if (!verdict.ok) return fail(context, "non_authentifie");

    const { session, token } = createSession({
      id: deps.newId(),
      memberId: challenge.memberId,
      now,
      pepper: deps.pepper,
      device: {
        label: body.value.device.label,
        userAgent: context.req.header("user-agent") ?? null,
      },
    });
    await deps.repositories.sessions.insert(session);

    return context.json({ token, expiresAt: session.expiresAt.toISOString() }, 201);
  });

  // Le second facteur : un code envoyé sur l'autre canal, puis posé sur la session en cours.
  app.post("/second-factor/challenges", authenticate(deps), async (context) => {
    const member = context.get("member");
    const now = deps.now();
    if (!deps.rateLimiter.take(`sf:${member._id}`, now).allowed) {
      return fail(context, "trop_de_demandes");
    }
    const { challenge, secret } = createChallenge({
      id: deps.newId(),
      memberId: member._id,
      kind: "code_sms",
      now,
      pepper: deps.pepper,
    });
    await deps.repositories.challenges.insert(challenge);
    await deps.notifier.send({
      kind: "code_sms",
      to: { email: member.email, phone: member.phone },
      secret,
      expiresAt: challenge.expiresAt,
    });
    return context.json({ challengeId: challenge._id }, 202);
  });

  app.post("/second-factor", authenticate(deps), async (context) => {
    const body = await parseBody(
      context,
      z.strictObject({ challengeId: z.string().min(1).max(64), secret: z.string().min(1).max(32) }),
    );
    if (!body.ok) return body.response;

    const now = deps.now();
    const member = context.get("member");
    const challenge = await deps.repositories.challenges.findById(body.value.challengeId);
    // Un défi qui appartient à quelqu'un d'autre n'existe pas pour celui qui le présente.
    if (!challenge || challenge.memberId !== member._id) return notFound(context);

    const verdict = verifyChallenge(challenge, body.value.secret, now, deps.pepper);
    await deps.repositories.challenges.save(verdict.challenge);
    if (!verdict.ok) return fail(context, "non_authentifie");

    const session = { ...context.get("session"), secondFactorAt: now };
    await deps.repositories.sessions.save(session);
    return context.json({ secondFactorAt: now.toISOString() });
  });

  app.get("/sessions", authenticate(deps), async (context) => {
    const member = context.get("member");
    const courante = context.get("session")._id;
    const sessions = await deps.repositories.sessions.listByMember(member._id);
    return context.json({
      // L'empreinte du jeton ne sort jamais : la liste sert à reconnaître un appareil, pas à
      // reconstituer un secret.
      sessions: sessions
        .filter((session) => !session.revokedAt)
        .map((session) => ({
          id: session._id,
          appareil: session.device.label,
          derniereActivite: session.lastSeenAt.toISOString(),
          courante: session._id === courante,
        })),
    });
  });

  app.delete("/sessions/:id", authenticate(deps), async (context) => {
    const member = context.get("member");
    const session = await deps.repositories.sessions.findById(context.req.param("id"));
    if (!session || session.memberId !== member._id) return notFound(context);
    await deps.repositories.sessions.save(revokeSession(session, deps.now(), member._id));
    return context.body(null, 204);
  });

  return app;
}
