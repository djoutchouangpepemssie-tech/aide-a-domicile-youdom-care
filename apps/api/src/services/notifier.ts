import type { ChallengeKind } from "../auth/challenges";

/*
 * L'envoi du lien magique et du code SMS. Une interface, parce que le prestataire d'envoi de SMS
 * n'est pas choisi (question 15) et que le courrier passera par la chaîne déjà en service sur le
 * site (`src/lib/mail/`).
 *
 * Règle tenue par l'interface elle-même : **le secret ne passe par aucun journal**. La mise en
 * œuvre reçoit le secret, l'envoie, et ne le rend pas.
 */

export type Notification = {
  kind: ChallengeKind;
  to: { email?: string | null; phone?: string | null };
  secret: string;
  expiresAt: Date;
};

export interface Notifier {
  send(notification: Notification): Promise<void>;
}

/**
 * Notificateur de développement et de test : il garde la trace de **ce qui a été envoyé à qui**,
 * jamais le secret. Un test qui a besoin du secret le reçoit de `createChallenge`, pas d'ici.
 */
export class RecordingNotifier implements Notifier {
  readonly sent: Array<{ kind: ChallengeKind; to: string }> = [];

  async send(notification: Notification): Promise<void> {
    this.sent.push({
      kind: notification.kind,
      to: notification.to.email ?? notification.to.phone ?? "inconnu",
    });
  }
}
