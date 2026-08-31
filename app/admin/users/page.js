// app/admin/users/page.js
"use client";

import { useState, useEffect, useCallback } from "react";

export default function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const getToken = () => localStorage.getItem("accessToken");

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ page, limit: "20" });
      if (search) params.set("search", search);

      const res = await fetch(`/api/admin/users?${params}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      if (data.success) {
        setUsers(data.users);
        setTotalPages(data.totalPages || 1);
      } else {
        setError(data.error || "Failed to load users");
      }
    } catch (err) {
      setError("Failed to load users");
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    const timer = setTimeout(() => setPage(1), 300);
    return () => clearTimeout(timer);
  }, [search]);

  return (
    <div className="min-h-screen bg-[#0A0E17] text-white">
      <div className="mx-auto max-w-6xl px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold">👥 Users</h1>
          <p className="text-sm text-gray-400">All users with their stats</p>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* Search */}
        <div className="mb-4">
          <input
            type="text"
            placeholder="🔍 Search users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-700 bg-[#141B2D] px-4 py-2.5 text-sm text-white outline-none focus:border-[#6C63FF] sm:w-80"
          />
        </div>

        {/* Users Table */}
        <div className="overflow-x-auto rounded-xl border border-gray-800 bg-[#141B2D]">
          <table className="min-w-full divide-y divide-gray-800">
            <thead>
              <tr>
                {["User Name", "Products", "Messages", "Webhook", "Joined"].map(
                  (h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500"
                    >
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center">
                    <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-[#6C63FF] border-t-transparent" />
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-12 text-center text-sm text-gray-500"
                  >
                    No users found.
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-800/30">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#6C63FF]/20 text-sm font-semibold text-[#6C63FF]">
                          {u.name?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{u.name}</p>
                          <p className="text-xs text-gray-500">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm">{u.productCount}</td>
                    <td className="px-4 py-3 text-sm">
                      {u.messageCount.toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-[#6C63FF]/20 px-2 py-0.5 text-xs text-[#6C63FF]">
                        {u.webhookModel || "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-400">
                      {new Date(u.createdAt).toLocaleDateString()}
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
                className="rounded-lg border border-gray-700 px-3 py-2 text-sm text-gray-300 hover:bg-gray-800 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => setPage(page + 1)}
                disabled={page >= totalPages}
                className="rounded-lg border border-gray-700 px-3 py-2 text-sm text-gray-300 hover:bg-gray-800 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
