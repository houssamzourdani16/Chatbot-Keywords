// components/admin/ProductFilters.js
"use client";

export default function ProductFilters({
  search,
  onSearchChange,
  status,
  onStatusChange,
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      {/* Search */}
      <div className="relative flex-1">
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
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search products by name..."
          className="w-full rounded-lg border border-gray-300 py-2.5 pl-11 pr-4 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />
      </div>

      {/* Status filter */}
      <select
        value={status}
        onChange={(e) => onStatusChange(e.target.value)}
        className="rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      >
        <option value="">All Status</option>
        <option value="Active">Active</option>
        <option value="Inactive">Inactive</option>
        <option value="Coming Soon">Coming Soon</option>
      </select>
    </div>
  );
}
