// app/admin/unfound-keywords/page.js
"use client";

import { useState, useEffect, useCallback } from "react";

const STATUS_COLORS = {
  pending: "bg-yellow-100 text-yellow-700",
  reviewed: "bg-blue-100 text-blue-700",
  added: "bg-green-100 text-green-700",
  ignored: "bg-gray-100 text-gray-700",
};

export default function AdminUnfoundKeywordsPage() {
  const [keywords, setKeywords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Selection (bulk delete)
  const [selected, setSelected] = useState(new Set());

  const getToken = () => localStorage.getItem("accessToken");

  const fetchKeywords = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ page, limit: "50" });
      if (search) params.set("search", search);
      if (statusFilter) params.set("status", statusFilter);

      const res = await fetch(`/api/admin/unfound-keywords?${params}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      if (data.success) {
        setKeywords(data.keywords);
        setTotalPages(data.totalPages || 1);
        setTotal(data.total || 0);
        const ids = new Set(data.keywords.map((k) => k._id));
        setSelected((prev) => {
          const next = new Set();
          prev.forEach((id) => {
            if (ids.has(id)) next.add(id);
          });
          return next;
        });
      } else {
        setError(data.error || "Failed to load unfound keywords");
      }
    } catch (err) {
      setError("Failed to load unfound keywords");
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => {
    fetchKeywords();
  }, [fetchKeywords]);

  // Reset to page 1 when filters change
  useEffect(() => {
    const timer = setTimeout(() => setPage(1), 300);
    return () => clearTimeout(timer);
  }, [search, statusFilter]);

  const toggleSelect = (id) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const toggleSelectAll = () => {
    if (selected.size === keywords.length) setSelected(new Set());
    else setSelected(new Set(keywords.map((k) => k._id)));
  };

  const deleteOne = async (id) => {
    if (!window.confirm("Delete this unfound keyword?")) return;
    setError("");
    setSuccess("");
    try {
      const res = await fetch(`/api/admin/unfound-keywords`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (data.success) {
        setKeywords((prev) => prev.filter((k) => k._id !== id));
        setTotal((prev) => Math.max(0, prev - 1));
        setSuccess("Keyword deleted");
      } else {
        setError(data.error || "Failed to delete");
      }
    } catch (err) {
      setError("Failed to delete");
    }
  };

  const deleteSelected = async () => {
    if (selected.size === 0) return;
    if (!window.confirm(`Delete ${selected.size} selected keyword(s)?`)) return;
    setError("");
    setSuccess("");
    try {
      const res = await fetch(`/api/admin/unfound-keywords`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ ids: [...selected] }),
      });
      const data = await res.json();
      if (data.success) {
        setKeywords((prev) => prev.filter((k) => !selected.has(k._id)));
        setTotal((prev) => Math.max(0, prev - data.deleted));
        setSelected(new Set());
        setSuccess(`Deleted ${data.deleted} keyword(s)`);
      } else {
        setError(data.error || "Failed to delete");
      }
    } catch (err) {
      setError("Failed to delete");
    }
  };

  const updateStatus = async (id, status) => {
    setError("");
    setSuccess("");
    try {
      const res = await fetch(`/api/admin/unfound-keywords`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ id, status }),
      });
      const data = await res.json();
      if (data.success) {
        setKeywords((prev) =>
          prev.map((k) => (k._id === id ? { ...k, status } : k)),
        );
        setSuccess(`Marked as ${status}`);
      } else {
        setError(data.error || "Failed to update");
      }
    } catch (err) {
      setError("Failed to update");
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          🔍 Unfound Keywords
        </h1>
        <p className="text-sm text-gray-500">
          Keywords from messages that weren&apos;t found in the keyword list.
          Review, manage, and delete them here.
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

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-gray-200 bg-white p-4">
        <input
          type="text"
          placeholder="🔍 Search keyword..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-50 rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm outline-none focus:border-blue-500"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm outline-none focus:border-blue-500"
        >
          <option value="">All Statuses</option>
          {Object.keys(STATUS_COLORS).map((s) => (
            <option key={s} value={s}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </option>
          ))}
        </select>
        <span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-700">
          {total} total
        </span>
        {selected.size > 0 && (
          <button
            onClick={deleteSelected}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
          >
            🗑️ Delete {selected.size} selected
          </button>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3">
                <input
                  type="checkbox"
                  checked={
                    selected.size === keywords.length && keywords.length > 0
                  }
                  onChange={toggleSelectAll}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600"
                />
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                Keyword
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                Count
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                Sender
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                Message
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={8} className="px-6 py-12 text-center">
                  <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
                </td>
              </tr>
            ) : keywords.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="px-6 py-12 text-center text-sm text-gray-500"
                >
                  No unfound keywords found.
                </td>
              </tr>
            ) : (
              keywords.map((k) => (
                <tr key={k._id} className="hover:bg-gray-50">
                  <td className="px-4 py-4">
                    <input
                      type="checkbox"
                      checked={selected.has(k._id)}
                      onChange={() => toggleSelect(k._id)}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600"
                    />
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-medium text-gray-900">
                      {k.keyword}
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                      {k.count}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {k.sender_id || "—"}
                  </td>
                  <td className="max-w-xs px-6 py-4">
                    <p className="truncate text-sm text-gray-600">
                      {k.message || "—"}
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <select
                      value={k.status}
                      onChange={(e) => updateStatus(k._id, e.target.value)}
                      className={`rounded-full border-0 px-2 py-0.5 text-xs font-medium outline-none ${STATUS_COLORS[k.status] || STATUS_COLORS.pending}`}
                    >
                      {Object.keys(STATUS_COLORS).map((s) => (
                        <option key={s} value={s}>
                          {s.charAt(0).toUpperCase() + s.slice(1)}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {new Date(k.created_at).toLocaleString()}
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => deleteOne(k._id)}
                      className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100"
                    >
                      🗑️ Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(page - 1)}
              disabled={page <= 1}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() => setPage(page + 1)}
              disabled={page >= totalPages}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
