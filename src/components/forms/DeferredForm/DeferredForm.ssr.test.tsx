// @vitest-environment node
import { PassThrough } from "node:stream";
import type { ReactNode } from "react";
import { renderToPipeableStream } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { listFormDefinitions } from "@/content/form-definitions";
import { getInterfaceTexts, getSpecialForms } from "@/content/loader";
import { LazyDetailedForm } from "./LazyDetailedForm";
import { LazyHospitalDischargeForm } from "./LazyHospitalDischargeForm";
import { LazyRappelForm } from "./LazyRappelForm";

/*
 * Rendu serveur des enveloppes différées (D-030) : sans `window`, le module est importé sans
 * attendre et le balisage complet du formulaire est dans le HTML, comme avant la dette DP.1.
 * La page reste lisible et les champs présents sans JavaScript.
 */

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

function renderHtml(element: ReactNode): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const sink = new PassThrough();
    sink.on("data", (chunk: Buffer) => chunks.push(chunk));
    sink.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    const { pipe } = renderToPipeableStream(element, {
      onAllReady() {
        pipe(sink);
      },
      onError(error) {
        reject(error instanceof Error ? error : new Error(String(error)));
      },
    });
  });
}

const texts = getInterfaceTexts();
const formTexts = {
  ...texts.formulaires,
  recherche: texts.recherche_commune,
  planning: texts.planning,
  planningTexts: {
    semaine_type: texts.semaine_type,
    formulaires: texts.formulaires,
    planning: texts.planning,
  },
};

describe("enveloppes différées, rendu serveur", () => {
  it("LazyRappelForm rend le formulaire de rappel complet", async () => {
    const html = await renderHtml(
      <LazyRappelForm
        texts={{
          ...texts.formulaires,
          ...texts.formulaires.rappel,
          recherche: texts.recherche_commune,
        }}
        phone="0184801703"
        confidentialiteHref="/politique-de-confidentialite/"
        initialInsee="92062"
      />,
    );
    expect(html).toContain('data-deferred-form="attente"');
    expect(html).toContain('data-form="rappel"');
    expect(html).toContain("Étape 1 sur 1");
    for (const label of ["Votre prénom", "Votre nom", "Votre téléphone"]) {
      expect(html).toContain(label);
    }
    expect(html).toContain('type="submit"');
    // Aucun repli de Suspense : le formulaire lui-même est dans le HTML.
    expect(html).not.toContain("min-h-[28rem]");
  });

  it("LazyDetailedForm rend la première étape du formulaire détaillé", async () => {
    const definition = listFormDefinitions().find((d) => d.id === "neuro");
    expect(definition).toBeDefined();
    if (!definition) return;
    const html = await renderHtml(
      <LazyDetailedForm
        definition={definition}
        texts={formTexts}
        phone={null}
        confidentialiteHref="/politique-de-confidentialite/"
      />,
    );
    expect(html).toContain('data-form="neuro"');
    expect(html).toContain("Étape 1 sur 5");
    expect(html).toContain('type="radio"');
  });

  it("LazyHospitalDischargeForm rend le formulaire de sortie d'hospitalisation", async () => {
    const html = await renderHtml(
      <LazyHospitalDischargeForm
        texts={formTexts}
        page={getSpecialForms().sortie_hospitalisation}
        phone={null}
        confidentialiteHref="/politique-de-confidentialite/"
      />,
    );
    expect(html).toContain('data-form="sortie-hospitalisation"');
    expect(html).toContain("<form");
  });
});
