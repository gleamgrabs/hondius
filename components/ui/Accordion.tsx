"use client";

import { useState } from "react";

interface AccordionItem {
  question: string;
  answer: string;
}

export default function Accordion({ items }: { items: AccordionItem[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="divide-y divide-color-rule">
      {items.map((item, i) => (
        <div key={i}>
          <button
            type="button"
            onClick={() => setOpenIndex(openIndex === i ? null : i)}
            className="w-full text-left py-4 flex justify-between items-center gap-4 text-color-text hover:text-color-accent transition-colors"
            aria-expanded={openIndex === i}
          >
            <span className="font-medium text-base">{item.question}</span>
            <span className="text-color-text-muted text-sm flex-shrink-0" aria-hidden>
              {openIndex === i ? "−" : "+"}
            </span>
          </button>
          {openIndex === i && (
            <div className="pb-4 text-color-text-muted text-sm leading-relaxed max-w-prose">
              {item.answer}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
