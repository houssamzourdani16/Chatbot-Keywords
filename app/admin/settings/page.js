// app/admin/settings/page.js
"use client";

import { useState, useEffect, useCallback } from "react";

const SETTING_GROUPS = [
  {
    key: "general",
    label: "⚙️ General Settings",
    description: "Site-wide configuration",
    fields: [
      { key: "site_name", label: "Site Name", type: "text", default: "" },
      { key: "site_url", label: "Site URL", type: "text", default: "" },
      {
        key: "default_language",
        label: "Default Language",
        type: "text",
        default: "Darija",
      },
      {
        key: "timezone",
        label: "Timezone",
        type: "text",
        default: "Africa/Algiers",
      },
    ],
  },
  {
    key: "ai",
    label: "🤖 AI Settings",
    description: "AI model configuration",
    fields: [
      { key: "ai_model", label: "AI Model", type: "text", default: "GPT-3.5" },
      {
        key: "ai_provider",
        label: "AI Provider",
        type: "text",
        default: "OpenAI",
      },
      {
        key: "default_temperature",
        label: "Default Temperature",
        type: "number",
        default: "0.7",
      },
      {
        key: "max_tokens",
        label: "Max Tokens",
        type: "number",
        default: "500",
      },
      {
        key: "response_language",
        label: "Response Language",
        type: "text",
        default: "Darija",
      },
    ],
  },
  {
    key: "webhook",
    label: "🔗 Webhook Settings",
    description: "Webhook processing configuration",
    fields: [
      {
        key: "default_waiting_time",
        label: "Default Waiting Time (s)",
        type: "number",
        default: "5",
      },
      {
        key: "max_waiting_time",
        label: "Max Waiting Time (s)",
        type: "number",
        default: "30",
      },
      {
        key: "batch_size_limit",
        label: "Batch Size Limit",
        type: "number",
        default: "50",
      },
      {
        key: "retry_attempts",
        label: "Retry Attempts",
        type: "number",
        default: "3",
      },
    ],
  },
  {
    key: "pricing",
    label: "💰 Pricing Settings",
    description: "Plan pricing and limits",
    fields: [
      {
        key: "basic_price",
        label: "Basic Plan Price (DZD)",
        type: "number",
        default: "0",
      },
      {
        key: "basic_messages_limit",
        label: "Basic Messages Limit",
        type: "number",
        default: "100",
      },
      {
        key: "pro_price",
        label: "Pro Plan Price (DZD)",
        type: "number",
        default: "5000",
      },
      {
        key: "pro_messages_limit",
        label: "Pro Messages Limit",
        type: "number",
        default: "1000",
      },
      {
        key: "enterprise_price",
        label: "Enterprise Plan Price (DZD)",
        type: "number",
        default: "15000",
      },
      {
        key: "enterprise_messages_limit",
        label: "Enterprise Messages Limit",
        type: "number",
        default: "10000",
      },
    ],
  },
  {
    key: "email",
    label: "📧 Email Settings",
    description: "SMTP and notification configuration",
    fields: [
      { key: "smtp_host", label: "SMTP Host", type: "text", default: "" },
      { key: "smtp_port", label: "SMTP Port", type: "number", default: "587" },
      { key: "smtp_user", label: "SMTP Username", type: "text", default: "" },
      {
        key: "smtp_password",
        label: "SMTP Password",
        type: "password",
        default: "",
      },
      { key: "from_email", label: "From Email", type: "text", default: "" },
    ],
  },
  {
    key: "security",
    label: "🔒 Security",
    description: "Security configuration",
    fields: [
      {
        key: "session_timeout",
        label: "Session Timeout (min)",
        type: "number",
        default: "60",
      },
      {
        key: "rate_limit",
        label: "Rate Limit (req/min)",
        type: "number",
        default: "60",
      },
      {
        key: "ip_whitelist",
        label: "IP Whitelist (comma separated)",
        type: "text",
        default: "",
      },
    ],
  },
  {
    key: "sheets",
    label: "📊 Google Sheets",
    description: "Connect your Google Sheets for keyword management",
    fields: [
      {
        key: "service_account_json",
        label: "Service Account JSON",
        type: "textarea",
        default: "",
      },
      {
        key: "master_sheet_id",
        label: "Master Keywords Sheet ID",
        type: "text",
        default: "",
      },
      {
        key: "new_sheet_id",
        label: "New/Unfound Keywords Sheet ID",
        type: "text",
        default: "",
      },
      {
        key: "master_range",
        label: "Master Sheet Range",
        type: "text",
        default: "Keywords!A2:F",
      },
      {
        key: "new_range",
        label: "New Sheet Range",
        type: "text",
        default: "NewKeywords!A2:F",
      },
    ],
  },
];

export default function SettingsPage() {
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const getToken = () => localStorage.getItem("accessToken");

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/settings", {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      if (data.success) setSettings(data.settings);
    } catch (err) {
      setError("Failed to load settings");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleChange = (group, key, value) => {
    setSettings((prev) => ({
      ...prev,
      [group]: { ...(prev[group] || {}), [key]: value },
    }));
  };

  const handleSaveGroup = async (group) => {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ group, settings: settings[group] || {} }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess(`✅ ${group} settings saved!`);
      } else {
        setError(data.error || "Failed to save settings");
      }
    } catch (err) {
      setError("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-purple-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">⚙️ Settings</h1>
        <p className="text-sm text-gray-500">Configure your platform</p>
      </div>

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

      <div className="space-y-6">
        {SETTING_GROUPS.map((group) => (
          <div
            key={group.key}
            className="rounded-xl border border-gray-200 bg-white p-6"
          >
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                {group.label}
              </h2>
              <p className="text-sm text-gray-500">{group.description}</p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {group.fields.map((field) => {
                const value = settings[group.key]?.[field.key] ?? field.default;
                return (
                  <div
                    key={field.key}
                    className={`flex flex-col gap-1.5 ${
                      field.type === "textarea" ? "sm:col-span-2" : ""
                    }`}
                  >
                    <label className="text-sm font-medium text-gray-700">
                      {field.label}
                    </label>
                    {field.type === "textarea" ? (
                      <textarea
                        value={value}
                        onChange={(e) =>
                          handleChange(group.key, field.key, e.target.value)
                        }
                        rows={6}
                        placeholder='Paste your full service account JSON here, e.g. {"type":"service_account",...}'
                        className="rounded-lg border border-gray-300 px-3.5 py-2.5 font-mono text-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      />
                    ) : (
                      <input
                        type={field.type}
                        value={value}
                        onChange={(e) =>
                          handleChange(group.key, field.key, e.target.value)
                        }
                        className="rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      />
                    )}
                  </div>
                );
              })}
            </div>

            <div className="mt-4 flex justify-end">
              <button
                onClick={() => handleSaveGroup(group.key)}
                disabled={saving}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Settings"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
