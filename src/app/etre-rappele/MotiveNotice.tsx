"use client";

import { useSyncExternalStore } from "react";

/*
 * Message au-dessus du formulaire de rappel selon `?motif=<clé>` dans l'adresse (docs/design/
 * CONCEPT.md §3 : « Je ne sais pas encore » → « C'est normal. L'évaluation à domicile sert à
 * cela. »). La clé est lue côté client, une fois, dans `window.location` : rien n'est conservé,
 * rien n'est envoyé, la page reste statique. Au rendu serveur et sans JavaScript, le composant ne
 * rend rien ; l'adresse ne porte qu'un mot clé, jamais une donnée personnelle.
 */

export interface MotiveNoticeProps {
  /** Messages par clé de motif (content/pages/etre-rappele.json > motifs). */
  messages: Readonly<Record<string, string>>;
  className?: string;
}

const PARAM = "motif";
const subscribeNoop = () => () => {};
const readMotive = () => new URLSearchParams(window.location.search).get(PARAM);
const serverMotive = () => null;

export function MotiveNotice({ messages, className }: MotiveNoticeProps) {
  const motive = useSyncExternalStore(subscribeNoop, readMotive, serverMotive);
  const message = motive !== null ? messages[motive] : undefined;
  if (!message) return null;
  return (
    <p
      data-motif={motive}
      className={
        className ??
        "m-0 rounded-card border-l-4 border-teal-700 bg-tint-teal px-5 py-4 font-bold text-teal-900"
      }
    >
      {message}
    </p>
  );
}
