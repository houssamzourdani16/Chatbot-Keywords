// app/admin/keywords/page.js
"use client";

import { useState, useEffect, useCallback } from "react";
import KeywordListModal from "@/components/admin/KeywordListModal";
import DeleteConfirmModal from "@/components/admin/DeleteConfirmModal";
import { apiFetch } from "@/lib/client/api";

export default function AdminKeywordsPage() {
  const [lists, setLists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Modals
  const [showModal, setShowModal] = useState(false);
  const [editingList, setEditingList] = useState(null);
  const [deletingList, setDeletingList] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [syncingId, setSyncingId] = useState(null);

  const fetchLists = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await apiFetch("/api/admin/keyword-lists");
      const data = await res.json();
      if (data.success) {
        setLists(data.lists);
      } else {
        setError(data.error || "Failed to load keyword lists");
      }
    } catch (err) {
      setError("Failed to load keyword lists");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLists();
  }, [fetchLists]);

  const handleSave = async (data) => {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const url = editingList
        ? `/api/admin/keyword-lists/${editingList.id}`
        : "/api/admin/keyword-lists";
      const res = await apiFetch(url, {
        method: editingList ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (result.success) {
        setSuccess(
          editingList ? "✅ Keyword list updated!" : "✅ Keyword list created!",
        );
        setShowModal(false);
        setEditingList(null);
        fetchLists();
      } else {
        setError(result.error || "Failed to save keyword list");
      }
    } catch (err) {
      setError("Failed to save keyword list");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    setError("");
    setSuccess("");
    try {
      const res = await apiFetch(
        `/api/admin/keyword-lists/${deletingList.id}`,
        {
          method: "DELETE",
        },
      );
      const result = await res.json();
      if (result.success) {
        setSuccess("🗑️ Keyword list deleted!");
        setDeletingList(null);
        fetchLists();
      } else {
        setError(result.error || "Failed to delete keyword list");
      }
    } catch (err) {
      setError("Failed to delete keyword list");
    } finally {
      setDeleting(false);
    }
  };

  const handleSync = async (list) => {
    setSyncingId(list.id);
    setError("");
    setSuccess("");
    try {
      const res = await apiFetch(`/api/admin/keyword-lists/${list.id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "sync" }),
      });
      const result = await res.json();
      if (result.success) {
        setSuccess(`🔄 Synced ${result.total} keywords from "${list.name}"!`);
        fetchLists();
      } else {
        setError(result.error || "Failed to sync keyword list");
      }
    } catch (err) {
      setError("Failed to sync keyword list");
    } finally {
      setSyncingId(null);
    }
  };

  const statusColor = (status) => {
    if (status === "success") return "bg-green-500/20 text-green-400";
    if (status === "failed") return "bg-red-500/20 text-red-400";
    if (status === "syncing") return "bg-blue-500/20 text-blue-400";
    return "bg-gray-500/20 text-gray-400";
  };

  const timeAgo = (date) => {
    if (!date) return "Never";
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins} min ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
    const days = Math.floor(hours / 24);
    return `${days} day${days > 1 ? "s" : ""} ago`;
  };

  return (
    <div className="min-h-screen bg-[#0A0E17] text-white">
      <div className="mx-auto max-w-6xl px-6 py-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">🔑 Keyword Management</h1>
            <p className="text-sm text-gray-400">
              Keywords stored in Google Sheets, synced on-demand
            </p>
          </div>
          <button
            onClick={() => {
              setEditingList(null);
              setShowModal(true);
            }}
            className="rounded-lg bg-[#6C63FF] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#5a52e0]"
          >
            + New Keyword List
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
        ) : lists.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-700 bg-[#141B2D] p-16 text-center">
            <p className="text-4xl">🔑</p>
            <h2 className="mt-4 text-lg font-semibold">No keyword lists yet</h2>
            <p className="mt-2 text-sm text-gray-400">
              Create your first keyword list connected to a Google Sheet.
            </p>
            <button
              onClick={() => setShowModal(true)}
              className="mt-6 rounded-lg bg-[#6C63FF] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#5a52e0]"
            >
              + New Keyword List
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {lists.map((list) => (
              <div
                key={list.id}
                className="rounded-xl border border-gray-800 bg-[#141B2D] p-6"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-semibold">{list.name}</h3>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColor(
                          list.sync_status,
                        )}`}
                      >
                        {list.sync_status === "success"
                          ? "✅ Synced"
                          : list.sync_status === "failed"
                            ? "❌ Failed"
                            : list.sync_status === "syncing"
                              ? "🔄 Syncing"
                              : "⏳ Idle"}
                      </span>
                      {!list.is_active && (
                        <span className="rounded-full bg-gray-500/20 px-2 py-0.5 text-xs text-gray-400">
                          Inactive
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-gray-400">
                      {list.description || "No description"}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setEditingList(list);
                        setShowModal(true);
                      }}
                      className="rounded-lg bg-gray-800 px-3 py-1.5 text-xs font-medium text-gray-300 hover:bg-gray-700"
                    >
                      ✏️ Edit
                    </button>
                    <button
                      onClick={() => handleSync(list)}
                      disabled={syncingId === list.id}
                      className="rounded-lg bg-[#6C63FF]/20 px-3 py-1.5 text-xs font-medium text-[#6C63FF] hover:bg-[#6C63FF]/30 disabled:opacity-50"
                    >
                      {syncingId === list.id ? "Syncing..." : "🔄 Sync"}
                    </button>
                    <button
                      onClick={() => setDeletingList(list)}
                      className="rounded-lg bg-red-500/20 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500/30"
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </div>

                {/* Details */}
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="rounded-lg bg-gray-800/50 p-3">
                    <p className="text-xs text-gray-500">Source</p>
                    <p className="mt-1 text-sm font-medium">Google Sheets</p>
                  </div>
                  <div className="rounded-lg bg-gray-800/50 p-3">
                    <p className="text-xs text-gray-500">Sheet ID</p>
                    <p className="mt-1 truncate text-sm font-medium">
                      {list.google_sheets?.sheet_id?.slice(0, 12)}...
                    </p>
                  </div>
                  <div className="rounded-lg bg-gray-800/50 p-3">
                    <p className="text-xs text-gray-500">Keywords</p>
                    <p className="mt-1 text-sm font-medium">
                      {list.stats?.total_keywords?.toLocaleString() || 0}
                    </p>
                  </div>
                  <div className="rounded-lg bg-gray-800/50 p-3">
                    <p className="text-xs text-gray-500">Categories</p>
                    <p className="mt-1 text-sm font-medium">
                      {list.stats?.total_categories || 0}
                    </p>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
                  <span>
                    Language: {list.language} · Dialect: {list.dialect}
                  </span>
                  <span>Last Sync: {timeAgo(list.cache?.last_sync_at)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      {showModal && (
        <KeywordListModal
          list={editingList}
          onClose={() => {
            setShowModal(false);
            setEditingList(null);
          }}
          onSave={handleSave}
          saving={saving}
        />
      )}
      {deletingList && (
        <DeleteConfirmModal
          title="Delete Keyword List"
          message={`Delete keyword list "${deletingList.name}"?`}
          onClose={() => setDeletingList(null)}
          onConfirm={handleDelete}
          deleting={deleting}
        />
      )}
    </div>
  );
}
