// components/admin/FieldManager.js
"use client";

import { useState } from "react";
import FieldList from "./FieldList";
import AddFieldModal from "./AddFieldModal";
import DeleteConfirmModal from "./DeleteConfirmModal";

export default function FieldManager({
  fields,
  onAddField,
  onToggleField,
  onDeleteField,
  adding,
  toggling,
  deleting,
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Custom Fields</h2>
          <p className="text-sm text-gray-500">
            Configure which fields appear on product forms.
          </p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          + Add Field
        </button>
      </div>

      <FieldList
        fields={fields}
        onToggle={onToggleField}
        onDelete={(f) => setDeleteTarget(f)}
      />

      {showAdd && (
        <AddFieldModal
          onClose={() => setShowAdd(false)}
          onSave={(data) => {
            onAddField(data);
            setShowAdd(false);
          }}
          saving={adding}
        />
      )}

      {deleteTarget && (
        <DeleteConfirmModal
          title="Delete Field"
          message={`Delete field "${deleteTarget.field_label}"? This cannot be undone.`}
          onClose={() => setDeleteTarget(null)}
          onConfirm={() => {
            onDeleteField(deleteTarget);
            setDeleteTarget(null);
          }}
          deleting={deleting}
        />
      )}
    </div>
  );
}
