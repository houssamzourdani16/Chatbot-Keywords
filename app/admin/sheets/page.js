// app/admin/sheets/page.js
"use client";

import { useState, useEffect, useCallback } from "react";

export default function AdminSheetsPage() {
  const [keywords, setKeywords] = useState([]);
  const [configured, setConfigured] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);

  const getToken = () => localStorage.getItem("accessToken");

  const fetchKeywords = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/sheets", {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      if (data.success) {
        setKeywords(data.keywords || []);
        setConfigured(data.configured || false);
      } else {
        setError(data.error || "Failed to load keywords");
      }
    } catch (err) {
      setError("Failed to load keywords");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchKeywords();
  }, [fetchKeywords]);

  const handleSave = async () => {
    if (!editing) return;
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/admin/sheets", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify(editing),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess("✅ Keyword updated in sheet!");
        setEditing(null);
        fetchKeywords();
      } else {
        setError(data.error || "Failed to update keyword");
      }
    } catch (err) {
      setError("Failed to update keyword");
    } finally {
      setSaving(false);
    }
  };

  const statusColor = (s) => {
    if (s === "done" || s === "completed") return "bg-green-100 text-green-700";
    if (s === "pending") return "bg-yellow-100 text-yellow-700";
    return "bg-gray-100 text-gray-700";
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          📊 Unfound Keywords
        </h1>
        <p className="text-sm text-gray-500">
          Keywords from messages that weren't found in the master sheet. Add
          meanings here to teach the AI.
        </p>
      </div>

      {!configured && !loading && (
        <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 p-6">
          <h2 className="text-lg font-semibold text-blue-800">
            🔌 Connect Google Sheets
          </h2>
          <p className="mt-2 text-sm text-blue-700">
            To use this feature, go to{" "}
            <span className="font-semibold">Settings → 📊 Google Sheets</span>{" "}
            and paste your service account JSON and sheet IDs. Then come back
            here to review unfound keywords.
          </p>
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700">
          {success}
        </div>
      )}

      {/* Keywords Table */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                Keyword
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                Category
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                Language
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                Meaning
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                Priority
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center">
                  <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
                </td>
              </tr>
            ) : keywords.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-6 py-12 text-center text-sm text-gray-500"
                >
                  {configured
                    ? "No unfound keywords yet. Great job!"
                    : "Connect Google Sheets to see unfound keywords."}
                </td>
              </tr>
            ) : (
              keywords.map((k) => (
                <tr key={k.row} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <p className="text-sm font-medium text-gray-900">
                      {k.keyword}
                    </p>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">
                    {k.category || "—"}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">
                    {k.language || "—"}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {k.meaning || "—"}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">
                    {k.priority || "—"}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColor(
                        k.status,
                      )}`}
                    >
                      {k.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => setEditing(k)}
                      className="rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100"
                    >
                      Add Meaning
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Edit modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                ✏️ Add Meaning: {editing.keyword}
              </h2>
              <button
                onClick={() => setEditing(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-700">
                  Meaning / Translation
                </label>
                <input
                  type="text"
                  value={editing.meaning || ""}
                  onChange={(e) =>
                    setEditing({ ...editing, meaning: e.target.value })
                  }
                  className="rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-gray-700">
                    Category
                  </label>
                  <input
                    type="text"
                    value={editing.category || ""}
                    onChange={(e) =>
                      setEditing({ ...editing, category: e.target.value })
                    }
                    className="rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-gray-700">
                    Language
                  </label>
                  <select
                    value={editing.language || "Darija"}
                    onChange={(e) =>
                      setEditing({ ...editing, language: e.target.value })
                    }
                    className="rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm outline-none focus:border-blue-500"
                  >
                    <option value="Darija">Darija</option>
                    <option value="Arabic">Arabic</option>
                    <option value="French">French</option>
                    <option value="English">English</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-gray-700">
                    Priority
                  </label>
                  <select
                    value={editing.priority || "Medium"}
                    onChange={(e) =>
                      setEditing({ ...editing, priority: e.target.value })
                    }
                    className="rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm outline-none focus:border-blue-500"
                  >
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-gray-700">
                    Status
                  </label>
                  <select
                    value={editing.status || "pending"}
                    onChange={(e) =>
                      setEditing({ ...editing, status: e.target.value })
                    }
                    className="rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm outline-none focus:border-blue-500"
                  >
                    <option value="pending">Pending</option>
                    <option value="done">Done</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setEditing(null)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save to Sheet"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
