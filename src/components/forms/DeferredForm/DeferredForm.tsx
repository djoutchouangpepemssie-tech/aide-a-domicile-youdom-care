"use client";

import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  type ComponentType,
  type ReactNode,
} from "react";

/*
 * Formulaire à hydratation différée (dette DP.1, D-026, D-030). Les formulaires de rappel et de
 * demande (MultiStepForm, CommuneField, zod, libphonenumber : 31 Ko compressés, plus 15 Ko de
 * communes quand la commune est préremplie) vivent en bas des pages services, locales et
 * d'agence : les charger avec la page retardait tout le reste pour un visiteur sur dix.
 *
 * Principe : le balisage complet du formulaire est rendu par le serveur (champs, libellés,
 * boutons : la page reste lisible sans JavaScript, et sans décalage de mise en page), mais son
 * code n'est chargé qu'au signal : la section approche de l'écran (`IntersectionObserver`, une
 * hauteur d'écran d'avance), ou le visiteur y pose le doigt ou le focus. Jusqu'au signal, la
 * frontière `Suspense` reste « déshydratée » : React garde le HTML du serveur en place, puis
 * l'hydrate quand le module arrive (aucun remplacement du DOM, les identifiants `useId` sont
 * les mêmes). L'ancre `#formulaire` fonctionne comme avant : la page défile jusqu'à la section,
 * l'observateur se déclenche, le formulaire s'hydrate.
 *
 * `React.lazy` plutôt que `next/dynamic` : Next précharge les fragments des composants
 * dynamiques rendus côté serveur dans le HTML initial (pas d'économie), et `ssr: false`
 * aurait supprimé le balisage serveur (formulaire invisible sans JavaScript, décalage de mise en
 * page mesuré à 0,24 en D-019). L'envoi natif sans JavaScript reste impossible : la route
 * `/api/lead/` ne lit que du JSON (docs/07 §6) ; c'était déjà le cas.
 *
 * Les signaux d'intention sont écoutés sur `window` en phase de capture : React arrête la
 * propagation des événements qui visent une frontière déshydratée (il les rejoue après
 * l'hydratation), un écouteur posé sur la section ne les verrait jamais. Tant que le formulaire
 * n'est pas hydraté, un envoi natif (Entrée dans un champ, clic sur le bouton) est retenu : sans
 * cela, le navigateur rechargerait la page avec une chaîne de requête.
 *
 * Navigation côté client (aucun HTML du serveur dans la frontière) : le module est chargé tout
 * de suite et un espace réservé tient la place le temps du chargement. Sans
 * `IntersectionObserver`, chargement immédiat.
 *
 * Limite connue : une saisie commencée dans un champ rendu par le serveur avant l'arrivée du
 * module (quelques centaines de millisecondes sur 4G, après une hauteur d'écran d'avance) n'est
 * pas reprise par l'état React, qui repart de la valeur vide au prochain rendu du champ.
 */

/** Marge de l'observateur : le formulaire se charge une hauteur d'écran avant d'être visible. */
export const DEFERRED_FORM_ROOT_MARGIN = "100% 0px";

export interface DeferredFormComponent<P> {
  (props: P): ReactNode;
  displayName: string;
  /** Déclenche le chargement du module sans attendre le signal (préchargement, tests). */
  preload: () => void;
}

interface Gate {
  promise: Promise<void>;
  open: () => void;
}

function createGate(): Gate {
  let resolve: (() => void) | null = null;
  const promise = new Promise<void>((r) => {
    resolve = r;
  });
  return {
    promise,
    open: () => {
      resolve?.();
      resolve = null;
    },
  };
}

/** Composant vide dont l'effet ne s'exécute qu'une fois la frontière hydratée (ou rendue). */
function Hydrated({ onHydrated }: { onHydrated: () => void }) {
  useEffect(() => {
    onHydrated();
  }, [onHydrated]);
  return null;
}

interface BoundaryProps {
  open: () => void;
  children: ReactNode;
}

function DeferredBoundary({ open, children }: BoundaryProps) {
  const ref = useRef<HTMLDivElement>(null);
  const hydrated = useRef(false);

  const onHydrated = useCallback(() => {
    hydrated.current = true;
    if (ref.current) ref.current.dataset.deferredForm = "pret";
  }, []);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    // Rien de rendu par le serveur dans la frontière (navigation côté client) ou pas
    // d'observateur : on charge tout de suite.
    if (!element.querySelector("form") || typeof IntersectionObserver === "undefined") {
      open();
      return;
    }
    if (hydrated.current) return;

    const within = (event: Event) => event.target instanceof Node && element.contains(event.target);
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) fire();
      },
      { rootMargin: DEFERRED_FORM_ROOT_MARGIN },
    );
    const onIntent = (event: Event) => {
      if (within(event)) fire();
    };
    // Envoi natif retenu tant que le formulaire n'est pas hydraté (voir l'en-tête du fichier).
    const onSubmit = (event: Event) => {
      if (!within(event) || hydrated.current) return;
      event.preventDefault();
      fire();
    };
    let fired = false;
    const fire = () => {
      if (fired) return;
      fired = true;
      observer.disconnect();
      window.removeEventListener("focusin", onIntent, true);
      window.removeEventListener("pointerdown", onIntent, true);
      element.dataset.deferredForm = "chargement";
      open();
    };
    window.addEventListener("focusin", onIntent, true);
    window.addEventListener("pointerdown", onIntent, true);
    window.addEventListener("submit", onSubmit, true);
    observer.observe(element);
    return () => {
      observer.disconnect();
      window.removeEventListener("focusin", onIntent, true);
      window.removeEventListener("pointerdown", onIntent, true);
      window.removeEventListener("submit", onSubmit, true);
    };
  }, [open]);

  return (
    <div ref={ref} data-deferred-form="attente">
      {/* L'espace réservé ne sert qu'en navigation côté client : à l'hydratation, React garde
          le HTML du serveur et n'affiche jamais ce repli. */}
      <Suspense fallback={<div className="min-h-[28rem]" aria-hidden="true" />}>
        {children}
        <Hydrated onHydrated={onHydrated} />
      </Suspense>
    </div>
  );
}

/**
 * Fabrique une enveloppe à hydratation différée autour d'un formulaire client. `load` importe
 * le module à la demande (`import()` : le fragment sort du JavaScript initial de la page).
 * Sur le serveur, le module est chargé sans attendre : le balisage complet est rendu.
 */
export function createDeferredForm<P extends object>(
  load: () => Promise<{ default: ComponentType<P> }>,
  displayName: string,
): DeferredFormComponent<P> {
  const gate = createGate();
  const Lazy = lazy(() => (typeof window === "undefined" ? load() : gate.promise.then(load)));

  const Deferred: DeferredFormComponent<P> = (props: P) => (
    <DeferredBoundary open={gate.open}>
      <Lazy {...props} />
    </DeferredBoundary>
  );
  Deferred.displayName = displayName;
  Deferred.preload = gate.open;
  return Deferred;
}
