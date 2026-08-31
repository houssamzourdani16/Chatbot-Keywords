// components/Tabs.js
"use client";
import { useState } from "react";

export default function Tabs({ tabs = [], defaultActive = 0, onChange }) {
  const [active, setActive] = useState(defaultActive);

  const handleChange = (index) => {
    setActive(index);
    onChange?.(index);
  };

  return (
    <div>
      <div className="flex gap-1 border-b border-gray-200">
        {tabs.map((tab, i) => (
          <button
            key={i}
            onClick={() => handleChange(i)}
            className={`relative px-4 py-2.5 text-sm font-medium transition-colors ${
              active === i
                ? "text-blue-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.label}
            {active === i && (
              <span className="absolute inset-x-0 -bottom-px h-0.5 bg-blue-600" />
            )}
          </button>
        ))}
      </div>
      <div className="py-4">{tabs[active]?.content}</div>
    </div>
  );
}
