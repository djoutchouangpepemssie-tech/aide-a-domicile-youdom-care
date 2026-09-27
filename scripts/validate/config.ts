import { checkContent } from "./check-content";
import { checkContrast } from "./check-contrast";
import { checkCopy } from "./check-copy";
import { checkFreshness } from "./check-freshness";
import { checkLinks } from "./check-links";
import { checkLocalFacts } from "./check-local-facts";
import { checkLocalNap } from "./check-local-nap";
import { checkLocalUniqueness } from "./check-local-uniqueness";
import { checkPlaceholders } from "./check-placeholders";
import { checkSchema } from "./check-schema";
import { checkSeo } from "./check-seo";
import type { Check } from "./types";

/*
 * Registre des contrôles de `pnpm validate` (docs/07 §7). Chaque tâche qui introduit un
 * contrôle l'ajoute ici. Un contrôle activé n'est plus jamais retiré ni affaibli.
 */
export const checks: readonly Check[] = [
  checkContent,
  checkPlaceholders,
  checkCopy,
  checkContrast,
  checkLinks,
  checkSeo,
  checkSchema,
  checkLocalFacts,
  checkLocalUniqueness,
  checkLocalNap,
  checkFreshness,
];
