// components/admin/google/SelectSpreadsheetStep.js
"use client";

import { useState } from "react";

export default function SelectSpreadsheetStep({
  files,
  loading,
  search,
  onSearch,
  onSelect,
  selectedId,
  onBack,
  onNext,
  accounts,
  selectedAccountId,
  onSelectAccount,
}) {
  const [searchInput, setSearchInput] = useState(search);

  const formatTime = (iso) => {
    if (!iso) return "";
    const d = new Date(iso);
    const now = Date.now();
    const diff = now - d.getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (mins < 60) return `${mins} min ago`;
    if (hours < 24) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
    if (days < 30) return `${days} day${days > 1 ? "s" : ""} ago`;
    return d.toLocaleDateString();
  };

  return (
    <div className="rounded-xl border border-gray-700 bg-gray-800/50 p-6">
      <h3 className="text-lg font-semibold text-white">📂 My Google Drive</h3>
      <p className="mt-1 text-sm text-gray-400">
        Select a spreadsheet to connect.
      </p>

      {/* Account switcher */}
      {accounts.length > 1 && (
        <div className="mt-4">
          <p className="mb-2 text-xs font-medium text-gray-400">Browsing as:</p>
          <div className="flex flex-wrap gap-2">
            {accounts.map((acc) => (
              <button
                key={acc.id}
                type="button"
                onClick={() => onSelectAccount(acc.id)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  selectedAccountId === acc.id
                    ? "bg-[#6C63FF] text-white"
                    : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                }`}
              >
                {acc.email}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Search */}
      <div className="mt-4">
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
            🔍
          </span>
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                onSearch(searchInput);
              }
            }}
            placeholder="Search spreadsheets..."
            className="w-full rounded-lg border border-gray-700 bg-[#0A0E17] py-2.5 pl-10 pr-4 text-sm text-white placeholder-gray-500 focus:border-[#6C63FF] focus:outline-none"
          />
        </div>
      </div>

      {/* List */}
      <div className="mt-4 max-h-72 space-y-2 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-10 text-gray-400">
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-gray-600 border-t-[#6C63FF]" />
            <span className="ml-2 text-sm">Loading spreadsheets...</span>
          </div>
        ) : files.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-700 py-10 text-center text-sm text-gray-500">
            No spreadsheets found. Try a different search.
          </div>
        ) : (
          files.map((file) => (
            <button
              key={file.id}
              type="button"
              onClick={() => onSelect(file)}
              className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left transition ${
                selectedId === file.id
                  ? "border-[#6C63FF] bg-[#6C63FF]/10"
                  : "border-gray-700 bg-[#0A0E17] hover:border-gray-500"
              }`}
            >
              <span className="text-xl">📄</span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-white">
                  {file.name}
                </p>
                <p className="text-xs text-gray-500">
                  Updated: {formatTime(file.modifiedTime)}
                </p>
              </div>
              {selectedId === file.id && (
                <span className="text-[#6C63FF]">✓</span>
              )}
            </button>
          ))
        )}
      </div>

      <p className="mt-3 text-xs text-gray-500">
        Showing {files.length} spreadsheet{files.length !== 1 ? "s" : ""}
      </p>

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
          disabled={!selectedId}
          className="rounded-lg bg-[#6C63FF] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#5A52E0] disabled:cursor-not-allowed disabled:opacity-40"
        >
          Next →
        </button>
      </div>
    </div>
  );
}
