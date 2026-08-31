// components/admin/WebhookModal.js
"use client";

import { useState } from "react";

export default function WebhookModal({ webhook, onClose, onSave, saving }) {
  const [form, setForm] = useState({
    name: webhook?.name || "",
    webhook_url: webhook?.webhook_url || "",
    description: webhook?.description || "",
    is_active: webhook?.is_active !== undefined ? webhook.is_active : true,
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(form);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-lg rounded-xl border border-gray-800 bg-[#141B2D] p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">
            {webhook ? "✏️ Edit Webhook" : "➕ Add New Webhook"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-200"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-300">Name</label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Gemini Pro"
              className="rounded-lg border border-gray-700 bg-gray-800 px-3.5 py-2.5 text-sm text-white outline-none focus:border-[#6C63FF]"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-300">
              Webhook URL
            </label>
            <input
              type="url"
              required
              value={form.webhook_url}
              onChange={(e) =>
                setForm({ ...form, webhook_url: e.target.value })
              }
              placeholder="https://n8n.domain.com/webhook/gemini"
              className="rounded-lg border border-gray-700 bg-gray-800 px-3.5 py-2.5 text-sm text-white outline-none focus:border-[#6C63FF]"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-300">
              Description
            </label>
            <textarea
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              rows={2}
              placeholder="e.g. Google's AI model for text processing"
              className="rounded-lg border border-gray-700 bg-gray-800 px-3.5 py-2.5 text-sm text-white outline-none focus:border-[#6C63FF]"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-300">Status</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm text-gray-300">
                <input
                  type="radio"
                  checked={form.is_active === true}
                  onChange={() => setForm({ ...form, is_active: true })}
                  className="h-4 w-4 text-[#6C63FF]"
                />
                ● Active
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-300">
                <input
                  type="radio"
                  checked={form.is_active === false}
                  onChange={() => setForm({ ...form, is_active: false })}
                  className="h-4 w-4 text-[#6C63FF]"
                />
                ○ Inactive
              </label>
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
              {saving ? "Saving..." : "💾 Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
