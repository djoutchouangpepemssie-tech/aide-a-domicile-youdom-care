import Link from "next/link";
import { cn } from "@/lib/cn";

/*
 * Carte d'Île-de-France accessible (docs/04 §4, P6.5) : un SVG schématique des huit
 * départements (formes simplifiées, positions relatives fidèles : Paris au centre, la petite
 * couronne autour, la grande couronne à l'extérieur), rendu comme une image (`role="img"`,
 * titre et description), et juste à côté la liste équivalente de liens, seule partie
 * interactive. Un département sans page construite est nommé sans lien, sans promesse de
 * date. Le SVG ne porte aucune information absente de la liste.
 * Sur téléphone (jusqu'à 64 rem) la liste passe devant la carte : au doigt, seuls les liens de la
 * liste sont utilisables, la carte n'est qu'une image (D-032 §6, P9.6). À partir de 64 rem la
 * carte reprend sa place à gauche.
 */

export interface MapDepartment {
  code: string;
  nom: string;
  /** Page du département si elle est construite. */
  href: string | null;
  /** Libellé du lien (« Aide à domicile dans les Hauts-de-Seine »). */
  label: string;
}

export interface IdfMapProps {
  departments: readonly MapDepartment[];
  texts: { titre: string; description: string; liste: string };
  className?: string;
}

/** Tracés schématiques, viewBox 0 0 600 520 ; le numéro est posé au point `label`. */
const shapes: Record<string, { d: string; label: [number, number] }> = {
  "95": { d: "M150 78 L440 92 L412 178 L300 188 L246 194 L182 156 Z", label: [300, 138] },
  "77": { d: "M440 92 L568 58 L578 470 L424 462 L396 340 L402 262 L412 178 Z", label: [498, 270] },
  "91": { d: "M198 342 L300 336 L396 340 L424 462 L262 484 L166 424 Z", label: [300, 420] },
  "78": {
    d: "M36 150 L182 156 L246 194 L244 330 L198 342 L166 424 L56 402 L24 262 Z",
    label: [128, 282],
  },
  "92": {
    d: "M246 194 L300 188 L300 226 C 282 232 274 246 274 262 C 274 278 282 292 300 298 L300 336 L244 330 Z",
    label: [264, 262],
  },
  "93": { d: "M300 188 L412 178 L402 262 L332 262 C 332 244 320 232 300 226 Z", label: [362, 224] },
  "94": {
    d: "M332 262 L402 262 L396 340 L300 336 L300 298 C 320 292 332 280 332 262 Z",
    label: [358, 306],
  },
  "75": {
    d: "M300 226 C 320 232 332 244 332 262 C 332 280 320 292 300 298 C 282 292 274 278 274 262 C 274 246 282 232 300 226 Z",
    label: [302, 264],
  },
};

export function IdfMap({ departments, texts, className }: IdfMapProps) {
  return (
    <div className={cn("idf-map grid gap-8 lg:grid-cols-[3fr_2fr] lg:items-center", className)}>
      <svg
        viewBox="0 0 600 520"
        role="img"
        aria-labelledby="idf-map-titre"
        aria-describedby="idf-map-description"
        className="order-2 h-auto w-full max-w-xl lg:order-1"
        data-idf-map
      >
        <title id="idf-map-titre">{texts.titre}</title>
        <desc id="idf-map-description">{texts.description}</desc>
        {departments.map((department) => {
          const shape = shapes[department.code];
          if (!shape) return null;
          return (
            <g key={department.code} data-departement={department.code}>
              <path
                d={shape.d}
                className={cn(
                  "stroke-teal-700 stroke-2 [stroke-linejoin:round]",
                  department.href ? "fill-teal-50" : "fill-white",
                )}
              />
              <text
                x={shape.label[0]}
                y={shape.label[1]}
                textAnchor="middle"
                dominantBaseline="middle"
                className="fill-teal-900 font-bold"
                fontSize="22"
              >
                {department.code}
              </text>
            </g>
          );
        })}
      </svg>
      <nav aria-label={texts.liste} className="order-1 lg:order-2">
        <p className="m-0 font-bold">{texts.liste}</p>
        <ul className="m-0 mt-3 grid list-none gap-2 p-0" data-idf-list>
          {departments.map((department) => (
            <li key={department.code} className="flex max-w-none items-center gap-3">
              <span className="tabular-figures inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-teal-50 text-small font-bold text-teal-900">
                {department.code}
              </span>
              {department.href ? (
                <Link
                  href={department.href}
                  prefetch={false}
                  className="inline-flex min-h-11 items-center font-bold"
                >
                  {department.label}
                </Link>
              ) : (
                <span className="inline-flex min-h-11 items-center">{department.nom}</span>
              )}
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
