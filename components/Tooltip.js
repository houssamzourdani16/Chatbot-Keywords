// components/Tooltip.js
"use client";
import { useState } from "react";

export default function Tooltip({ content, children, position = "top" }) {
  const [show, setShow] = useState(false);

  const positions = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
    left: "right-full top-1/2 -translate-y-1/2 mr-2",
    right: "left-full top-1/2 -translate-y-1/2 ml-2",
  };

  return (
    <div
      className="relative inline-block"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && (
        <div
          className={`absolute z-50 whitespace-nowrap rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-medium text-white shadow-lg ${positions[position] || positions.top}`}
        >
          {content}
        </div>
      )}
    </div>
  );
}
