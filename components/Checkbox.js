// components/Checkbox.js
"use client";

export default function Checkbox({
  label,
  checked,
  onChange,
  disabled = false,
}) {
  return (
    <label
      className={`flex items-center gap-2.5 ${disabled ? "opacity-50" : "cursor-pointer"}`}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
      />
      <span className="text-sm text-gray-700">{label}</span>
    </label>
  );
}
