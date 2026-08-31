// components/admin/KeywordListModal.js
"use client";

import { useState } from "react";

export default function KeywordListModal({ list, onClose, onSave, saving }) {
  const [form, setForm] = useState({
    name: list?.name || "",
    description: list?.description || "",
    google_sheets: {
      sheet_id: list?.google_sheets?.sheet_id || "",
      sheet_name: list?.google_sheets?.sheet_name || "Sheet1",
    },
  });

  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [sheetNames, setSheetNames] = useState([]);
  const [preview, setPreview] = useState([]);
  const [spreadsheetLink, setSpreadsheetLink] = useState("");

  const getToken = () => localStorage.getItem("accessToken");

  // Extract the spreadsheet ID from a full Google Sheets URL
  const extractSheetId = (url) => {
    const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    return match ? match[1] : "";
  };

  const handleLinkChange = (value) => {
    setSpreadsheetLink(value);
    const id = extractSheetId(value);
    if (id) {
      setForm({
        ...form,
        google_sheets: { ...form.google_sheets, sheet_id: id },
      });
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(form);
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    setSheetNames([]);
    setPreview([]);
    try {
      // Build a temporary list object for testing
      const testList = {
        google_sheets: {
          sheet_id: form.google_sheets.sheet_id,
          sheet_name: form.google_sheets.sheet_name,
        },
      };

      const res = await fetch("/api/admin/keyword-lists/test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ action: "test", ...testList }),
      });
      const data = await res.json();
      setTestResult(data);
      if (data.sheetNames) setSheetNames(data.sheetNames);
      if (data.preview) setPreview(data.preview);
    } catch (err) {
      setTestResult({ success: false, message: "Test failed" });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-gray-800 bg-[#141B2D] p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">
            {list ? "✏️ Edit Keyword List" : "➕ New Keyword List"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-200"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div>
            <h3 className="mb-3 text-sm font-semibold text-gray-300">
              Basic Information
            </h3>
            <div className="space-y-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-300">
                  Name
                </label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Algerian Darija"
                  className="rounded-lg border border-gray-700 bg-gray-800 px-3.5 py-2.5 text-sm text-white outline-none focus:border-[#6C63FF]"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-300">
                  Description
                </label>
                <input
                  type="text"
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  placeholder="e.g. Darija keywords for Algeria"
                  className="rounded-lg border border-gray-700 bg-gray-800 px-3.5 py-2.5 text-sm text-white outline-none focus:border-[#6C63FF]"
                />
              </div>
            </div>
          </div>

          {/* Google Sheets Configuration */}
          <div>
            <h3 className="mb-3 text-sm font-semibold text-gray-300">
              📊 Google Sheets Configuration
            </h3>
            <div className="space-y-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-300">
                  🔗 Spreadsheet Link
                </label>
                <input
                  type="text"
                  value={spreadsheetLink}
                  onChange={(e) => handleLinkChange(e.target.value)}
                  placeholder="https://docs.google.com/spreadsheets/d/..."
                  className="rounded-lg border border-gray-700 bg-gray-800 px-3.5 py-2.5 text-sm text-white outline-none focus:border-[#6C63FF]"
                />
                <p className="text-xs text-gray-500">
                  Paste the full link — the Sheet ID is extracted automatically.
                </p>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-300">
                  Sheet ID
                </label>
                <input
                  type="text"
                  required
                  value={form.google_sheets.sheet_id}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      google_sheets: {
                        ...form.google_sheets,
                        sheet_id: e.target.value,
                      },
                    })
                  }
                  placeholder="1abc123def456..."
                  className="rounded-lg border border-gray-700 bg-gray-800 px-3.5 py-2.5 text-sm text-white outline-none focus:border-[#6C63FF]"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-300">
                  Sheet Name
                </label>
                <input
                  type="text"
                  value={form.google_sheets.sheet_name}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      google_sheets: {
                        ...form.google_sheets,
                        sheet_name: e.target.value,
                      },
                    })
                  }
                  placeholder="Sheet1"
                  className="rounded-lg border border-gray-700 bg-gray-800 px-3.5 py-2.5 text-sm text-white outline-none focus:border-[#6C63FF]"
                />
              </div>

              {/* Test Connection */}
              <button
                type="button"
                onClick={handleTest}
                disabled={testing}
                className="rounded-lg bg-[#6C63FF]/20 px-4 py-2 text-sm font-medium text-[#6C63FF] hover:bg-[#6C63FF]/30 disabled:opacity-50"
              >
                {testing ? "Testing..." : "🔗 Test Connection"}
              </button>

              {/* Step-by-step validation results */}
              {testResult?.steps && (
                <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-4">
                  <p className="mb-3 text-sm font-semibold text-gray-300">
                    🔍 Connection Check (Step by Step)
                  </p>
                  <div className="space-y-2">
                    {testResult.steps.map((step) => (
                      <div
                        key={step.step}
                        className={`flex items-start gap-2 rounded-lg p-2.5 text-sm ${
                          step.status === "success"
                            ? "bg-green-500/10 text-green-400"
                            : "bg-red-500/10 text-red-400"
                        }`}
                      >
                        <span className="mt-0.5 shrink-0">
                          {step.status === "success" ? "✅" : "❌"}
                        </span>
                        <div>
                          <p className="font-medium">
                            Step {step.step}: {step.name}
                          </p>
                          <p className="text-xs opacity-80">{step.message}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* All sheets found */}
              {sheetNames.length > 0 && (
                <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-4">
                  <p className="mb-2 text-sm font-semibold text-gray-300">
                    📋 Sheets Found in Spreadsheet
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {sheetNames.map((name) => (
                      <button
                        key={name}
                        type="button"
                        onClick={() =>
                          setForm({
                            ...form,
                            google_sheets: {
                              ...form.google_sheets,
                              sheet_name: name,
                            },
                          })
                        }
                        className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                          form.google_sheets.sheet_name === name
                            ? "bg-[#6C63FF] text-white"
                            : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                        }`}
                      >
                        {name}
                      </button>
                    ))}
                  </div>
                  <p className="mt-2 text-xs text-gray-500">
                    Click a sheet to select it
                  </p>
                </div>
              )}

              {/* Preview of sheet data */}
              {preview.length > 0 && (
                <div className="overflow-x-auto rounded-lg border border-gray-700 bg-gray-800/50 p-4">
                  <p className="mb-2 text-sm font-semibold text-gray-300">
                    👁️ Preview of "{form.google_sheets.sheet_name}"
                  </p>
                  <table className="min-w-full divide-y divide-gray-700 text-xs">
                    <thead>
                      <tr>
                        {preview[0]?.map((cell, i) => (
                          <th
                            key={i}
                            className="px-2 py-1.5 text-left font-semibold text-gray-400"
                          >
                            {cell || `Col ${i + 1}`}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                      {preview.slice(1).map((row, ri) => (
                        <tr key={ri}>
                          {row.map((cell, ci) => (
                            <td key={ci} className="px-2 py-1.5 text-gray-300">
                              {cell || "—"}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Simple result fallback */}
              {testResult && !testResult.steps && (
                <div
                  className={`rounded-lg p-3 text-sm ${
                    testResult.success
                      ? "bg-green-500/10 text-green-400"
                      : "bg-red-500/10 text-red-400"
                  }`}
                >
                  {testResult.message || testResult.error}
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-700 px-4 py-2 text-sm font-medium text-gray-300 hover:bg-gray-800"
            >
              ❌ Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-[#6C63FF] px-4 py-2 text-sm font-semibold text-white hover:bg-[#5a52e0] disabled:opacity-50"
            >
              {saving ? "Saving..." : list ? "💾 Save Changes" : "💾 Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
