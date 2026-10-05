"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Button } from "@/components/ui/Button/Button";
import { Callout } from "@/components/ui/Callout/Callout";
import { cn } from "@/lib/cn";
import type { LeadForm } from "@/lib/lead/forms";
import { track } from "@/lib/mesure/client";
import { formatFrenchPhone, toTelHref } from "@/lib/phone";

/*
 * Coque multi-étapes des formulaires (docs/05 §3 et §6) : barre de progression « Étape 2 sur 5 »,
 * action principale en tête et bouton « Retour » à partir de la deuxième étape, une question
 * principale par écran, réponses conservées
 * sur l'appareil (sessionStorage) jusqu'à l'envoi puis effacées, résumé d'erreurs en tête lié
 * aux champs, focus sur la première erreur, panne d'envoi sans perte de saisie avec le
 * téléphone proposé. Champ piège invisible et horodatage de début pour la route api/lead
 * (docs/05 §6). Le formulaire n'est rendu qu'après hydratation, pour lire le stockage sans
 * décalage entre serveur et client.
 */

export interface StepContext<T> {
  value: T;
  setValue: (value: T) => void;
  /** Erreurs de l'étape, par champ : le composant de champ les affiche sous le champ. */
  errors: Readonly<Record<string, string>>;
  /** Identifiant DOM stable d'un champ, pour lier le résumé d'erreurs et le focus. */
  fieldId: (field: string) => string;
}

export interface FormStep<T> {
  id: string;
  /** Question principale de l'écran (docs/01 §7). */
  title: string;
  /** Nom court pour la progression ; à défaut, le titre est repris. */
  shortTitle?: string;
  hint?: string;
  render: (ctx: StepContext<T>) => ReactNode;
  /** Erreurs par champ ; objet vide si l'étape est valide. */
  validate?: (value: T) => Record<string, string>;
}

export interface SubmitMeta {
  /** Valeur du champ piège : vide chez un humain. */
  honeypot: string;
  /** Horodatage ISO du premier affichage du formulaire. */
  startedAt: string;
}

export interface MultiStepFormTexts {
  /** Contient {n} et {total}. */
  etape_sur: string;
  retour: string;
  suivant: string;
  envoyer: string;
  envoi_en_cours: string;
  erreurs_titre: string;
  conservation: string;
  /** Contient {téléphone}. */
  envoi_impossible: string;
}

export interface MultiStepFormProps<T> {
  form: LeadForm;
  steps: readonly FormStep<T>[];
  initialValue: T;
  texts: MultiStepFormTexts;
  onSubmit: (value: T, meta: SubmitMeta) => Promise<void>;
  /** Page de confirmation, ouverte après l'envoi. */
  successHref: string;
  /** Téléphone affiché en cas de panne d'envoi ; null s'il est inconnu. */
  phone: string | null;
  /** Étape affichée si aucune saisie n'est conservée (tests, pré-remplissage). */
  initialStep?: number;
  className?: string;
}

export function storageKey(form: LeadForm): string {
  return `yc-demande-${form}`;
}

interface Stored<T> {
  step: number;
  value: T;
}

function readStored<T>(form: LeadForm): Stored<T> | null {
  try {
    const raw = window.sessionStorage.getItem(storageKey(form));
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && "step" in parsed && "value" in parsed) {
      return parsed as Stored<T>;
    }
  } catch {
    /* stockage indisponible ou corrompu : on repart de zéro */
  }
  return null;
}

function writeStored<T>(form: LeadForm, stored: Stored<T>) {
  try {
    window.sessionStorage.setItem(storageKey(form), JSON.stringify(stored));
  } catch {
    /* stockage indisponible : les réponses vivent seulement dans l'écran */
  }
}

export function clearStored(form: LeadForm) {
  try {
    window.sessionStorage.removeItem(storageKey(form));
  } catch {
    /* rien à effacer */
  }
}

export function MultiStepForm<T>({
  form,
  steps,
  initialValue,
  texts,
  onSubmit,
  successHref,
  phone,
  initialStep = 0,
  className,
}: MultiStepFormProps<T>) {
  const router = useRouter();
  const id = useId();
  // Rendu complet dès le serveur (pas de décalage de mise en page) ; une saisie conservée sur
  // l'appareil est reprise juste après le montage.
  const [state, setState] = useState<Stored<T>>({ step: initialStep, value: initialValue });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<"idle" | "sending" | "failed">("idle");
  const [honeypot, setHoneypot] = useState("");
  const restored = useRef(false);
  const startedAt = useRef(new Date().toISOString());
  const headingRef = useRef<HTMLHeadingElement>(null);
  const summaryRef = useRef<HTMLDivElement>(null);
  const failureRef = useRef<HTMLElement>(null);

  // Étape d'une saisie conservée en attente de reprise : la mesure ne compte pas l'étape 1 affichée
  // le temps du montage quand le visiteur revient en réalité à l'étape 3.
  const pendingStep = useRef<number | null>(null);

  useEffect(() => {
    const stored = readStored<T>(form);
    if (stored) {
      pendingStep.current = stored.step;
      queueMicrotask(() => setState(stored));
    }
    restored.current = true;
  }, [form]);

  useEffect(() => {
    if (restored.current) writeStored(form, state);
  }, [form, state]);

  // Mesure sans donnée personnelle (docs/05 §9) : le formulaire et le numéro d'étape, rien d'autre.
  useEffect(() => {
    if (pendingStep.current !== null && pendingStep.current !== state.step) return;
    pendingStep.current = null;
    track("demande_etape_vue", { formulaire: form, etape: state.step + 1 });
  }, [form, state.step]);

  // Panne d'envoi : l'alerte est annoncée (`role="alert"`) et reçoit le focus, pour que le clavier
  // et le lecteur d'écran se trouvent sur le message et le téléphone proposé (audit P8.4 R-4).
  useEffect(() => {
    if (status === "failed") failureRef.current?.focus();
  }, [status]);

  const step = steps[state.step] ?? steps[0];
  if (!step) throw new Error("MultiStepForm : aucune étape");
  const total = steps.length;
  const isLast = state.step === total - 1;
  const fieldId = (field: string) => `${id}-${step.id}-${field}`;
  const errorEntries = Object.entries(errors);

  const goTo = (next: number) => {
    setErrors({});
    setState((s) => ({ ...s, step: next }));
    requestAnimationFrame(() => headingRef.current?.focus());
  };

  const check = (): boolean => {
    const found = step.validate?.(state.value) ?? {};
    setErrors(found);
    const first = Object.keys(found)[0];
    if (first) {
      requestAnimationFrame(() => {
        // L'identifiant d'un groupe (boutons radio, cases) est porté par le `fieldset`, qui ne
        // prend pas le focus : on vise alors son premier contrôle (audit P8.4, RGAA 11.10).
        const target = document.getElementById(fieldId(first));
        const focusable = target?.matches("input, select, textarea, button, [tabindex]")
          ? target
          : target?.querySelector<HTMLElement>("input, select, textarea, button, [tabindex]");
        (focusable ?? summaryRef.current)?.focus();
      });
      return false;
    }
    return true;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (status === "sending") return;
    if (!check()) return;
    if (!isLast) {
      goTo(state.step + 1);
      return;
    }
    setStatus("sending");
    try {
      await onSubmit(state.value, { honeypot, startedAt: startedAt.current });
      clearStored(form);
      router.push(successHref);
    } catch {
      setStatus("failed");
    }
  };

  const telHref = phone ? toTelHref(phone) : null;
  const failureText = texts.envoi_impossible.split("{téléphone}");

  return (
    <form
      noValidate
      onSubmit={(event) => void handleSubmit(event)}
      className={cn("grid gap-8", className)}
      aria-labelledby={`${id}-titre`}
      data-form={form}
      data-step={step.id}
    >
      {/*
       * Progression (29/09/2026). L'élément natif était dessiné par le système : barre verte
       * sur Windows, hors de la palette, et rien n'indiquait ce que contenait l'étape en cours ni
       * ce qui restait à faire. Elle devient une suite de segments aux couleurs de la marque, où
       * chaque étape porte son nom : on voit où on en est, ce qui est fait, et ce qui vient.
       * La valeur reste annoncée aux lecteurs d'écran par `role="progressbar"`.
       */}
      <div className="grid gap-2">
        <p id={`${id}-progression`} className="m-0 text-small font-bold text-teal-900">
          {texts.etape_sur.replace("{n}", String(state.step + 1)).replace("{total}", String(total))}
          <span className="font-normal text-text-soft"> · {step.shortTitle ?? step.title}</span>
        </p>
        <ol
          className="m-0 flex list-none gap-1.5 p-0"
          role="progressbar"
          aria-labelledby={`${id}-progression`}
          aria-valuemin={1}
          aria-valuemax={total}
          aria-valuenow={state.step + 1}
        >
          {steps.map((s, i) => (
            <li
              key={s.id}
              className={cn(
                "h-2 flex-1 rounded-full transition-colors [transition-duration:var(--duration-base)] motion-reduce:transition-none",
                i < state.step && "bg-teal-500",
                i === state.step && "bg-teal-700",
                i > state.step && "bg-line",
              )}
              aria-hidden="true"
            />
          ))}
        </ol>
      </div>

      {errorEntries.length > 0 ? (
        <div
          ref={summaryRef}
          role="alert"
          tabIndex={-1}
          className="rounded-card border-2 border-danger bg-danger-bg p-4"
        >
          <p className="m-0 font-bold">{texts.erreurs_titre}</p>
          {/* `min-h-11` sur chaque lien : cible de 44 px de WCAG 2.5.8. Les liens du résumé
              mesuraient 22 px de haut, et c'est précisément ici qu'une personne qui vient
              d'échouer à remplir le formulaire doit viser juste du premier coup
              (docs/AUDIT_GLOBAL.md §9, DP.4). */}
          <ul className="m-0 mt-2 list-disc pl-5">
            {errorEntries.map(([field, message]) => (
              <li key={field} className="max-w-none">
                <a href={`#${fieldId(field)}`} className="inline-flex min-h-11 items-center">
                  {message}
                </a>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div>
        <h2 id={`${id}-titre`} ref={headingRef} tabIndex={-1} className="m-0 outline-none">
          {step.title}
        </h2>
        {step.hint ? <p className="mt-2 text-text-soft">{step.hint}</p> : null}
      </div>

      <div className="grid gap-6">
        {step.render({
          value: state.value,
          setValue: (value) => setState((s) => ({ ...s, value })),
          errors,
          fieldId,
        })}
      </div>

      <div
        className="absolute -left-[10000px] top-auto h-px w-px overflow-hidden"
        aria-hidden="true"
      >
        <label>
          Site web
          <input
            type="text"
            name="site_web"
            tabIndex={-1}
            autoComplete="off"
            value={honeypot}
            onChange={(event) => setHoneypot(event.target.value)}
          />
        </label>
      </div>

      {status === "failed" ? (
        <Callout ref={failureRef} variant="attention" role="alert" tabIndex={-1}>
          {failureText[0]}
          {telHref && phone ? (
            <a href={telHref} data-mesure="formulaire">
              {formatFrenchPhone(phone)}
            </a>
          ) : null}
          {failureText[1]}
        </Callout>
      ) : null}

      {/*
       * L'action principale vient en premier, le retour n'apparaît qu'à partir de la deuxième
       * étape (29/09/2026). Un bouton « Retour » grisé en tête du premier écran n'aide personne :
       * il occupe la place de l'action attendue et laisse croire qu'on a raté quelque chose.
       */}
      <div className="flex flex-wrap items-center gap-4">
        <Button type="submit" disabled={status === "sending"}>
          {status === "sending" ? texts.envoi_en_cours : isLast ? texts.envoyer : texts.suivant}
        </Button>
        {state.step > 0 ? (
          <Button
            type="button"
            variant="outline"
            disabled={status === "sending"}
            onClick={() => goTo(Math.max(0, state.step - 1))}
          >
            {texts.retour}
          </Button>
        ) : null}
      </div>

      <p className="m-0 text-small text-text-soft">{texts.conservation}</p>
    </form>
  );
}
