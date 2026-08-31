// app/admin/webhooks/page.js
"use client";

import { useState, useEffect, useCallback } from "react";
import WebhookModal from "@/components/admin/WebhookModal";
import DeleteConfirmModal from "@/components/admin/DeleteConfirmModal";

export default function AdminWebhooksPage() {
  const [webhooks, setWebhooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Modals
  const [showModal, setShowModal] = useState(false);
  const [editingWebhook, setEditingWebhook] = useState(null);
  const [deletingWebhook, setDeletingWebhook] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const getToken = () => localStorage.getItem("accessToken");

  const fetchWebhooks = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/webhooks", {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      if (data.success) {
        setWebhooks(data.webhooks);
      } else {
        setError(data.error || "Failed to load webhooks");
      }
    } catch (err) {
      setError("Failed to load webhooks");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWebhooks();
  }, [fetchWebhooks]);

  const handleSave = async (data) => {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const url = editingWebhook
        ? `/api/admin/webhooks/${editingWebhook.id}`
        : "/api/admin/webhooks";
      const res = await fetch(url, {
        method: editingWebhook ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (result.success) {
        setSuccess(
          editingWebhook ? "✅ Webhook updated!" : "✅ Webhook added!",
        );
        setShowModal(false);
        setEditingWebhook(null);
        fetchWebhooks();
      } else {
        setError(result.error || "Failed to save webhook");
      }
    } catch (err) {
      setError("Failed to save webhook");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch(`/api/admin/webhooks/${deletingWebhook.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const result = await res.json();
      if (result.success) {
        setSuccess("🗑️ Webhook deleted!");
        setDeletingWebhook(null);
        fetchWebhooks();
      } else {
        setError(result.error || "Failed to delete webhook");
      }
    } catch (err) {
      setError("Failed to delete webhook");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0E17] text-white">
      <div className="mx-auto max-w-5xl px-6 py-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">🔗 N8N Webhooks</h1>
            <p className="text-sm text-gray-400">
              Manage AI model webhooks that users can choose
            </p>
          </div>
          <button
            onClick={() => {
              setEditingWebhook(null);
              setShowModal(true);
            }}
            className="rounded-lg bg-[#6C63FF] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#5a52e0]"
          >
            + Add New Webhook
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

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#6C63FF] border-t-transparent" />
          </div>
        ) : webhooks.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-700 bg-[#141B2D] p-16 text-center">
            <p className="text-4xl">🔗</p>
            <h2 className="mt-4 text-lg font-semibold">No webhooks yet</h2>
            <p className="mt-2 text-sm text-gray-400">
              Add your first N8N webhook model so users can choose it.
            </p>
            <button
              onClick={() => setShowModal(true)}
              className="mt-6 rounded-lg bg-[#6C63FF] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#5a52e0]"
            >
              + Add New Webhook
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {webhooks.map((w) => (
              <div
                key={w.id}
                className="rounded-xl border border-gray-800 bg-[#141B2D] p-6"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-semibold">{w.name}</h3>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          w.is_active
                            ? "bg-green-500/20 text-green-400"
                            : "bg-red-500/20 text-red-400"
                        }`}
                      >
                        {w.is_active ? "✅ Active" : "⚠️ Inactive"}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-gray-400">
                      {w.description || "No description"}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setEditingWebhook(w);
                        setShowModal(true);
                      }}
                      className="rounded-lg bg-gray-800 px-3 py-1.5 text-xs font-medium text-gray-300 hover:bg-gray-700"
                    >
                      ✏️ Edit
                    </button>
                    <button
                      onClick={() => setDeletingWebhook(w)}
                      className="rounded-lg bg-red-500/20 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500/30"
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between rounded-lg bg-gray-800/50 p-3">
                  <code className="truncate text-xs text-gray-400">
                    {w.webhook_url}
                  </code>
                  <span className="ml-3 shrink-0 text-xs text-gray-500">
                    👥 {w.users_count} users
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      {showModal && (
        <WebhookModal
          webhook={editingWebhook}
          onClose={() => {
            setShowModal(false);
            setEditingWebhook(null);
          }}
          onSave={handleSave}
          saving={saving}
        />
      )}
      {deletingWebhook && (
        <DeleteConfirmModal
          title="Delete Webhook"
          message={`Delete webhook "${deletingWebhook.name}"?`}
          onClose={() => setDeletingWebhook(null)}
          onConfirm={handleDelete}
          deleting={deleting}
        />
      )}
    </div>
  );
}
