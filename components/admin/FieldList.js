// components/admin/FieldList.js
"use client";

export default function FieldList({ fields, onToggle, onDelete }) {
  if (fields.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-10 text-center text-sm text-gray-500">
        No custom fields yet. Add your first field to customize products.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {fields.map((field) => (
        <div
          key={field._id}
          className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-4"
        >
          <div className="flex items-center gap-3">
            <span className="text-gray-400 cursor-move">⋮⋮</span>
            <div>
              <p className="text-sm font-medium text-gray-900">
                {field.field_label}
              </p>
              <p className="text-xs text-gray-500">
                {field.field_name} · {field.field_type}
                {field.is_required ? " · Required" : ""}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Toggle */}
            <button
              onClick={() => onToggle(field)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                field.is_visible ? "bg-green-500" : "bg-gray-300"
              }`}
              aria-label="Toggle visibility"
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  field.is_visible ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
            {/* Delete */}
            <button
              onClick={() => onDelete(field)}
              className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100"
            >
              🗑️
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
