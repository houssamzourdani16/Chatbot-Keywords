// components/admin/ProductTable.js
"use client";

import ProductFilters from "./ProductFilters";

export default function ProductTable({
  products,
  search,
  onSearchChange,
  status,
  onStatusChange,
  onEdit,
  onDelete,
  onView,
  page,
  totalPages,
  onPageChange,
  loading,
  selected = [],
  onToggleSelect,
}) {
  return (
    <div>
      <ProductFilters
        search={search}
        onSearchChange={onSearchChange}
        status={status}
        onStatusChange={onStatusChange}
      />

      <div className="mt-4 overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {onToggleSelect && (
                <th className="w-10 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={
                      products.length > 0 &&
                      products.every((p) => selected.includes(p.id))
                    }
                    onChange={() => {
                      const allSelected = products.every((p) =>
                        selected.includes(p.id),
                      );
                      if (allSelected) {
                        products.forEach((p) => onToggleSelect(p.id));
                      } else {
                        products.forEach((p) => {
                          if (!selected.includes(p.id)) onToggleSelect(p.id);
                        });
                      }
                    }}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600"
                  />
                </th>
              )}
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                Price
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                Messages
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                Created
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center">
                  <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
                </td>
              </tr>
            ) : products.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-6 py-12 text-center text-sm text-gray-500"
                >
                  No products found.
                </td>
              </tr>
            ) : (
              products.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  {onToggleSelect && (
                    <td className="px-4 py-4">
                      <input
                        type="checkbox"
                        checked={selected.includes(p.id)}
                        onChange={() => onToggleSelect(p.id)}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600"
                      />
                    </td>
                  )}
                  <td className="px-6 py-4">
                    <p className="text-sm font-medium text-gray-900">
                      {p.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {p.description || ""}
                    </p>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">
                    {p.price} DZD
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        p.status === "Active"
                          ? "bg-green-100 text-green-700"
                          : p.status === "Inactive"
                            ? "bg-red-100 text-red-700"
                            : "bg-yellow-100 text-yellow-700"
                      }`}
                    >
                      {p.status || "Active"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">
                    {p.messageCount || 0}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {new Date(p.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <button
                        onClick={() => onView(p)}
                        className="rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100"
                      >
                        View
                      </button>
                      <button
                        onClick={() => onEdit(p)}
                        className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-200"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => onDelete(p)}
                        className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
