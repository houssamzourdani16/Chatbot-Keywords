// app/admin/google-sheets/page.js
"use client";

import { useState, useEffect, useCallback } from "react";

export default function AdminGoogleSheetsPage() {
  const [config, setConfig] = useState(null);
  const [configured, setConfigured] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [testResult, setTestResult] = useState(null);
  const [sheetNames, setSheetNames] = useState([]);
  const [preview, setPreview] = useState([]);
  const [showForm, setShowForm] = useState(false);

  const [form, setForm] = useState({
    service_account_email: "",
    private_key: "",
    spreadsheet_id: "",
    sheet_name: "Sheet1",
    range: "A:Z",
    columns: {
      keyword_column: 0,
      category_column: 1,
      metadata_columns: [],
    },
  });

  const getToken = () => localStorage.getItem("accessToken");

  const fetchConfig = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/google-sheets/config", {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      if (data.success) {
        setConfigured(data.configured);
        if (data.configured) {
          setConfig(data.config);
          setForm({
            service_account_email: data.config.service_account_email || "",
            private_key: "",
            spreadsheet_id: data.config.spreadsheet_id || "",
            sheet_name: data.config.sheet_name || "Sheet1",
            range: data.config.range || "A:Z",
            columns: data.config.columns || {
              keyword_column: 0,
              category_column: 1,
              metadata_columns: [],
            },
          });
        }
      } else {
        setError(data.error || "Failed to load config");
      }
    } catch (err) {
      setError("Failed to load config");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/google-sheets/config", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess("✅ Configuration saved!");
        setShowForm(false);
        fetchConfig();
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
      const res = await fetch("/api/google-sheets/test", {
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
      const res = await fetch("/api/google-sheets/sync", {
        method: "POST",
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      if (data.success) {
        setSuccess(`✅ Synced ${data.total} keywords!`);
        fetchConfig();
      } else {
        setError(data.error || "Failed to sync");
      }
    } catch (err) {
      setError("Failed to sync");
    } finally {
      setSyncing(false);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#6C63FF] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">
            📊 Google Sheets Configuration
          </h1>
          <p className="mt-1 text-sm text-gray-400">
            Manual connection using service account credentials (no OAuth)
          </p>
        </div>
        {configured && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="rounded-lg bg-[#6C63FF]/20 px-4 py-2 text-sm font-medium text-[#6C63FF] hover:bg-[#6C63FF]/30"
          >
            {showForm ? "✕ Close" : "✏️ Edit Configuration"}
          </button>
        )}
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

      {/* Configuration form */}
      {(showForm || !configured) && (
        <form
          onSubmit={handleSave}
          className="mb-6 rounded-xl border border-gray-800 bg-[#141B2D] p-6"
        >
          <h2 className="mb-4 text-lg font-semibold text-white">
            🔑 Service Account Credentials
          </h2>

          <div className="space-y-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-300">
                📧 Service Account Email
              </label>
              <input
                type="email"
                required
                value={form.service_account_email}
                onChange={(e) =>
                  setForm({
                    ...form,
                    service_account_email: e.target.value,
                  })
                }
                placeholder="service@your-project.iam.gserviceaccount.com"
                className="rounded-lg border border-gray-700 bg-gray-800 px-3.5 py-2.5 text-sm text-white outline-none focus:border-[#6C63FF]"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-300">
                🔐 Private Key
              </label>
              <textarea
                required
                rows={4}
                value={form.private_key}
                onChange={(e) =>
                  setForm({ ...form, private_key: e.target.value })
                }
                placeholder="-----BEGIN PRIVATE KEY-----..."
                className="rounded-lg border border-gray-700 bg-gray-800 px-3.5 py-2.5 font-mono text-xs text-white outline-none focus:border-[#6C63FF]"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-300">
                📄 Spreadsheet ID
              </label>
              <input
                type="text"
                required
                value={form.spreadsheet_id}
                onChange={(e) =>
                  setForm({ ...form, spreadsheet_id: e.target.value })
                }
                placeholder="1abc123def456..."
                className="rounded-lg border border-gray-700 bg-gray-800 px-3.5 py-2.5 text-sm text-white outline-none focus:border-[#6C63FF]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-300">
                  📋 Sheet Name
                </label>
                <input
                  type="text"
                  value={form.sheet_name}
                  onChange={(e) =>
                    setForm({ ...form, sheet_name: e.target.value })
                  }
                  placeholder="Sheet1"
                  className="rounded-lg border border-gray-700 bg-gray-800 px-3.5 py-2.5 text-sm text-white outline-none focus:border-[#6C63FF]"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-300">
                  Range
                </label>
                <input
                  type="text"
                  value={form.range}
                  onChange={(e) => setForm({ ...form, range: e.target.value })}
                  placeholder="A:Z"
                  className="rounded-lg border border-gray-700 bg-gray-800 px-3.5 py-2.5 text-sm text-white outline-none focus:border-[#6C63FF]"
                />
              </div>
            </div>

            {/* Column mapping */}
            <div className="rounded-lg bg-gray-800/50 p-3">
              <p className="mb-2 text-sm font-medium text-gray-300">
                Column Mapping
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-gray-400">
                    Keyword Column
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={form.columns.keyword_column}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        columns: {
                          ...form.columns,
                          keyword_column: parseInt(e.target.value) || 0,
                        },
                      })
                    }
                    className="rounded-lg border border-gray-700 bg-gray-800 px-3.5 py-2 text-sm text-white outline-none focus:border-[#6C63FF]"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-gray-400">
                    Category Column
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={form.columns.category_column}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        columns: {
                          ...form.columns,
                          category_column: parseInt(e.target.value) || 1,
                        },
                      })
                    }
                    className="rounded-lg border border-gray-700 bg-gray-800 px-3.5 py-2 text-sm text-white outline-none focus:border-[#6C63FF]"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3">
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
            </div>
          </div>

          {/* Test results */}
          {testResult?.steps && (
            <div className="mt-4 rounded-lg border border-gray-700 bg-gray-800/50 p-4">
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
            <div className="mt-4 rounded-lg border border-gray-700 bg-gray-800/50 p-4">
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
            <div className="mt-4 overflow-x-auto rounded-lg border border-gray-700 bg-gray-800/50 p-4">
              <p className="mb-2 text-sm font-semibold text-gray-300">
                👁️ Preview of "{form.sheet_name}"
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

      {/* Configuration status */}
      {configured && !showForm && (
        <div className="rounded-xl border border-gray-800 bg-[#141B2D] p-6">
          <h2 className="mb-4 text-lg font-semibold text-white">
            📊 Configuration Status
          </h2>

          <div
            className={`rounded-lg p-4 ${
              config?.connection_status === "connected"
                ? "bg-green-500/10 text-green-400"
                : config?.connection_status === "failed"
                  ? "bg-red-500/10 text-red-400"
                  : "bg-gray-800/50 text-gray-300"
            }`}
          >
            <p className="font-semibold">
              {config?.connection_status === "connected"
                ? "✅ Connected to Google Sheets"
                : config?.connection_status === "failed"
                  ? "❌ Connection failed"
                  : "⏳ Pending connection"}
            </p>
            {config?.connection_error && (
              <p className="mt-1 text-xs opacity-80">
                {config.connection_error}
              </p>
            )}
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-lg bg-gray-800/50 p-4">
              <p className="text-xs text-gray-400">📄 Spreadsheet</p>
              <p className="mt-1 text-sm font-medium text-white">
                {config?.spreadsheet_id}
              </p>
            </div>
            <div className="rounded-lg bg-gray-800/50 p-4">
              <p className="text-xs text-gray-400">📋 Sheet</p>
              <p className="mt-1 text-sm font-medium text-white">
                {config?.sheet_name}
              </p>
            </div>
            <div className="rounded-lg bg-gray-800/50 p-4">
              <p className="text-xs text-gray-400">🔑 Keywords</p>
              <p className="mt-1 text-sm font-medium text-white">
                {config?.total_keywords || 0} keywords
              </p>
            </div>
            <div className="rounded-lg bg-gray-800/50 p-4">
              <p className="text-xs text-gray-400">🔄 Last Sync</p>
              <p className="mt-1 text-sm font-medium text-white">
                {formatTime(config?.last_sync_at)}
              </p>
            </div>
          </div>

          <div className="mt-6 flex gap-3">
            <button
              onClick={handleSync}
              disabled={syncing}
              className="rounded-lg bg-[#6C63FF] px-4 py-2 text-sm font-semibold text-white hover:bg-[#5A52E0] disabled:opacity-50"
            >
              {syncing ? "Syncing..." : "🔄 Sync Now"}
            </button>
            <button
              onClick={() => setShowForm(true)}
              className="rounded-lg border border-gray-700 px-4 py-2 text-sm font-medium text-gray-300 hover:bg-gray-800"
            >
              ✏️ Edit Configuration
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
