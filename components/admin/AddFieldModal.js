// components/admin/AddFieldModal.js
"use client";

const FIELD_TYPES = [
  "text",
  "number",
  "dropdown",
  "checkbox",
  "date",
  "textarea",
  "image",
  "color",
];

export default function AddFieldModal({ onClose, onSave, saving }) {
  const handleSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = {
      field_name: formData.get("field_name"),
      field_label: formData.get("field_label"),
      field_type: formData.get("field_type"),
      is_required: formData.get("is_required") === "on",
      is_visible: true,
      options: formData.get("options")
        ? formData
            .get("options")
            .split(",")
            .map((o) => o.trim())
            .filter(Boolean)
        : [],
      default_value: formData.get("default_value"),
    };
    onSave(data);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl">
        <h3 className="text-lg font-semibold text-gray-900">
          ➕ Add New Field
        </h3>
        <form
          onSubmit={handleSubmit}
          className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2"
        >
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">
              Field Name
            </label>
            <input
              type="text"
              name="field_name"
              placeholder="e.g. image_url"
              required
              className="rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">
              Field Label
            </label>
            <input
              type="text"
              name="field_label"
              placeholder="e.g. Image URL"
              required
              className="rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">
              Field Type
            </label>
            <select
              name="field_type"
              className="rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              {FIELD_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">
              Default Value
            </label>
            <input
              type="text"
              name="default_value"
              placeholder="Optional"
              className="rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <label className="text-sm font-medium text-gray-700">
              Options (comma-separated, for dropdown)
            </label>
            <input
              type="text"
              name="options"
              placeholder="e.g. Red, Blue, Green"
              className="rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>
          <div className="flex items-center gap-2 sm:col-span-2">
            <input
              type="checkbox"
              name="is_required"
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label className="text-sm text-gray-700">Required field</label>
          </div>
          <div className="flex justify-end gap-3 sm:col-span-2">
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
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? "Adding..." : "Add Field"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
