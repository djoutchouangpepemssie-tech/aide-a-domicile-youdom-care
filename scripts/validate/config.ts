import { checkContent } from "./check-content";
import { checkContrast } from "./check-contrast";
import { checkCopy } from "./check-copy";
import { checkPlaceholders } from "./check-placeholders";
import type { Check } from "./types";

/*
 * Registre des contrôles de `pnpm validate` (docs/07 §7). Chaque tâche qui introduit un
 * contrôle l'ajoute ici. Un contrôle activé n'est plus jamais retiré ni affaibli.
 */
export const checks: readonly Check[] = [checkContent, checkPlaceholders, checkCopy, checkContrast];
