"use client";

import { useId, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button/Button";
import { Callout } from "@/components/ui/Callout/Callout";
import { Heading } from "@/components/ui/Heading/Heading";
import type { CaregiverCheckPage } from "@/content/schemas";

/*
 * « Où en êtes-vous ? » (docs/03 §7) : huit questions originales à réponse simple, trois niveaux
 * de conseils pratiques. Ce n'est pas un test médical : pas de score clinique, aucune échelle
 * publiée, aucune donnée conservée ni transmise. Tout se calcule dans le navigateur ; le
 * formulaire n'a ni action ni requête réseau, et rien n'est écrit dans le stockage local.
 * Boutons radio natifs (clavier, lecteurs d'écran), résultat annoncé dans une région polie.
 */

export interface CaregiverCheckProps {
  page: CaregiverCheckPage;
}

type Answers = Record<string, number | undefined>;

export function levelFor(page: CaregiverCheckPage, total: number) {
  const [first, ...rest] = page.niveaux;
  return page.niveaux.find((n) => total >= n.min && total <= n.max) ?? rest.at(-1) ?? first;
}

export function CaregiverCheck({ page }: CaregiverCheckProps) {
  const baseId = useId();
  const [answers, setAnswers] = useState<Answers>({});
  const [submitted, setSubmitted] = useState(false);

  const missing = page.questions.filter((q) => answers[q.id] === undefined).length;
  const total = page.questions.reduce((sum, q) => sum + (answers[q.id] ?? 0), 0);
  const level = submitted && missing === 0 ? levelFor(page, total) : null;

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
  }

  function reset() {
    setAnswers({});
    setSubmitted(false);
  }

  return (
    <div className="caregiver-check">
      <Callout variant="attention" title={page.avertissement.titre}>
        {page.avertissement.texte}
      </Callout>

      <form onSubmit={onSubmit} noValidate aria-label={page.h1} className="mt-8">
        <ol className="m-0 grid list-none gap-6 p-0">
          {page.questions.map((question, index) => {
            const name = `${baseId}-${question.id}`;
            return (
              <li key={question.id} className="max-w-none">
                <fieldset className="m-0 rounded-card border border-line bg-white p-5 shadow-1">
                  <legend className="heading-4 px-1">
                    {index + 1}. {question.texte}
                  </legend>
                  <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2">
                    {page.reponses.map((reponse) => {
                      const id = `${name}-${reponse.valeur}`;
                      return (
                        <label key={id} htmlFor={id} className="flex min-h-11 items-center gap-2">
                          <input
                            id={id}
                            type="radio"
                            name={name}
                            value={reponse.valeur}
                            className="size-5 accent-[var(--color-action)]"
                            checked={answers[question.id] === reponse.valeur}
                            onChange={() => {
                              setAnswers((prev) => ({ ...prev, [question.id]: reponse.valeur }));
                            }}
                          />
                          {reponse.libelle}
                        </label>
                      );
                    })}
                  </div>
                </fieldset>
              </li>
            );
          })}
        </ol>

        <div className="mt-8 flex flex-wrap items-center gap-4">
          <Button type="submit">{page.bouton_resultat}</Button>
          <Button type="button" variant="outline" onClick={reset}>
            {page.bouton_recommencer}
          </Button>
        </div>

        {submitted && missing > 0 ? (
          <p role="alert" className="m-0 mt-4 font-bold text-teal-800">
            {page.incomplet.replace("{n}", String(missing))}
          </p>
        ) : null}
      </form>

      <section
        aria-live="polite"
        aria-labelledby={`${baseId}-resultat`}
        className="mt-10"
        data-level={level?.id ?? ""}
      >
        {level ? (
          <div className="rounded-card border border-line bg-white p-6 shadow-1">
            <Heading level={2} id={`${baseId}-resultat`}>
              {page.resultat_h2}
            </Heading>
            <p className="heading-3 m-0 mt-4">{level.titre}</p>
            <p className="m-0 mt-3">{level.texte}</p>
            <ul className="mt-5 grid gap-3">
              {level.conseils.map((conseil) => (
                <li key={conseil.texte} className="max-w-none">
                  {conseil.texte}
                  {conseil.lien ? (
                    <>
                      {" "}
                      <a
                        href={conseil.lien.href}
                        className="font-bold"
                        {...(conseil.lien.href.startsWith("http")
                          ? { target: "_blank", rel: "noopener noreferrer" }
                          : {})}
                      >
                        {conseil.lien.libelle}
                      </a>
                    </>
                  ) : null}
                </li>
              ))}
            </ul>
            <div className="mt-8">
              <p className="heading-4 m-0">{page.appel.titre}</p>
              <p className="m-0 mt-2">{page.appel.texte}</p>
              <div className="mt-4">
                <Button href={page.appel.href}>{page.appel.bouton}</Button>
              </div>
            </div>
          </div>
        ) : (
          <h2 id={`${baseId}-resultat`} className="sr-only">
            {page.resultat_h2}
          </h2>
        )}
      </section>
    </div>
  );
}
