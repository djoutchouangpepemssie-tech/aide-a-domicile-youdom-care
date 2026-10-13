import { expect, type Locator, type Page } from "@playwright/test";

/*
 * Coche un bouton radio ou une case au clavier, puis **vérifie que c'est coché**.
 *
 * Sans cette vérification, une frappe perdue — focus déplacé par une animation, nœud re-rendu,
 * runner chargé — ne se voyait pas à l'endroit du raté : elle ressortait plus loin, en délai
 * dépassé de 30 s sur un champ qui n'avait plus aucune raison d'apparaître. Un parcours du dépôt
 * du client échouait ainsi sur « Toutes les nuits », alors que le rythme était resté décoché une
 * ligne plus haut (D-081).
 *
 * `toPass` reprend la frappe au lieu de la supposer reçue. Si l'espace ne coche vraiment pas, le
 * test échoue toujours — mais en nommant le champ en cause.
 */
export async function checkByKeyboard(
  form: Locator,
  page: Page,
  role: "radio" | "checkbox",
  name: string | RegExp,
) {
  const field = form.getByRole(role, { name }).first();
  await expect(field, `${role} « ${String(name)} » absent de l'écran`).toBeVisible();
  await expect(async () => {
    await field.focus();
    await page.keyboard.press("Space");
    await expect(field, `${role} « ${String(name)} » reste décoché après Espace`).toBeChecked();
  }).toPass({ timeout: 10_000 });
}
