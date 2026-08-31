// components/Textarea.js
"use client";

export default function Textarea({
  label,
  value,
  onChange,
  placeholder,
  rows = 4,
  required = false,
  error,
  hint,
}) {
  return (
    <div className="flex w-full flex-col gap-1.5">
      {label && (
        <label className="text-sm font-medium text-gray-700">{label}</label>
      )}
      <textarea
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        rows={rows}
        required={required}
        className={`w-full rounded-lg border px-3.5 py-2.5 text-sm outline-none transition-colors focus:ring-2 ${
          error
            ? "border-red-300 focus:border-red-500 focus:ring-red-100"
            : "border-gray-300 focus:border-blue-500 focus:ring-blue-100"
        }`}
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
      {hint && !error && <p className="text-xs text-gray-500">{hint}</p>}
    </div>
  );
}
