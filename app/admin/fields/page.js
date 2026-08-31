// app/admin/fields/page.js
"use client";

import { useState, useEffect, useCallback } from "react";
import FieldManager from "@/components/admin/FieldManager";

export default function FieldsPage() {
  const [fields, setFields] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [adding, setAdding] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const getToken = () => localStorage.getItem("accessToken");

  const fetchFields = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/fields", {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      if (data.success) {
        setFields(data.fields);
      } else {
        setError(data.error || "Failed to load fields");
      }
    } catch (err) {
      setError("Failed to load fields");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFields();
  }, [fetchFields]);

  const handleAddField = async (data) => {
    setAdding(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/admin/fields", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (result.success) {
        setSuccess("✅ Field added!");
        fetchFields();
      } else {
        setError(result.error || "Failed to add field");
      }
    } catch (err) {
      setError("Failed to add field");
    } finally {
      setAdding(false);
    }
  };

  const handleToggleField = async (field) => {
    setToggling(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/fields/${field._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ is_visible: !field.is_visible }),
      });
      const result = await res.json();
      if (result.success) {
        fetchFields();
      } else {
        setError(result.error || "Failed to toggle field");
      }
    } catch (err) {
      setError("Failed to toggle field");
    } finally {
      setToggling(false);
    }
  };

  const handleDeleteField = async (field) => {
    setDeleting(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch(`/api/admin/fields/${field._id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const result = await res.json();
      if (result.success) {
        setSuccess("🗑️ Field deleted!");
        fetchFields();
      } else {
        setError(result.error || "Failed to delete field");
      }
    } catch (err) {
      setError("Failed to delete field");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          🧩 Dynamic Field Management
        </h1>
        <p className="text-sm text-gray-500">
          Configure which custom fields appear on product forms.
        </p>
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

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-purple-600 border-t-transparent" />
        </div>
      ) : (
        <FieldManager
          fields={fields}
          onAddField={handleAddField}
          onToggleField={handleToggleField}
          onDeleteField={handleDeleteField}
          adding={adding}
          toggling={toggling}
          deleting={deleting}
        />
      )}
    </div>
  );
}
