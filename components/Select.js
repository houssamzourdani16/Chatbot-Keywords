// components/Select.js
"use client";

export default function Select({
  label,
  value,
  onChange,
  options = [],
  placeholder = "Select an option",
  required = false,
  error,
}) {
  return (
    <div className="flex w-full flex-col gap-1.5">
      {label && (
        <label className="text-sm font-medium text-gray-700">{label}</label>
      )}
      <select
        value={value}
        onChange={onChange}
        required={required}
        className={`w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm outline-none transition-colors focus:ring-2 ${
          error
            ? "border-red-300 focus:border-red-500 focus:ring-red-100"
            : "border-gray-300 focus:border-blue-500 focus:ring-blue-100"
        }`}
      >
        <option value="" disabled>
          {placeholder}
        </option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
