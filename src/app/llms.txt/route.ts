import { buildLlmsInput, renderLlmsTxt } from "@/lib/seo/llms";

/*
 * GET /llms.txt (docs/04 §2 « Moteurs de réponse », P5.6) : texte brut statique généré au build
 * depuis content/ par src/lib/seo/llms.ts. Pas de mention dans robots.txt (inutile) ; le
 * fichier n'est pas un plan de site, il liste les pages de référence pour les assistants.
 */

export const dynamic = "force-static";

export async function GET(): Promise<Response> {
  const body = renderLlmsTxt(await buildLlmsInput());
  return new Response(body, {
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}
