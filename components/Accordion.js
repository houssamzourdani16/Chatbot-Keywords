// components/Accordion.js
"use client";
import { useState } from "react";

export default function Accordion({ items = [], defaultOpen = 0 }) {
  const [openIndex, setOpenIndex] = useState(defaultOpen);

  return (
    <div className="divide-y divide-gray-200 rounded-xl border border-gray-200">
      {items.map((item, i) => {
        const isOpen = openIndex === i;
        return (
          <div key={i}>
            <button
              onClick={() => setOpenIndex(isOpen ? null : i)}
              className="flex w-full items-center justify-between px-5 py-4 text-left"
            >
              <span className="text-sm font-medium text-gray-900">
                {item.title}
              </span>
              <svg
                className={`h-5 w-5 text-gray-500 transition-transform ${isOpen ? "rotate-180" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>
            {isOpen && (
              <div className="px-5 pb-4 text-sm text-gray-600">
                {item.content}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
