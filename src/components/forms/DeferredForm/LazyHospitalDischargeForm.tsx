"use client";

import type { HospitalDischargeFormProps } from "@/components/forms/SpecialForms/HospitalDischargeForm";
import { createDeferredForm } from "./DeferredForm";

/* Formulaire de sortie d'hospitalisation (section 12 de la page service) à hydratation différée. */
export const LazyHospitalDischargeForm = createDeferredForm<HospitalDischargeFormProps>(
  () =>
    import("@/components/forms/SpecialForms/HospitalDischargeForm").then((m) => ({
      default: m.HospitalDischargeForm,
    })),
  "LazyHospitalDischargeForm",
);
