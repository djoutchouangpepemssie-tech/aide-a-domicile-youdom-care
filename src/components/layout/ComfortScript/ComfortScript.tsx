import { COMFORT_STORAGE_KEY } from "@/lib/comfort";

// Restaure le mode confort avant le premier rendu pour éviter un saut de mise en page.
// Aucune donnée personnelle : une préférence d'affichage, lue sur l'appareil seulement.
const script = `try{if(localStorage.getItem(${JSON.stringify(COMFORT_STORAGE_KEY)})==="on")document.documentElement.dataset.comfort="on"}catch(e){}`;

export function ComfortScript() {
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
