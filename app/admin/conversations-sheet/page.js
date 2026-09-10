// app/admin/conversations-sheet/page.js
"use client";

import { useState, useEffect, useCallback } from "react";

const EMPTY_FORM = {
  id: "",
  name: "Conversations",
  service_account_email: "",
  private_key: "",
  spreadsheet_id: "",
  sheet_name: "Sheet1",
  range: "A:Z",
  columns: {
    sender_id_column: 0,
    max_conversation_columns: 0,
  },
};

export default function AdminConversationsSheetPage() {
  const [configs, setConfigs] = useState([]);
  const [configured, setConfigured] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [testResult, setTestResult] = useState(null);
  const [sheetNames, setSheetNames] = useState([]);
  const [preview, setPreview] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [spreadsheetLink, setSpreadsheetLink] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Right-side sheet content viewer
  const [selectedConfigId, setSelectedConfigId] = useState(null);
  const [sheetContent, setSheetContent] = useState(null);
  const [contentLoading, setContentLoading] = useState(false);
  const [contentError, setContentError] = useState("");

  const [form, setForm] = useState(EMPTY_FORM);

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
      setForm({ ...form, spreadsheet_id: id });
    }
  };

  const fetchConfigs = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/conversations-sheet/config", {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      if (data.success) {
        setConfigured(data.configured);
        setConfigs(data.configs || []);
      } else {
        setError(data.error || "Failed to load configs");
      }
    } catch (err) {
      setError("Failed to load configs");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfigs();
  }, [fetchConfigs]);

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setTestResult(null);
    setSheetNames([]);
    setPreview([]);
    setSpreadsheetLink("");
    setShowAdvanced(false);
  };

  const startAdd = () => {
    resetForm();
    setShowForm(true);
    setError("");
    setSuccess("");
  };

  const startEdit = (config) => {
    setForm({
      id: config.id,
      name: config.name || "Conversations",
      service_account_email: config.service_account_email || "",
      private_key: "",
      spreadsheet_id: config.spreadsheet_id || "",
      sheet_name: config.sheet_name || "Sheet1",
      range: config.range || "A:Z",
      columns: {
        sender_id_column: config.columns?.sender_id_column || 0,
        max_conversation_columns: config.columns?.max_conversation_columns || 0,
      },
    });
    setEditingId(config.id);
    setShowForm(true);
    setTestResult(null);
    setSheetNames([]);
    setPreview([]);
    setSpreadsheetLink("");
    setShowAdvanced(!!config.service_account_email);
    setError("");
    setSuccess("");
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/conversations-sheet/config", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess(
          editingId
            ? "✅ Sheet configuration updated!"
            : "✅ Sheet configuration added!",
        );
        setShowForm(false);
        resetForm();
        fetchConfigs();
      } else {
        setError(data.error || "Failed to save config");
      }
    } catch (err) {
      setError("Failed to save config");
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setError("");
    setSuccess("");
    setTestResult(null);
    setSheetNames([]);
    setPreview([]);
    try {
      const res = await fetch("/api/conversations-sheet/test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      setTestResult(data);
      if (data.sheetNames) setSheetNames(data.sheetNames);
      if (data.preview) setPreview(data.preview);
    } catch (err) {
      setError("Failed to test connection");
    } finally {
      setTesting(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/conversations-sheet/sync", {
        method: "POST",
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      if (data.success) {
        setSuccess(
          `✅ Synced ${data.total} rows across ${data.synced} sheet(s)!`,
        );
        fetchConfigs();
      } else {
        setError(data.error || "Failed to sync");
      }
    } catch (err) {
      setError("Failed to sync");
    } finally {
      setSyncing(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this conversations sheet configuration?")) {
      return;
    }
    setDeleting(id);
    setError("");
    setSuccess("");
    try {
      const res = await fetch(`/api/conversations-sheet/config?id=${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      if (data.success) {
        setSuccess("🗑️ Sheet configuration deleted!");
        fetchConfigs();
      } else {
        setError(data.error || "Failed to delete config");
      }
    } catch (err) {
      setError("Failed to delete config");
    } finally {
      setDeleting(null);
    }
  };

  // Load the full content of a sheet config for the right-side viewer
  const loadSheetContent = async (configId) => {
    setSelectedConfigId(configId);
    setContentLoading(true);
    setContentError("");
    setSheetContent(null);
    try {
      const res = await fetch(
        `/api/conversations-sheet/content?id=${configId}`,
        { headers: { Authorization: `Bearer ${getToken()}` } },
      );
      const data = await res.json();
      if (data.success) {
        setSheetContent(data);
      } else {
        setContentError(data.error || "Failed to load sheet content");
      }
    } catch (err) {
      setContentError("Failed to load sheet content");
    } finally {
      setContentLoading(false);
    }
  };

  const formatTime = (iso) => {
    if (!iso) return "Never";
    const d = new Date(iso);
    const diff = Date.now() - d.getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (mins < 60) return `${mins} min ago`;
    if (hours < 24) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
    if (days < 30) return `${days} day${days > 1 ? "s" : ""} ago`;
    return d.toLocaleDateString();
  };

  const inputCls =
    "w-full rounded-lg border border-gray-700 bg-gray-800 px-3.5 py-2.5 text-sm text-white outline-none transition-colors focus:border-[#6C63FF] focus:ring-2 focus:ring-[#6C63FF]/20";
  const labelCls = "text-sm font-medium text-gray-300";
  const hintCls = "text-xs text-gray-500";

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#6C63FF] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">
            💬 Conversations Sheets
          </h1>
          <p className="mt-1 text-sm text-gray-400">
            Link Google Sheets to archive ALL conversations by Sender ID. Before
            the n8n webhook call, the full history for each sender is read from
            these sheets and sent with the payload.
          </p>
        </div>
        <button
          onClick={startAdd}
          className="rounded-lg bg-[#6C63FF] px-4 py-2 text-sm font-semibold text-white hover:bg-[#5A52E0]"
        >
          ➕ Add Sheet
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 rounded-lg border border-green-500/30 bg-green-500/10 p-4 text-sm text-green-400">
          {success}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* ============ LEFT COLUMN (form + list) ============ */}
        <div className="lg:col-span-2">
          {/* ============ ADD / EDIT FORM ============ */}
          {showForm && (
            <form
              onSubmit={handleSave}
              className="mb-6 overflow-hidden rounded-xl border border-gray-800 bg-[#141B2D]"
            >
              {/* Form header */}
              <div className="border-b border-gray-800 bg-gray-900/40 px-6 py-4">
                <h2 className="text-lg font-semibold text-white">
                  {editingId ? "✏️ Edit Sheet" : "➕ Add Conversations Sheet"}
                </h2>
                <p className="mt-0.5 text-xs text-gray-500">
                  Paste a Google Sheets link to archive conversations by Sender
                  ID.
                </p>
              </div>

              <div className="space-y-5 p-6">
                {/* Step 1: Link */}
                <div className="rounded-lg border border-[#6C63FF]/30 bg-[#6C63FF]/5 p-4">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#6C63FF]">
                    Step 1 — Spreadsheet Link
                  </p>
                  <div className="flex flex-col gap-1.5">
                    <label className={labelCls}>🔗 Google Sheets Link</label>
                    <input
                      type="text"
                      value={spreadsheetLink}
                      onChange={(e) => handleLinkChange(e.target.value)}
                      placeholder="https://docs.google.com/spreadsheets/d/..."
                      className={inputCls}
                    />
                    <p className={hintCls}>
                      Paste the full link — the Sheet ID is extracted
                      automatically.
                    </p>
                  </div>
                  <div className="mt-3 flex flex-col gap-1.5">
                    <label className={labelCls}>📄 Spreadsheet ID</label>
                    <input
                      type="text"
                      required
                      value={form.spreadsheet_id}
                      onChange={(e) =>
                        setForm({ ...form, spreadsheet_id: e.target.value })
                      }
                      placeholder="1abc123def456..."
                      className={inputCls}
                    />
                  </div>
                </div>

                {/* Step 2: Details */}
                <div className="rounded-lg border border-gray-800 bg-gray-900/30 p-4">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
                    Step 2 — Sheet Details
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1.5">
                      <label className={labelCls}>🏷️ Label</label>
                      <input
                        type="text"
                        value={form.name}
                        onChange={(e) =>
                          setForm({ ...form, name: e.target.value })
                        }
                        placeholder="e.g. Main, Support"
                        className={inputCls}
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className={labelCls}>📋 Sheet Name (tab)</label>
                      <input
                        type="text"
                        value={form.sheet_name}
                        onChange={(e) =>
                          setForm({ ...form, sheet_name: e.target.value })
                        }
                        placeholder="Sheet1"
                        className={inputCls}
                      />
                    </div>
                  </div>
                  <div className="mt-3 flex flex-col gap-1.5">
                    <label className={labelCls}>Range</label>
                    <input
                      type="text"
                      value={form.range}
                      onChange={(e) =>
                        setForm({ ...form, range: e.target.value })
                      }
                      placeholder="A:Z"
                      className={inputCls}
                    />
                  </div>
                </div>

                {/* Step 3: Column mapping */}
                <div className="rounded-lg border border-gray-800 bg-gray-900/30 p-4">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
                    Step 3 — Column Mapping
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs text-gray-400">
                        Sender ID Column
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={form.columns.sender_id_column}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            columns: {
                              ...form.columns,
                              sender_id_column: parseInt(e.target.value) || 0,
                            },
                          })
                        }
                        className={inputCls}
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs text-gray-400">
                        Max Conversation Columns (0 = all)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={form.columns.max_conversation_columns}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            columns: {
                              ...form.columns,
                              max_conversation_columns:
                                parseInt(e.target.value) || 0,
                            },
                          })
                        }
                        className={inputCls}
                      />
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-gray-500">
                    Column A (0) = Sender ID. Columns after it hold the
                    conversation messages.
                  </p>
                </div>

                {/* Advanced: credentials (optional) */}
                <div className="rounded-lg border border-gray-800 bg-gray-900/30">
                  <button
                    type="button"
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="flex w-full items-center justify-between px-4 py-3 text-left"
                  >
                    <span className="text-sm font-medium text-gray-300">
                      🔐 Advanced — Service Account Credentials{" "}
                      <span className="text-xs text-gray-500">(optional)</span>
                    </span>
                    <span
                      className={`text-gray-400 transition-transform ${
                        showAdvanced ? "rotate-180" : ""
                      }`}
                    >
                      ▾
                    </span>
                  </button>
                  {showAdvanced && (
                    <div className="space-y-3 border-t border-gray-800 p-4">
                      <p className="text-xs text-gray-500">
                        Only needed for private sheets. For public sheets
                        (shared with &quot;Anyone with the link can view&quot;),
                        leave these empty.
                      </p>
                      <div className="flex flex-col gap-1.5">
                        <label className={labelCls}>
                          📧 Service Account Email
                        </label>
                        <input
                          type="email"
                          value={form.service_account_email}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              service_account_email: e.target.value,
                            })
                          }
                          placeholder="service@your-project.iam.gserviceaccount.com"
                          className={inputCls}
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className={labelCls}>🔐 Private Key</label>
                        <textarea
                          rows={4}
                          value={form.private_key}
                          onChange={(e) =>
                            setForm({ ...form, private_key: e.target.value })
                          }
                          placeholder={
                            editingId
                              ? "Leave blank to keep the existing key"
                              : "-----BEGIN PRIVATE KEY-----..."
                          }
                          className={`${inputCls} font-mono text-xs`}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={handleTest}
                    disabled={testing}
                    className="rounded-lg bg-[#6C63FF]/20 px-4 py-2 text-sm font-medium text-[#6C63FF] hover:bg-[#6C63FF]/30 disabled:opacity-50"
                  >
                    {testing ? "Testing..." : "🔗 Test Connection"}
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-lg bg-[#6C63FF] px-4 py-2 text-sm font-semibold text-white hover:bg-[#5A52E0] disabled:opacity-50"
                  >
                    {saving ? "Saving..." : "💾 Save Configuration"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false);
                      resetForm();
                    }}
                    className="rounded-lg border border-gray-700 px-4 py-2 text-sm font-medium text-gray-300 hover:bg-gray-800"
                  >
                    Cancel
                  </button>
                </div>
              </div>

              {/* Test results */}
              {testResult?.steps && (
                <div className="border-t border-gray-800 bg-gray-900/40 p-6">
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

              {/* Sheets found */}
              {sheetNames.length > 0 && (
                <div className="border-t border-gray-800 bg-gray-900/40 p-6">
                  <p className="mb-2 text-sm font-semibold text-gray-300">
                    📋 Sheets Found in Spreadsheet
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {sheetNames.map((name) => (
                      <button
                        key={name}
                        type="button"
                        onClick={() => setForm({ ...form, sheet_name: name })}
                        className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                          form.sheet_name === name
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

              {/* Preview */}
              {preview.length > 0 && (
                <div className="overflow-x-auto border-t border-gray-800 bg-gray-900/40 p-6">
                  <p className="mb-2 text-sm font-semibold text-gray-300">
                    👁️ Preview of &quot;{form.sheet_name}&quot;
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
            </form>
          )}

          {/* ============ LIST OF CONFIGURED SHEETS ============ */}
          {configured && !showForm && (
            <div className="rounded-xl border border-gray-800 bg-[#141B2D] p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">
                  📊 Configured Sheets ({configs.length})
                </h2>
                <button
                  onClick={handleSync}
                  disabled={syncing}
                  className="rounded-lg bg-[#6C63FF] px-4 py-2 text-sm font-semibold text-white hover:bg-[#5A52E0] disabled:opacity-50"
                >
                  {syncing ? "Syncing..." : "🔄 Sync All"}
                </button>
              </div>

              <div className="space-y-3">
                {configs.map((config) => (
                  <div
                    key={config.id}
                    className="rounded-lg border border-gray-700 bg-gray-800/50 p-4"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span
                          className={`h-2.5 w-2.5 rounded-full ${
                            config.connection_status === "connected"
                              ? "bg-green-500"
                              : config.connection_status === "failed"
                                ? "bg-red-500"
                                : "bg-yellow-500"
                          }`}
                        />
                        <div>
                          <p className="text-sm font-semibold text-white">
                            {config.name || "Conversations"}
                          </p>
                          <p className="text-xs text-gray-400">
                            {config.spreadsheet_id} • {config.sheet_name}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => loadSheetContent(config.id)}
                          className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
                            selectedConfigId === config.id
                              ? "bg-[#6C63FF] text-white"
                              : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                          }`}
                        >
                          👁️ View
                        </button>
                        <button
                          onClick={() => startEdit(config)}
                          className="rounded-lg bg-[#6C63FF]/20 px-3 py-1.5 text-xs font-medium text-[#6C63FF] hover:bg-[#6C63FF]/30"
                        >
                          ✏️ Edit
                        </button>
                        <button
                          onClick={() => handleDelete(config.id)}
                          disabled={deleting === config.id}
                          className="rounded-lg bg-red-500/20 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500/30 disabled:opacity-50"
                        >
                          {deleting === config.id ? "..." : "🗑️ Delete"}
                        </button>
                      </div>
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-3 text-xs">
                      <div className="rounded-lg bg-gray-900/50 p-2.5">
                        <p className="text-gray-500">Senders</p>
                        <p className="mt-0.5 font-medium text-white">
                          {config.total_senders || 0}
                        </p>
                      </div>
                      <div className="rounded-lg bg-gray-900/50 p-2.5">
                        <p className="text-gray-500">Rows</p>
                        <p className="mt-0.5 font-medium text-white">
                          {config.last_sync_count || 0}
                        </p>
                      </div>
                      <div className="rounded-lg bg-gray-900/50 p-2.5">
                        <p className="text-gray-500">Last Sync</p>
                        <p className="mt-0.5 font-medium text-white">
                          {formatTime(config.last_sync_at)}
                        </p>
                      </div>
                    </div>
                    {config.connection_error && (
                      <p className="mt-2 text-xs text-red-400">
                        {config.connection_error}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ============ EMPTY STATE ============ */}
          {!configured && !showForm && (
            <div className="rounded-xl border border-dashed border-gray-700 bg-[#141B2D] p-10 text-center">
              <p className="text-4xl">💬</p>
              <h2 className="mt-3 text-lg font-semibold text-white">
                No Conversations Sheets Linked
              </h2>
              <p className="mx-auto mt-2 max-w-md text-sm text-gray-400">
                Link a Google Sheet to archive all conversations by Sender ID.
                The first column holds the Sender ID, and the remaining columns
                hold the conversation messages. You can add multiple sheets.
              </p>
              <button
                onClick={startAdd}
                className="mt-5 rounded-lg bg-[#6C63FF] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#5A52E0]"
              >
                ➕ Link Your First Sheet
              </button>
            </div>
          )}
        </div>

        {/* ============ RIGHT COLUMN (sheet content viewer) ============ */}
        <div className="lg:col-span-1">
          <div className="sticky top-4 rounded-xl border border-gray-800 bg-[#141B2D] p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white">
                📄 Sheet Content
              </h2>
              {sheetContent && (
                <span className="rounded-full bg-gray-800 px-2 py-0.5 text-xs text-gray-400">
                  {sheetContent.total} rows
                </span>
              )}
            </div>

            {!selectedConfigId && !sheetContent && (
              <p className="text-xs text-gray-500">
                Select a configured sheet to view its content here.
              </p>
            )}

            {contentLoading && (
              <div className="flex items-center justify-center py-10">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#6C63FF] border-t-transparent" />
              </div>
            )}

            {contentError && (
              <p className="rounded-lg bg-red-500/10 p-3 text-xs text-red-400">
                {contentError}
              </p>
            )}

            {sheetContent && !contentLoading && (
              <div>
                <p className="mb-2 truncate text-xs text-gray-400">
                  {sheetContent.name} • {sheetContent.sheet_name}
                </p>
                {sheetContent.rows.length === 0 ? (
                  <p className="text-xs text-gray-500">This sheet is empty.</p>
                ) : (
                  <div className="max-h-[70vh] overflow-auto rounded-lg border border-gray-800">
                    <table className="min-w-full divide-y divide-gray-700 text-xs">
                      <thead className="sticky top-0 bg-gray-900">
                        <tr>
                          {sheetContent.rows[0]?.map((cell, i) => (
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
                        {sheetContent.rows.slice(1).map((row, ri) => (
                          <tr key={ri}>
                            {row.map((cell, ci) => (
                              <td
                                key={ci}
                                className="max-w-30 truncate px-2 py-1.5 text-gray-300"
                                title={cell || ""}
                              >
                                {cell || "—"}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
