"use client";

import type { DetailedFormProps } from "@/components/forms/DetailedForm/DetailedForm";
import { createDeferredForm } from "./DeferredForm";

/* Formulaire détaillé (section 12 des pages services) à hydratation différée. */
export const LazyDetailedForm = createDeferredForm<DetailedFormProps>(
  () =>
    import("@/components/forms/DetailedForm/DetailedForm").then((m) => ({
      default: m.DetailedForm,
    })),
  "LazyDetailedForm",
);
