// components/admin/google/PreviewMapStep.js
"use client";

export default function PreviewMapStep({
  spreadsheet,
  sheet,
  preview,
  loading,
  mapping,
  onMappingChange,
  onBack,
  onConfirm,
}) {
  const columns = preview?.columns || [];

  const handleMapping = (field, value) => {
    onMappingChange({ ...mapping, [field]: value });
  };

  return (
    <div className="rounded-xl border border-gray-700 bg-gray-800/50 p-6">
      <h3 className="text-lg font-semibold text-white">📊 Data Preview</h3>
      <p className="mt-1 text-sm text-gray-400">
        {spreadsheet?.name} → {sheet?.title}
      </p>

      {/* Preview table */}
      <div className="mt-4 overflow-x-auto rounded-lg border border-gray-700">
        {loading ? (
          <div className="flex items-center justify-center py-10 text-gray-400">
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-gray-600 border-t-[#6C63FF]" />
            <span className="ml-2 text-sm">Loading preview...</span>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-700 text-xs">
            <thead className="bg-[#0A0E17]">
              <tr>
                {columns.map((col) => (
                  <th
                    key={col.letter}
                    className="px-3 py-2 text-left font-semibold text-gray-300"
                  >
                    {col.letter} ({col.name})
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {preview?.data?.slice(0, 5).map((row, ri) => (
                <tr key={ri}>
                  {columns.map((col, ci) => (
                    <td key={ci} className="px-3 py-2 text-gray-300">
                      {row[ci] || "—"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {preview && (
        <p className="mt-2 text-xs text-gray-500">
          Showing {preview.previewRows} of {preview.totalRows} rows
        </p>
      )}

      {/* Column mapping */}
      <div className="mt-6 rounded-lg border border-gray-700 bg-[#0A0E17] p-4">
        <p className="mb-3 text-sm font-semibold text-gray-300">
          Column Mapping
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs text-gray-400">
              Keyword Column
            </label>
            <select
              value={mapping.keyword_column}
              onChange={(e) =>
                handleMapping("keyword_column", Number(e.target.value))
              }
              className="w-full rounded-lg border border-gray-700 bg-[#141B2D] px-3 py-2 text-sm text-white focus:border-[#6C63FF] focus:outline-none"
            >
              {columns.map((col) => (
                <option key={col.letter} value={col.letter.charCodeAt(0) - 65}>
                  {col.letter} ({col.name})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-400">
              Category Column
            </label>
            <select
              value={mapping.category_column}
              onChange={(e) =>
                handleMapping("category_column", Number(e.target.value))
              }
              className="w-full rounded-lg border border-gray-700 bg-[#141B2D] px-3 py-2 text-sm text-white focus:border-[#6C63FF] focus:outline-none"
            >
              {columns.map((col) => (
                <option key={col.letter} value={col.letter.charCodeAt(0) - 65}>
                  {col.letter} ({col.name})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-400">
              Metadata Column
            </label>
            <select
              value={mapping.metadata_column}
              onChange={(e) =>
                handleMapping("metadata_column", Number(e.target.value))
              }
              className="w-full rounded-lg border border-gray-700 bg-[#141B2D] px-3 py-2 text-sm text-white focus:border-[#6C63FF] focus:outline-none"
            >
              <option value={-1}>None</option>
              {columns.map((col) => (
                <option key={col.letter} value={col.letter.charCodeAt(0) - 65}>
                  {col.letter} ({col.name})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="mt-6 flex justify-between">
        <button
          type="button"
          onClick={onBack}
          className="rounded-lg border border-gray-700 px-4 py-2 text-sm font-medium text-gray-300 hover:bg-gray-700"
        >
          ← Back
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className="rounded-lg bg-green-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-green-500"
        >
          ✅ Confirm & Sync
        </button>
      </div>
    </div>
  );
}
