// components/admin/google/SelectSheetStep.js
"use client";

export default function SelectSheetStep({
  spreadsheet,
  sheets,
  loading,
  selectedSheet,
  onSelect,
  onBack,
  onNext,
}) {
  return (
    <div className="rounded-xl border border-gray-700 bg-gray-800/50 p-6">
      <h3 className="text-lg font-semibold text-white">
        📄 Selected: {spreadsheet?.name || "Spreadsheet"}
      </h3>
      <p className="mt-1 text-sm text-gray-400">Select a sheet to use.</p>

      <div className="mt-4 space-y-2">
        {loading ? (
          <div className="flex items-center justify-center py-10 text-gray-400">
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-gray-600 border-t-[#6C63FF]" />
            <span className="ml-2 text-sm">Loading sheets...</span>
          </div>
        ) : sheets.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-700 py-10 text-center text-sm text-gray-500">
            No sheets found in this spreadsheet.
          </div>
        ) : (
          sheets.map((sheet) => (
            <button
              key={sheet.id}
              type="button"
              onClick={() => onSelect(sheet)}
              className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left transition ${
                selectedSheet?.id === sheet.id
                  ? "border-[#6C63FF] bg-[#6C63FF]/10"
                  : "border-gray-700 bg-[#0A0E17] hover:border-gray-500"
              }`}
            >
              <span
                className={`text-lg ${
                  selectedSheet?.id === sheet.id ? "text-[#6C63FF]" : ""
                }`}
              >
                {selectedSheet?.id === sheet.id ? "●" : "○"}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-white">
                  {sheet.title}
                </p>
                <p className="text-xs text-gray-500">
                  {sheet.rowCount.toLocaleString()} rows × {sheet.columnCount}{" "}
                  columns
                </p>
              </div>
            </button>
          ))
        )}
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
          onClick={onNext}
          disabled={!selectedSheet}
          className="rounded-lg bg-[#6C63FF] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#5A52E0] disabled:cursor-not-allowed disabled:opacity-40"
        >
          Next →
        </button>
      </div>
    </div>
  );
}
