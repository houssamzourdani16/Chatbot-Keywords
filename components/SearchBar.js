// components/SearchBar.js
"use client";

export default function SearchBar({
  value,
  onChange,
  placeholder = "Search...",
  onSearch,
  className = "",
}) {
  const handleSubmit = (e) => {
    e.preventDefault();
    onSearch?.(value);
  };

  return (
    <form onSubmit={handleSubmit} className={`relative ${className}`}>
      <svg
        className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
        />
      </svg>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-gray-300 py-2.5 pl-11 pr-4 text-sm outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      />
    </form>
  );
}
