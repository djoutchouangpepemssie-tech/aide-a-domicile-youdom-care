import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/*
 * Garde-fous du budget du mouvement (BRIEF_LIQUID_GLASS §2, docs/07 §5), lus dans le code source :
 * aucune minuterie répétée laissée derrière, aucun écouteur de défilement non passif, aucune
 * propriété de mise en page animée, aucune bibliothèque d'animation, `will-change` seulement
 * pendant l'interaction. Un test de source plutôt qu'un test de rendu : il attrape la faute à
 * l'écriture, sur tout le périmètre, sans navigateur.
 */

const ROOTS = ["src/lib/motion", "src/components/motion", "src/components/ui/Thread"] as const;

function sources(): { path: string; code: string }[] {
  const found: { path: string; code: string }[] = [];
  const walk = (directory: string) => {
    for (const entry of readdirSync(directory)) {
      const path = join(directory, entry);
      if (statSync(path).isDirectory()) {
        walk(path);
        continue;
      }
      if (!/\.(ts|tsx|css)$/.test(entry) || /\.test\.tsx?$/.test(entry)) continue;
      found.push({ path: path.replace(/\\/g, "/"), code: readFileSync(path, "utf8") });
    }
  };
  for (const root of ROOTS) walk(root);
  return found;
}

const files = sources();

describe("budget du mouvement", () => {
  it("lit bien tout le périmètre", () => {
    expect(files.length).toBeGreaterThan(15);
  });

  it("n'utilise aucune minuterie répétée", () => {
    for (const { path, code } of files) {
      expect(code, path).not.toMatch(/\bsetInterval\b/);
    }
  });

  it("n'écoute le défilement et le toucher qu'en mode passif", () => {
    for (const { path, code } of files) {
      const listeners = code.match(
        /addEventListener\(\s*"(scroll|touchstart|touchmove|wheel)"[^)]*\)/g,
      );
      for (const listener of listeners ?? []) {
        expect(`${path} : ${listener}`).toMatch(/passive:\s*true/);
      }
    }
  });

  it("n'anime que `transform`, `opacity` et le tracé du fil", () => {
    const forbidden = /transition:[^;]*\b(width|height|top|left|right|bottom|margin|padding)\b/;
    for (const { path, code } of files) {
      if (!path.endsWith(".css")) continue;
      expect(code, path).not.toMatch(forbidden);
      // Aucune animation infinie : rien ne tourne en boucle sous les yeux du lecteur.
      expect(code, path).not.toMatch(/\binfinite\b/);
    }
  });

  it("ne pose `will-change` que pendant l'interaction", () => {
    for (const { path, code } of files) {
      if (path.endsWith(".css")) {
        // Aucune déclaration permanente : seul le JavaScript en pose une, le temps du geste.
        expect(code, path).not.toMatch(/will-change\s*:/);
        continue;
      }
      // En JavaScript, un `will-change` posé doit être retiré dans le même fichier.
      const posed = code.match(/willChange = "(?!")/g) ?? [];
      const cleared = code.match(/willChange = ""/g) ?? [];
      expect(cleared.length, path).toBe(posed.length);
    }
  });

  it("n'ajoute aucune bibliothèque d'animation", () => {
    for (const { path, code } of files) {
      expect(code, path).not.toMatch(/from "(framer-motion|gsap|motion|animejs|three|lottie)/);
    }
  });
});
