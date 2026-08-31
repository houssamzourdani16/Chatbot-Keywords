// components/admin/KeywordModal.js
"use client";

import { useState } from "react";

export default function KeywordModal({
  keyword,
  categories,
  languages,
  onClose,
  onSave,
  saving,
}) {
  const [form, setForm] = useState({
    keyword: keyword?.keyword || "",
    category: keyword?.category || "Other",
    language: keyword?.language || "Darija",
    meaning: keyword?.meaning || "",
    synonyms: keyword?.synonyms?.join(", ") || "",
    context: keyword?.context || "",
    priority: keyword?.priority || "Medium",
    examples: keyword?.examples?.join(", ") || "",
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      ...form,
      synonyms: form.synonyms
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      examples: form.examples
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            {keyword ? "✏️ Edit Keyword" : "➕ Add Keyword"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">
                Keyword
              </label>
              <input
                type="text"
                required
                value={form.keyword}
                onChange={(e) => setForm({ ...form, keyword: e.target.value })}
                className="rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">
                Category
              </label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm outline-none focus:border-blue-500"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">
                Language
              </label>
              <select
                value={form.language}
                onChange={(e) => setForm({ ...form, language: e.target.value })}
                className="rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm outline-none focus:border-blue-500"
              >
                {languages.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">
                Priority
              </label>
              <select
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value })}
                className="rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm outline-none focus:border-blue-500"
              >
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">
              Meaning / Translation
            </label>
            <input
              type="text"
              value={form.meaning}
              onChange={(e) => setForm({ ...form, meaning: e.target.value })}
              className="rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">
              Synonyms (comma separated)
            </label>
            <input
              type="text"
              value={form.synonyms}
              onChange={(e) => setForm({ ...form, synonyms: e.target.value })}
              className="rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">
              Context / Examples
            </label>
            <textarea
              value={form.context}
              onChange={(e) => setForm({ ...form, context: e.target.value })}
              rows={2}
              className="rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">
              Example Sentences (comma separated)
            </label>
            <input
              type="text"
              value={form.examples}
              onChange={(e) => setForm({ ...form, examples: e.target.value })}
              className="rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? "Saving..." : keyword ? "Save Changes" : "Add Keyword"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
