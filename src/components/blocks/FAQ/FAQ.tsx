import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/*
 * FAQ (docs/02 §7) : details/summary natifs, une question par bloc, aucun JavaScript.
 * Le balisage FAQPage n'est pas ajouté ici (types autorisés décidés en P5.2).
 */

export interface FAQItem {
  id?: string;
  question: string;
  answer: ReactNode;
}

export interface FAQProps {
  items: readonly FAQItem[];
  className?: string;
}

export function FAQ({ items, className }: FAQProps) {
  return (
    <div className={cn("faq flex flex-col gap-3", className)}>
      {items.map((item, index) => (
        <details
          key={item.id ?? index}
          id={item.id}
          className="group rounded-card border border-line bg-white shadow-1 open:shadow-2"
        >
          <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 rounded-card px-5 py-3 font-bold marker:hidden [&::-webkit-details-marker]:hidden">
            <span>{item.question}</span>
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              width="20"
              height="20"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="shrink-0 text-teal-700 transition-transform [transition-duration:var(--duration-fast)] group-open:rotate-180 motion-reduce:transition-none"
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </summary>
          <div className="prose px-5 pb-5">{item.answer}</div>
        </details>
      ))}
    </div>
  );
}
