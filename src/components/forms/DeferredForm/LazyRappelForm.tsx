"use client";

import type { RappelFormProps } from "@/components/forms/RappelForm/RappelForm";
import { createDeferredForm } from "./DeferredForm";

/*
 * Formulaire de rappel à hydratation différée, pour les pages où il vient en fin de page
 * (services, pages locales, agences). `/etre-rappele/` garde l'import direct : le formulaire
 * y est la page. Le type des propriétés seul est importé ici ; le composant arrive par `import()`.
 */
export const LazyRappelForm = createDeferredForm<RappelFormProps>(
  () => import("@/components/forms/RappelForm/RappelForm").then((m) => ({ default: m.RappelForm })),
  "LazyRappelForm",
);
